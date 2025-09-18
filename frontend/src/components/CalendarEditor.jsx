import React, { useMemo, useState } from 'react'

export default function CalendarEditor({ calendar, onCancel, onSave, onDelete, title = 'Modifier le calendrier' }){
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
    <form className="editor-pane" aria-labelledby="cal-editor-title" onSubmit={submit}>
      <div className="editor-header">
        <h3 id="cal-editor-title">{title}</h3>
        <button type="button" className="btn-secondary" onClick={onCancel} disabled={saving}>Fermer</button>
      </div>
      {err && <div className="form-error">{err}</div>}

      <label htmlFor="cal-name" className="editor-field">
        <span>Nom</span>
        <input id="cal-name" type="text" value={name} onChange={e=>setName(e.target.value)} required />
      </label>

      <label htmlFor="cal-color" className="editor-field">
        <span>Couleur</span>
        <input
          id="cal-color"
          type="color"
          value={color}
          onChange={e=>setColor(e.target.value)}
          style={{ width: 72, height: 40, padding: 0, borderRadius: 8, border: '1px solid #2f3542', background: '#0f1218' }}
        />
      </label>

      <label htmlFor="cal-default" className="editor-checkbox">
        <input id="cal-default" type="checkbox" checked={isDefault} onChange={e=>setIsDefault(e.target.checked)} />
        <span>Par défaut</span>
      </label>

      <div className="editor-actions">
        <div>
          {calendar?.id && onDelete && (
            <button type="button" className="btn-danger" onClick={onDelete} disabled={saving}>Supprimer le calendrier</button>
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
