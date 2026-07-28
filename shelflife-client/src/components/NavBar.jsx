import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { logout } from '../services/authService'

const useWindowWidth = () => {
  const [width, setWidth] = useState(window.innerWidth)
  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])
  return width
}

const Navbar = () => {
  const navigate = useNavigate()
  const windowWidth = useWindowWidth()
  const [menuOpen, setMenuOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div style={{
      backgroundColor: "#050510",
      borderBottom: "4px solid #00bfff",
      padding: "8px 32px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      position: "relative",
    }}>
      <Link to="/" style={{ textDecoration: "none" }}>
        <img
          src="/logo.png"
          alt="Shelf Life"
          style={{
            height: windowWidth < 768 ? "50px" : "80px",
            objectFit: "contain",
            display: "block",
            marginLeft: "-20px",
          }}
        />
      </Link>

      {windowWidth < 768 ? (
        <>
          {/* Hamburger button */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            style={{
              backgroundColor: "transparent",
              border: "1px solid #00bfff",
              borderRadius: "4px",
              padding: "6px 10px",
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              gap: "5px",
            }}
          >
            <span style={{ display: "block", width: "22px", height: "2px", backgroundColor: "#00bfff" }} />
            <span style={{ display: "block", width: "22px", height: "2px", backgroundColor: "#00bfff" }} />
            <span style={{ display: "block", width: "22px", height: "2px", backgroundColor: "#00bfff" }} />
          </button>

          {/* Mobile dropdown menu */}
          {menuOpen && (
            <div style={{
              position: "absolute",
              top: "100%",
              right: 0,
              backgroundColor: "#050510",
              border: "1px solid #1a1a2e",
              borderTop: "2px solid #00bfff",
              borderRadius: "0 0 4px 4px",
              zIndex: 100,
              minWidth: "200px",
              display: "flex",
              flexDirection: "column",
            }}>
              <Link
                to="/items/new"
                onClick={() => setMenuOpen(false)}
                style={{
                  color: "#00bfff",
                  padding: "14px 20px",
                  fontFamily: "Bebas Neue, sans-serif",
                  fontSize: "1.1rem",
                  letterSpacing: "2px",
                  textDecoration: "none",
                  borderBottom: "1px solid #1a1a2e",
                }}
              >
                + ADD TITLE
              </Link>
              <Link
                to="/wishlist"
                onClick={() => setMenuOpen(false)}
                style={{
                  color: "#00bfff",
                  padding: "14px 20px",
                  fontFamily: "Bebas Neue, sans-serif",
                  fontSize: "1.1rem",
                  letterSpacing: "2px",
                  textDecoration: "none",
                  borderBottom: "1px solid #1a1a2e",
                }}
              >
                WISHLIST
              </Link>
              <button
                onClick={() => { handleLogout(); setMenuOpen(false) }}
                style={{
                  backgroundColor: "transparent",
                  color: "#888",
                  border: "none",
                  padding: "14px 20px",
                  fontFamily: "Bebas Neue, sans-serif",
                  fontSize: "1.1rem",
                  letterSpacing: "2px",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                LOGOUT
              </button>
            </div>
          )}
        </>
      ) : (
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <Link to="/items/new" className="btn-blue" style={{
            backgroundColor: "#00bfff",
            color: "#050510",
            padding: "8px 16px",
            fontFamily: "Bebas Neue, sans-serif",
            fontSize: "1.1rem",
            letterSpacing: "2px",
            textDecoration: "none",
            borderRadius: "4px",
            whiteSpace: "nowrap",
          }}>
            + ADD TITLE
          </Link>
          <Link to="/wishlist" className="btn-outline-blue" style={{
            color: "#00bfff",
            padding: "8px 16px",
            fontFamily: "Bebas Neue, sans-serif",
            fontSize: "1.1rem",
            letterSpacing: "2px",
            textDecoration: "none",
            border: "1px solid #00bfff",
            borderRadius: "4px",
            whiteSpace: "nowrap",
          }}>
            WISHLIST
          </Link>
          <button onClick={handleLogout} className="btn-gray" style={{
            backgroundColor: "transparent",
            color: "#888",
            border: "1px solid #888",
            padding: "8px 16px",
            fontFamily: "Bebas Neue, sans-serif",
            fontSize: "1.1rem",
            letterSpacing: "2px",
            cursor: "pointer",
            borderRadius: "4px",
            whiteSpace: "nowrap",
          }}>
            LOGOUT
          </button>
        </div>
      )}
    </div>
  )
}

export default Navbar