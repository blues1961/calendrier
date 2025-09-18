import React, { useMemo, useState } from 'react'

function toLocalInputValue(dt){
  if (!dt) return ''
  const d = (dt instanceof Date) ? dt : new Date(dt)
  const tzOff = d.getTimezoneOffset()
  const local = new Date(d.getTime() - tzOff * 60000)
  return local.toISOString().slice(0,16) // YYYY-MM-DDTHH:mm
}

function fromLocalInputValue(v){
  if (!v) return null
  const d = new Date(v)
  return d.toISOString()
}

export default function EventEditor({ event, calendars = [], onCancel, onSave, onDelete, title = 'Modifier l\u2019événement' }){
  const [form, setForm] = useState(() => ({
    title: event?.title || '',
    description: event?.description || '',
    location: event?.location || '',
    all_day: !!(event?.all_day),
    start: toLocalInputValue(event?.start),
    end: toLocalInputValue(event?.end),
    calendar: (typeof event?.calendar === 'number') ? event.calendar : (event?.calendar_id ?? event?.calendar?.id ?? calendars[0]?.id ?? null),
  }))
  // Récurrence (hebdomadaire) — uniquement utile en création
  const creating = !event?.id
  const [repeat, setRepeat] = useState(false)
  const [segments, setSegments] = useState([{ count: 10, gap: 0 }])
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const canSave = useMemo(() => form.title.trim() && form.start && form.end && form.calendar, [form])

  function upd(k, v){ setForm(prev => ({ ...prev, [k]: v })) }

  async function submit(e){
    e?.preventDefault?.()
    if (!canSave) return
    setSaving(true); setErr('')
    try {
      // Prépare le payload de base
      const base = {
        title: form.title.trim(),
        description: form.description.trim(),
        location: form.location.trim(),
        all_day: !!form.all_day,
        start: fromLocalInputValue(form.start),
        end: fromLocalInputValue(form.end),
        calendar: form.calendar,
      }

      if (creating && repeat) {
        // Génère les occurrences hebdo en préservant le jour de la semaine (local),
        // sans dérive lors des changements d'heure (DST).
        const start0 = new Date(form.start)                 // local
        const end0 = new Date(form.end || form.start)
        const baseDay = new Date(start0.getFullYear(), start0.getMonth(), start0.getDate())
        const startMin = start0.getHours() * 60 + start0.getMinutes()
        const durMin = Math.max(1, Math.round((end0 - start0) / 60000))

        const addWeeksLocal = (d, w) => { const r = new Date(d); r.setDate(r.getDate() + w * 7); return r }

        const out = []
        let weekOffset = 0
        segments.forEach(seg => {
          const count = Number(seg.count || 0)
          const gap = Number(seg.gap || 0)
          for (let i = 0; i < count; i++) {
            const day = addWeeksLocal(baseDay, weekOffset + i)
            if (form.all_day) {
              const ss = new Date(day); ss.setHours(0,1,0,0)   // 00:01 local
              const ee = new Date(day); ee.setHours(23,59,0,0) // 23:59 local
              out.push({ ...base, start: ss.toISOString(), end: ee.toISOString() })
            } else {
              const start = new Date(day); start.setHours(0,0,0,0); const st = new Date(start.getTime() + startMin*60000)
              const en = new Date(st.getTime() + durMin*60000)
              out.push({ ...base, start: st.toISOString(), end: en.toISOString() })
            }
          }
          weekOffset += count + gap
        })
        await onSave?.(base, { occurrences: out })
      } else {
        await onSave?.(base)
      }
    } catch (e) {
      setErr(e?.message || 'Échec de sauvegarde')
      setSaving(false)
    }
  }

  return (
    <form className="editor-pane" aria-labelledby="evt-editor-title" onSubmit={submit}>
      <div className="editor-header">
        <h3 id="evt-editor-title">{title}</h3>
        <button type="button" className="btn-secondary" onClick={onCancel} disabled={saving}>Fermer</button>
      </div>
      {err && <div className="form-error">{err}</div>}

      <label htmlFor="ev-cal" className="editor-field">
        <span>Calendrier</span>
        <select id="ev-cal" value={form.calendar ?? ''} onChange={e=>upd('calendar', Number(e.target.value))}>
          {calendars.map(c => (<option key={c.id} value={c.id}>{c.name}</option>))}
        </select>
      </label>

      <label htmlFor="ev-title" className="editor-field">
        <span>Titre</span>
        <input id="ev-title" type="text" value={form.title} onChange={e=>upd('title', e.target.value)} required />
      </label>

      <label htmlFor="ev-desc" className="editor-field">
        <span>Description</span>
        <textarea id="ev-desc" rows="4" value={form.description} onChange={e=>upd('description', e.target.value)} />
      </label>

      <label htmlFor="ev-start" className="editor-field">
        <span>Début</span>
        <input id="ev-start" type="datetime-local" value={form.start} onChange={e=>upd('start', e.target.value)} required />
      </label>

      <label htmlFor="ev-end" className="editor-field">
        <span>Fin</span>
        <input id="ev-end" type="datetime-local" value={form.end} onChange={e=>upd('end', e.target.value)} required />
      </label>

      <label htmlFor="ev-all" className="editor-checkbox">
        <input id="ev-all" type="checkbox" checked={!!form.all_day} onChange={e=>upd('all_day', e.target.checked)} />
        <span>Journée entière</span>
      </label>

      <label htmlFor="ev-loc" className="editor-field">
        <span>Lieu</span>
        <textarea id="ev-loc" rows="3" placeholder={'Nom du lieu\nAdresse ligne 1\nAdresse ligne 2'} value={form.location} onChange={e=>upd('location', e.target.value)} />
      </label>

      {creating && (
        <>
          <h4 className="editor-subtitle">Récurrence</h4>
          <label htmlFor="ev-repeat" className="editor-checkbox">
            <input id="ev-repeat" type="checkbox" checked={repeat} onChange={e=>setRepeat(e.target.checked)} />
            <span>Répéter (hebdomadaire)</span>
          </label>
          {repeat && (
            <div className="editor-recurring">
              {segments.map((s, idx) => (
                <div key={idx} className="editor-recurring-row">
                  <label>
                    <span>Occurrences (sem.)</span>
                    <input type="number" min="1" value={s.count}
                      onChange={e=>{
                        const v = Math.max(1, Number(e.target.value||1));
                        setSegments(prev => prev.map((x,i)=> i===idx? { ...x, count:v }: x))
                      }}
                    />
                  </label>
                  <label>
                    <span>Pause (sem.)</span>
                    <input type="number" min="0" value={s.gap}
                      onChange={e=>{
                        const v = Math.max(0, Number(e.target.value||0));
                        setSegments(prev => prev.map((x,i)=> i===idx? { ...x, gap:v }: x))
                      }}
                    />
                  </label>
                  <button type="button" className="btn-secondary" onClick={()=> setSegments(prev => prev.filter((_,i)=>i!==idx))} disabled={segments.length<=1}>Retirer</button>
                </div>
              ))}
              <div>
                <button type="button" onClick={()=> setSegments(prev => [...prev, { count: 5, gap: 0 }])}>+ Ajouter un segment</button>
              </div>
            </div>
          )}
        </>
      )}

      <div className="editor-actions">
        <div>
          {event?.id && onDelete && (
            <button type="button" className="btn-danger" onClick={onDelete} disabled={saving}>Supprimer l’événement</button>
          )}
        </div>
        <div className="editor-actions-right">
          <button type="button" className="btn-secondary" onClick={onCancel} disabled={saving}>Annuler</button>
          <button type="submit" disabled={!canSave || saving}>Enregistrer</button>
        </div>
      </div>
    </form>
  )
}
