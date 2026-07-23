import { Link, useNavigate } from 'react-router-dom'
import { logout } from '../services/authService'

const Navbar = () => {
  const navigate = useNavigate()

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
    }}>
      <Link to="/" style={{ textDecoration: "none" }}>
        <img
          src="/logo.png"
          alt="Shelf Life"
          style={{
            height: "160px",
            objectFit: "contain",
            display: "block",
            marginTop: "-30px",
            marginLeft: "-30px",
            marginBottom: "-20px"
          }}
        />
      </Link>
      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
        <Link to="/items/new" style={{
          backgroundColor: "#00bfff",
          color: "#050510",
          padding: "8px 16px",
          fontFamily: "Bebas Neue, sans-serif",
          fontSize: "1.1rem",
          letterSpacing: "2px",
          textDecoration: "none",
          borderRadius: "4px",
        }}>
          + ADD TITLE
        </Link>
        <Link to="/wishlist" style={{
          color: "#00bfff",
          padding: "8px 16px",
          fontFamily: "Bebas Neue, sans-serif",
          fontSize: "1.1rem",
          letterSpacing: "2px",
          textDecoration: "none",
          border: "1px solid #00bfff",
          borderRadius: "4px",
        }}>
          WISHLIST
        </Link>
        <button onClick={handleLogout} style={{
          backgroundColor: "transparent",
          color: "#f5a623",
          border: "1px solid #f5a623",
          padding: "8px 16px",
          fontFamily: "Bebas Neue, sans-serif",
          fontSize: "1.1rem",
          letterSpacing: "2px",
          cursor: "pointer",
          borderRadius: "4px",
        }}>
          LOGOUT
        </button>
      </div>
    </div>
  )
}

export default Navbar