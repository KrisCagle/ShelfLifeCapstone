import { Link } from 'react-router-dom'

const Navbar = () => {
  return (
    <nav className="bg-gray-900 text-white px-6 py-4 flex items-center justify-between">
      <Link to="/" className="text-xl font-bold tracking-wide text-amber-400">
        Shelf Life
      </Link>
      <div className="flex gap-6">
        <Link to="/" className="hover:text-amber-400 transition-colors">
          Collection
        </Link>
        <Link to="/wishlist" className="hover:text-amber-400 transition-colors">
          Wishlist
        </Link>
        <Link to="/items/new" className="hover:text-amber-400 transition-colors">
          + Add Item
        </Link>
      </div>
    </nav>
  )
}

export default Navbar