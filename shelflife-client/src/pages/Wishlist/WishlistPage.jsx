import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getWishlist, deleteWishlistItem } from '../../services/itemService'

const priorityLabels = { 1: "Low", 2: "Medium", 3: "High" }

const WishlistPage = () => {
  const [items, setItems] = useState([])

  useEffect(() => {
    getWishlist().then(data => setItems(Array.isArray(data) ? data : []))
  }, [])

  const handleDelete = async (id) => {
    await deleteWishlistItem(id)
    setItems(prev => prev.filter(i => i.id !== id))
  }

  return (
    <div className="min-h-screen bg-white p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900">My Wishlist</h1>
          <Link
            to="/wishlist/new"
            className="border border-gray-300 text-gray-700 font-semibold px-4 py-2 rounded"
          >
            + Add to Wishlist
          </Link>
        </div>

        {items.length === 0 ? (
          <p className="text-gray-400 text-center mt-20">Your wishlist is empty — add something you're hunting for!</p>
        ) : (
          <div className="flex flex-col gap-4">
            {items.map(item => (
              <div key={item.id} className="border border-gray-200 rounded-lg p-4 flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h2 className="text-lg font-semibold text-gray-900">{item.title}</h2>
                    <span className="text-xs border border-gray-300 text-gray-600 px-2 py-1 rounded">{item.format?.name}</span>
                    <span className="text-xs border border-gray-300 text-gray-600 px-2 py-1 rounded">{priorityLabels[item.priority]}</span>
                  </div>
                  {item.notes && <p className="text-gray-500 text-sm">{item.notes}</p>}
                </div>
                <div className="flex gap-3 ml-4">
                  <Link
                    to={`/items/new?title=${encodeURIComponent(item.title)}&formatId=${item.formatId}`}
                    className="text-green-600 text-sm font-semibold"
                  >
                    Mark as Found
                  </Link>
                  <Link to={`/wishlist/${item.id}/edit`} className="text-gray-700 text-sm font-semibold">Edit</Link>
                  <button onClick={() => handleDelete(item.id)} className="text-red-500 text-sm font-semibold">Remove</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default WishlistPage