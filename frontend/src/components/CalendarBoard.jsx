import React, { useEffect, useMemo, useState } from 'react'
import { Calendar, dateFnsLocalizer } from 'react-big-calendar'
import { format, parse, startOfWeek, getDay } from 'date-fns'
import fr from 'date-fns/locale/fr'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import { api } from '../api'

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

  return (
    <div style={{ display:'grid', gridTemplateColumns:'260px 1fr', gap:16, padding:16, minHeight:'calc(100vh - 56px)' }}>
      <aside style={{ borderRight:'1px solid #2a2d36', paddingRight:12 }}>
        <h3 style={{ margin:'0 0 8px' }}>Calendriers</h3>
        <ul style={{ listStyle:'none', padding:0, margin:0, display:'grid', gap:8 }}>
          {cals.map(c => (
            <li key={c.id} title={c.name} style={{ display:'flex', alignItems:'center', gap:8 }}>
              <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggle(c.id)} />
              <span style={{ background:c.color, display:'inline-block', width:12, height:12, borderRadius:3 }} />
              <span>{c.name}</span>
            </li>
          ))}
          {!cals.length && <li style={{ opacity:.7 }}><em>Aucun calendrier</em></li>}
        </ul>
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
      </main>
    </div>
  )
}
