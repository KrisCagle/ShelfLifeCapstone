FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY ["ShelfLifeAPI/ShelfLifeAPI.csproj", "ShelfLifeAPI/"]
RUN dotnet restore "ShelfLifeAPI/ShelfLifeAPI.csproj"
COPY . .
WORKDIR "/src/ShelfLifeAPI"
RUN dotnet publish -c Release -o /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app
COPY --from=build /app/publish .
ENV ASPNETCORE_URLS=http://+:8080
ENTRYPOINT ["dotnet", "ShelfLifeAPI.dll"]