import { useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'

const mockItems = [
  {
    id: 1,
    title: "Jurassic Park",
    format: { name: "VHS" },
    condition: { name: "Good" },
    purchasePrice: 2.99,
    dateAcquired: "1995-06-15",
    storeFound: "Goodwill",
    notes: "Great condition for the age",
    imageUrl: "",
    priority: 2,
    itemGenres: [{ genre: { name: "Action" } }, { genre: { name: "Sci-Fi" } }]
  },
  {
    id: 2,
    title: "Thriller",
    format: { name: "Vinyl" },
    condition: { name: "Sealed" },
    purchasePrice: 5.00,
    dateAcquired: "2023-03-10",
    storeFound: "Salvation Army",
    notes: "Still sealed!",
    imageUrl: "",
    priority: 1,
    itemGenres: [{ genre: { name: "Pop" } }]
  },
  {
    id: 3,
    title: "Super Mario World",
    format: { name: "SNES" },
    condition: { name: "Fair" },
    purchasePrice: 8.50,
    dateAcquired: "2024-01-20",
    storeFound: "Thrift Town",
    notes: "Label is worn but plays fine",
    imageUrl: "",
    priority: 3,
    itemGenres: [{ genre: { name: "Platformer" } }]
  }
]

const priorityLabels = { 1: "Low", 2: "Medium", 3: "High" }

const ItemDetailPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [showConfirm, setShowConfirm] = useState(false)

  const item = mockItems.find(i => i.id === parseInt(id))

  if (!item) return <div className="text-white p-6">Item not found.</div>

  const handleDelete = () => {
    // will wire up real delete later
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-2xl mx-auto">
        <Link to="/" className="text-amber-400 hover:underline text-sm mb-4 inline-block">
          ← Back to Collection
        </Link>

        <div className="bg-gray-800 rounded-lg p-6 mt-2">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold">{item.title}</h1>
            <span className="bg-blue-600 text-white text-sm font-bold px-3 py-1 rounded">
              {item.format.name}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm mb-6">
            <div>
              <p className="text-gray-400">Condition</p>
              <p className="font-semibold">{item.condition.name}</p>
            </div>
            <div>
              <p className="text-gray-400">Purchase Price</p>
              <p className="font-semibold text-amber-400">${item.purchasePrice.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-gray-400">Date Acquired</p>
              <p className="font-semibold">{item.dateAcquired}</p>
            </div>
            <div>
              <p className="text-gray-400">Store Found</p>
              <p className="font-semibold">{item.storeFound}</p>
            </div>
            <div>
              <p className="text-gray-400">Priority</p>
              <p className="font-semibold">{priorityLabels[item.priority]}</p>
            </div>
          </div>

          {item.notes && (
            <div className="mb-6">
              <p className="text-gray-400 text-sm">Notes</p>
              <p className="mt-1">{item.notes}</p>
            </div>
          )}

          <div className="flex flex-wrap gap-2 mb-6">
            {item.itemGenres.map((ig, index) => (
              <span key={index} className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded">
                {ig.genre.name}
              </span>
            ))}
          </div>

          <div className="flex gap-3">
            <Link
              to={`/items/${item.id}/edit`}
              className="bg-amber-400 text-gray-900 font-semibold px-4 py-2 rounded hover:bg-amber-300 transition-colors"
            >
              Edit
            </Link>
            <button
              onClick={() => setShowConfirm(true)}
              className="bg-red-600 text-white font-semibold px-4 py-2 rounded hover:bg-red-500 transition-colors"
            >
              Delete
            </button>
          </div>
        </div>

        {showConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg p-6 max-w-sm w-full mx-4">
              <h2 className="text-xl font-bold mb-2">Delete Item</h2>
              <p className="text-gray-400 mb-6">Are you sure you want to remove <span className="text-white font-semibold">{item.title}</span> from your collection?</p>
              <div className="flex gap-3">
                <button
                  onClick={handleDelete}
                  className="bg-red-600 text-white font-semibold px-4 py-2 rounded hover:bg-red-500 transition-colors flex-1"
                >
                  Confirm Delete
                </button>
                <button
                  onClick={() => setShowConfirm(false)}
                  className="bg-gray-700 text-white font-semibold px-4 py-2 rounded hover:bg-gray-600 transition-colors flex-1"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ItemDetailPage