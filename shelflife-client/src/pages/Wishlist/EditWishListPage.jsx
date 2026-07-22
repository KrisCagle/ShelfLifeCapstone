import { useState, useEffect } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'

const priorityLabels = { 1: "Low", 2: "Medium", 3: "High" }

const EditWishlistPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [formats, setFormats] = useState([])
  const [formData, setFormData] = useState(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/formats').then(r => r.json()),
      fetch(`/api/wishlist/${id}`).then(r => r.json())
    ]).then(([formatsData, itemData]) => {
      setFormats(formatsData)
      setFormData({
        title: itemData.title,
        formatId: itemData.formatId,
        priority: itemData.priority,
        notes: itemData.notes || ''
      })
    })
  }, [id])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    await fetch(`/api/wishlist/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: formData.title,
        formatId: parseInt(formData.formatId),
        priority: parseInt(formData.priority),
        notes: formData.notes
      })
    })
    navigate('/wishlist')
  }

  if (!formData) return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <p className="text-gray-400">Loading...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-white p-6">
      <div className="max-w-2xl mx-auto">
        <Link to="/wishlist" className="text-blue-600 hover:underline text-sm mb-4 inline-block">
          ← Back to Wishlist
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Edit Wishlist Item</h1>

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
              rows={3}
              className="w-full px-4 py-2 rounded border border-gray-300 focus:outline-none focus:border-gray-500"
            />
          </div>

          <div className="flex gap-3 mt-2">
            <button
              type="submit"
              className="border border-gray-300 text-gray-700 font-semibold px-6 py-2 rounded"
            >
              Save Changes
            </button>
            <Link
              to="/wishlist"
              className="border border-gray-300 text-gray-700 font-semibold px-6 py-2 rounded"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}

export default EditWishlistPage