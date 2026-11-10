// One dish, full screen: photos & videos (drag to reorder), details, availability, delete.
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ActionSheet, Button, Card, DatePicker, Dialog, Empty, Form, ImageViewer, Input, List, NavBar, Popup, Selector, Stepper, TextArea, Toast } from 'antd-mobile'
import { AddOutline, DeleteOutline, PlayOutline } from 'antd-mobile-icons'
import { DndContext, closestCenter, PointerSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, arrayMove, rectSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { dishStats, newMediaId, useCook } from '../../store/cook.js'
import { deleteMedia, pickMedia, saveMedia } from '../../lib/media.js'
import { clock, dayLabel, shrinkImage } from '../../lib/format.js'
import { notifyCounts } from '../../lib/sales.js'
import { useNotify } from '../../store/notify.js'
import { useMyKitchen } from '../../store/index.js'
import { MediaView } from '../shared.jsx'
import { availability } from './parts.jsx'

const roundUp = (t, mins = 5) => Math.ceil(t / (mins * 60000)) * mins * 60000

// One draggable media tile.
function SortableTile({ item, index, onTap }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id })
  const style = { transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 5 : 'auto', opacity: isDragging ? 0.85 : 1 }
  return (
    <div ref={setNodeRef} style={style} className={`media-tile ${isDragging ? 'dragging' : ''}`} {...attributes} {...listeners} onClick={() => onTap(item)}>
      <MediaView url={item.url} mediaKey={item.key} type={item.type} height="100%" thumb />
      {item.type === 'video' && <span className="media-video"><PlayOutline /></span>}
      {index === 0 && <span className="media-cover">Cover</span>}
      <span className="media-index">{index + 1}</span>
    </div>
  )
}

// Two big buttons: Available now / Pre-order, then the fields for the one picked.
function Availability({ dish }) {
  const { goLive, takeOffline, incoming } = useCook()
  const [kind, setKind] = useState(dish.live ? (dish.live.now ? 'now' : 'preorder') : null)
  const [portions, setPortions] = useState(dish.live?.portions ?? 10)
  const base = useMemo(() => roundUp(Date.now() + 60 * 60000, 30), [])
  const [closesAt, setClosesAt] = useState(dish.live?.closesAt ?? base)
  const [readyAt, setReadyAt] = useState(dish.live && !dish.live.now ? dish.live.readyAt : base + 60 * 60000)
  const [picker, setPicker] = useState(null)
  const stats = dishStats(dish, incoming)
  const bounds = useMemo(() => ({ min: new Date(), max: new Date(Date.now() + 3 * 86400000) }), [])

  const save = () => {
    if (portions < stats.ordered) return Toast.show({ content: `You’ve already accepted ${stats.ordered} portions` })
    if (kind === 'preorder') {
      if (closesAt <= Date.now()) return Toast.show({ content: 'Orders must close in the future' })
      if (readyAt < closesAt) return Toast.show({ content: 'Pickup can’t be before orders close' })
    }
    goLive(dish.id, kind === 'now' ? { now: true, portions, closesAt: null, readyAt: Date.now() } : { now: false, portions, closesAt, readyAt })
    if (dish.live) return Toast.show({ icon: 'success', content: 'Updated' })
    // Going live: everyone who tapped "Notify me" on this dish is alerted.
    const waiting = notifyCounts([dish], useNotify.getState().subs, useMyKitchen.getState().kitchen?.id)[0].value
    Toast.show({ icon: 'success', duration: 2600, content: `${kind === 'now' ? 'Live now' : 'Pre-orders open'}${waiting ? ` · ${waiting} neighbour${waiting === 1 ? '' : 's'} who tapped Notify me were alerted` : ''}` })
  }

  const status = availability(dish)
  return (
    <Card className={`avail-card avail-${status.kind}`}>
      <div className="row between">
        <div className="caps" style={{ color: 'var(--ink)' }}>Availability</div>
        <span style={{ fontSize: 12, fontWeight: 600 }}>{status.label}</span>
      </div>
      <Selector
        className="avail-choice" columns={2} showCheckMark={false} value={kind ? [kind] : []}
        onChange={(v) => v[0] && setKind(v[0])}
        options={[
          { value: 'now', label: 'Available now', description: 'Ready right now' },
          { value: 'preorder', label: 'Pre-order', description: 'Take orders now, cook later' },
        ]}
      />
      {kind && (
        <List style={{ marginTop: 10, '--border-top': 'none', '--border-bottom': 'none' }}>
          {kind === 'preorder' && (
            <>
              <List.Item clickable onClick={() => setPicker('close')} extra={<span className="mono">{dayLabel(closesAt).toLowerCase()} {clock(closesAt)}</span>}>Orders close at</List.Item>
              <List.Item clickable onClick={() => setPicker('ready')} extra={<span className="mono">{dayLabel(readyAt).toLowerCase()} {clock(readyAt)}</span>}>Ready for pickup at</List.Item>
            </>
          )}
          <List.Item description={dish.live ? `${stats.ordered} ordered · ${stats.left} left · ${stats.pendingCount} pending` : 'How many can you make?'}
            extra={<Stepper min={1} max={200} value={portions} onChange={(v) => setPortions(v || 1)} />}>Portions</List.Item>
        </List>
      )}
      {kind && (
        <div className="stack" style={{ marginTop: 12 }}>
          <Button block size="large" color={kind === 'now' ? 'success' : 'primary'} onClick={save}>
            {dish.live ? 'Update' : kind === 'now' ? 'Go live now' : 'Open pre-orders'}
          </Button>
          {dish.live && <Button block fill="outline" color="danger" onClick={() => { takeOffline(dish.id); setKind(null); Toast.show({ content: 'Taken offline' }) }}>Take offline</Button>}
        </div>
      )}
      <DatePicker
        visible={!!picker} onClose={() => setPicker(null)} precision="minute" min={bounds.min} max={bounds.max}
        filter={{ minute: (v) => v % 5 === 0 }} title={picker === 'close' ? 'Orders close at' : 'Ready for pickup at'}
        value={new Date(picker === 'close' ? closesAt : readyAt)}
        onConfirm={(v) => { const t = v.getTime(); if (picker === 'close') { setClosesAt(t); if (readyAt < t) setReadyAt(t + 30 * 60000) } else setReadyAt(t) }}
      />
    </Card>
  )
}

export default function Dish() {
  const { id } = useParams()
  const isNew = id === 'new'
  const navigate = useNavigate()
  const { dishes, addDish, updateDish, deleteDish } = useCook()
  const dish = dishes.find((d) => d.id === id)
  const [draftMedia, setDraftMedia] = useState([])          // media while creating
  const media = isNew ? draftMedia : dish?.media ?? []
  const setMedia = (m) => (isNew ? setDraftMedia(m) : updateDish(dish.id, { media: m }))
  const [form] = Form.useForm()
  const [preview, setPreview] = useState(null)
  const [adding, setAdding] = useState(false)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 6 } }),
  )

  useEffect(() => { if (dish) form.setFieldsValue({ name: dish.name, desc: dish.desc, price: String(dish.price) }) }, [dish?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!isNew && !dish) return <><NavBar onBack={() => navigate('/cook', { replace: true })}>Dish</NavBar><Empty description="This dish was deleted." /></>

  const addMedia = () => {
    const handler = ActionSheet.show({
      extra: 'Add photos or videos', cancelText: 'Cancel',
      actions: [{ key: 'camera', text: 'Take photo or video' }, { key: 'gallery', text: 'Choose from gallery or files' }],
      onAction: async (a) => {
        handler.close()
        const picked = await pickMedia({ capture: a.key === 'camera', multiple: a.key === 'gallery' })
        const files = Array.isArray(picked) ? picked : picked ? [picked] : []
        if (!files.length) return
        setAdding(true)
        try {
          const items = []
          for (const f of files) {
            if (f.type.startsWith('video/')) items.push({ id: newMediaId(), type: 'video', key: await saveMedia(f) })
            else items.push({ id: newMediaId(), type: 'image', url: await shrinkImage(f, 900) })
          }
          setMedia([...media, ...items])
          Toast.show({ content: `Added ${items.length}` })
        } finally { setAdding(false) }
      },
    })
  }

  const tapTile = (item) => {
    const i = media.findIndex((m) => m.id === item.id)
    const handler = ActionSheet.show({
      cancelText: 'Cancel',
      actions: [
        ...(i > 0 ? [{ key: 'cover', text: 'Make cover' }] : []),
        { key: 'preview', text: 'Preview' },
        { key: 'remove', text: 'Remove', danger: true },
      ],
      onAction: (a) => {
        handler.close()
        if (a.key === 'cover') setMedia(arrayMove(media, i, 0))
        if (a.key === 'preview') {
          if (item.type === 'image') ImageViewer.Multi.show({ images: media.filter((m) => m.type === 'image').map((m) => m.url), defaultIndex: media.filter((m) => m.type === 'image').findIndex((m) => m.id === item.id) })
          else setPreview(item)
        }
        if (a.key === 'remove') { if (item.key) deleteMedia(item.key); setMedia(media.filter((m) => m.id !== item.id)) }
      },
    })
  }

  const onDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return
    setMedia(arrayMove(media, media.findIndex((m) => m.id === active.id), media.findIndex((m) => m.id === over.id)))
  }

  const saveDetails = (v) => {
    const data = { name: v.name.trim(), desc: v.desc?.trim() ?? '', price: Number(v.price) }
    if (isNew) {
      if (!media.length) return Toast.show({ content: 'Add at least one photo or video' })
      const newId = addDish({ ...data, media })
      Toast.show({ icon: 'success', content: 'Dish created — now set availability' })
      navigate(`/cook/dish/${newId}`, { replace: true })
    } else {
      updateDish(dish.id, data); Toast.show({ icon: 'success', content: 'Saved' })
    }
  }

  const remove = async () => {
    const ok = await Dialog.confirm({ title: 'Delete dish?', content: `${dish.name} will be removed from your menu${dish.live ? ' and taken offline' : ''}.`, confirmText: 'Delete', cancelText: 'Cancel' })
    if (!ok) return
    dish.media?.forEach((m) => m.key && deleteMedia(m.key))
    deleteDish(dish.id); Toast.show({ content: 'Dish deleted' }); navigate('/cook', { replace: true })
  }

  return (
    <div style={{ paddingBottom: 32 }}>
      <NavBar onBack={() => navigate('/cook', { replace: true })}>{isNew ? 'Add a dish' : dish.name}</NavBar>
      <div className="pad stack" style={{ paddingTop: 14 }}>
        {!isNew && <Availability key={dish.id + (dish.live ? 'l' : 'o')} dish={dish} />}

        <Card>
          <div className="row between">
            <div className="caps" style={{ color: 'var(--ink)' }}>Photos & videos</div>
            <span className="muted" style={{ fontSize: 12 }}>{media.length ? 'Hold & drag to reorder' : ''}</span>
          </div>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={media.map((m) => m.id)} strategy={rectSortingStrategy}>
              <div className="media-grid">
                {media.map((m, i) => <SortableTile key={m.id} item={m} index={i} onTap={tapTile} />)}
                <button className="media-add" onClick={addMedia} disabled={adding}>
                  <AddOutline fontSize={24} /><span>{adding ? 'Adding…' : 'Add'}</span>
                </button>
              </div>
            </SortableContext>
          </DndContext>
          <div className="faint" style={{ fontSize: 12, marginTop: 8 }}>The first one is the cover. Buyers swipe through them in this order.</div>
        </Card>

        <Card>
          <div className="caps" style={{ color: 'var(--ink)' }}>Details</div>
          <Form form={form} layout="vertical" onFinish={saveDetails} requiredMarkStyle="none" style={{ '--border-top': 'none', margin: '0 -12px' }}
            footer={<Button block type="submit" color={isNew ? 'primary' : 'default'} size="large">{isNew ? 'Create dish' : 'Save details'}</Button>}>
            <Form.Item name="name" label="Dish name" rules={[{ required: true, message: 'Name your dish' }]}>
              <Input placeholder="e.g. Rajma chawal" maxLength={50} clearable />
            </Form.Item>
            <Form.Item name="desc" label="Short description">
              <TextArea placeholder="What’s in it, how much it serves" maxLength={120} autoSize={{ minRows: 2, maxRows: 3 }} />
            </Form.Item>
            <Form.Item name="price" label="Price per portion (₹)" rules={[{ required: true, message: 'Add a price' }, { pattern: /^\d{1,5}$/, message: 'Whole rupees only' }]}>
              <Input type="number" inputMode="numeric" placeholder="140" />
            </Form.Item>
          </Form>
        </Card>

        {!isNew && (
          <Button block fill="outline" color="danger" size="large" onClick={remove}>
            <span className="row" style={{ gap: 6, justifyContent: 'center' }}><DeleteOutline /> Delete dish</span>
          </Button>
        )}
      </div>

      <Popup visible={!!preview} onMaskClick={() => setPreview(null)} showCloseButton onClose={() => setPreview(null)} destroyOnClose bodyStyle={{ background: '#000' }}>
        {preview && <MediaView mediaKey={preview.key} type="video" height="70dvh" controls style={{ objectFit: 'contain', background: '#000' }} />}
      </Popup>
    </div>
  )
}
