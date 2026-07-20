import { useState, useEffect } from 'react'
import { getWishlist, createWishlistItem, deleteWishlistItem } from '../../services/itemService'

const priorityLabels = { 1: "Low", 2: "Medium", 3: "High" }

const WishlistPage = () => {
  const [items, setItems] = useState([])
  const [formats, setFormats] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    formatId: '',
    priority: 1,
    notes: ''
  })

  useEffect(() => {
    getWishlist().then(data => setItems(Array.isArray(data) ? data : []))
    fetch('/api/formats').then(r => r.json()).then(setFormats)
  }, [])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
  e.preventDefault()
  await createWishlistItem({
    title: formData.title,
    formatId: parseInt(formData.formatId),
    priority: parseInt(formData.priority),
    notes: formData.notes
  })
  const updated = await getWishlist()
  setItems(Array.isArray(updated) ? updated : [])
  setFormData({ title: '', formatId: '', priority: 1, notes: '' })
  setShowForm(false)
}

  const handleDelete = async (id) => {
    await deleteWishlistItem(id)
    setItems(prev => prev.filter(i => i.id !== id))
  }

  return (
    <div className="min-h-screen bg-white p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900">My Wishlist</h1>
          <button
            onClick={() => setShowForm(!showForm)}
            className="border border-gray-300 text-gray-700 font-semibold px-4 py-2 rounded"
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
                {formats.map(f => (
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
              className="border border-gray-300 text-gray-700 font-semibold px-6 py-2 rounded w-fit"
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
                      {item.format?.name}
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
                  className="ml-4 text-red-500 text-sm font-semibold"
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