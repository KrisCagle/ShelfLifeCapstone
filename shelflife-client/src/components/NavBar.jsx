import { Link } from 'react-router-dom'

const Navbar = () => {
  return (
    <nav className="border-b border-gray-200 px-6 py-4 flex items-center justify-between bg-white">
      <Link to="/" className="text-xl font-bold text-gray-900">
        Shelf Life
      </Link>
      <div className="flex gap-6">
        <Link to="/" className="text-gray-600 hover:text-gray-900">
          Collection
        </Link>
        <Link to="/wishlist" className="text-gray-600 hover:text-gray-900">
          Wishlist
        </Link>
        <Link to="/items/new" className="text-gray-600 hover:text-gray-900">
          + Add Item
        </Link>
      </div>
    </nav>
  )
}

export default Navbar