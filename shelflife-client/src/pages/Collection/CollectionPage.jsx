import { useState } from 'react'
import { Link } from 'react-router-dom'

const mockItems = [
  {
    id: 1,
    title: "Jurassic Park",
    format: { name: "VHS" },
    condition: { name: "Good" },
    purchasePrice: 2.99,
    itemGenres: [{ genre: { name: "Action" } }, { genre: { name: "Sci-Fi" } }]
  },
  {
    id: 2,
    title: "Thriller",
    format: { name: "Vinyl" },
    condition: { name: "Sealed" },
    purchasePrice: 5.00,
    itemGenres: [{ genre: { name: "Pop" } }]
  },
  {
    id: 3,
    title: "Super Mario World",
    format: { name: "SNES" },
    condition: { name: "Fair" },
    purchasePrice: 8.50,
    itemGenres: [{ genre: { name: "Platformer" } }]
  }
]

const formatColors = {
  VHS: "bg-blue-600",
  CD: "bg-green-600",
  Vinyl: "bg-purple-600",
  SNES: "bg-red-600",
  NES: "bg-red-700",
  N64: "bg-yellow-600",
  PS1: "bg-gray-600",
  PS2: "bg-gray-700",
  GameBoy: "bg-teal-600",
  "GameBoy Advance": "bg-teal-700",
  GameCube: "bg-indigo-600",
}

const CollectionPage = () => {
  const [search, setSearch] = useState('')
  const [items, setItems] = useState(mockItems)

  const filtered = items.filter(item =>
    item.title.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-amber-400">My Collection</h1>
          <Link
            to="/items/new"
            className="bg-amber-400 text-gray-900 font-semibold px-4 py-2 rounded hover:bg-amber-300 transition-colors"
          >
            + Add Item
          </Link>
        </div>

        <input
          type="text"
          placeholder="Search your collection..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full mb-6 px-4 py-2 rounded bg-gray-800 text-white border border-gray-700 focus:outline-none focus:border-amber-400"
        />

        {filtered.length === 0 ? (
          <p className="text-gray-400 text-center mt-20">No items found. Add something to your collection!</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map(item => (
              <Link to={`/items/${item.id}`} key={item.id}>
                <div className="bg-gray-800 rounded-lg p-4 hover:ring-2 hover:ring-amber-400 transition-all cursor-pointer">
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-lg font-semibold truncate">{item.title}</h2>
                    <span className={`text-xs font-bold px-2 py-1 rounded text-white ${formatColors[item.format.name] || 'bg-gray-600'}`}>
                      {item.format.name}
                    </span>
                  </div>
                  <p className="text-gray-400 text-sm mb-2">Condition: {item.condition.name}</p>
                  <p className="text-amber-400 text-sm font-semibold">${item.purchasePrice.toFixed(2)}</p>
                  <div className="flex flex-wrap gap-1 mt-3">
                    {item.itemGenres.map((ig, index) => (
                      <span key={index} className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded">
                        {ig.genre.name}
                      </span>
                    ))}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default CollectionPage