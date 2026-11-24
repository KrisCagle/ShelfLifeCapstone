// Loads the Grand Comics Database's data dump into ShelfLife's ComicSeries and ComicIssues
// tables. GCD publishes a fresh dump every two weeks (comics.org/download, signed in; the
// licence is CC BY-SA 4.0 with credit and links back), and rerunning this replaces the data.
//
//   dotnet run --project tools/GcdImport -- <path to the .db file> [--languages en,es] [--dry-run]
//
// The connection string comes from ConnectionStrings:DefaultConnection, read from the API's
// user secrets or the ConnectionStrings__DefaultConnection environment variable. Run the
// API's migrations first so the tables exist.

using System.Diagnostics;
using Microsoft.Data.Sqlite;
using Microsoft.Extensions.Configuration;
using Npgsql;
using NpgsqlTypes;

var path = args.FirstOrDefault(a => !a.StartsWith("--"));
if (path == null || !File.Exists(path))
{
    Console.Error.WriteLine("Usage: GcdImport <path to GCD .db file> [--languages en,es] [--dry-run]");
    return 1;
}
var dryRun = args.Contains("--dry-run");
var languages = args.SkipWhile(a => a != "--languages").Skip(1).FirstOrDefault()?
    .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries) ?? [];

var config = new ConfigurationBuilder().AddUserSecrets<Program>().AddEnvironmentVariables().Build();
var connectionString = Connection.Normalize(config.GetConnectionString("DefaultConnection"));
if (connectionString == null && !dryRun)
{
    Console.Error.WriteLine("No ConnectionStrings:DefaultConnection found in user secrets or the environment.");
    return 1;
}

var clock = Stopwatch.StartNew();
using var gcd = new SqliteConnection(new SqliteConnectionStringBuilder { DataSource = path, Mode = SqliteOpenMode.ReadOnly }.ToString());
gcd.Open();

// Only comics, only live rows, optionally only some languages.
var languageFilter = languages.Length == 0 ? "" : $"AND l.code IN ({string.Join(',', languages.Select((_, i) => $"$lang{i}"))})";
SqliteCommand Command(string sql)
{
    var command = gcd.CreateCommand();
    command.CommandText = sql;
    for (var i = 0; i < languages.Length; i++)
        command.Parameters.AddWithValue($"$lang{i}", languages[i]);
    return command;
}
var seriesFilter = $"""
    FROM gcd_series s
    LEFT JOIN stddata_language l ON l.id = s.language_id
    WHERE s.deleted = 0 AND s.is_comics_publication = 1 {languageFilter}
    """;

// A barcode printed on unrelated series is a placeholder ("00123456789"), not a product.
Console.WriteLine("Finding placeholder barcodes…");
var junk = new HashSet<string>();
using (var reader = Command("SELECT barcode FROM gcd_issue WHERE deleted = 0 AND barcode <> '' GROUP BY barcode HAVING COUNT(DISTINCT series_id) > 3").ExecuteReader())
    while (reader.Read())
        junk.Add(Barcodes.Digits(reader.GetString(0)));
Console.WriteLine($"  {junk.Count:N0} placeholder barcodes will be dropped");

var series = new List<ComicSeriesRow>();
using (var reader = Command($"""
    SELECT s.id, s.name, s.year_began, p.name, l.code, s.issue_count, s.first_issue_id
    {seriesFilter.Replace("FROM gcd_series s", "FROM gcd_series s LEFT JOIN gcd_publisher p ON p.id = s.publisher_id")}
    """).ExecuteReader())
    while (reader.Read())
        series.Add(new ComicSeriesRow(
            reader.GetInt32(0),
            Text.Clip(reader.GetString(1), 255)!,
            reader.IsDBNull(2) ? null : reader.GetInt32(2),
            reader.IsDBNull(3) ? null : Text.Clip(reader.GetString(3), 255),
            reader.IsDBNull(4) ? null : reader.GetString(4),
            reader.IsDBNull(5) ? 0 : reader.GetInt32(5),
            reader.IsDBNull(6) ? null : reader.GetInt32(6)));
Console.WriteLine($"  {series.Count:N0} series");

var stats = new Stats();
var issues = new List<ComicIssueRow>();
using (var reader = Command($"""
    SELECT i.id, i.series_id, i.number, i.variant_name, i.variant_of_id, i.title, i.key_date, i.barcode, i.isbn
    FROM gcd_issue i
    WHERE i.deleted = 0 AND i.series_id IN (SELECT s.id {seriesFilter})
    """).ExecuteReader())
    while (reader.Read())
    {
        var (barcode, main) = Barcodes.Clean(reader.IsDBNull(7) ? null : reader.GetString(7), junk, stats);
        var isbn = Barcodes.Isbn(reader.IsDBNull(8) ? null : reader.GetString(8));
        if (isbn != null) stats.Isbns++;
        issues.Add(new ComicIssueRow(
            reader.GetInt32(0),
            reader.GetInt32(1),
            Text.Clip(reader.IsDBNull(2) ? "" : reader.GetString(2), 50)!,
            Text.Clip(Text.NullIfEmpty(reader.IsDBNull(3) ? null : reader.GetString(3)), 255),
            reader.IsDBNull(4) ? null : reader.GetInt32(4),
            Text.Clip(Text.NullIfEmpty(reader.IsDBNull(5) ? null : reader.GetString(5)), 255),
            Text.Year(reader.IsDBNull(6) ? null : reader.GetString(6)),
            barcode,
            main,
            isbn));
    }
Console.WriteLine($"  {issues.Count:N0} issues, {stats.Barcodes:N0} with a barcode ({stats.WithAddOn:N0} with an add-on), {stats.Isbns:N0} with an ISBN; read in {clock.Elapsed.TotalSeconds:N0}s");

if (dryRun)
{
    Console.WriteLine("Dry run: nothing written.");
    return 0;
}

// One transaction: if anything fails, the previous import stays in place.
await using var db = new NpgsqlConnection(connectionString);
await db.OpenAsync();
await using (var transaction = await db.BeginTransactionAsync())
{
    await using (var truncate = new NpgsqlCommand("""TRUNCATE "ComicIssues", "ComicSeries" """, db, transaction))
        await truncate.ExecuteNonQueryAsync();

    await using (var writer = await db.BeginBinaryImportAsync("""COPY "ComicSeries" ("Id", "Name", "YearBegan", "Publisher", "Language", "IssueCount", "FirstIssueId") FROM STDIN (FORMAT BINARY)"""))
    {
        foreach (var s in series)
        {
            await writer.StartRowAsync();
            await writer.WriteAsync(s.Id, NpgsqlDbType.Integer);
            await writer.WriteAsync(s.Name, NpgsqlDbType.Varchar);
            await Write(writer, s.YearBegan);
            await Write(writer, s.Publisher);
            await Write(writer, s.Language);
            await writer.WriteAsync(s.IssueCount, NpgsqlDbType.Integer);
            await Write(writer, s.FirstIssueId);
        }
        await writer.CompleteAsync();
    }

    await using (var writer = await db.BeginBinaryImportAsync("""COPY "ComicIssues" ("Id", "SeriesId", "Number", "VariantName", "VariantOfId", "Title", "Year", "Barcode", "BarcodeMain", "Isbn") FROM STDIN (FORMAT BINARY)"""))
    {
        foreach (var i in issues)
        {
            await writer.StartRowAsync();
            await writer.WriteAsync(i.Id, NpgsqlDbType.Integer);
            await writer.WriteAsync(i.SeriesId, NpgsqlDbType.Integer);
            await writer.WriteAsync(i.Number, NpgsqlDbType.Varchar);
            await Write(writer, i.VariantName);
            await Write(writer, i.VariantOfId);
            await Write(writer, i.Title);
            await Write(writer, i.Year);
            await Write(writer, i.Barcode);
            await Write(writer, i.BarcodeMain);
            await Write(writer, i.Isbn);
        }
        await writer.CompleteAsync();
    }
    await transaction.CommitAsync();
}
await using (var analyze = new NpgsqlCommand("""ANALYZE "ComicSeries"; ANALYZE "ComicIssues";""", db))
    await analyze.ExecuteNonQueryAsync();
await using (var size = new NpgsqlCommand("""SELECT pg_size_pretty(pg_total_relation_size('"ComicSeries"') + pg_total_relation_size('"ComicIssues"'))""", db))
    Console.WriteLine($"Imported in {clock.Elapsed.TotalSeconds:N0}s. Comic tables now take {await size.ExecuteScalarAsync()} including indexes.");
return 0;

static async Task Write<T>(NpgsqlBinaryImporter writer, T? value)
{
    if (value == null) await writer.WriteNullAsync();
    else if (value is int number) await writer.WriteAsync(number, NpgsqlDbType.Integer);
    else await writer.WriteAsync(value.ToString(), NpgsqlDbType.Varchar);
}

record ComicSeriesRow(int Id, string Name, int? YearBegan, string? Publisher, string? Language, int IssueCount, int? FirstIssueId);
record ComicIssueRow(int Id, int SeriesId, string Number, string? VariantName, int? VariantOfId, string? Title, int? Year, string? Barcode, string? BarcodeMain, string? Isbn);

class Stats
{
    public int Barcodes;
    public int WithAddOn;
    public int Isbns;
}

static class Barcodes
{
    public static string Digits(string raw) => new(raw.Where(char.IsDigit).ToArray());

    /// The full barcode and the main UPC/EAN a scanner reads without the add-on.
    /// Comics print a 5-digit add-on (issue, cover, printing) and magazines a 2-digit one.
    public static (string? Full, string? Main) Clean(string? raw, HashSet<string> junk, Stats stats)
    {
        if (string.IsNullOrWhiteSpace(raw))
            return (null, null);
        var digits = Digits(raw.Split(';')[0]);
        if (digits.Length is < 8 or > 18 || junk.Contains(digits) || digits.All(c => c == '0'))
            return (null, null);
        var main = digits.Length switch
        {
            17 or 14 => digits[..12], // UPC-A + 5- or 2-digit add-on
            18 or 15 => digits[..13], // EAN-13 + add-on
            8 or 12 or 13 => digits,
            _ => null,
        };
        if (main == null)
            return (null, null);
        // The app reads an EAN-13 that starts with 0 as the 12-digit UPC-A it really is.
        if (main.Length == 13 && main[0] == '0')
            main = main[1..];
        stats.Barcodes++;
        if (digits.Length > main.Length + 1)
            stats.WithAddOn++;
        return (digits, main);
    }

    /// The first valid ISBN, as ISBN-13.
    public static string? Isbn(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw))
            return null;
        foreach (var part in raw.Split(';', ','))
        {
            var compact = new string(part.Where(c => char.IsDigit(c) || c is 'X' or 'x').ToArray()).ToUpperInvariant();
            if (compact.Length == 13 && compact.All(char.IsDigit) && (compact.StartsWith("978") || compact.StartsWith("979")))
                return compact;
            if (compact.Length == 10 && compact[..9].All(char.IsDigit))
                return To13(compact);
        }
        return null;
    }

    private static string? To13(string isbn10)
    {
        var check = isbn10.Select((c, i) => (c == 'X' ? 10 : c - '0') * (10 - i)).Sum();
        if (check % 11 != 0)
            return null;
        var core = "978" + isbn10[..9];
        var total = core.Select((c, i) => (c - '0') * (i % 2 == 0 ? 1 : 3)).Sum();
        return core + ((10 - total % 10) % 10);
    }
}

static class Text
{
    public static string? NullIfEmpty(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    public static string? Clip(string? value, int max) => value == null ? null : value.Length <= max ? value : value[..max];

    /// GCD key dates look like "1988-05-00"; unknown parts are zero.
    public static int? Year(string? keyDate) =>
        keyDate is { Length: >= 4 } && int.TryParse(keyDate[..4], out var year) && year is > 1800 and < 2200 ? year : null;
}

static class Connection
{
    /// Accepts key=value strings or postgres:// URLs, as the API does.
    public static string? Normalize(string? value)
    {
        if (value == null || !(value.StartsWith("postgres://") || value.StartsWith("postgresql://")))
            return value;
        var uri = new Uri(value);
        var user = uri.UserInfo.Split(':', 2);
        return new NpgsqlConnectionStringBuilder
        {
            Host = uri.Host,
            Port = uri.Port > 0 ? uri.Port : 5432,
            Database = uri.AbsolutePath.TrimStart('/'),
            Username = Uri.UnescapeDataString(user[0]),
            Password = user.Length > 1 ? Uri.UnescapeDataString(user[1]) : null,
            SslMode = SslMode.Require,
        }.ToString();
    }
}
