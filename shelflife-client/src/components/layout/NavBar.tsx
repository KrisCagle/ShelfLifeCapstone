import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { Heart, Home, Library, LogOut, Megaphone, Menu, Plus, X } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/auth/AuthProvider'
import { Logo } from '@/components/ui/Logo'
import { ButtonLink, buttonClasses } from '@/components/ui/Button'
import { cn } from '@/lib/cn'
import { initials } from '@/lib/format'

const links = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/collection', label: 'Collection', icon: Library },
  { to: '/wishlist', label: 'Wishlist', icon: Heart },
]

export function NavBar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Close menus on navigation and on outside click.
  useEffect(() => {
    setMobileOpen(false)
    setMenuOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!menuOpen) return
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [menuOpen])

  // Leave the (possibly protected) page first; otherwise its auth guard
  // redirects to /login the moment the user is cleared.
  const handleLogout = async () => {
    navigate('/', { replace: true })
    await logout()
    toast('Signed out. See you on the next hunt.')
  }

  const visibleLinks = user ? links : links.slice(0, 1)

  return (
    <header
      className={cn(
        'sticky top-0 z-40 border-b transition-all duration-300',
        scrolled ? 'border-neon-cyan/25 bg-ink-900/80 shadow-[0_8px_30px_rgba(0,0,0,0.6)] backdrop-blur-xl' : 'border-transparent bg-ink-900/40 backdrop-blur-md',
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:px-6">
        <Link to="/" className="shrink-0" aria-label="ShelfLife home">
          <Logo className="h-8 sm:h-9" />
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
          {visibleLinks.map(({ to, label, end }) => (
            <NavLink key={to} to={to} end={end} className="relative px-3 py-2">
              {({ isActive }) => (
                <>
                  <span className={cn('font-display text-lg tracking-[0.12em] transition-colors', isActive ? 'text-neon-cyan text-glow-cyan' : 'text-zinc-400 hover:text-zinc-100')}>
                    {label}
                  </span>
                  {isActive && (
                    <motion.span
                      layoutId="nav-underline"
                      className="absolute inset-x-3 -bottom-[1px] h-[2px] rounded-full bg-neon-cyan shadow-glow-cyan"
                    />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {user ? (
            <>
              <ButtonLink to="/items/new" size="sm" icon={<Plus className="size-4" />} className="hidden sm:inline-flex">
                Add title
              </ButtonLink>
              <div ref={menuRef} className="relative hidden md:block">
                <button
                  onClick={() => setMenuOpen((open) => !open)}
                  className="grid size-9 place-items-center rounded-full border border-neon-cyan/40 bg-neon-cyan/10 font-display text-lg tracking-wider text-neon-cyan transition hover:shadow-glow-cyan"
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                  aria-label="Account menu"
                >
                  {initials(user.firstName, user.lastName)}
                </button>
                <AnimatePresence>
                  {menuOpen && (
                    <motion.div
                      role="menu"
                      initial={{ opacity: 0, y: -6, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -6, scale: 0.97 }}
                      transition={{ duration: 0.15 }}
                      className="glass absolute right-0 mt-2 w-60 origin-top-right rounded-xl !bg-ink-900/[0.97] p-1.5"
                    >
                      <div className="px-3 py-2">
                        <p className="font-semibold text-white">
                          {user.firstName} {user.lastName}
                        </p>
                        <p className="truncate text-sm text-zinc-500">{user.email}</p>
                      </div>
                      <div className="my-1 h-px bg-white/5" />
                      {user.isAdmin && (
                        <Link to="/admin/news" role="menuitem" className="flex items-center gap-2 rounded-lg px-3 py-2 text-zinc-300 hover:bg-white/5 hover:text-white">
                          <Megaphone className="size-4" /> Manage news
                        </Link>
                      )}
                      <button onClick={handleLogout} role="menuitem" className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-zinc-300 hover:bg-white/5 hover:text-white">
                        <LogOut className="size-4" /> Sign out
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </>
          ) : (
            <>
              <Link to="/login" className={buttonClasses('ghost', 'sm', 'hidden sm:inline-flex')}>
                Sign in
              </Link>
              <ButtonLink to="/register" size="sm">
                Get started
              </ButtonLink>
            </>
          )}
          {user && (
            <button
              onClick={() => setMobileOpen((open) => !open)}
              className="grid size-9 place-items-center rounded-lg border border-white/10 text-zinc-300 md:hidden"
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {mobileOpen && user && (
          <motion.nav
            aria-label="Mobile"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-white/5 md:hidden"
          >
            <div className="space-y-1 px-4 py-3">
              {[...links, { to: '/items/new', label: 'Add title', icon: Plus, end: false }].map(({ to, label, icon: Icon, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    cn('flex items-center gap-3 rounded-lg px-3 py-3 font-display text-xl tracking-[0.12em]', isActive ? 'bg-neon-cyan/10 text-neon-cyan' : 'text-zinc-300')
                  }
                >
                  <Icon className="size-5" /> {label}
                </NavLink>
              ))}
              {user.isAdmin && (
                <NavLink to="/admin/news" className="flex items-center gap-3 rounded-lg px-3 py-3 font-display text-xl tracking-[0.12em] text-zinc-300">
                  <Megaphone className="size-5" /> Manage news
                </NavLink>
              )}
              <button onClick={handleLogout} className="flex w-full items-center gap-3 rounded-lg px-3 py-3 font-display text-xl tracking-[0.12em] text-zinc-500">
                <LogOut className="size-5" /> Sign out
              </button>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  )
}
