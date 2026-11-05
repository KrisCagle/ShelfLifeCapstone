import { apiFetch, getJson, sendJson } from './api'

export const login = (email, password) =>
  apiFetch('/auth/login', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${btoa(`${email}:${password}`)}`,
    },
  })

export const register = (userData) =>
  sendJson('/auth/register', 'POST', {
    userName: userData.userName,
    email: userData.email,
    password: btoa(userData.password),
    firstName: userData.firstName,
    lastName: userData.lastName,
  })

export const logout = () => apiFetch('/auth/logout', { method: 'POST' })

export const getMe = () => getJson('/auth/me')

export const isLoggedIn = async () => {
  const response = await apiFetch('/auth/me')
  return response.ok
}
