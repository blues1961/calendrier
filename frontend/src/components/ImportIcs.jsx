import React, { useEffect, useRef, useState } from 'react'
import { api } from '../api'

export default function ImportIcs({ calendars = [], defaultCalendarId = null, onImported }){
  const fileRef = useRef(null)
  const [calendarId, setCalendarId] = useState(defaultCalendarId ?? '')
  const [file, setFile] = useState(null)
  const [status, setStatus] = useState({ type: '', message: '' })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!calendars.length) {
      setCalendarId('')
      return
    }

    const exists = calendars.some(c => c.id === Number(calendarId))
    if (!calendarId || !exists) {
      setCalendarId(defaultCalendarId ?? calendars[0]?.id ?? '')
    }
  }, [calendarId, calendars, defaultCalendarId])

  async function handleSubmit(e){
    e.preventDefault()
    if (!file || !calendarId) return

    const formData = new FormData()
    formData.append('file', file)
    formData.append('calendar_id', String(calendarId))

    setSubmitting(true)
    setStatus({ type: '', message: '' })

    try {
      const result = await api.events.importIcs(formData)
      setStatus({
        type: 'success',
        message: `${result.imported} importé(s), ${result.skipped} ignoré(s).`,
      })
      setFile(null)
      if (fileRef.current) fileRef.current.value = ''
      await onImported?.({ ...result, calendarId: Number(calendarId) })
    } catch (error) {
      const detail = error?.response?.data?.detail || 'Échec de l’import .ics.'
      setStatus({ type: 'error', message: detail })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="import-ics" onSubmit={handleSubmit}>
      <div className="import-ics__head">
        <h4>Importer un .ics</h4>
        <p>Ajoute les VEVENT dans le calendrier choisi, sans doublons sur le UID.</p>
      </div>

      <label className="editor-field" htmlFor="ics-calendar">
        <span>Calendrier cible</span>
        <select
          id="ics-calendar"
          value={calendarId}
          onChange={e => setCalendarId(Number(e.target.value))}
          disabled={!calendars.length || submitting}
        >
          {calendars.map(cal => (
            <option key={cal.id} value={cal.id}>{cal.name}</option>
          ))}
        </select>
      </label>

      <label className="editor-field" htmlFor="ics-file">
        <span>Fichier .ics</span>
        <input
          id="ics-file"
          ref={fileRef}
          type="file"
          accept=".ics,text/calendar"
          onChange={e => setFile(e.target.files?.[0] ?? null)}
          disabled={!calendars.length || submitting}
        />
      </label>

      {status.message && (
        <div className={status.type === 'error' ? 'form-error' : 'import-ics__success'}>
          {status.message}
        </div>
      )}

      <button
        type="submit"
        className="btn btn--block"
        disabled={!calendars.length || !file || !calendarId || submitting}
      >
        {submitting ? 'Import en cours…' : 'Importer'}
      </button>
    </form>
  )
}
