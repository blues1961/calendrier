import React, { useEffect, useState } from 'react'
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

  useEffect(() => { (async () => {
      const [cs, es] = await Promise.all([api.calendars.list(), api.events.list()])
      setCals(cs)
      setEvents(es.map(e => ({ ...e, start: new Date(e.start), end: new Date(e.end) })))
  })() }, [])

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <h2>Mes calendriers</h2>
        <button onClick={() => api.auth.logout()}>Se déconnecter</button>
      </div>
      <ul>{cals.map(c => <li key={c.id}><span style={{ background:c.color, display:'inline-block', width:12, height:12, marginRight:6 }} />{c.name}</li>)}</ul>
      <Calendar
        localizer={localizer}
        culture="fr"
        messages={messages}
        events={events}
        startAccessor="start"
        endAccessor="end"
        style={{ height: '80vh', marginTop: 16 }}
      />
    </div>
  )
}
