import React, { useEffect, useMemo, useRef, useState } from 'react'

import { decryptPrivateFields, deriveVaultKeyMaterial } from '../contactCrypto'

const PRIVATE_CONTACTS_VALUE = '__private_contacts__'

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

export default function EventEditor({
  event,
  calendars = [],
  contacts = [],
  contactsError = '',
  user = null,
  onCancel,
  onSave,
  onDelete,
  title = 'Modifier l\u2019événement',
}){
  const [form, setForm] = useState(() => ({
    title: event?.title || '',
    description: event?.description || '',
    location: event?.location || '',
    external_contact_id: event?.external_contact_id || '',
    external_contact_snapshot: event?.external_contact_snapshot || {},
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
  const [vaultUnlock, setVaultUnlock] = useState({
    error: '',
    passphrase: '',
    pending: false,
    unlockedContacts: [],
    unlockRequested: false,
  })
  const descRef = useRef(null)
  const locRef = useRef(null)

  const canSave = useMemo(() => form.title.trim() && form.start && form.end && form.calendar, [form])

  function upd(k, v){ setForm(prev => ({ ...prev, [k]: v })) }

  function updateContact(contactId) {
    if (contactId === PRIVATE_CONTACTS_VALUE) {
      setForm(prev => ({
        ...prev,
        external_contact_id: '',
        external_contact_snapshot: {},
      }))
      setVaultUnlock(prev => ({
        ...prev,
        error: '',
        passphrase: '',
        unlockRequested: true,
      }))
      return
    }

    const selectedContact = contacts.find(contact => String(contact.id) === String(contactId))
    const unlockedContact = vaultUnlock.unlockedContacts.find(contact => contact.id === String(contactId))
    const visibleFields = unlockedContact?.fields || selectedContact || {}
    const shouldCopyLocation = selectedContact?.visibility !== 'private'
    setForm(prev => ({
      ...prev,
      external_contact_id: contactId,
      external_contact_snapshot: selectedContact || {},
      location: shouldCopyLocation ? visibleFields.address || prev.location : prev.location,
    }))
  }

  function updateVaultPassphrase(event) {
    setVaultUnlock(prev => ({
      ...prev,
      error: '',
      passphrase: event.target.value,
    }))
  }

  async function unlockPrivateContacts() {
    if (!privateContacts.length) return

    setVaultUnlock(prev => ({
      ...prev,
      error: '',
      pending: true,
    }))

    try {
      const keyMaterial = await deriveVaultKeyMaterial(vaultUnlock.passphrase, user?.username || 'default')
      const unlockedContacts = await Promise.all(
        privateContacts.map(async contact => ({
          id: String(contact.id),
          fields: await decryptPrivateFields(contact.encrypted_payload, keyMaterial),
        })),
      )

      setVaultUnlock(prev => ({
        ...prev,
        error: '',
        passphrase: '',
        pending: false,
        unlockedContacts,
        unlockRequested: false,
      }))
    } catch {
      setVaultUnlock(prev => ({
        ...prev,
        error: 'Phrase de passe invalide ou contacts privés illisibles.',
        pending: false,
      }))
    }
  }

  function lockPrivateContacts() {
    setVaultUnlock({
      error: '',
      passphrase: '',
      pending: false,
      unlockedContacts: [],
      unlockRequested: false,
    })
  }

  const autoResize = (el) => {
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }

  useEffect(() => {
    autoResize(descRef.current)
    autoResize(locRef.current)
  }, [])

  useEffect(() => { autoResize(descRef.current) }, [form.description])
  useEffect(() => { autoResize(locRef.current) }, [form.location])

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
        external_contact_id: form.external_contact_id,
        external_contact_snapshot: form.external_contact_snapshot,
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

  const selectedContactIsMissing =
    form.external_contact_id &&
    !contacts.some(contact => String(contact.id) === String(form.external_contact_id))
  const selectedContact =
    contacts.find(contact => String(contact.id) === String(form.external_contact_id)) ||
    form.external_contact_snapshot ||
    null
  const selectedContactId = String(selectedContact?.id || form.external_contact_id || '')
  const publicContacts = contacts.filter(contact => contact.visibility !== 'private')
  const privateContacts = contacts.filter(contact => contact.visibility === 'private' && contact.encrypted_payload)
  const unlockedPrivateContact = vaultUnlock.unlockedContacts.find(contact => contact.id === selectedContactId)
  const contactSelectValue =
    vaultUnlock.unlockRequested ||
    (selectedContact?.visibility === 'private' && !unlockedPrivateContact)
      ? PRIVATE_CONTACTS_VALUE
      : form.external_contact_id
  const currentContactLabel =
    selectedContact?.name ||
    (selectedContact?.visibility === 'private' ? 'Contact privé' : 'Contact associé')
  const selectedContactIsPrivate =
    selectedContact?.visibility === 'private' && Boolean(selectedContact?.encrypted_payload)
  const selectedContactIsUnlocked = selectedContactIsPrivate && Boolean(unlockedPrivateContact)
  const visibleContact =
    selectedContactIsPrivate && !selectedContactIsUnlocked
      ? null
      : selectedContactIsUnlocked
        ? unlockedPrivateContact.fields
        : selectedContact
  const hasSelectedContactDetails =
    visibleContact &&
    (visibleContact.phone ||
      visibleContact.address ||
      visibleContact.email ||
      visibleContact.organization ||
      visibleContact.notes)

  return (
    <form className="editor-pane" aria-labelledby="evt-editor-title" onSubmit={submit}>
      <div className="editor-header">
        <h3 id="evt-editor-title">{title}</h3>
        <button type="button" className="btn btn--light" onClick={onCancel} disabled={saving}>Fermer</button>
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
        <textarea
          id="ev-desc"
          ref={descRef}
          rows="3"
          value={form.description}
          onChange={e=>{
            upd('description', e.target.value)
            autoResize(e.target)
          }}
        />
      </label>

      <label htmlFor="ev-contact" className="editor-field">
        <span>Contact</span>
        <select
          id="ev-contact"
          value={contactSelectValue}
          onChange={e => updateContact(e.target.value)}
          disabled={Boolean(contactsError)}
        >
          <option value="">Aucun contact associé</option>
          {privateContacts.length > 0 && !vaultUnlock.unlockedContacts.length && (
            <option value={PRIVATE_CONTACTS_VALUE}>Contact privé</option>
          )}
          {selectedContactIsMissing && (
            <option value={form.external_contact_id}>{currentContactLabel}</option>
          )}
          {vaultUnlock.unlockedContacts.map(contact => (
            <option key={contact.id} value={contact.id}>
              {contact.fields.name || `Contact privé #${contact.id}`}
            </option>
          ))}
          {publicContacts.map(contact => (
            <option key={contact.id} value={contact.id}>
              {contact.name || `Contact #${contact.id}`}
            </option>
          ))}
        </select>
        {contactsError && (
          <div className="form-error">
            {contactsError} L’événement reste modifiable; crée l’utilisateur correspondant dans Contact pour associer un contact.
          </div>
        )}
        {(vaultUnlock.unlockRequested || (selectedContactIsPrivate && !selectedContactIsUnlocked)) && (
          <div className="contact-vault">
            <p>Contacts privés verrouillés.</p>
            <div className="contact-vault__unlock">
              <input
                type="password"
                placeholder="Phrase de passe du coffre Contact"
                value={vaultUnlock.passphrase}
                onChange={updateVaultPassphrase}
              />
              <button
                type="button"
                className="btn btn--xs"
                disabled={vaultUnlock.pending || !vaultUnlock.passphrase}
                onClick={unlockPrivateContacts}
              >
                {vaultUnlock.pending ? 'Déverrouillage...' : 'Déverrouiller'}
              </button>
            </div>
            {vaultUnlock.error && <div className="form-error">{vaultUnlock.error}</div>}
          </div>
        )}
        {vaultUnlock.unlockedContacts.length > 0 && (
          <button type="button" className="btn btn--light btn--xs contact-vault__lock" onClick={lockPrivateContacts}>
            Verrouiller les contacts privés
          </button>
        )}
        {hasSelectedContactDetails && (
          <div className="contact-preview">
            {visibleContact.organization && <span>{visibleContact.organization}</span>}
            {visibleContact.phone && <a href={`tel:${visibleContact.phone}`}>Tél. {visibleContact.phone}</a>}
            {visibleContact.address && <span>Adresse : {visibleContact.address}</span>}
            {visibleContact.email && <a href={`mailto:${visibleContact.email}`}>{visibleContact.email}</a>}
            {visibleContact.notes && <span>Notes : {visibleContact.notes}</span>}
          </div>
        )}
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
        <textarea
          id="ev-loc"
          ref={locRef}
          rows="2"
          placeholder={'Nom du lieu\nAdresse ligne 1\nAdresse ligne 2'}
          value={form.location}
          onChange={e=>{
            upd('location', e.target.value)
            autoResize(e.target)
          }}
        />
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
                  <button type="button" className="btn btn--light" onClick={()=> setSegments(prev => prev.filter((_,i)=>i!==idx))} disabled={segments.length<=1}>Retirer</button>
                </div>
              ))}
              <div>
                <button type="button" className="btn btn--light" onClick={()=> setSegments(prev => [...prev, { count: 5, gap: 0 }])}>+ Ajouter un segment</button>
              </div>
            </div>
          )}
        </>
      )}

      <div className="editor-actions">
        <div>
          {event?.id && onDelete && (
            <button type="button" className="btn btn--danger" onClick={onDelete} disabled={saving}>Supprimer l’événement</button>
          )}
        </div>
        <div className="editor-actions-right">
          <button type="button" className="btn btn--light" onClick={onCancel} disabled={saving}>Annuler</button>
          <button type="submit" className="btn" disabled={!canSave || saving}>Enregistrer</button>
        </div>
      </div>
    </form>
  )
}
