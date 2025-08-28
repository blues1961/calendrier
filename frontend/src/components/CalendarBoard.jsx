import React, { useEffect, useState } from 'react'
import { Calendar, dateFnsLocalizer } from 'react-big-calendar'
import { format, parse, startOfWeek, getDay } from 'date-fns'
import fr from 'date-fns/locale/fr'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import { api } from '../api'

const locales = { 'fr': fr }
const localizer = dateFnsLocalizer({ format, parse, startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }), getDay, locales })

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
      <h2>Mes calendriers</h2>
      <ul>{cals.map(c => <li key={c.id}><span style={{ background:c.color, display:'inline-block', width:12, height:12, marginRight:6 }} />{c.name}</li>)}</ul>
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        style={{ height: '80vh', marginTop: 16 }}
      />
    </div>
  )
}
