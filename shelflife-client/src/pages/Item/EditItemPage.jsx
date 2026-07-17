import { useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'

const mockFormats = [
  { id: 1, name: "VHS" },
  { id: 2, name: "CD" },
  { id: 3, name: "Vinyl" },
  { id: 4, name: "NES" },
  { id: 5, name: "SNES" },
  { id: 6, name: "N64" },
  { id: 7, name: "PS1" },
  { id: 8, name: "PS2" },
  { id: 9, name: "GameBoy" },
  { id: 10, name: "GameBoy Advance" },
  { id: 11, name: "GameCube" }
]

const mockConditions = [
  { id: 1, name: "Sealed" },
  { id: 2, name: "Good" },
  { id: 3, name: "Fair" },
  { id: 4, name: "Poor" }
]

const mockGenres = [
  { id: 1, name: "Action" }, { id: 2, name: "Comedy" }, { id: 3, name: "Horror" },
  { id: 4, name: "Drama" }, { id: 5, name: "Sci-Fi" }, { id: 6, name: "RPG" },
  { id: 7, name: "Platformer" }, { id: 8, name: "Shooter" }, { id: 9, name: "Sports" },
  { id: 10, name: "Thriller" }, { id: 11, name: "Animation" }, { id: 12, name: "Documentary" },
  { id: 13, name: "Rock" }, { id: 14, name: "Hip Hop" }, { id: 15, name: "Jazz" },
  { id: 16, name: "Electronic" }, { id: 17, name: "Classical" }, { id: 18, name: "Country" },
  { id: 19, name: "R&B" }, { id: 20, name: "Pop" }
]

const mockItems = [
  {
    id: 1,
    title: "Jurassic Park",
    formatId: 1,
    conditionId: 2,
    purchasePrice: 2.99,
    dateAcquired: "1995-06-15",
    storeFound: "Goodwill",
    notes: "Great condition for the age",
    imageUrl: "",
    priority: 2,
    genreIds: [1, 5]
  },
  {
    id: 2,
    title: "Thriller",
    formatId: 3,
    conditionId: 1,
    purchasePrice: 5.00,
    dateAcquired: "2023-03-10",
    storeFound: "Salvation Army",
    notes: "Still sealed!",
    imageUrl: "",
    priority: 1,
    genreIds: [20]
  },
  {
    id: 3,
    title: "Super Mario World",
    formatId: 5,
    conditionId: 3,
    purchasePrice: 8.50,
    dateAcquired: "2024-01-20",
    storeFound: "Thrift Town",
    notes: "Label is worn but plays fine",
    imageUrl: "",
    priority: 3,
    genreIds: [7]
  }
]

const EditItemPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()

  const existing = mockItems.find(i => i.id === parseInt(id))

  const [formData, setFormData] = useState(existing || {
    title: '',
    formatId: '',
    conditionId: '',
    purchasePrice: '',
    dateAcquired: '',
    storeFound: '',
    notes: '',
    imageUrl: '',
    priority: 1,
    genreIds: []
  })

  if (!existing) return <div className="text-white p-6">Item not found.</div>

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

  const handleSubmit = (e) => {
    e.preventDefault()
    // will wire up real PUT later
    console.log('Updating:', formData)
    navigate(`/items/${id}`)
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-2xl mx-auto">
        <Link to={`/items/${id}`} className="text-amber-400 hover:underline text-sm mb-4 inline-block">
          ← Back to Item
        </Link>
        <h1 className="text-3xl font-bold text-amber-400 mb-6">Edit Item</h1>

        <form onSubmit={handleSubmit} className="bg-gray-800 rounded-lg p-6 flex flex-col gap-4">

          <div>
            <label className="block text-sm text-gray-400 mb-1">Title</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 rounded bg-gray-700 text-white border border-gray-600 focus:outline-none focus:border-amber-400"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Format</label>
            <select
              name="formatId"
              value={formData.formatId}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 rounded bg-gray-700 text-white border border-gray-600 focus:outline-none focus:border-amber-400"
            >
              <option value="">Select a format</option>
              {mockFormats.map(f => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Condition</label>
            <div className="flex gap-3 flex-wrap">
              {mockConditions.map(c => (
                <label key={c.id} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="conditionId"
                    value={c.id}
                    checked={parseInt(formData.conditionId) === c.id}
                    onChange={handleChange}
                    className="accent-amber-400"
                  />
                  {c.name}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Purchase Price</label>
            <input
              type="number"
              name="purchasePrice"
              value={formData.purchasePrice}
              onChange={handleChange}
              step="0.01"
              min="0"
              className="w-full px-4 py-2 rounded bg-gray-700 text-white border border-gray-600 focus:outline-none focus:border-amber-400"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Date Acquired</label>
            <input
              type="date"
              name="dateAcquired"
              value={formData.dateAcquired}
              onChange={handleChange}
              className="w-full px-4 py-2 rounded bg-gray-700 text-white border border-gray-600 focus:outline-none focus:border-amber-400"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Store Found</label>
            <input
              type="text"
              name="storeFound"
              value={formData.storeFound}
              onChange={handleChange}
              className="w-full px-4 py-2 rounded bg-gray-700 text-white border border-gray-600 focus:outline-none focus:border-amber-400"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Priority</label>
            <select
              name="priority"
              value={formData.priority}
              onChange={handleChange}
              className="w-full px-4 py-2 rounded bg-gray-700 text-white border border-gray-600 focus:outline-none focus:border-amber-400"
            >
              <option value={1}>Low</option>
              <option value={2}>Medium</option>
              <option value={3}>High</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Genres</label>
            <div className="flex flex-wrap gap-2">
              {mockGenres.map(g => (
                <button
                  type="button"
                  key={g.id}
                  onClick={() => handleGenreToggle(g.id)}
                  className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                    formData.genreIds.includes(g.id)
                      ? 'bg-amber-400 text-gray-900'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {g.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Image URL (optional)</label>
            <input
              type="text"
              name="imageUrl"
              value={formData.imageUrl}
              onChange={handleChange}
              className="w-full px-4 py-2 rounded bg-gray-700 text-white border border-gray-600 focus:outline-none focus:border-amber-400"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Notes (optional)</label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={3}
              className="w-full px-4 py-2 rounded bg-gray-700 text-white border border-gray-600 focus:outline-none focus:border-amber-400"
            />
          </div>

          <div className="flex gap-3 mt-2">
            <button
              type="submit"
              className="bg-amber-400 text-gray-900 font-semibold px-6 py-2 rounded hover:bg-amber-300 transition-colors"
            >
              Save Changes
            </button>
            <Link
              to={`/items/${id}`}
              className="bg-gray-700 text-white font-semibold px-6 py-2 rounded hover:bg-gray-600 transition-colors"
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