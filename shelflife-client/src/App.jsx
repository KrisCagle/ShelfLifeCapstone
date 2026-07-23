import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom'
import Navbar from './components/NavBar'
import CollectionPage from './pages/Collection/CollectionPage'
import AddItemPage from './pages/Item/AddItemPage'
import EditItemPage from './pages/Item/EditItemPage'
import ItemDetailPage from './pages/Item/ItemDetailPage'
import WishlistPage from './pages/Wishlist/WishlistPage'
import AddWishlistPage from './pages/Wishlist/AddWishListPage'
import EditWishlistPage from './pages/Wishlist/EditWishListPage'
import LoginPage from './pages/Auth/LoginPage'
import RegisterPage from './pages/Auth/RegisterPage'

const AppContent = () => {
  const location = useLocation()
  const hideNavbar = location.pathname === '/' || location.pathname === '/login' || location.pathname === '/register'

  return (
    <>
      {!hideNavbar && <Navbar />}
      <Routes>
        <Route path="/" element={<CollectionPage />} />
        <Route path="/items/new" element={<AddItemPage />} />
        <Route path="/items/:id" element={<ItemDetailPage />} />
        <Route path="/items/:id/edit" element={<EditItemPage />} />
        <Route path="/wishlist" element={<WishlistPage />} />
        <Route path="/wishlist/new" element={<AddWishlistPage />} />
        <Route path="/wishlist/:id/edit" element={<EditWishlistPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Routes>
    </>
  )
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  )
}

export default App