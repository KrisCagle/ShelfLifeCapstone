import { Suspense, useEffect } from 'react'
import { Link, Navigate, Outlet, useLocation } from 'react-router-dom'
import { motion } from 'motion/react'
import { Loader2 } from 'lucide-react'
import { useAuth } from '@/auth/AuthProvider'
import { NavBar } from './NavBar'
import { Logo } from '@/components/ui/Logo'

export function AppShell() {
  const location = useLocation()

  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [location.pathname])

  return (
    <div className="wood-wall flex min-h-dvh flex-col">
      <a href="#main" className="sr-only z-50 rounded bg-neon-cyan px-3 py-2 text-ink-900 focus:not-sr-only focus:fixed focus:left-3 focus:top-3">
        Skip to content
      </a>
      <NavBar />
      <motion.main
        id="main"
        key={location.pathname}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="flex-1"
      >
        <Suspense fallback={<PageSpinner />}>
          <Outlet />
        </Suspense>
      </motion.main>
      <Footer />
    </div>
  )
}

function PageSpinner() {
  return (
    <div className="grid min-h-[60vh] place-items-center">
      <Loader2 className="size-8 animate-spin text-neon-cyan" aria-label="Loading" />
    </div>
  )
}

function Footer() {
  return (
    <footer className="border-t border-white/5 bg-ink-900/70 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 text-sm text-zinc-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-center gap-4">
          <Logo className="h-6 opacity-80" />
          <span>© {new Date().getFullYear()} ShelfLife</span>
        </div>
        <p className="max-w-md sm:text-right">
          Headlines link to and belong to their publishers. Price estimates come from live eBay listings.
        </p>
        <nav className="flex gap-4">
          <Link to="/" className="hover:text-zinc-300">Home</Link>
          <Link to="/collection" className="hover:text-zinc-300">Collection</Link>
          <Link to="/wishlist" className="hover:text-zinc-300">Wishlist</Link>
        </nav>
      </div>
    </footer>
  )
}

/** Gate for signed-in pages: waits for the session check, then redirects to login with a return path. */
export function RequireAuth({ admin }: { admin?: boolean }) {
  const { user, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) return <PageSpinner />
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`} replace />
  if (admin && !user.isAdmin) return <Navigate to="/" replace />
  return <Outlet />
}
