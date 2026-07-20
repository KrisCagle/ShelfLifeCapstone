import { useState } from 'react'

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
    <div className="min-h-screen bg-white p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900">My Wishlist</h1>
          <button
            onClick={() => setShowForm(!showForm)}
            className="border border-gray-300 text-gray-700 font-semibold px-4 py-2 rounded hover:bg-gray-100 transition-colors"
          >
            {showForm ? 'Cancel' : '+ Add to Wishlist'}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="border border-gray-200 rounded-lg p-6 mb-6 flex flex-col gap-4">
            <h2 className="text-xl font-bold text-gray-900">New Wishlist Item</h2>

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
                {mockFormats.map(f => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">Priority</label>
              <div className="flex gap-4">
                {[1, 2, 3].map(p => (
                  <label key={p} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="priority"
                      value={p}
                      checked={parseInt(formData.priority) === p}
                      onChange={handleChange}
                    />
                    {priorityLabels[p]}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">Notes (optional)</label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={2}
                className="w-full px-4 py-2 rounded border border-gray-300 focus:outline-none focus:border-gray-500"
              />
            </div>

            <button
              type="submit"
              className="border border-gray-300 text-gray-700 font-semibold px-6 py-2 rounded hover:bg-gray-100 transition-colors w-fit"
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
              <div key={item.id} className="border border-gray-200 rounded-lg p-4 flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h2 className="text-lg font-semibold text-gray-900">{item.title}</h2>
                    <span className="text-xs border border-gray-300 text-gray-600 px-2 py-1 rounded">
                      {item.format.name}
                    </span>
                    <span className="text-xs border border-gray-300 text-gray-600 px-2 py-1 rounded">
                      {priorityLabels[item.priority]}
                    </span>
                  </div>
                  {item.notes && (
                    <p className="text-gray-500 text-sm">{item.notes}</p>
                  )}
                </div>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="ml-4 text-red-500 hover:text-red-700 text-sm font-semibold transition-colors"
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