import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getItems } from "../../services/itemService";
import { logout } from "../../services/authService";

const useWindowWidth = () => {
  const [width, setWidth] = useState(window.innerWidth);
  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  return width;
};

const CollectionPage = () => {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedFormat, setSelectedFormat] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const windowWidth = useWindowWidth();

  const getCardSize = () => {
    if (windowWidth < 480)
      return { cardWidth: 140, cardHeight: 196, cardsPerShelf: 2 };
    if (windowWidth < 768)
      return { cardWidth: 160, cardHeight: 224, cardsPerShelf: 3 };
    if (windowWidth < 1100)
      return { cardWidth: 180, cardHeight: 252, cardsPerShelf: 4 };
    return { cardWidth: 200, cardHeight: 280, cardsPerShelf: 5 };
  };

  const { cardWidth, cardHeight, cardsPerShelf } = getCardSize();

  useEffect(() => {
    getItems()
      .then((data) => {
        if (Array.isArray(data)) {
          setItems(data);
        } else {
          navigate("/login");
        }
        setLoading(false);
      })
      .catch(() => {
        navigate("/login");
        setLoading(false);
      });
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const filtered = items.filter((item) => {
    const matchesSearch = item.title
      .toLowerCase()
      .includes(search.toLowerCase());
    const matchesFormat =
      selectedFormat === "" || item.format?.name === selectedFormat;
    const matchesGenre =
      selectedGenre === "" ||
      item.itemGenres?.some((ig) => ig.genre?.name === selectedGenre);
    return matchesSearch && matchesFormat && matchesGenre;
  });

  const chunkArray = (arr, size) => {
    const chunks = [];
    for (let i = 0; i < arr.length; i += size) {
      chunks.push(arr.slice(i, i + size));
    }
    return chunks;
  };

  const shelves = chunkArray(filtered, cardsPerShelf);

  if (loading)
    return (
      <div
        style={{
          backgroundColor: "#000000",
          backgroundImage: `url("https://www.transparenttextures.com/patterns/retina-wood.png")`,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <p
          style={{
            color: "#00bfff",
            fontFamily: "Bebas Neue, sans-serif",
            fontSize: "2rem",
            letterSpacing: "4px",
            textShadow: "0 0 20px rgba(0, 191, 255, 0.8)",
          }}
        >
          Loading your collection...
        </p>
      </div>
    );

  const formatColors = {
    VHS: "#01ccff",
    CD: "#ffea00",
    Vinyl: "#7722cc",
    NES: "#768e0a",
    SNES: "#00fff2",
    N64: "#cc0000",
    PS1: "#ff00f7",
    PS2: "#0033cc",
    GameBoy: "#008866",
    "GameBoy Advance": "#008866",
    GameCube: "#6600cc",
    "Sega Genesis": "#0055aa",
  };
  const formatShortNames = {
    "GameBoy Advance": "GBA",
    "Sega Genesis": "GENESIS",
  };
  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#000000",
        backgroundImage: `url("https://www.transparenttextures.com/patterns/retina-wood.png")`,
        padding: "0 0 40px 0",
      }}
    >
      {/* Store Header */}
      <div
        style={{
          backgroundColor: "#050510",
          borderBottom: "4px solid #00bfff",
          padding: windowWidth < 768 ? "8px 16px" : "8px 32px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div>
          <Link to="/" style={{ textDecoration: "none" }}>
            <img
              src="/logo.png"
              alt="Shelf Life"
              style={{
                height: windowWidth < 768 ? "100px" : "180px",
                objectFit: "contain",
                marginBottom: "-49px",
                marginTop: "-53px",
                marginLeft: "-39px",
              }}
            />
          </Link>

          <p
            style={{
              color: "#f5a623",
              margin: "0 0 8px 0",
              fontSize: ".99rem",
              letterSpacing: "2px",
              fontFamily: "Share Tech Mono, monospace",
              textShadow: "0 0 10px rgba(245, 166, 35, 0.5)",
            }}
          >
            {items.length} TITLES · $
            {items
              .reduce((sum, item) => sum + (item.purchasePrice || 0), 0)
              .toFixed(2)}{" "}
            INVESTED
          </p>
        </div>
        <div
          style={{
            display: "flex",
            gap: "8px",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <Link
            to="/items/new"
            style={{
              backgroundColor: "#00bfff",
              color: "#050510",
              padding: windowWidth < 768 ? "6px 10px" : "8px 16px",
              fontFamily: "Bebas Neue, sans-serif",
              fontSize: windowWidth < 768 ? "0.9rem" : "1.1rem",
              letterSpacing: "2px",
              textDecoration: "none",
              borderRadius: "4px",
            }}
          >
            + ADD TITLE
          </Link>
          <Link
            to="/wishlist"
            style={{
              color: "#00bfff",
              padding: windowWidth < 768 ? "6px 10px" : "8px 16px",
              fontFamily: "Bebas Neue, sans-serif",
              fontSize: windowWidth < 768 ? "0.9rem" : "1.1rem",
              letterSpacing: "2px",
              textDecoration: "none",
              border: "1px solid #00bfff",
              borderRadius: "4px",
            }}
          >
            WISHLIST
          </Link>
          <button
            onClick={handleLogout}
            style={{
              backgroundColor: "transparent",
              color: "#f5a623",
              border: "1px solid #f5a623",
              padding: windowWidth < 768 ? "6px 10px" : "8px 16px",
              fontFamily: "Bebas Neue, sans-serif",
              fontSize: windowWidth < 768 ? "0.9rem" : "1.1rem",
              letterSpacing: "2px",
              cursor: "pointer",
              borderRadius: "4px",
            }}
          >
            LOGOUT
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div
        style={{
          padding: windowWidth < 768 ? "8px 16px" : "8px 32px",
          display: "flex",
          gap: "12px",
          flexWrap: "wrap",
          borderBottom: "1px solid #1a1a2e",
          backgroundColor: "#050510",
        }}
      >
        <select
          value={selectedFormat}
          onChange={(e) => setSelectedFormat(e.target.value)}
          style={{
            padding: "8px 12px",
            backgroundColor: "#0d0d1a",
            border: "1px solid #333",
            borderRadius: "4px",
            color: "#00bfff",
            fontFamily: "Share Tech Mono, monospace",
            fontSize: "0.85rem",
            letterSpacing: "1px",
            outline: "none",
            cursor: "pointer",
          }}
        >
          <option value="">ALL FORMATS</option>
          {[...new Set(items.map((i) => i.format?.name))]
            .filter(Boolean)
            .map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
        </select>

        <select
          value={selectedGenre}
          onChange={(e) => setSelectedGenre(e.target.value)}
          style={{
            padding: "8px 12px",
            backgroundColor: "#0d0d1a",
            border: "1px solid #333",
            borderRadius: "4px",
            color: "#00bfff",
            fontFamily: "Share Tech Mono, monospace",
            fontSize: "0.85rem",
            letterSpacing: "1px",
            outline: "none",
            cursor: "pointer",
          }}
        >
          <option value="">ALL GENRES</option>
          {[
            ...new Set(
              items.flatMap(
                (i) => i.itemGenres?.map((ig) => ig.genre?.name) || [],
              ),
            ),
          ]
            .filter(Boolean)
            .sort()
            .map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
        </select>

        {(selectedFormat || selectedGenre) && (
          <button
            onClick={() => {
              setSelectedFormat("");
              setSelectedGenre("");
            }}
            style={{
              padding: "8px 12px",
              backgroundColor: "transparent",
              border: "1px solid #f5a623",
              borderRadius: "4px",
              color: "#f5a623",
              fontFamily: "Share Tech Mono, monospace",
              fontSize: "0.85rem",
              letterSpacing: "1px",
              cursor: "pointer",
            }}
          >
            CLEAR FILTERS
          </button>
        )}
      </div>

      {/* Shelves */}
      <div
        style={{
          padding: "16px 0",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          width: "100%",
        }}
      >
        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 0" }}>
            <p
              style={{
                fontFamily: "Bebas Neue, sans-serif",
                fontSize: "2rem",
                color: "#444",
                letterSpacing: "4px",
              }}
            >
              YOUR VAULT IS EMPTY
            </p>
            <p
              style={{
                color: "#555",
                letterSpacing: "2px",
                fontSize: "0.85rem",
                fontFamily: "Share Tech Mono, monospace",
              }}
            >
              ADD YOUR FIRST TITLE TO GET STARTED
            </p>
          </div>
        ) : (
          shelves.map((shelf, shelfIndex) => (
            <div
              key={shelfIndex}
              style={{
                marginBottom: "8px",
                display: "inline-block",
                width: "100%",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  display: "inline-flex",
                  gap: "16px",
                  padding: "16px 16px 0",
                  alignItems: "flex-end",
                  justifyContent: "center",
                }}
              >
                {shelf.map((item) => (
                  <Link
                    to={`/items/${item.id}`}
                    key={item.id}
                    style={{
                      textDecoration: "none",
                      flex: `0 0 ${cardWidth}px`,
                      width: `${cardWidth}px`,
                    }}
                  >
                    <div
                      style={{
                        backgroundColor: "#111",
                        border: "1px solid #1a1a2e",
                        borderTop: `3px solid ${formatColors[item.format?.name] || "#00bfff"}`,
                        borderRadius: "4px 4px 0 0",
                        overflow: "hidden",
                        cursor: "pointer",
                        transition: "transform 0.2s, box-shadow 0.2s",
                        width: `${cardWidth}px`,
                        minHeight: `${cardHeight + 100}px`,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = "translateY(-10px)";
                        e.currentTarget.style.boxShadow = `0 0 20px ${formatColors[item.format?.name] || "#00bfff"}66, 0 0 40px ${formatColors[item.format?.name] || "#00bfff"}33`;
                        e.currentTarget.style.border = `1px solid ${formatColors[item.format?.name] || "#00bfff"}`;
                        e.currentTarget.style.borderTop = `3px solid ${formatColors[item.format?.name] || "#00bfff"}`;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.boxShadow = "none";
                        e.currentTarget.style.border = "1px solid #1a1a2e";
                        e.currentTarget.style.borderTop = `3px solid ${formatColors[item.format?.name] || "#00bfff"}`;
                      }}
                    >
                      {/* Cover Image */}
                      <div
                        style={{
                          width: `${cardWidth}px`,
                          height: `${cardHeight}px`,
                          position: "relative",
                          backgroundColor: "#0d0d1a",
                          overflow: "hidden",
                        }}
                      >
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.title}
                            style={{
                              position: "absolute",
                              top: 0,
                              left: 0,
                              width: "100%",
                              height: "100%",
                              objectFit: "contain",
                              backgroundColor: "#0d0d1a",
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              position: "absolute",
                              top: 0,
                              left: 0,
                              width: "100%",
                              height: "100%",
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              justifyContent: "center",
                              backgroundColor: "#0d0d1a",
                              minHeight: `${cardHeight}px`,
                            }}
                          >
                            <p
                              style={{
                                fontFamily: "Bebas Neue, sans-serif",
                                color:
                                  formatColors[item.format?.name] || "#00bfff",
                                fontSize: windowWidth < 480 ? "1rem" : "1.4rem",
                                letterSpacing: "3px",
                                textAlign: "center",
                                padding: "8px",
                                textShadow: `0 0 10px ${formatColors[item.format?.name] || "#00bfff"}88`,
                              }}
                            >
                              {item.format?.name}
                            </p>
                            <p
                              style={{
                                fontFamily: "Share Tech Mono, monospace",
                                color: "#444",
                                fontSize: "0.7rem",
                                letterSpacing: "2px",
                                textAlign: "center",
                                padding: "0 8px",
                              }}
                            >
                              {item.title.toUpperCase()}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Info strip */}
                      <div
                        style={{
                          padding: "8px 10px",
                          backgroundColor: "#060610",
                          width: `${cardWidth}px`,
                          boxSizing: "border-box",
                        }}
                      >
                        <p
                          style={{
                            fontFamily: "Oswald, sans-serif",
                            color: "#f5f5f5",
                            fontSize: windowWidth < 480 ? "0.75rem" : "0.9rem",
                            margin: "0 0 6px",
                            letterSpacing: "1px",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            fontWeight: "600",
                          }}
                        >
                          {item.title.toUpperCase()}
                        </p>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: "6px",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              gap: "4px",
                              flexWrap: "wrap",
                            }}
                          >
                            <span
                              style={{
                                backgroundColor:
                                  formatColors[item.format?.name] || "#00bfff",
                                color: "#fff",
                                padding: "2px 5px",
                                fontSize: "0.9rem",
                                fontFamily: "Bebas Neue, sans-serif",
                                letterSpacing: "1px",
                                borderRadius: "2px",
                              }}
                            >
                              {formatShortNames[item.format?.name] ||
                                item.format?.name}
                            </span>
                            <span
                              style={{
                                backgroundColor: "#1a1a2e",
                                color: "#aaa",
                                padding: "2px 5px",
                                fontSize: "0.8rem",
                                fontFamily: "Share Tech Mono, monospace",
                                letterSpacing: "1px",
                                borderRadius: "2px",
                                border: "1px solid #333",
                              }}
                            >
                              {item.condition?.name}
                            </span>
                          </div>
                          <span
                            style={{
                              color: "#f5a623",
                              fontSize: "0.75rem",
                              fontFamily: "Share Tech Mono, monospace",
                              textShadow: "0 0 8px rgba(245, 166, 35, 0.4)",
                            }}
                          >
                            ${item.purchasePrice?.toFixed(2)}
                          </span>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: "4px",
                            overflow: "hidden",
                          }}
                        >
                          {item.itemGenres?.slice(0, 2).map((ig, index) => (
                            <span
                              key={index}
                              style={{
                                color: "#888",
                                fontSize: "0.8rem",
                                fontFamily: "Share Tech Mono, monospace",
                                letterSpacing: "1px",
                                border: "1px solid #2a2a3e",
                                padding: "1px 4px",
                                borderRadius: "2px",
                              }}
                            >
                              {ig.genre?.name.toUpperCase()}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              {/* Shelf plank */}
              <div
                style={{
                  height: "20px",
                  background:
                    "linear-gradient(180deg, #5c3d1e 0%, #3d2810 40%, #2a1c0a 100%)",
                  borderTop: "2px solid #8B6914",
                  borderRadius: "0 0 4px 4px",
                  boxShadow: "0 6px 12px rgba(0,0,0,0.6)",
                  marginBottom: "24px",
                  width: `${shelf.length * cardWidth + (shelf.length - 1) * 16 + 32}px`,
                  margin: "0 auto 24px auto",
                }}
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default CollectionPage;
