import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Download, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/auth/AuthProvider'
import { ApiError } from '@/lib/api'
import { Button, buttonClasses } from '@/components/ui/Button'
import { Field } from '@/components/ui/Form'
import { PageHeader, Panel } from '@/components/ui/Misc'
import { Modal } from '@/components/ui/Modal'
import { PasswordInput } from '@/pages/AuthPages'

export default function AccountPage() {
  const { user } = useAuth()
  const [deleting, setDeleting] = useState(false)
  if (!user) return null

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <PageHeader eyebrow="Your account" title="Account" description={`${user.firstName} ${user.lastName} · ${user.email}`} />

      <Panel className="mt-8 p-6">
        <h2 className="font-display text-2xl tracking-[0.08em] text-white">Download your data</h2>
        <p className="mt-1 text-zinc-400">
          A zip file with everything ShelfLife has about you: your account details, collection, wishlist and the photos
          you took.
        </p>
        {/* A plain link: the browser downloads the file itself, with the login cookie. */}
        <a href="/api/account/export" download className={buttonClasses('subtle', 'md', 'mt-4')}>
          <Download className="size-4" /> Download my data
        </a>
      </Panel>

      <Panel className="mt-6 p-6" accent="#ff3b3b">
        <h2 className="font-display text-2xl tracking-[0.08em] text-white">Delete your account</h2>
        <p className="mt-1 text-zinc-400">
          Removes your account, collection, wishlist, titles you typed in and your photos. This can’t be undone, so
          download your data first if you might want it.
        </p>
        <Button variant="danger" className="mt-4" icon={<Trash2 className="size-4" />} onClick={() => setDeleting(true)}>
          Delete my account
        </Button>
      </Panel>

      <DeleteAccountModal open={deleting} onClose={() => setDeleting(false)} />
    </div>
  )
}

function DeleteAccountModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { deleteAccount } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string>()
  const [submitting, setSubmitting] = useState(false)

  const close = () => {
    if (submitting) return
    setPassword('')
    setError(undefined)
    onClose()
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(undefined)
    try {
      await deleteAccount(password)
      toast.success('Your account has been deleted.')
      navigate('/', { replace: true })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Nothing was deleted.')
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title="Delete your account?"
      footer={
        <>
          <Button variant="ghost" onClick={close} disabled={submitting}>
            Keep my account
          </Button>
          <Button variant="danger" type="submit" form="delete-account" loading={submitting} disabled={!password}>
            Delete forever
          </Button>
        </>
      }
    >
      <form id="delete-account" onSubmit={submit}>
        <p className="mb-4 text-zinc-300">Everything in your collection and wishlist will be gone for good.</p>
        <Field label="Your password" error={error}>
          {({ id, invalid, describedBy }) => (
            <PasswordInput
              id={id}
              invalid={invalid}
              describedBy={describedBy}
              value={password}
              onChange={setPassword}
              autoComplete="current-password"
            />
          )}
        </Field>
      </form>
    </Modal>
  )
}
