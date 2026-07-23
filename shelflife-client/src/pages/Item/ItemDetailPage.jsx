import { useState, useEffect } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { getItemById, deleteItem } from '../../services/itemService'

const ItemDetailPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [item, setItem] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showConfirm, setShowConfirm] = useState(false)

  useEffect(() => {
    getItemById(id)
      .then(data => {
        setItem(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [id])

  const handleDelete = async () => {
    await deleteItem(id)
    navigate('/')
  }

  if (loading) return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#000000',
      backgroundImage: `url("https://www.transparenttextures.com/patterns/retina-wood.png")`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <p style={{
        color: '#00bfff',
        fontFamily: 'Bebas Neue, sans-serif',
        fontSize: '2rem',
        letterSpacing: '4px',
        textShadow: '0 0 20px rgba(0, 191, 255, 0.8)',
      }}>
        LOADING...
      </p>
    </div>
  )

  if (!item) return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#000000',
      backgroundImage: `url("https://www.transparenttextures.com/patterns/retina-wood.png")`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <p style={{
        color: '#ff4444',
        fontFamily: 'Bebas Neue, sans-serif',
        fontSize: '2rem',
        letterSpacing: '4px',
      }}>
        ITEM NOT FOUND
      </p>
    </div>
  )

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#000000',
      backgroundImage: `url("https://www.transparenttextures.com/patterns/retina-wood.png")`,
      padding: '24px 0 40px 0',
    }}>

      {/* Content */}
      <div style={{
        maxWidth: '900px',
        margin: '40px auto',
        padding: '0 24px',
        display: 'flex',
        gap: '40px',
        flexWrap: 'wrap',
      }}>
        {/* Cover Image */}
        <div style={{
          width: '280px',
          minWidth: '200px',
          flexShrink: 0,
        }}>
          <div style={{
            width: '100%',
            aspectRatio: '2/3',
            backgroundColor: '#0d0d1a',
            border: '1px solid #1a1a2e',
            borderTop: '3px solid #00bfff',
            borderRadius: '4px',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            {item.imageUrl ? (
              <img
                src={item.imageUrl}
                alt={item.title}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                }}
              />
            ) : (
              <p style={{
                fontFamily: 'Bebas Neue, sans-serif',
                color: '#00bfff',
                fontSize: '1.4rem',
                letterSpacing: '3px',
                textAlign: 'center',
                padding: '8px',
                textShadow: '0 0 10px rgba(0, 191, 255, 0.5)',
              }}>
                NO COVER
              </p>
            )}
          </div>
        </div>

        {/* Details */}
        <div style={{ flex: 1, minWidth: '250px' }}>
          <h1 style={{
            fontFamily: 'Bebas Neue, sans-serif',
            fontSize: '2.5rem',
            color: '#f5f5f5',
            letterSpacing: '3px',
            margin: '0 0 8px 0',
          }}>
            {item.title.toUpperCase()}
          </h1>

          <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
            <span style={{
              backgroundColor: '#00bfff',
              color: '#050510',
              padding: '4px 10px',
              fontSize: '0.75rem',
              fontFamily: 'Bebas Neue, sans-serif',
              letterSpacing: '2px',
              borderRadius: '2px',
            }}>
              {item.format?.name}
            </span>
            <span style={{
              backgroundColor: '#1a1a2e',
              color: '#888',
              padding: '4px 10px',
              fontSize: '0.75rem',
              fontFamily: 'Bebas Neue, sans-serif',
              letterSpacing: '2px',
              borderRadius: '2px',
              border: '1px solid #333',
            }}>
              {item.condition?.name}
            </span>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '16px',
            marginBottom: '24px',
          }}>
            <div>
              <p style={{
                color: '#888',
                fontFamily: 'Oswald, sans-serif',
                fontSize: '0.7rem',
                letterSpacing: '2px',
                margin: '0 0 4px 0',
              }}>
                PURCHASE PRICE
              </p>
              <p style={{
                color: '#00bfff',
                fontFamily: 'Bebas Neue, sans-serif',
                fontSize: '1.5rem',
                letterSpacing: '2px',
                margin: 0,
              }}>
                ${item.purchasePrice?.toFixed(2)}
              </p>
            </div>
            <div>
              <p style={{
                color: '#888',
                fontFamily: 'Oswald, sans-serif',
                fontSize: '0.7rem',
                letterSpacing: '2px',
                margin: '0 0 4px 0',
              }}>
                DATE ACQUIRED
              </p>
              <p style={{
                color: '#f5f5f5',
                fontFamily: 'Oswald, sans-serif',
                fontSize: '1rem',
                letterSpacing: '1px',
                margin: 0,
              }}>
                {new Date(item.dateAcquired).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p style={{
                color: '#888',
                fontFamily: 'Oswald, sans-serif',
                fontSize: '0.7rem',
                letterSpacing: '2px',
                margin: '0 0 4px 0',
              }}>
                STORE FOUND
              </p>
              <p style={{
                color: '#f5f5f5',
                fontFamily: 'Oswald, sans-serif',
                fontSize: '1rem',
                letterSpacing: '1px',
                margin: 0,
              }}>
                {item.storeFound || '—'}
              </p>
            </div>
          </div>

          {item.notes && (
            <div style={{ marginBottom: '24px' }}>
              <p style={{
                color: '#888',
                fontFamily: 'Oswald, sans-serif',
                fontSize: '0.7rem',
                letterSpacing: '2px',
                margin: '0 0 4px 0',
              }}>
                NOTES
              </p>
              <p style={{
                color: '#f5f5f5',
                fontFamily: 'Oswald, sans-serif',
                fontSize: '0.9rem',
                letterSpacing: '1px',
                margin: 0,
                lineHeight: '1.6',
              }}>
                {item.notes}
              </p>
            </div>
          )}

          {item.itemGenres?.length > 0 && (
            <div style={{ marginBottom: '32px' }}>
              <p style={{
                color: '#888',
                fontFamily: 'Oswald, sans-serif',
                fontSize: '0.7rem',
                letterSpacing: '2px',
                margin: '0 0 8px 0',
              }}>
                GENRES
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {item.itemGenres.map((ig, index) => (
                  <span key={index} style={{
                    color: '#aaa',
                    fontSize: '0.7rem',
                    fontFamily: 'Oswald, sans-serif',
                    letterSpacing: '1px',
                    border: '1px solid #1a1a2e',
                    padding: '3px 8px',
                    borderRadius: '2px',
                  }}>
                    {ig.genre?.name.toUpperCase()}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px' }}>
            <Link
              to={`/items/${item.id}/edit`}
              style={{
                backgroundColor: '#00bfff',
                color: '#050510',
                padding: '10px 24px',
                fontFamily: 'Bebas Neue, sans-serif',
                fontSize: '1rem',
                letterSpacing: '3px',
                textDecoration: 'none',
                borderRadius: '4px',
              }}
            >
              EDIT
            </Link>
            <button
              onClick={() => setShowConfirm(true)}
              style={{
                backgroundColor: 'transparent',
                color: '#ff4444',
                border: '1px solid #ff4444',
                padding: '10px 24px',
                fontFamily: 'Bebas Neue, sans-serif',
                fontSize: '1rem',
                letterSpacing: '3px',
                cursor: 'pointer',
                borderRadius: '4px',
              }}
            >
              DELETE
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showConfirm && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 50,
        }}>
          <div style={{
            backgroundColor: '#050510',
            border: '1px solid #1a1a2e',
            borderTop: '4px solid #ff4444',
            borderRadius: '4px',
            padding: '32px',
            maxWidth: '400px',
            width: '90%',
          }}>
            <h2 style={{
              fontFamily: 'Bebas Neue, sans-serif',
              fontSize: '1.8rem',
              color: '#ff4444',
              letterSpacing: '3px',
              margin: '0 0 12px 0',
            }}>
              DELETE ITEM
            </h2>
            <p style={{
              color: '#888',
              fontFamily: 'Oswald, sans-serif',
              fontSize: '0.9rem',
              letterSpacing: '1px',
              margin: '0 0 24px 0',
              lineHeight: '1.6',
            }}>
              Are you sure you want to remove <span style={{ color: '#f5f5f5' }}>{item.title}</span> from your collection?
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={handleDelete}
                style={{
                  backgroundColor: '#ff4444',
                  color: '#fff',
                  border: 'none',
                  padding: '10px 24px',
                  fontFamily: 'Bebas Neue, sans-serif',
                  fontSize: '1rem',
                  letterSpacing: '3px',
                  cursor: 'pointer',
                  borderRadius: '4px',
                  flex: 1,
                }}
              >
                CONFIRM DELETE
              </button>
              <button
                onClick={() => setShowConfirm(false)}
                style={{
                  backgroundColor: 'transparent',
                  color: '#888',
                  border: '1px solid #333',
                  padding: '10px 24px',
                  fontFamily: 'Bebas Neue, sans-serif',
                  fontSize: '1rem',
                  letterSpacing: '3px',
                  cursor: 'pointer',
                  borderRadius: '4px',
                  flex: 1,
                }}
              >
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ItemDetailPage