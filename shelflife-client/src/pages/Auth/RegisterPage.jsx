import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { register } from '../../services/authService'

const RegisterPage = () => {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    userName: '',
    email: '',
    password: '',
    firstName: '',
    lastName: ''
  })
  const [error, setError] = useState('')

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const response = await register(formData)
    if (response.ok) {
      navigate('/')
    } else {
      setError('Registration failed. Please try again.')
    }
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
    color: '#666',
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
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
    }}>
      <div style={{
        backgroundColor: '#050510',
        border: '1px solid #1a1a2e',
        borderTop: '4px solid #00bfff',
        borderRadius: '4px',
        padding: '40px',
        width: '100%',
        maxWidth: '420px',
        boxShadow: '0 0 40px rgba(0, 191, 255, 0.1)',
      }}>
        <h1 style={{
          fontFamily: 'Bebas Neue, sans-serif',
          fontSize: '3rem',
          color: '#00bfff',
          letterSpacing: '6px',
          margin: '0 0 4px 0',
          textShadow: '0 0 20px rgba(0, 191, 255, 0.8), 0 0 40px rgba(0, 191, 255, 0.4)',
          textAlign: 'center',
        }}>
          SHELF LIFE
        </h1>
        <p style={{
          color: '#666',
          margin: '0 0 32px 0',
          fontSize: '0.75rem',
          letterSpacing: '2px',
          textAlign: 'center',
        }}>
          CREATE YOUR ACCOUNT
        </p>

        {error && (
          <div style={{
            backgroundColor: '#1a0000',
            border: '1px solid #ff4444',
            borderRadius: '4px',
            padding: '10px 14px',
            marginBottom: '20px',
            color: '#ff4444',
            fontFamily: 'Oswald, sans-serif',
            fontSize: '0.85rem',
            letterSpacing: '1px',
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>FIRST NAME</label>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                required
                style={inputStyle}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>LAST NAME</label>
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                required
                style={inputStyle}
              />
            </div>
          </div>

          <div>
            <label style={labelStyle}>USERNAME</label>
            <input
              type="text"
              name="userName"
              value={formData.userName}
              onChange={handleChange}
              required
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>EMAIL</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>PASSWORD</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              style={inputStyle}
            />
          </div>

          <button
            type="submit"
            style={{
              backgroundColor: '#00bfff',
              color: '#050510',
              padding: '12px',
              border: 'none',
              borderRadius: '4px',
              fontFamily: 'Bebas Neue, sans-serif',
              fontSize: '1.2rem',
              letterSpacing: '3px',
              cursor: 'pointer',
              marginTop: '8px',
            }}
          >
            CREATE ACCOUNT
          </button>
        </form>

        <p style={{
          color: '#555',
          fontFamily: 'Oswald, sans-serif',
          fontSize: '0.8rem',
          letterSpacing: '1px',
          textAlign: 'center',
          marginTop: '24px',
        }}>
          ALREADY HAVE AN ACCOUNT?{' '}
          <Link to="/login" style={{
            color: '#00bfff',
            textDecoration: 'none',
            letterSpacing: '1px',
          }}>
            SIGN IN
          </Link>
        </p>
      </div>
    </div>
  )
}

export default RegisterPage