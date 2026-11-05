import { useState, type FormEvent, type ReactNode } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'motion/react'
import { Eye, EyeOff, LogIn, UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/auth/AuthProvider'
import { ApiError } from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { Field, Input } from '@/components/ui/Form'
import { Logo } from '@/components/ui/Logo'
import { CaseCard, ShelfPlank } from '@/components/collection/CaseCard'

/** Only follow same-site relative paths after sign-in. */
const safeNext = (next: string | null) => (next && next.startsWith('/') && !next.startsWith('//') ? next : '/collection')

function AuthLayout({ title, subtitle, children, footer }: { title: string; subtitle: string; children: ReactNode; footer: ReactNode }) {
  return (
    <div className="mx-auto grid min-h-[calc(100dvh-4rem)] max-w-6xl items-center gap-10 px-4 py-10 sm:px-6 lg:grid-cols-2">
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
        className="hidden lg:block"
      >
        <Logo flicker className="mb-10 w-full max-w-sm" />
        <div className="grid max-w-sm grid-cols-3 gap-3 px-3">
          {[
            { title: 'Super Metroid', format: 'SNES' },
            { title: 'Kind of Blue', format: 'Vinyl' },
            { title: 'Alien', format: 'VHS' },
          ].map((card, i) => (
            <motion.div key={card.title} className="animate-float" style={{ animationDelay: `${i * 0.8}s` }}>
              <CaseCard item={card} compact showInfo={false} />
            </motion.div>
          ))}
        </div>
        <ShelfPlank className="max-w-sm" />
        <p className="mt-8 max-w-sm text-zinc-400">Your games, records and tapes, catalogued, valued and one search away.</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="glass mx-auto w-full max-w-md rounded-2xl p-6 sm:p-8"
      >
        <Logo className="mx-auto mb-6 h-10 lg:hidden" />
        <h1 className="font-display text-4xl tracking-[0.08em] text-white">{title}</h1>
        <p className="mb-6 mt-1 text-zinc-400">{subtitle}</p>
        {children}
        <p className="mt-6 text-center text-sm text-zinc-400">{footer}</p>
      </motion.div>
    </div>
  )
}

function PasswordInput({ id, invalid, describedBy, value, onChange, autoComplete }: {
  id: string
  invalid: boolean
  describedBy?: string
  value: string
  onChange: (v: string) => void
  autoComplete: string
}) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="relative">
      <Input
        id={id}
        type={visible ? 'text' : 'password'}
        invalid={invalid}
        aria-describedby={describedBy}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pr-11"
        required
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1.5 text-zinc-500 hover:text-zinc-200"
        aria-label={visible ? 'Hide password' : 'Show password'}
      >
        {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  )
}

export function LoginPage() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const next = safeNext(params.get('next'))

  if (user && !submitting) return <Navigate to={next} replace />

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await login(email.trim(), password)
      toast.success('Welcome back!')
      navigate(next, { replace: true })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Couldn’t reach the server. Try again in a moment.')
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout
      title="Sign in"
      subtitle="Pick up where you left off."
      footer={
        <>
          New here?{' '}
          <Link to={`/register${params.get('next') ? `?next=${encodeURIComponent(next)}` : ''}`} className="font-semibold text-neon-cyan hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {error && (
          <div role="alert" className="rounded-lg border border-neon-red/40 bg-neon-red/10 px-3 py-2 text-sm text-neon-red">
            {error}
          </div>
        )}
        <Field label="Email">
          {({ id }) => <Input id={id} type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />}
        </Field>
        <Field label="Password">
          {({ id, invalid, describedBy }) => (
            <PasswordInput id={id} invalid={invalid} describedBy={describedBy} value={password} onChange={setPassword} autoComplete="current-password" />
          )}
        </Field>
        <Button type="submit" size="lg" className="w-full" loading={submitting} icon={<LogIn className="size-5" />} disabled={!email || !password}>
          Sign in
        </Button>
      </form>
    </AuthLayout>
  )
}

interface RegisterForm {
  firstName: string
  lastName: string
  userName: string
  email: string
  password: string
}

// Identity error codes → the field they belong to.
const IDENTITY_FIELDS: Record<string, keyof RegisterForm> = {
  DuplicateEmail: 'email',
  InvalidEmail: 'email',
  DuplicateUserName: 'userName',
  InvalidUserName: 'userName',
  PasswordTooShort: 'password',
}

export function RegisterPage() {
  const { user, register } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [form, setForm] = useState<RegisterForm>({ firstName: '', lastName: '', userName: '', email: '', password: '' })
  const [errors, setErrors] = useState<Partial<Record<keyof RegisterForm | 'form', string>>>({})
  const [submitting, setSubmitting] = useState(false)
  const next = safeNext(params.get('next'))

  if (user && !submitting) return <Navigate to={next} replace />

  const set = (key: keyof RegisterForm) => (value: string) => {
    setForm((f) => ({ ...f, [key]: value }))
    setErrors((e) => ({ ...e, [key]: undefined }))
  }

  const validate = () => {
    const found: typeof errors = {}
    if (!form.firstName.trim()) found.firstName = 'Tell us your first name.'
    if (!form.userName.trim()) found.userName = 'Pick a username.'
    if (!/^\S+@\S+\.\S+$/.test(form.email)) found.email = 'Enter a valid email.'
    if (form.password.length < 6) found.password = 'Use at least 6 characters.'
    setErrors(found)
    return Object.keys(found).length === 0
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setSubmitting(true)
    try {
      await register({ ...form, email: form.email.trim(), userName: form.userName.trim() })
      toast.success(`Welcome to ShelfLife, ${form.firstName}!`)
      navigate(next === '/collection' ? '/items/new' : next, { replace: true })
    } catch (err) {
      const found: typeof errors = {}
      if (err instanceof ApiError) {
        Object.entries(err.fieldErrors).forEach(([code, messages]) => {
          found[IDENTITY_FIELDS[code] ?? 'form'] = messages[0]
        })
        if (Object.keys(found).length === 0) found.form = err.message
      } else found.form = 'Couldn’t reach the server. Try again in a moment.'
      setErrors(found)
      setSubmitting(false)
    }
  }

  const text = (key: keyof RegisterForm, label: string, props: { type?: string; autoComplete: string; optional?: boolean }) => (
    <Field label={label} error={errors[key]} optional={props.optional}>
      {({ id, invalid, describedBy }) => (
        <Input
          id={id}
          type={props.type ?? 'text'}
          autoComplete={props.autoComplete}
          invalid={invalid}
          aria-describedby={describedBy}
          value={form[key]}
          onChange={(e) => set(key)(e.target.value)}
        />
      )}
    </Field>
  )

  return (
    <AuthLayout
      title="Create account"
      subtitle="Free to start. Your shelf, in minutes."
      footer={
        <>
          Already collecting with us?{' '}
          <Link to="/login" className="font-semibold text-neon-cyan hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {errors.form && (
          <div role="alert" className="rounded-lg border border-neon-red/40 bg-neon-red/10 px-3 py-2 text-sm text-neon-red">
            {errors.form}
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          {text('firstName', 'First name', { autoComplete: 'given-name' })}
          {text('lastName', 'Last name', { autoComplete: 'family-name', optional: true })}
        </div>
        {text('userName', 'Username', { autoComplete: 'username' })}
        {text('email', 'Email', { type: 'email', autoComplete: 'email' })}
        <Field label="Password" error={errors.password} hint="At least 6 characters.">
          {({ id, invalid, describedBy }) => (
            <PasswordInput id={id} invalid={invalid} describedBy={describedBy} value={form.password} onChange={set('password')} autoComplete="new-password" />
          )}
        </Field>
        <Button type="submit" size="lg" className="w-full" loading={submitting} icon={<UserPlus className="size-5" />}>
          Create account
        </Button>
      </form>
    </AuthLayout>
  )
}
