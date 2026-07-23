import { useState, useEffect } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'

const priorityLabels = { 1: "Low", 2: "Medium", 3: "High" }

const EditWishlistPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [formats, setFormats] = useState([])
  const [formData, setFormData] = useState(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/formats').then(r => r.json()),
      fetch(`/api/wishlist/${id}`).then(r => r.json())
    ]).then(([formatsData, itemData]) => {
      setFormats(formatsData)
      setFormData({
        title: itemData.title,
        formatId: itemData.formatId,
        priority: itemData.priority,
        notes: itemData.notes || ''
      })
    })
  }, [id])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    await fetch(`/api/wishlist/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: formData.title,
        formatId: parseInt(formData.formatId),
        priority: parseInt(formData.priority),
        notes: formData.notes
      })
    })
    navigate('/wishlist')
  }

  const inputStyle = {
    width: '100%',
    padding: '10px 14px',
    backgroundColor: '#0d0d1a',
    border: '1px solid #333',
    borderRadius: '4px',
    color: '#f5f5f5',
    fontFamily: 'Oswald, sans-serif',
    fontSize: '0.95rem',
    letterSpacing: '1px',
    outline: 'none',
    boxSizing: 'border-box',
  }

  const labelStyle = {
    display: 'block',
    color: '#888',
    fontFamily: 'Oswald, sans-serif',
    fontSize: '0.75rem',
    letterSpacing: '2px',
    marginBottom: '6px',
  }

  if (!formData) return (
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

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#000000',
      backgroundImage: `url("https://www.transparenttextures.com/patterns/retina-wood.png")`,
      padding: '0 0 40px 0',
    }}>
      {/* Header */}
      <div style={{
        backgroundColor: '#050510',
        borderBottom: '4px solid #00bfff',
        padding: '16px 32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <Link to="/" style={{
          fontFamily: 'Bebas Neue, sans-serif',
          fontSize: '3rem',
          color: '#00bfff',
          letterSpacing: '6px',
          textDecoration: 'none',
          textShadow: '0 0 20px rgba(0, 191, 255, 0.8), 0 0 40px rgba(0, 191, 255, 0.4)',
        }}>
          SHELF LIFE
        </Link>
        <Link to="/wishlist" style={{
          color: '#00bfff',
          fontFamily: 'Oswald, sans-serif',
          fontSize: '0.85rem',
          letterSpacing: '2px',
          textDecoration: 'none',
          border: '1px solid #00bfff',
          padding: '8px 16px',
          borderRadius: '4px',
        }}>
          ← BACK TO WISHLIST
        </Link>
      </div>

      {/* Form */}
      <div style={{ maxWidth: '600px', margin: '40px auto', padding: '0 24px' }}>
        <h1 style={{
          fontFamily: 'Bebas Neue, sans-serif',
          fontSize: '2rem',
          color: '#00bfff',
          letterSpacing: '4px',
          margin: '0 0 24px 0',
          textShadow: '0 0 20px rgba(0, 191, 255, 0.5)',
        }}>
          EDIT WISHLIST ITEM
        </h1>

        <form onSubmit={handleSubmit} style={{
          backgroundColor: '#050510',
          border: '1px solid #1a1a2e',
          borderTop: '3px solid #00bfff',
          borderRadius: '4px',
          padding: '32px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
        }}>
          <div>
            <label style={labelStyle}>TITLE</label>
            <input type="text" name="title" value={formData.title} onChange={handleChange} required style={inputStyle} />
          </div>

          <div>
            <label style={labelStyle}>FORMAT</label>
            <select name="formatId" value={formData.formatId} onChange={handleChange} required style={{ ...inputStyle, cursor: 'pointer' }}>
              <option value="">SELECT A FORMAT</option>
              {formats.map(f => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={labelStyle}>PRIORITY</label>
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              {[1, 2, 3].map(p => (
                <label key={p} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  color: '#ccc',
                  fontFamily: 'Oswald, sans-serif',
                  fontSize: '0.9rem',
                  letterSpacing: '1px',
                }}>
                  <input
                    type="radio"
                    name="priority"
                    value={p}
                    checked={parseInt(formData.priority) === p}
                    onChange={handleChange}
                    style={{ accentColor: '#00bfff' }}
                  />
                  {priorityLabels[p].toUpperCase()}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label style={labelStyle}>NOTES (OPTIONAL)</label>
            <textarea name="notes" value={formData.notes} onChange={handleChange} rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
            <button type="submit" style={{
              backgroundColor: '#00bfff',
              color: '#050510',
              padding: '12px 24px',
              border: 'none',
              borderRadius: '4px',
              fontFamily: 'Bebas Neue, sans-serif',
              fontSize: '1.1rem',
              letterSpacing: '3px',
              cursor: 'pointer',
            }}>
              SAVE CHANGES
            </button>
            <Link to="/wishlist" style={{
              backgroundColor: 'transparent',
              color: '#888',
              padding: '12px 24px',
              border: '1px solid #333',
              borderRadius: '4px',
              fontFamily: 'Bebas Neue, sans-serif',
              fontSize: '1.1rem',
              letterSpacing: '3px',
              textDecoration: 'none',
              display: 'inline-block',
            }}>
              CANCEL
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}

export default EditWishlistPage