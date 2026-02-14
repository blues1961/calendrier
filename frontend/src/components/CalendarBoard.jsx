import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Calendar, dateFnsLocalizer } from 'react-big-calendar'
import { format, parse, startOfWeek, getDay } from 'date-fns'
import fr from 'date-fns/locale/fr'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import { api } from '../api'
import CalendarEditor from './CalendarEditor'
import EventEditor from './EventEditor'

const locales = { fr }
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
  getDay,
  locales,
})

const messages = {
  allDay: 'Toute la journée',
  previous: 'Préc.',
  next: 'Suiv.',
  today: 'Aujourd’hui',
  month: 'Mois',
  week: 'Semaine',
  day: 'Jour',
  agenda: 'Agenda',
  date: 'Date',
  time: 'Heure',
  event: 'Événement',
  showMore: total => `+ ${total} de plus`,
  noEventsInRange: 'Aucun événement',
}

export default function CalendarBoard({ sidebarOpen = true }){
  const [cals, setCals] = useState([])
  const [events, setEvents] = useState([])
  const [selected, setSelected] = useState(new Set())
  const selectAllRef = useRef(null)
  const [creatingCal, setCreatingCal] = useState(false)
  const [editingCal, setEditingCal] = useState(null)
  const [editingEvt, setEditingEvt] = useState(null)
  const [view, setView] = useState('month')

  // Tooltip enrichi: titre, lieu, notes, plage horaire
  const EventWithTooltip = ({ event, title }) => {
    const start = event.start instanceof Date ? event.start : new Date(event.start)
    const end = event.end instanceof Date ? event.end : new Date(event.end)
    const lines = [
      title || event.title || '(sans titre)',
      event.location ? String(event.location) : null,
      event.description ? String(event.description) : null,
      `${format(start, 'PP p', { locale: fr })} → ${format(end, 'PP p', { locale: fr })}`,
    ].filter(Boolean)
    const tip = lines.join('\n')
    return <span title={tip}>{title}</span>
  }

  useEffect(() => { (async () => {
      const [cs, es] = await Promise.all([api.calendars.list(), api.events.list()])
      setCals(cs)
      setSelected(new Set(cs.map(c => c.id)))
      setEvents(es.map(e => ({ ...e, start: new Date(e.start), end: new Date(e.end) })))
  })() }, [])

  async function reloadData({ removedId } = {}){
    const [cs, es] = await Promise.all([api.calendars.list(), api.events.list()])
    setCals(cs)
    setSelected(prev => {
      const s = new Set(prev)
      if (removedId != null) s.delete(removedId)
      // Nettoie les IDs qui n'existent plus
      for (const id of Array.from(s)) { if (!cs.find(c => c.id === id)) s.delete(id) }
      return s
    })
    setEvents(es.map(e => ({ ...e, start: new Date(e.start), end: new Date(e.end) })))
  }

  const visibleEvents = useMemo(() => {
    if (!events.length) return []
    if (!selected || selected.size === 0) return []
    return events.filter(e => {
      const cid = typeof e.calendar === 'number' ? e.calendar : (e.calendar_id ?? (e.calendar && e.calendar.id))
      return !cid || selected.has(cid)
    })
  }, [events, selected])

  const toggle = (id) => {
    setSelected(prev => {
      const s = new Set(prev)
      if (s.has(id)) s.delete(id); else s.add(id)
      return s
    })
  }

  const selectedCount = useMemo(
    () => cals.reduce((count, c) => (selected.has(c.id) ? count + 1 : count), 0),
    [cals, selected]
  )
  const allSelected = cals.length > 0 && selectedCount === cals.length
  const partiallySelected = selectedCount > 0 && !allSelected

  useEffect(() => {
    if (selectAllRef.current) selectAllRef.current.indeterminate = partiallySelected
  }, [partiallySelected])

  const toggleAll = () => {
    setSelected(prev => {
      const allIds = cals.map(c => c.id)
      const hasAll = allIds.length > 0 && allIds.every(id => prev.has(id))
      return hasAll ? new Set() : new Set(allIds)
    })
  }

  async function ensureSingleDefault(updated) {
    if (!updated?.is_default) return
    const toUnset = cals.filter(c => c.is_default && c.id !== updated.id)
    if (toUnset.length === 0) return
    // Optimistic update UI
    setCals(prev => prev.map(c => (toUnset.find(x => x.id === c.id) ? { ...c, is_default: false } : c)))
    // Persist backend
    await Promise.allSettled(toUnset.map(c => api.calendars.update(c.id, { is_default: false })))
  }

  const getEventCalendarId = (e) => (typeof e.calendar === 'number' ? e.calendar : (e.calendar_id ?? (e.calendar && e.calendar.id)))

  function startOfDay(d){ const x = new Date(d); x.setHours(0,1,0,0); return x }
  function endOfDay(d){ const x = new Date(d); x.setHours(23,59,0,0); return x }

  function handleSlotSelect(info){
    // Crée un nouvel événement sur simple clic ou sélection d'un créneau
    if (info?.action && !['click', 'doubleClick', 'select'].includes(info.action)) return
    if (!cals.length) return
    const defaultCal = (cals.find(c => c.is_default) || cals[0])
    const start = new Date(info.start)
    let isAllDay = (view === 'month') || ((info.end - info.start) >= 22*60*60*1000)
    let evStart = isAllDay ? startOfDay(start) : start
    let evEnd
    if (isAllDay) {
      evEnd = endOfDay(start)
    } else {
      const end = new Date(info.end || start)
      // Si on a cliqué une case horaire, par défaut 1h
      if (!info.end || (end <= start)) evEnd = new Date(start.getTime() + 60*60*1000)
      else evEnd = end
    }
    setEditingEvt({
      id: undefined,
      title: '', description: '', location: '',
      all_day: isAllDay,
      start: evStart, end: evEnd,
      calendar: defaultCal?.id,
    })
  }

  // Couleur d'arrière-plan des événements selon la couleur du calendrier
  const eventPropGetter = (event) => {
    const cid = getEventCalendarId(event)
    const cal = cals.find(c => c.id === cid)
    const bg = (event.color || cal?.color || '#4c8dff').toString()
    // Choix de la couleur du texte selon luminosité
    const hex = bg.startsWith('#') ? bg.slice(1) : bg
    const r = parseInt(hex.substr(0,2),16) || 0
    const g = parseInt(hex.substr(2,2),16) || 0
    const b = parseInt(hex.substr(4,2),16) || 0
    const luminance = (0.299*r + 0.587*g + 0.114*b) / 255
    const fg = luminance > 0.6 ? '#111' : '#fff'
    return { style: { backgroundColor: bg, borderColor: bg, color: fg } }
  }

  const layoutClassName = sidebarOpen
    ? 'calendar-layout calendar-layout--with-sidebar'
    : 'calendar-layout'

  return (
    <div className={layoutClassName}>
      {sidebarOpen && (
        <aside className="calendar-sidebar">
          <div className="calendar-sidebar__head">
            <h3>Calendriers</h3>
          </div>
          <div className="calendar-sidebar__all">
            <label className="calendar-item__toggle calendar-item__toggle--all">
              <input
                ref={selectAllRef}
                type="checkbox"
                checked={allSelected}
                disabled={!cals.length}
                onChange={toggleAll}
              />
              <span className="calendar-item__name">Tous les calendriers</span>
            </label>
          </div>
          <ul className="list calendar-list">
            {cals.map(c => (
              <li key={c.id} title={c.name} className="calendar-item">
                <label className="calendar-item__toggle">
                  <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggle(c.id)} />
                  <span className="calendar-item__color" style={{ background: c.color }} />
                  <span className="calendar-item__name">{c.name}</span>
                </label>
                <button className="btn btn--light btn--xs" onClick={() => setEditingCal(c)}>Modifier</button>
              </li>
            ))}
            {!cals.length && <li className="calendar-empty"><em>Aucun calendrier</em></li>}
          </ul>
          <div className="calendar-sidebar__foot">
            <button className="btn" onClick={() => setCreatingCal(true)}>Ajouter un calendrier</button>
          </div>
        </aside>
      )}

      <main className="calendar-main">
        {editingEvt && (
          <EventEditor
            event={editingEvt}
            calendars={cals}
            title={editingEvt?.id ? 'Modifier l\u2019événement' : 'Nouvel événement'}
            onCancel={() => setEditingEvt(null)}
            onSave={async (payload, opts) => {
              if (editingEvt?.id) {
                const updated = await api.events.update(editingEvt.id, payload)
                const mapped = { ...updated, start: new Date(updated.start), end: new Date(updated.end) }
                setEvents(prev => prev.map(e => e.id === editingEvt.id ? mapped : e))
              } else {
                if (opts?.occurrences?.length) {
                  const createdAll = await Promise.all(
                    opts.occurrences.map(p => api.events.create(p))
                  )
                  const mappedAll = createdAll.map(x => ({ ...x, start: new Date(x.start), end: new Date(x.end) }))
                  setEvents(prev => [...prev, ...mappedAll])
                } else {
                  const created = await api.events.create(payload)
                  const mapped = { ...created, start: new Date(created.start), end: new Date(created.end) }
                  setEvents(prev => [...prev, mapped])
                }
              }
              setEditingEvt(null)
            }}
            onDelete={async () => {
              const ok = window.confirm('Supprimer cet événement ? Cette action est définitive.')
              if (!ok) return
              await api.events.remove(editingEvt.id)
              setEvents(prev => prev.filter(e => e.id !== editingEvt.id))
              setEditingEvt(null)
            }}
          />
        )}

        {editingCal && (
          <CalendarEditor
            calendar={editingCal}
            onCancel={() => setEditingCal(null)}
            onSave={async (changes) => {
              const updated = await api.calendars.update(editingCal.id, changes)
              await ensureSingleDefault(updated)
              setCals(prev => prev.map(x => x.id === updated.id ? updated : x))
              setEditingCal(null)
            }}
            onDelete={async () => {
              if (!editingCal?.id) return
              const ok = window.confirm('Supprimer ce calendrier et tous ses événements ? Cette action est définitive.')
              if (!ok) return
              await api.calendars.remove(editingCal.id)
              setEditingCal(null)               // ferme la fiche
              await reloadData({ removedId: editingCal.id }) // rafraîchit liste + événements
            }}
          />
        )}

        {creatingCal && (
          <CalendarEditor
            calendar={{ name: '', color: '#4c8dff', is_default: false }}
            title="Nouveau calendrier"
            onCancel={() => setCreatingCal(false)}
            onSave={async (payload) => {
              const created = await api.calendars.create(payload)
              await ensureSingleDefault(created)
              setCals(prev => [...prev, created])
              setSelected(prev => new Set(prev).add(created.id))
              setCreatingCal(false)
            }}
          />
        )}

        <div className="calendar-surface">
          <Calendar
            className="calendar-widget"
            localizer={localizer}
            culture="fr"
            messages={messages}
            events={visibleEvents}
            startAccessor="start"
            endAccessor="end"
            selectable="ignoreEvents"
            onSelectSlot={handleSlotSelect}
            view={view}
            onView={setView}
            components={{ event: EventWithTooltip }}
            eventPropGetter={eventPropGetter}
            onSelectEvent={(ev) => setEditingEvt(ev)}
          />
        </div>
      </main>
    </div>
  )
}
