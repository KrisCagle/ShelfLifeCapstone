import { useState, useEffect } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { getItemById, updateItem } from '../../services/itemService'

const EditItemPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [formats, setFormats] = useState([])
  const [conditions, setConditions] = useState([])
  const [genres, setGenres] = useState([])
  const [formData, setFormData] = useState(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/formats').then(r => r.json()),
      fetch('/api/conditions').then(r => r.json()),
      fetch('/api/genres').then(r => r.json()),
      getItemById(id)
    ]).then(([formatsData, conditionsData, genresData, itemData]) => {
      setFormats(formatsData)
      setConditions(conditionsData)
      setGenres(genresData)
      setFormData({
        title: itemData.title,
        formatId: itemData.formatId,
        conditionId: itemData.conditionId,
        purchasePrice: itemData.purchasePrice,
        dateAcquired: itemData.dateAcquired?.split('T')[0] || '',
        storeFound: itemData.storeFound,
        notes: itemData.notes,
        imageUrl: itemData.imageUrl,
        priority: itemData.priority,
        genreIds: itemData.itemGenres?.map(ig => ig.genreId) || []
      })
    })
  }, [id])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleGenreToggle = (genreId) => {
    setFormData(prev => ({
      ...prev,
      genreIds: prev.genreIds.includes(genreId)
        ? prev.genreIds.filter(g => g !== genreId)
        : [...prev.genreIds, genreId]
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    await updateItem(id, {
      ...formData,
      formatId: parseInt(formData.formatId),
      conditionId: parseInt(formData.conditionId),
      purchasePrice: parseFloat(formData.purchasePrice),
      priority: parseInt(formData.priority)
    })
    navigate(`/items/${id}`)
  }

  if (!formData) return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <p className="text-gray-400">Loading...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-white p-6">
      <div className="max-w-2xl mx-auto">
        <Link to={`/items/${id}`} className="text-blue-600 hover:underline text-sm mb-4 inline-block">
          ← Back to Item
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Edit Item</h1>

        <form onSubmit={handleSubmit} className="border border-gray-200 rounded-lg p-6 flex flex-col gap-4">

          <div>
            <label className="block text-sm text-gray-600 mb-1">Title</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 rounded border border-gray-300 focus:outline-none focus:border-gray-500"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Format</label>
            <select
              name="formatId"
              value={formData.formatId}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 rounded border border-gray-300 focus:outline-none focus:border-gray-500"
            >
              <option value="">Select a format</option>
              {formats.map(f => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Condition</label>
            <div className="flex gap-3 flex-wrap">
              {conditions.map(c => (
                <label key={c.id} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="conditionId"
                    value={c.id}
                    checked={parseInt(formData.conditionId) === c.id}
                    onChange={handleChange}
                  />
                  {c.name}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Purchase Price</label>
            <input
              type="number"
              name="purchasePrice"
              value={formData.purchasePrice}
              onChange={handleChange}
              step="0.01"
              min="0"
              className="w-full px-4 py-2 rounded border border-gray-300 focus:outline-none focus:border-gray-500"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Date Acquired</label>
            <input
              type="date"
              name="dateAcquired"
              value={formData.dateAcquired}
              onChange={handleChange}
              className="w-full px-4 py-2 rounded border border-gray-300 focus:outline-none focus:border-gray-500"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Store Found</label>
            <input
              type="text"
              name="storeFound"
              value={formData.storeFound}
              onChange={handleChange}
              className="w-full px-4 py-2 rounded border border-gray-300 focus:outline-none focus:border-gray-500"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Priority</label>
            <select
              name="priority"
              value={formData.priority}
              onChange={handleChange}
              className="w-full px-4 py-2 rounded border border-gray-300 focus:outline-none focus:border-gray-500"
            >
              <option value={1}>Low</option>
              <option value={2}>Medium</option>
              <option value={3}>High</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-2">Genres</label>
            <div className="flex flex-wrap gap-2">
              {genres.map(g => (
                <button
                  type="button"
                  key={g.id}
                  onClick={() => handleGenreToggle(g.id)}
                  className={`px-3 py-1 rounded text-sm font-medium border transition-colors ${
                    formData.genreIds.includes(g.id)
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'border-gray-300 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {g.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Image URL (optional)</label>
            <input
              type="text"
              name="imageUrl"
              value={formData.imageUrl}
              onChange={handleChange}
              className="w-full px-4 py-2 rounded border border-gray-300 focus:outline-none focus:border-gray-500"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Notes (optional)</label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={3}
              className="w-full px-4 py-2 rounded border border-gray-300 focus:outline-none focus:border-gray-500"
            />
          </div>

          <div className="flex gap-3 mt-2">
            <button
              type="submit"
              className="border border-gray-300 text-gray-700 font-semibold px-6 py-2 rounded hover:bg-gray-100 transition-colors"
            >
              Save Changes
            </button>
            <Link
              to={`/items/${id}`}
              className="border border-gray-300 text-gray-700 font-semibold px-6 py-2 rounded hover:bg-gray-100 transition-colors"
            >
              Cancel
            </Link>
          </div>

        </form>
      </div>
    </div>
  )
}

export default EditItemPage