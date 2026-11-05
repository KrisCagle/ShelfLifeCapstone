import { getJson } from './api'

export const getFormats = () => getJson('/formats')

export const getConditions = () => getJson('/conditions')

export const getGenres = () => getJson('/genres')
