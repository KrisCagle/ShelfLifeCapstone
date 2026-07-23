const BASE_URL = import.meta.env.VITE_API_URL || '/api'

export const login = async (email, password) => {
  const response = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${btoa(`${email}:${password}`)}`,
    },
  })
  return response
}

export const register = async (userData) => {
  const passwordEncoded = btoa(userData.password)
  const response = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userName: userData.userName,
      email: userData.email,
      password: passwordEncoded,
      firstName: userData.firstName,
      lastName: userData.lastName,
    })
  })
  return response
}

export const logout = async () => {
  await fetch(`${BASE_URL}/auth/logout`)
  localStorage.removeItem('token')
}

export const getMe = () =>
  fetch(`${BASE_URL}/auth/me`).then(r => r.json())

export const isLoggedIn = async () => {
  const response = await fetch(`${BASE_URL}/auth/me`)
  return response.ok
}