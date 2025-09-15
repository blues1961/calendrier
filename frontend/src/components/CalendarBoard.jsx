import React, { useEffect, useMemo, useState } from 'react'
import { Calendar, dateFnsLocalizer } from 'react-big-calendar'
import { format, parse, startOfWeek, getDay } from 'date-fns'
import fr from 'date-fns/locale/fr'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import { api } from '../api'
import CalendarEditor from './CalendarEditor'

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

export default function CalendarBoard(){
  const [cals, setCals] = useState([])
  const [events, setEvents] = useState([])
  const [selected, setSelected] = useState(new Set())
  const [creatingCal, setCreatingCal] = useState(false)
  const [editingCal, setEditingCal] = useState(null)

  useEffect(() => { (async () => {
      const [cs, es] = await Promise.all([api.calendars.list(), api.events.list()])
      setCals(cs)
      setSelected(new Set(cs.map(c => c.id)))
      setEvents(es.map(e => ({ ...e, start: new Date(e.start), end: new Date(e.end) })))
  })() }, [])

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

  async function ensureSingleDefault(updated) {
    if (!updated?.is_default) return
    const toUnset = cals.filter(c => c.is_default && c.id !== updated.id)
    if (toUnset.length === 0) return
    // Optimistic update UI
    setCals(prev => prev.map(c => (toUnset.find(x => x.id === c.id) ? { ...c, is_default: false } : c)))
    // Persist backend
    await Promise.allSettled(toUnset.map(c => api.calendars.update(c.id, { is_default: false })))
  }

  return (
    <div style={{ display:'grid', gridTemplateColumns:'260px 1fr', gap:16, padding:16, minHeight:'calc(100vh - 56px)' }}>
      <aside style={{ borderRight:'1px solid #2a2d36', paddingRight:12 }}>
        <h3 style={{ margin:'0 0 8px' }}>Calendriers</h3>
        <ul style={{ listStyle:'none', padding:0, margin:0, display:'grid', gap:8 }}>
          {cals.map(c => (
            <li key={c.id} title={c.name} style={{ display:'flex', alignItems:'center', gap:8 }}>
              <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggle(c.id)} />
              <span style={{ background:c.color, display:'inline-block', width:12, height:12, borderRadius:3 }} />
              <span style={{ flex:1 }}>{c.name}</span>
              <button className="btn-secondary" onClick={() => setEditingCal(c)} style={{ padding:'4px 8px' }}>Modifier</button>
            </li>
          ))}
          {!cals.length && <li style={{ opacity:.7 }}><em>Aucun calendrier</em></li>}
        </ul>
        <div style={{ marginTop:16 }}>
          <button onClick={() => setCreatingCal(true)}>Ajouter un calendrier</button>
        </div>
      </aside>

      <main>
        <Calendar
          localizer={localizer}
          culture="fr"
          messages={messages}
          events={visibleEvents}
          startAccessor="start"
          endAccessor="end"
          style={{ height: 'calc(100vh - 96px)', minHeight: 420 }}
        />
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
          />
        )}
        {creatingCal && (
          <CalendarEditor
            calendar={{ name: '', color: '#1976d2', is_default: false }}
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
      </main>
    </div>
  )
}
