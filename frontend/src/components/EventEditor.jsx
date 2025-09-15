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
      const mkDate = (v, allDay) => {
        if (!v) return null
        const d = new Date(v)
        if (allDay) {
          const day = new Date(d)
          const start = new Date(day); start.setHours(0,1,0,0)
          const end = new Date(day); end.setHours(23,59,0,0)
          return { start: start.toISOString(), end: end.toISOString() }
        }
        return { start: d.toISOString() }
      }

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
        // Génère les occurrences hebdomadaires à partir de la date/heure de départ
        const start0 = new Date(form.start)
        const end0 = new Date(form.end || form.start)
        const dur = end0 - start0
        const out = []
        let weekOffset = 0
        segments.forEach(seg => {
          for (let i = 0; i < Number(seg.count||0); i++) {
            const st = new Date(start0.getTime() + (weekOffset + i) * 7 * 24 * 3600 * 1000)
            const en = new Date(st.getTime() + dur)
            if (form.all_day) {
              const ss = new Date(st); ss.setHours(0,1,0,0)
              const ee = new Date(st); ee.setHours(23,59,0,0)
              out.push({ ...base, start: ss.toISOString(), end: ee.toISOString() })
            } else {
              out.push({ ...base, start: st.toISOString(), end: en.toISOString() })
            }
          }
          weekOffset += Number(seg.count||0) + Number(seg.gap||0)
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
    <div className="modal-backdrop">
      <form className="modal" role="dialog" aria-modal="true" aria-labelledby="evt-editor-title" onSubmit={submit}>
        <h3 id="evt-editor-title">{title}</h3>
        <button type="button" className="modal-close" aria-label="Fermer" onClick={onCancel}>×</button>
        {err && <div className="form-error" style={{gridColumn:'1 / -1', color:'salmon'}}>{err}</div>}

        <label htmlFor="ev-cal">Calendrier</label>
        <select id="ev-cal" value={form.calendar ?? ''} onChange={e=>upd('calendar', Number(e.target.value))}>
          {calendars.map(c => (<option key={c.id} value={c.id}>{c.name}</option>))}
        </select>

        <label htmlFor="ev-title">Titre</label>
        <input id="ev-title" type="text" value={form.title} onChange={e=>upd('title', e.target.value)} required />

        <label htmlFor="ev-desc">Description</label>
        <textarea id="ev-desc" rows="4" value={form.description} onChange={e=>upd('description', e.target.value)} />

        <label htmlFor="ev-start">Début</label>
        <input id="ev-start" type="datetime-local" value={form.start} onChange={e=>upd('start', e.target.value)} required />

        <label htmlFor="ev-end">Fin</label>
        <input id="ev-end" type="datetime-local" value={form.end} onChange={e=>upd('end', e.target.value)} required />

        <label htmlFor="ev-all">Journée entière</label>
        <input id="ev-all" type="checkbox" checked={!!form.all_day} onChange={e=>upd('all_day', e.target.checked)} />

        <label htmlFor="ev-loc">Lieu</label>
        <textarea id="ev-loc" rows="3" placeholder={'Nom du lieu\nAdresse ligne 1\nAdresse ligne 2'} value={form.location} onChange={e=>upd('location', e.target.value)} />

        {creating && (
          <>
            <h4 style={{ gridColumn:'1 / -1', margin:'8px 0 4px' }}>Récurrence</h4>
            <label htmlFor="ev-repeat">Répéter (hebdomadaire)</label>
            <input id="ev-repeat" type="checkbox" checked={repeat} onChange={e=>setRepeat(e.target.checked)} />
            {repeat && (
              <div style={{ gridColumn:'1 / -1', display:'grid', gap:8 }}>
                {segments.map((s, idx) => (
                  <div key={idx} style={{ display:'grid', gridTemplateColumns:'1fr 1fr auto', gap:8, alignItems:'center' }}>
                    <label style={{ justifySelf:'start' }}>Occurrences (sem.):
                      <input type="number" min="1" value={s.count}
                        onChange={e=>{
                          const v = Math.max(1, Number(e.target.value||1));
                          setSegments(prev => prev.map((x,i)=> i===idx? { ...x, count:v }: x))
                        }}
                        style={{ marginLeft:8, width:100 }} />
                    </label>
                    <label style={{ justifySelf:'start' }}>Pause (sem.):
                      <input type="number" min="0" value={s.gap}
                        onChange={e=>{
                          const v = Math.max(0, Number(e.target.value||0));
                          setSegments(prev => prev.map((x,i)=> i===idx? { ...x, gap:v }: x))
                        }}
                        style={{ marginLeft:8, width:100 }} />
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

        <div className="modal-actions" style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            {event?.id && onDelete && (
              <button type="button" className="btn-danger" onClick={onDelete} disabled={saving}>Supprimer l’événement</button>
            )}
          </div>
          <div style={{ display:'flex', gap:10 }}>
            <button type="button" className="btn-secondary" onClick={onCancel} disabled={saving}>Annuler</button>
            <button type="submit" disabled={!canSave || saving}>Enregistrer</button>
          </div>
        </div>
      </form>
    </div>
  )
}
