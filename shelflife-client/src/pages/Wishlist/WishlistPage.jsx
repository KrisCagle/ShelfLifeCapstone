import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getWishlist, deleteWishlistItem } from '../../services/itemService'

const priorityLabels = { 1: "Low", 2: "Medium", 3: "High" }
const priorityColors = { 1: "#01dfba", 2: "#f5a623", 3: "#ff4444" }

const useWindowWidth = () => {
  const [width, setWidth] = useState(window.innerWidth)
  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])
  return width
}

const WishlistPage = () => {
  const [items, setItems] = useState([])
  const windowWidth = useWindowWidth()
  const isMobile = windowWidth < 600

  useEffect(() => {
    getWishlist().then(data => setItems(Array.isArray(data) ? data : []))
  }, [])

  const handleDelete = async (id) => {
    await deleteWishlistItem(id)
    setItems(prev => prev.filter(i => i.id !== id))
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#000000',
      backgroundImage: `url("https://www.transparenttextures.com/patterns/retina-wood.png")`,
      padding: '24px 0 40px 0',
    }}>
     

      {/* Content */}
      <div style={{ maxWidth: '800px', margin: '40px auto', padding: '0 24px' }}>
        <h1 style={{
          fontFamily: 'Rajdhani, sans-serif',
          fontSize: '2rem',
          color: '#00bfff',
          letterSpacing: '4px',
          margin: '0 0 10px 12px',
          textShadow: '0 0 11px rgba(0, 191, 255, 0.5)',
        }}>
          MY WISHLIST
        </h1>

        {items.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <p style={{
              fontFamily: 'Rajdhani, sans-serif',
              fontSize: '2rem',
              color: '#333',
              letterSpacing: '4px',
            }}>
              YOUR WISHLIST IS EMPTY
            </p>
            <p style={{
              color: '#444',
              fontFamily: 'Rajdhani, sans-serif',
              fontSize: '0.85rem',
              letterSpacing: '2px',
              marginTop: '8px',
            }}>
              ADD TITLES YOU'RE HUNTING FOR
            </p>
          </div>
        ) : (
          <div style={{
            background: "radial-gradient(ellipse at center, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.3) 60%, rgba(0,0,0,0) 100%)",
            backdropFilter: "blur(1px)",
            borderRadius: "8px",
            padding: "16px",
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {items.map(item => (
                <div key={item.id} style={{
                  backgroundColor: '#050510',
                  border: '1px solid #1a1a2e',
                  borderLeft: `4px solid ${priorityColors[item.priority]}`,
                  borderRadius: '4px',
                  padding: '16px 20px',
                  display: 'flex',
                  flexDirection: isMobile ? 'column' : 'row',
                  alignItems: isMobile ? 'stretch' : 'center',
                  justifyContent: 'space-between',
                }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px', flexWrap: 'wrap' }}>
                    <h2 style={{
                      fontFamily: 'Rajdhani, sans-serif',
                      fontSize: '1.3rem',
                      color: '#f5f5f5',
                      letterSpacing: '2px',
                      margin: 0,
                    }}>
                      {item.title.toUpperCase()}
                    </h2>
                    <span style={{
                      backgroundColor: '#0d0d1a',
                      color: '#00bfff',
                      padding: '2px 8px',
                      fontSize: '0.79rem',
                      fontFamily: 'Rajdhani, sans-serif',
                      letterSpacing: '1px',
                      borderRadius: '2px',
                      border: '1px solid #00bfff',
                    }}>
                      {item.format?.name}
                    </span>
                    <span style={{
                      color: priorityColors[item.priority],
                      fontSize: '0.79rem',
                      fontFamily: 'Rajdhani, sans-serif',
                      letterSpacing: '1px',
                    }}>
                      {priorityLabels[item.priority].toUpperCase()} PRIORITY
                    </span>
                  </div>
                  {item.notes && (
                    <p style={{
                      color: '#9a9898',
                      fontFamily: 'Rajdhani, sans-serif',
                      fontSize: '1rem',
                      letterSpacing: '1px',
                      margin: 0,
                    }}>
                      {item.notes}
                    </p>
                  )}
                </div>
                <div style={{
                  display: 'flex',
                  gap: '12px',
                  marginLeft: isMobile ? 0 : '16px',
                  marginTop: isMobile ? '12px' : 0,
                  flexShrink: 0,
                  flexWrap: 'wrap',
                }}>
                  <Link
                    to={`/items/new?title=${encodeURIComponent(item.title)}&formatId=${item.formatId}`}
                    style={{
                      color: '#00ff88',
                      fontFamily: 'Rajdhani, sans-serif',
                      fontSize: '0.85rem',
                      letterSpacing: '1px',
                      textDecoration: 'none',
                    }}
                  >
                    FOUND IT
                  </Link>
                  <Link
                    to={`/wishlist/${item.id}/edit`} className="btn-blue"
                    style={{
                      color: '#00bfff',
                      fontFamily: 'Rajdhani, sans-serif',
                      fontSize: '0.85rem',
                      letterSpacing: '1px',
                      textDecoration: 'none',
                    }}
                  >
                    EDIT
                  </Link>
                  <button
                    onClick={() => handleDelete(item.id)} className="btn-outline-blue"
                    style={{
                      backgroundColor: 'transparent',
                      border: 'none',
                      color: '#ff4444',
                      fontFamily: 'Rajdhani, sans-serif',
                      fontSize: '0.85rem',
                      letterSpacing: '1px',
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  >
                    REMOVE
                  </button>
                </div>
              </div>
            ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default WishlistPage