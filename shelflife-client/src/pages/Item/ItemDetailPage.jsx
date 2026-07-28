import { useState, useEffect } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { getItemById, deleteItem, getEbayPrice } from '../../services/itemService'

const ItemDetailPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [item, setItem] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showConfirm, setShowConfirm] = useState(false)
  const [ebayData, setEbayData] = useState(null)
  const [ebayLoading, setEbayLoading] = useState(false)

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

  const handlePriceCheck = async () => {
    setEbayLoading(true)
    const data = await getEbayPrice(item.title, item.format?.name)
    setEbayData(data)
    setEbayLoading(false)
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
        fontFamily: 'Rajdhani, sans-serif',
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
        fontFamily: 'Rajdhani, sans-serif',
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
        padding: '32px 24px',
        display: 'flex',
        gap: '40px',
        flexWrap: 'wrap',
        background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.3) 60%, rgba(0,0,0,0) 100%)',
        backdropFilter: 'blur(2px)',
        borderRadius: '8px',
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
                fontFamily: 'Rajdhani, sans-serif',
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
            fontFamily: 'Rajdhani, sans-serif',
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
              fontFamily: 'Rajdhani, sans-serif',
              letterSpacing: '2px',
              borderRadius: '2px',
            }}>
              {item.format?.name}
            </span>
            <span style={{
              backgroundColor: '#1a1a2e',
              color: '#aaa',
              padding: '4px 10px',
              fontSize: '0.75rem',
              fontFamily: 'Rajdhani, sans-serif',
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
                fontFamily: 'Rajdhani, sans-serif',
                fontSize: '0.7rem',
                letterSpacing: '2px',
                margin: '0 0 4px 0',
              }}>
                PURCHASE PRICE
              </p>
              <p style={{
                color: '#f5a623',
                fontFamily: 'Rajdhani, sans-serif',
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
                fontFamily: 'Rajdhani, sans-serif',
                fontSize: '0.7rem',
                letterSpacing: '2px',
                margin: '0 0 4px 0',
              }}>
                DATE ACQUIRED
              </p>
              <p style={{
                color: '#ccc',
                fontFamily: 'Rajdhani, sans-serif',
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
                fontFamily: 'Rajdhani, sans-serif',
                fontSize: '0.7rem',
                letterSpacing: '2px',
                margin: '0 0 4px 0',
              }}>
                STORE FOUND
              </p>
              <p style={{
                color: '#ccc',
                fontFamily: 'Rajdhani, sans-serif',
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
                fontFamily: 'Rajdhani, sans-serif',
                fontSize: '0.7rem',
                letterSpacing: '2px',
                margin: '0 0 4px 0',
              }}>
                NOTES
              </p>
              <p style={{
                color: '#ccc',
                fontFamily: 'Rajdhani, sans-serif',
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
                fontFamily: 'Rajdhani, sans-serif',
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
                    fontFamily: 'Rajdhani, sans-serif',
                    letterSpacing: '1px',
                    border: '1px solid #444',
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
              to={`/items/${item.id}/edit`}  className="btn-blue"
              style={{
                backgroundColor: '#00bfff',
                color: '#050510',
                padding: '10px 24px',
                fontFamily: 'Rajdhani, sans-serif',
                fontSize: '1rem',
                letterSpacing: '3px',
                textDecoration: 'none',
                borderRadius: '4px',
              }}
            >
              EDIT
            </Link>
            <button
              onClick={() => setShowConfirm(true)} className="btn-outline-red"
              style={{
                backgroundColor: 'transparent',
                color: '#ff4444',
                border: '1px solid #ff4444',
                padding: '10px 24px',
                fontFamily: 'Rajdhani, sans-serif',
                fontSize: '1rem',
                letterSpacing: '3px',
                cursor: 'pointer',
                borderRadius: '4px',
              }}
            >
              DELETE
            </button>
          </div>

         {/* eBay Price Check */}
          <div style={{ marginTop: '24px', borderTop: '1px solid #1a1a2e', paddingTop: '24px' }}>
            <button
              onClick={handlePriceCheck} className="btn-amber"
              style={{
                backgroundColor: '#f5a623',
                color: '#050510',
                padding: '10px 24px',
                border: 'none',
                borderRadius: '4px',
                fontFamily: 'Rajdhani, sans-serif',
                fontSize: '1rem',
                letterSpacing: '3px',
                cursor: 'pointer',
              }}
            >
              {ebayLoading ? 'CHECKING...' : "WHAT'S IT WORTH?"}
            </button>

            {ebayData && (
              <div style={{ marginTop: '16px' }}>
                <p style={{
                  color: '#888',
                  fontFamily: 'Rajdhani, sans-serif',
                  fontSize: '0.75rem',
                  letterSpacing: '2px',
                  margin: '0 0 12px 0',
                }}>
                  EBAY MARKET DATA — {ebayData.count} ACTIVE LISTINGS
                </p>
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                  <div style={{
                    backgroundColor: '#0d0d1a',
                    border: '1px solid #1a1a2e',
                    borderRadius: '4px',
                    padding: '12px 16px',
                    flex: 1,
                    minWidth: '100px',
                  }}>
                    <p style={{ color: '#888', fontFamily: 'Rajdhani, sans-serif', fontSize: '0.65rem', letterSpacing: '2px', margin: '0 0 4px 0' }}>LOW</p>
                    <p style={{ color: '#00ff88', fontFamily: 'Rajdhani, sans-serif', fontSize: '1.5rem', margin: 0 }}>${ebayData.low}</p>
                  </div>
                  <div style={{
                    backgroundColor: '#0d0d1a',
                    border: '1px solid #1a1a2e',
                    borderRadius: '4px',
                    padding: '12px 16px',
                    flex: 1,
                    minWidth: '100px',
                  }}>
                    <p style={{ color: '#888', fontFamily: 'Rajdhani, sans-serif', fontSize: '0.65rem', letterSpacing: '2px', margin: '0 0 4px 0' }}>AVERAGE</p>
                    <p style={{ color: '#f5a623', fontFamily: 'Rajdhani, sans-serif', fontSize: '1.5rem', margin: 0 }}>${ebayData.average}</p>
                  </div>
                  <div style={{
                    backgroundColor: '#0d0d1a',
                    border: '1px solid #1a1a2e',
                    borderRadius: '4px',
                    padding: '12px 16px',
                    flex: 1,
                    minWidth: '100px',
                  }}>
                    <p style={{ color: '#888', fontFamily: 'Rajdhani, sans-serif', fontSize: '0.65rem', letterSpacing: '2px', margin: '0 0 4px 0' }}>HIGH</p>
                    <p style={{ color: '#ff4444', fontFamily: 'Rajdhani, sans-serif', fontSize: '1.5rem', margin: 0 }}>${ebayData.high}</p>
                  </div>
                </div>
                <div style={{ marginTop: '12px', padding: '10px 14px', backgroundColor: '#0d0d1a', border: '1px solid #1a1a2e', borderRadius: '4px' }}>
                  <p style={{ color: '#888', fontFamily: 'Rajdhani, sans-serif', fontSize: '0.65rem', letterSpacing: '2px', margin: '0 0 4px 0' }}>YOU PAID</p>
                  <p style={{ color: '#ccc', fontFamily: 'Rajdhani, sans-serif', fontSize: '1.2rem', margin: '0 0 8px 0' }}>${item.purchasePrice?.toFixed(2)}</p>
                  {ebayData.average > item.purchasePrice ? (
                    <p style={{ color: '#00ff88', fontFamily: 'Share Tech Mono, monospace', fontSize: '0.8rem', margin: 0 }}>
                      ↑ YOU SAVED ${(ebayData.average - item.purchasePrice).toFixed(2)} VS AVERAGE MARKET PRICE
                    </p>
                  ) : (
                    <p style={{ color: '#f5a623', fontFamily: 'Share Tech Mono, monospace', fontSize: '0.8rem', margin: 0 }}>
                      ↓ PAID ${(item.purchasePrice - ebayData.average).toFixed(2)} ABOVE AVERAGE MARKET PRICE
                    </p>
                  )}
                </div>
              </div>
            )}
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
              fontFamily: 'Rajdhani, sans-serif',
              fontSize: '1.8rem',
              color: '#ff4444',
              letterSpacing: '3px',
              margin: '0 0 12px 0',
            }}>
              DELETE ITEM
            </h2>
            <p style={{
              color: '#aaa',
              fontFamily: 'Rajdhani, sans-serif',
              fontSize: '0.9rem',
              letterSpacing: '1px',
              margin: '0 0 24px 0',
              lineHeight: '1.6',
            }}>
              Are you sure you want to remove <span style={{ color: '#f5f5f5' }}>{item.title}</span> from your collection?
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={handleDelete} className="btn-red"
                style={{
                  backgroundColor: '#ff4444',
                  color: '#fff',
                  border: 'none',
                  padding: '10px 24px',
                  fontFamily: 'Rajdhani, sans-serif',
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
                onClick={() => setShowConfirm(false)} className="btn-gray"
                style={{
                  backgroundColor: 'transparent',
                  color: '#888',
                  border: '1px solid #333',
                  padding: '10px 24px',
                  fontFamily: 'Rajdhani, sans-serif',
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