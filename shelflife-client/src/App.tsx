import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MotionConfig } from 'motion/react'
import { Toaster } from 'sonner'
import { ApiError } from '@/lib/api'
import { AuthProvider } from '@/auth/AuthProvider'
import { AppShell, RequireAuth } from '@/components/layout/AppShell'
import { lazy } from 'react'
import LandingPage from '@/pages/LandingPage'
import { LoginPage, RegisterPage } from '@/pages/AuthPages'
import NotFoundPage from '@/pages/NotFoundPage'

// Signed-in pages load on demand so the landing page ships less JavaScript.
const CollectionPage = lazy(() => import('@/pages/CollectionPage'))
const ItemDetailPage = lazy(() => import('@/pages/ItemDetailPage'))
const ItemFormPage = lazy(() => import('@/pages/ItemFormPage'))
const WishlistPage = lazy(() => import('@/pages/WishlistPages').then((m) => ({ default: m.WishlistPage })))
const WishlistFormPage = lazy(() => import('@/pages/WishlistPages').then((m) => ({ default: m.WishlistFormPage })))
const AdminNewsPage = lazy(() => import('@/pages/AdminNewsPage'))
const HaulPage = lazy(() => import('@/pages/HaulPage'))

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      // Don't retry "you're not allowed" / "not found"; do retry flaky network errors.
      retry: (count, error) => !(error instanceof ApiError && error.status < 500) && count < 2,
    },
  },
})

const router = createBrowserRouter([
  {
    element: (
      <AuthProvider>
        <AppShell />
      </AuthProvider>
    ),
    children: [
      { path: '/', element: <LandingPage /> },
      { path: '/login', element: <LoginPage /> },
      { path: '/register', element: <RegisterPage /> },
      {
        element: <RequireAuth />,
        children: [
          { path: '/collection', element: <CollectionPage /> },
          { path: '/haul', element: <HaulPage /> },
          { path: '/items/new', element: <ItemFormPage /> },
          { path: '/items/:id', element: <ItemDetailPage /> },
          { path: '/items/:id/edit', element: <ItemFormPage /> },
          { path: '/wishlist', element: <WishlistPage /> },
          { path: '/wishlist/new', element: <WishlistFormPage /> },
          { path: '/wishlist/:id/edit', element: <WishlistFormPage /> },
        ],
      },
      { element: <RequireAuth admin />, children: [{ path: '/admin/news', element: <AdminNewsPage /> }] },
      { path: '/home', element: <Navigate to="/" replace /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <MotionConfig reducedMotion="user">
        <RouterProvider router={router} />
        <Toaster
          theme="dark"
          position="bottom-right"
          toastOptions={{
            classNames: {
              toast: '!bg-ink-900/95 !border !border-white/10 !backdrop-blur-xl !text-zinc-100 !font-sans !text-base',
              actionButton: '!bg-neon-cyan !text-ink-900 !font-display !tracking-widest',
              success: '[&_[data-icon]]:!text-neon-green',
              error: '[&_[data-icon]]:!text-neon-red',
            },
          }}
        />
      </MotionConfig>
    </QueryClientProvider>
  )
}
