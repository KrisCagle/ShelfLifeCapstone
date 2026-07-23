import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { createItem } from '../../services/itemService'

const AddItemPage = () => {
  const navigate = useNavigate()
  const [formats, setFormats] = useState([])
  const [conditions, setConditions] = useState([])
  const [genres, setGenres] = useState([])
  const [formData, setFormData] = useState({
    title: '',
    formatId: '',
    conditionId: '',
    purchasePrice: 0,
    dateAcquired: '',
    storeFound: '',
    notes: '',
    imageUrl: '',
    genreIds: []
  })

  useEffect(() => {
    fetch('/api/formats').then(r => r.json()).then(setFormats)
    fetch('/api/conditions').then(r => r.json()).then(setConditions)
    fetch('/api/genres').then(r => r.json()).then(setGenres)
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const title = params.get('title')
    const formatId = params.get('formatId')
    if (title || formatId) {
      setFormData(prev => ({
        ...prev,
        title: title || '',
        formatId: formatId || ''
      }))
    }
  }, [])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleGenreToggle = (id) => {
    setFormData(prev => ({
      ...prev,
      genreIds: prev.genreIds.includes(id)
        ? prev.genreIds.filter(g => g !== id)
        : [...prev.genreIds, id]
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    await createItem({
      ...formData,
      formatId: parseInt(formData.formatId),
      conditionId: parseInt(formData.conditionId),
      purchasePrice: parseFloat(formData.purchasePrice),
      priority: 0
    })
    navigate('/')
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
        <Link to="/" style={{
          color: '#00bfff',
          fontFamily: 'Oswald, sans-serif',
          fontSize: '0.85rem',
          letterSpacing: '2px',
          textDecoration: 'none',
          border: '1px solid #00bfff',
          padding: '8px 16px',
          borderRadius: '4px',
        }}>
          ← BACK TO COLLECTION
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
          ADD NEW TITLE
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
            <label style={labelStyle}>CONDITION</label>
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              {conditions.map(c => (
                <label key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: '#ccc', fontFamily: 'Oswald, sans-serif', fontSize: '0.9rem', letterSpacing: '1px' }}>
                  <input
                    type="radio"
                    name="conditionId"
                    value={c.id}
                    checked={parseInt(formData.conditionId) === c.id}
                    onChange={handleChange}
                    style={{ accentColor: '#00bfff' }}
                  />
                  {c.name.toUpperCase()}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label style={labelStyle}>PURCHASE PRICE</label>
            <input type="number" name="purchasePrice" value={formData.purchasePrice} onChange={handleChange} step="0.01" min="0" style={inputStyle} />
          </div>

          <div>
            <label style={labelStyle}>DATE ACQUIRED</label>
            <input type="date" name="dateAcquired" value={formData.dateAcquired} onChange={handleChange} style={inputStyle} />
          </div>

          <div>
            <label style={labelStyle}>STORE FOUND</label>
            <input type="text" name="storeFound" value={formData.storeFound} onChange={handleChange} style={inputStyle} />
          </div>

          <div>
            <label style={labelStyle}>GENRES</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {genres.map(g => (
                <button
                  type="button"
                  key={g.id}
                  onClick={() => handleGenreToggle(g.id)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '2px',
                    fontSize: '0.7rem',
                    fontFamily: 'Oswald, sans-serif',
                    letterSpacing: '1px',
                    cursor: 'pointer',
                    border: formData.genreIds.includes(g.id) ? '1px solid #00bfff' : '1px solid #333',
                    backgroundColor: formData.genreIds.includes(g.id) ? '#00bfff' : 'transparent',
                    color: formData.genreIds.includes(g.id) ? '#050510' : '#666',
                    transition: 'all 0.15s',
                  }}
                >
                  {g.name.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={labelStyle}>IMAGE URL (OPTIONAL)</label>
            <input type="text" name="imageUrl" value={formData.imageUrl} onChange={handleChange} style={inputStyle} />
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
              SAVE TITLE
            </button>
            <Link to="/" style={{
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

export default AddItemPage