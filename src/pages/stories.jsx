// Kitchen stories: avatar row (antd Avatar) + full-screen viewer (react-insta-stories in an antd Popup).
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Stories from 'react-insta-stories'
import { Avatar, Button, Popup } from 'antd-mobile'
import { CloseOutline } from 'antd-mobile-icons'
import { useStories } from '../store/index.js'
import { timeAgo } from '../lib/format.js'
import { getMediaUrl } from '../lib/media.js'
import { PinIcon } from './shared.jsx'

const shortName = (name) => name.replace(/^(.*?)['’]s\s.*$/, '$1').split(' ').slice(0, 2).join(' ')

// Horizontal scrollers must not turn into page swipes (see the swiper in App.jsx).
export const keepTouch = { onTouchStart: (e) => e.stopPropagation(), onPointerDown: (e) => e.stopPropagation(), onMouseDown: (e) => e.stopPropagation() }

export function StoryRow({ groups, pins = {} }) {
  const seen = useStories((s) => s.seen)
  const [open, setOpen] = useState(null) // index into the frozen order
  const [frozen, setFrozen] = useState(null) // order captured when the viewer opens, so watching doesn't reshuffle it
  const isSeen = (g) => g.slides.every((s) => seen[s.id])
  // Pinned kitchens' stories always lead (most recently pinned first); the rest: unwatched first.
  const isPinned = (g) => !!pins[g.kitchen.id]
  const ordered = [...groups].sort((a, b) =>
    (isPinned(b) - isPinned(a)) || (isPinned(a) && isPinned(b) ? pins[b.kitchen.id] - pins[a.kitchen.id] : isSeen(a) - isSeen(b)))
  const openAt = (i) => { setFrozen(ordered); setOpen(i) }
  const onIndex = (i) => { setOpen(i); if (i === null) setFrozen(null) }

  return (
    <>
      <div className="story-row" {...keepTouch}>
        {ordered.map((g, i) => (
          <button key={g.kitchen.id} className="story-chip" onClick={() => openAt(i)}>
            <span className={`story-ring ${isSeen(g) ? 'seen' : ''}`}>
              <Avatar src={g.kitchen.thumb} style={{ '--size': '62px', '--border-radius': '50%' }} />
            </span>
            {isPinned(g) && <span className="story-pin" aria-label="Pinned"><PinIcon on size={11} /></span>}
            <span className="story-name">{shortName(g.kitchen.name)}</span>
          </button>
        ))}
      </div>
      <StoryViewer groups={frozen ?? ordered} index={open} onIndex={onIndex} />
    </>
  )
}

function StoryViewer({ groups, index, onIndex }) {
  const navigate = useNavigate()
  const markSeen = useStories((s) => s.markSeen)
  const group = index === null ? null : groups[index]
  const [slide, setSlide] = useState(0)
  const close = () => onIndex(null)

  // Stories a cook posted from this phone live in IndexedDB; turn them into playable URLs first.
  const [stored, setStored] = useState({})
  const needs = group?.slides.filter((s) => s.mediaKey) ?? []
  useEffect(() => {
    if (!needs.length) return
    let live = true; const made = []
    Promise.all(needs.map(async (s) => [s.id, await getMediaUrl(s.mediaKey)])).then((pairs) => {
      pairs.forEach(([, u]) => u && made.push(u))
      if (live) setStored(Object.fromEntries(pairs))
    })
    return () => { live = false; made.forEach((u) => URL.revokeObjectURL(u)) }
  }, [group]) // eslint-disable-line react-hooks/exhaustive-deps
  const ready = needs.every((s) => stored[s.id])

  // Memoised: a new `stories` array on every render makes the library restart the timer.
  const slides = useMemo(() => group ? group.slides.map((s) => ({
    url: s.mediaKey ? stored[s.id] : s.video ?? s.image,
    type: s.video || s.type === 'video' ? 'video' : 'image',
    duration: 5000,
    seeMoreCollapsed: () => (
      <div className="story-footer" onClick={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
        {s.caption && <div className="story-caption">{s.caption}</div>}
        <Button block color="primary" shape="rounded" onClick={() => { close(); navigate(`/kitchen/${group.kitchen.id}`) }}>
          {group.kitchen.mine ? 'See your kitchen' : `Order from ${group.kitchen.name}`}
        </Button>
      </div>
    ),
    seeMore: () => null,
  })) : [], [group, stored]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Popup visible={!!group} onMaskClick={close} destroyOnClose bodyStyle={{ height: '100dvh', background: '#000', borderRadius: 0 }}>
      {group && ready && (
        <div className="story-viewer" style={{ position: 'relative', height: '100%' }}>
          <Stories
            key={group.kitchen.id}
            stories={slides}
            width="100%" height="100%"
            defaultInterval={5000}
            keyboardNavigation
            storyContainerStyles={{ background: '#000' }}
            storyStyles={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onStoryStart={(i) => { markSeen(group.slides[i].id); setSlide(i) }}
            onAllStoriesEnd={() => (index + 1 < groups.length ? onIndex(index + 1) : close())}
          />
          <div className="story-head">
            <Avatar src={group.kitchen.thumb} style={{ '--size': '34px', '--border-radius': '50%' }} />
            <div>
              <div style={{ fontWeight: 600 }}>{group.kitchen.name}</div>
              <div style={{ fontSize: 12, opacity: 0.8 }}>{group.kitchen.block ? `Block ${group.kitchen.block} · ` : ''}{timeAgo(group.slides[slide]?.at ?? group.slides[0].at)}</div>
            </div>
          </div>
          <button className="story-close" onClick={close} aria-label="Close"><CloseOutline fontSize={26} /></button>
        </div>
      )}
    </Popup>
  )
}
