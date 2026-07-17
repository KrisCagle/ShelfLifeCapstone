import { useState } from 'react'
import { Link } from 'react-router-dom'

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

const mockWishlist = [
  { id: 1, title: "The Sandlot", format: { name: "VHS" }, priority: 2, notes: "Saw it at Goodwill once, missed it" },
  { id: 2, title: "Donkey Kong Country", format: { name: "SNES" }, priority: 3, notes: "Holy grail find" },
  { id: 3, title: "Kind of Blue", format: { name: "Vinyl" }, priority: 1, notes: "Miles Davis classic" }
]

const priorityLabels = { 1: "Low", 2: "Medium", 3: "High" }
const priorityColors = {
  1: "bg-gray-600",
  2: "bg-yellow-600",
  3: "bg-red-600"
}

const WishlistPage = () => {
  const [items, setItems] = useState(mockWishlist)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    formatId: '',
    priority: 1,
    notes: ''
  })

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const format = mockFormats.find(f => f.id === parseInt(formData.formatId))
    const newItem = {
      id: items.length + 1,
      title: formData.title,
      format: { name: format?.name || '' },
      priority: parseInt(formData.priority),
      notes: formData.notes
    }
    setItems(prev => [...prev, newItem])
    setFormData({ title: '', formatId: '', priority: 1, notes: '' })
    setShowForm(false)
  }

  const handleDelete = (id) => {
    setItems(prev => prev.filter(i => i.id !== id))
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-amber-400">My Wishlist</h1>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-amber-400 text-gray-900 font-semibold px-4 py-2 rounded hover:bg-amber-300 transition-colors"
          >
            {showForm ? 'Cancel' : '+ Add to Wishlist'}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="bg-gray-800 rounded-lg p-6 mb-6 flex flex-col gap-4">
            <h2 className="text-xl font-bold">New Wishlist Item</h2>

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
              <label className="block text-sm text-gray-400 mb-1">Priority</label>
              <div className="flex gap-4">
                {[1, 2, 3].map(p => (
                  <label key={p} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="priority"
                      value={p}
                      checked={parseInt(formData.priority) === p}
                      onChange={handleChange}
                      className="accent-amber-400"
                    />
                    {priorityLabels[p]}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Notes (optional)</label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={2}
                className="w-full px-4 py-2 rounded bg-gray-700 text-white border border-gray-600 focus:outline-none focus:border-amber-400"
              />
            </div>

            <button
              type="submit"
              className="bg-amber-400 text-gray-900 font-semibold px-6 py-2 rounded hover:bg-amber-300 transition-colors w-fit"
            >
              Save to Wishlist
            </button>
          </form>
        )}

        {items.length === 0 ? (
          <p className="text-gray-400 text-center mt-20">Your wishlist is empty — add something you're hunting for!</p>
        ) : (
          <div className="flex flex-col gap-4">
            {items.map(item => (
              <div key={item.id} className="bg-gray-800 rounded-lg p-4 flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h2 className="text-lg font-semibold">{item.title}</h2>
                    <span className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded">
                      {item.format.name}
                    </span>
                    <span className={`text-xs font-bold px-2 py-1 rounded text-white ${priorityColors[item.priority]}`}>
                      {priorityLabels[item.priority]}
                    </span>
                  </div>
                  {item.notes && (
                    <p className="text-gray-400 text-sm">{item.notes}</p>
                  )}
                </div>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="ml-4 text-red-400 hover:text-red-300 text-sm font-semibold transition-colors"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default WishlistPage