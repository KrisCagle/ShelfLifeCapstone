import { useState, type FormEvent } from 'react'
import { CalendarClock, Megaphone, Pencil, Pin, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useAllNewsPosts, useDeleteNewsPost, useSaveNewsPost } from '@/hooks/queries'
import { ApiError } from '@/lib/api'
import { asUtc, timeAgo } from '@/lib/format'
import type { NewsPost } from '@/lib/types'
import { Button } from '@/components/ui/Button'
import { Field, Input, Textarea } from '@/components/ui/Form'
import { EmptyState, PageHeader, Panel, Skeleton } from '@/components/ui/Misc'
import { Modal } from '@/components/ui/Modal'
import { PostCard } from '@/components/news/News'

// <input type="datetime-local"> wants local "YYYY-MM-DDTHH:mm"; the API stores UTC.
const toLocalInput = (iso: string) => {
  const d = new Date(asUtc(iso))
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
}

export default function AdminNewsPage() {
  const { data: posts, isLoading } = useAllNewsPosts()
  const [editing, setEditing] = useState<NewsPost | 'new' | null>(null)
  const remove = useDeleteNewsPost()

  const onDelete = (post: NewsPost) => {
    if (!window.confirm(`Delete “${post.title}”? This can’t be undone.`)) return
    remove.mutate(post.id, { onSuccess: () => toast('Post deleted') })
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <PageHeader
        eyebrow="Admin"
        title="ShelfLife news"
        description="Posts appear above the collector headlines on the home page. Pinned posts stay first."
        actions={
          <Button icon={<Plus className="size-4" />} onClick={() => setEditing('new')}>
            New post
          </Button>
        }
      />

      <div className="mt-8 space-y-4">
        {isLoading ? (
          <Skeleton className="h-32 rounded-2xl" />
        ) : !posts?.length ? (
          <Panel>
            <EmptyState icon={<Megaphone className="size-8" />} title="No posts yet" description="Announce features, events or collecting tips." action={<Button onClick={() => setEditing('new')}>Write the first post</Button>} />
          </Panel>
        ) : (
          posts.map((post) => {
            const scheduled = new Date(asUtc(post.publishedAt)) > new Date()
            return (
              <div key={post.id} className="space-y-2">
                <div className="flex items-center justify-between gap-2 font-mono text-xs text-zinc-500">
                  <span className="flex items-center gap-2">
                    {post.isPinned && <Pin className="size-3.5 text-neon-green" />}
                    {scheduled ? (
                      <span className="flex items-center gap-1 text-neon-amber">
                        <CalendarClock className="size-3.5" /> Scheduled {timeAgo(asUtc(post.publishedAt))}
                      </span>
                    ) : (
                      'Published'
                    )}
                  </span>
                  <span className="flex gap-1">
                    <Button size="sm" variant="ghost" icon={<Pencil className="size-3.5" />} onClick={() => setEditing(post)}>
                      Edit
                    </Button>
                    <Button size="sm" variant="ghost" className="hover:text-neon-red" icon={<Trash2 className="size-3.5" />} onClick={() => onDelete(post)}>
                      Delete
                    </Button>
                  </span>
                </div>
                <PostCard post={post} />
              </div>
            )
          })
        )}
      </div>

      {editing && <PostEditor post={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} />}
    </div>
  )
}

function PostEditor({ post, onClose }: { post?: NewsPost; onClose: () => void }) {
  const save = useSaveNewsPost(post?.id)
  const [title, setTitle] = useState(post?.title ?? '')
  const [body, setBody] = useState(post?.body ?? '')
  const [linkUrl, setLinkUrl] = useState(post?.linkUrl ?? '')
  const [imageUrl, setImageUrl] = useState(post?.imageUrl ?? '')
  const [isPinned, setIsPinned] = useState(post?.isPinned ?? false)
  const [publishAt, setPublishAt] = useState(post ? toLocalInput(post.publishedAt) : '')
  const [error, setError] = useState('')

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !body.trim()) return setError('A title and a body are required.')
    try {
      await save.mutateAsync({
        title,
        body,
        linkUrl,
        imageUrl,
        isPinned,
        publishedAt: publishAt ? new Date(publishAt).toISOString() : undefined,
      })
      toast.success(post ? 'Post updated' : 'Post published')
      onClose()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Couldn’t save the post.')
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={post ? 'Edit post' : 'New post'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="post-form" loading={save.isPending}>
            {post ? 'Save' : 'Publish'}
          </Button>
        </>
      }
    >
      <form id="post-form" onSubmit={onSubmit} className="space-y-4" noValidate>
        {error && <p className="rounded-lg border border-neon-red/40 bg-neon-red/10 px-3 py-2 text-sm text-neon-red">{error}</p>}
        <Field label="Title">{({ id }) => <Input id={id} value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} autoFocus />}</Field>
        <Field label="Body">{({ id }) => <Textarea id={id} value={body} maxLength={2000} onChange={(e) => setBody(e.target.value)} rows={5} />}</Field>
        <Field label="Link" optional>{({ id }) => <Input id={id} type="url" placeholder="https://…" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} />}</Field>
        <Field label="Image link" optional>{({ id }) => <Input id={id} type="url" placeholder="https://…" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />}</Field>
        <Field label="Publish at" optional hint="Leave empty to publish now. A future time schedules the post.">
          {({ id, describedBy }) => <Input id={id} type="datetime-local" aria-describedby={describedBy} value={publishAt} onChange={(e) => setPublishAt(e.target.value)} className="font-mono" />}
        </Field>
        <label className="flex cursor-pointer items-center gap-3 text-zinc-300">
          <input type="checkbox" checked={isPinned} onChange={(e) => setIsPinned(e.target.checked)} className="size-4 accent-[#00ff88]" />
          Pin to the top of the news
        </label>
      </form>
    </Modal>
  )
}
