import React, { useMemo, useState } from 'react'

export default function CalendarEditor({ calendar, onCancel, onSave, title = 'Modifier le calendrier' }){
  const [name, setName] = useState(calendar?.name || '')
  const [color, setColor] = useState(calendar?.color || '#1976d2')
  const [isDefault, setIsDefault] = useState(!!calendar?.is_default)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const canSave = useMemo(() => name.trim().length > 0, [name])

  async function submit(e){
    e?.preventDefault?.()
    if (!canSave) return
    setSaving(true); setErr('')
    try {
      await onSave?.({ name: name.trim(), color, is_default: isDefault })
    } catch (e) {
      setErr(e?.message || 'Échec de sauvegarde')
      setSaving(false)
    }
  }

  return (
    <div className="modal-backdrop">
      <form className="modal" role="dialog" aria-modal="true" aria-labelledby="cal-editor-title" onSubmit={submit}>
        <h3 id="cal-editor-title">{title}</h3>
        <button type="button" className="modal-close" aria-label="Fermer" onClick={onCancel}>×</button>
        {err && <div className="form-error" style={{marginTop:4}}>{err}</div>}

        <label htmlFor="cal-name">Nom</label>
        <input id="cal-name" type="text" value={name} onChange={e=>setName(e.target.value)} required />

        <label htmlFor="cal-color">Couleur</label>
        <input id="cal-color" type="color" value={color} onChange={e=>setColor(e.target.value)} />

        <label htmlFor="cal-default">Par défaut</label>
        <input id="cal-default" type="checkbox" checked={isDefault} onChange={e=>setIsDefault(e.target.checked)} />

        <div className="modal-actions">
          <button type="button" className="btn-secondary" onClick={onCancel} disabled={saving}>Annuler</button>
          <button type="submit" disabled={!canSave || saving}>Enregistrer</button>
        </div>
      </form>
    </div>
  )
}
