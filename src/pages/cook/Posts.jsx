import { useState } from 'react'
import { ActionSheet, Button, Card, Dialog, Empty, Grid, Popup, TextArea, Toast } from 'antd-mobile'
import { AddCircleOutline, CameraOutline, CloseOutline, DeleteOutline, MoreOutline } from 'antd-mobile-icons'
import { useNow } from '../../hooks/index.js'
import { STORY_TTL_MS, useCook } from '../../store/cook.js'
import { deleteMedia, pickMedia } from '../../lib/media.js'
import { timeAgo } from '../../lib/format.js'
import { keepTouch } from '../stories.jsx'
import { Composer, CookHeader, MediaView } from './parts.jsx'

export default function Posts() {
  const { posts, stories, editPost, deletePost, deleteStory } = useCook()
  const now = useNow(60000)
  const [composer, setComposer] = useState(null)   // { file, kind }
  const [viewStory, setViewStory] = useState(null)
  const [editing, setEditing] = useState(null)     // { id, text }

  // Camera (capture) or gallery/files, then open the composer.
  const create = (kind) => {
    const handler = ActionSheet.show({
      extra: kind === 'story' ? 'Add to your story' : 'New post',
      cancelText: 'Cancel',
      actions: [
        { key: 'camera', text: 'Take photo or video' },
        { key: 'gallery', text: 'Choose from gallery or files' },
      ],
      onAction: async (a) => {
        handler.close()
        const file = await pickMedia({ capture: a.key === 'camera' })
        if (file) setComposer({ file, kind })
      },
    })
  }

  const live = stories.filter((s) => now - s.at < STORY_TTL_MS)

  const removePost = async (p) => {
    const ok = await Dialog.confirm({ content: 'Delete this post? Neighbours won’t see it any more.', confirmText: 'Delete', cancelText: 'Cancel' })
    if (ok) { deletePost(p.id); deleteMedia(p.mediaKey); Toast.show({ content: 'Post deleted' }) }
  }
  const removeStory = async (s) => {
    const ok = await Dialog.confirm({ content: 'Delete this story?', confirmText: 'Delete', cancelText: 'Cancel' })
    if (ok) { deleteStory(s.id); deleteMedia(s.mediaKey); setViewStory(null); Toast.show({ content: 'Story deleted' }) }
  }
  const postMenu = (p) => {
    const handler = ActionSheet.show({
      cancelText: 'Cancel',
      actions: [{ key: 'edit', text: 'Edit text' }, { key: 'delete', text: 'Delete post', danger: true }],
      onAction: (a) => { handler.close(); if (a.key === 'edit') setEditing({ id: p.id, text: p.text }); else removePost(p) },
    })
  }

  const expiresIn = (s) => { const h = Math.min(24, Math.ceil((STORY_TTL_MS - (Math.max(now, s.at) - s.at)) / 3600000)); return h <= 1 ? 'expires within 1h' : `expires in ${h}h` }

  return (
    <div style={{ paddingBottom: 24 }}>
      <CookHeader title="Posts & stories" />

      <div className="pad" style={{ marginTop: 14 }}>
        <Grid columns={2} gap={10}>
          <Grid.Item>
            <button className="create-btn" onClick={() => create('post')}>
              <span className="create-icon"><CameraOutline /><AddCircleOutline className="plus" /></span>
              <b>New post</b><span>Camera or gallery</span>
            </button>
          </Grid.Item>
          <Grid.Item>
            <button className="create-btn dark" onClick={() => create('story')}>
              <span className="create-icon"><AddCircleOutline /></span>
              <b>Add story</b><span>Shows for 24 hours</span>
            </button>
          </Grid.Item>
        </Grid>
      </div>

      <div className="pad caps" style={{ marginTop: 20 }}>Your stories</div>
      {live.length === 0 ? (
        <div className="pad muted" style={{ fontSize: 13, marginTop: 6 }}>No active stories. Add one to appear at the top of neighbours’ Home.</div>
      ) : (
        <div className="cook-story-row" {...keepTouch}>
          {live.map((s) => (
            <button key={s.id} className="cook-story" onClick={() => setViewStory(s)}>
              <MediaView mediaKey={s.mediaKey} type={s.type} height={150} thumb style={{ borderRadius: 12 }} />
              <span className="cook-story-meta">{expiresIn(s)}</span>
            </button>
          ))}
        </div>
      )}

      <div className="pad caps" style={{ marginTop: 20 }}>Recent posts</div>
      <div className="pad stack" style={{ marginTop: 8 }}>
        {posts.length === 0 ? <Empty description="Nothing posted yet. Show neighbours what’s cooking." /> : posts.map((p) => (
          <Card key={p.id} bodyStyle={{ padding: 0 }} style={{ overflow: 'hidden' }}>
            <MediaView mediaKey={p.mediaKey} type={p.type} height={260} controls />
            <div style={{ padding: '10px 14px 12px' }}>
              <div className="row between">
                <span className="muted" style={{ fontSize: 12 }}>{p.type === 'video' ? 'Video' : 'Photo'} · {timeAgo(p.at, now)}</span>
                <Button size="mini" fill="none" onClick={() => postMenu(p)} aria-label="Post options"><MoreOutline fontSize={20} /></Button>
              </div>
              {p.text ? <div style={{ fontSize: 14, marginTop: 4 }}>{p.text}</div> : <div className="faint" style={{ fontSize: 13, marginTop: 4 }}>No text</div>}
            </div>
          </Card>
        ))}
      </div>

      <Composer file={composer?.file} kind={composer?.kind} onClose={() => setComposer(null)} />

      {/* Edit post text */}
      <Popup visible={!!editing} onMaskClick={() => setEditing(null)} showCloseButton onClose={() => setEditing(null)}>
        {editing && (
          <div style={{ padding: '20px 16px 28px' }} className="stack">
            <h2 className="h1">Edit text</h2>
            <TextArea value={editing.text} onChange={(v) => setEditing({ ...editing, text: v })} maxLength={400} showCount autoSize={{ minRows: 3, maxRows: 6 }}
              style={{ background: 'var(--card)', padding: 10, borderRadius: 12, border: '1px solid var(--line)' }} />
            <Button block size="large" color="primary" onClick={() => { editPost(editing.id, editing.text.trim()); setEditing(null); Toast.show({ icon: 'success', content: 'Updated' }) }}>Save</Button>
          </div>
        )}
      </Popup>

      {/* Preview / delete a story */}
      <Popup visible={!!viewStory} onMaskClick={() => setViewStory(null)} destroyOnClose bodyStyle={{ height: '100dvh', background: '#000', borderRadius: 0 }}>
        {viewStory && (
          <div style={{ position: 'relative', height: '100%' }}>
            <MediaView mediaKey={viewStory.mediaKey} type={viewStory.type} height="100%" controls={viewStory.type === 'video'} style={{ background: '#000' }} />
            <button className="story-close" onClick={() => setViewStory(null)} aria-label="Close"><CloseOutline fontSize={26} /></button>
            <div className="story-footer" style={{ position: 'absolute', bottom: 0 }}>
              {viewStory.text && <div className="story-caption">{viewStory.text}</div>}
              <div className="row" style={{ color: '#fff', fontSize: 12, marginBottom: 12, opacity: 0.8 }}>Posted {timeAgo(viewStory.at, now)} · {expiresIn(viewStory)}</div>
              <Button block color="danger" shape="rounded" onClick={() => removeStory(viewStory)}>
                <span className="row" style={{ gap: 6, justifyContent: 'center' }}><DeleteOutline /> Delete story</span>
              </Button>
            </div>
          </div>
        )}
      </Popup>
    </div>
  )
}
