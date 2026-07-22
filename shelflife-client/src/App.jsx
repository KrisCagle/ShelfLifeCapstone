import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import CollectionPage from './pages/Collection/CollectionPage'
import AddItemPage from './pages/Item/AddItemPage'
import EditItemPage from './pages/Item/EditItemPage'
import ItemDetailPage from './pages/Item/ItemDetailPage'
import WishlistPage from './pages/Wishlist/WishlistPage'
import LoginPage from './pages/Auth/LoginPage'
import RegisterPage from './pages/Auth/RegisterPage'
import EditWishlistPage from './pages/Wishlist/EditWishlistPage'
import AddWishlistPage from './pages/Wishlist/AddWishlistPage'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<CollectionPage />} />
        <Route path="/items/new" element={<AddItemPage />} />
        <Route path="/items/:id" element={<ItemDetailPage />} />
        <Route path="/items/:id/edit" element={<EditItemPage />} />
        <Route path="/wishlist" element={<WishlistPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/wishlist/:id/edit" element={<EditWishlistPage />} />
        <Route path="/wishlist/new" element={<AddWishlistPage />} />
        
      </Routes>
    </Router>
  )
}

export default App