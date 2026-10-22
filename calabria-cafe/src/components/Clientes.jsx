import { useState } from 'react'
import { supabase } from '../lib/supabase'

const money = n => Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const uid = () => 'x' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)

export default function Clientes({ clients }) {
  const [q, setQ] = useState('')
  const [modal, setModal] = useState(null)

  const list = clients
    .filter(c => c.name.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => Number(b.total_spent || 0) - Number(a.total_spent || 0))

  return (
    <div className="section-pad">
      <div className="product-search-row">
        <input className="input" placeholder="Buscar cliente…" value={q} onChange={e => setQ(e.target.value)} />
        <button className="btn btn-caramel" onClick={() => setModal({})}>+ Novo</button>
      </div>
      <div className="card">
        {list.length ? list.map(c => (
          <div key={c.id} className="client-row" onClick={() => setModal(c)}>
            <div className="client-avatar">{c.name.charAt(0).toUpperCase()}</div>
            <div className="client-main">
              <div className="client-name">{c.name}</div>
              <div className="client-sub">{c.phone || 'Sem telefone'} · {c.visits || 0} visitas</div>
            </div>
            <div className="client-spent">{money(c.total_spent || 0)}</div>
            <span className="chevron">›</span>
          </div>
        )) : (
          <div className="empty"><div className="empty-icon">👥</div><div className="empty-msg">Nenhum cliente cadastrado.</div></div>
        )}
      </div>
      {modal !== null && <ClientModal client={modal} onClose={() => setModal(null)} />}
    </div>
  )
}

function ClientModal({ client, onClose }) {
  const isNew = !client.id
  const [name, setName] = useState(client.name || '')
  const [phone, setPhone] = useState(client.phone || '')
  const [notes, setNotes] = useState(client.notes || '')
  const [saving, setSaving] = useState(false)

  async function save() {
    if (!name.trim()) { alert('Nome obrigatório.'); return }
    setSaving(true)
    const data = {
      id: client.id || uid(),
      name: name.trim(), phone: phone.trim(), notes: notes.trim(),
      total_spent: client.total_spent || 0,
      visits: client.visits || 0,
    }
    await supabase.from('clients').upsert(data)
    setSaving(false)
    onClose()
  }

  async function remove() {
    if (!confirm('Excluir este cliente?')) return
    await supabase.from('clients').delete().eq('id', client.id)
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title">{isNew ? 'Novo cliente' : 'Editar cliente'}</div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="field"><label>Nome</label>
          <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="Nome completo" />
        </div>
        <div className="field"><label>Telefone</label>
          <input className="input" value={phone} onChange={e => setPhone(e.target.value)} placeholder="(21) 9 0000-0000" />
        </div>
        <div className="field"><label>Observações</label>
          <textarea className="input" value={notes} onChange={e => setNotes(e.target.value)} style={{ minHeight: 64, resize: 'vertical' }} placeholder="Preferências, alergias…" />
        </div>
        {!isNew && (
          <div style={{ display: 'flex', justifyContent: 'space-between', background: 'var(--cream2)', borderRadius: 10, padding: '10px 14px', marginBottom: 14, fontSize: 13 }}>
            <span>Gasto total: <b>{money(client.total_spent || 0)}</b></span>
            <span>Visitas: <b>{client.visits || 0}</b></span>
          </div>
        )}
        <div style={{ display: 'flex', gap: 10 }}>
          {!isNew && <button className="btn btn-danger" onClick={remove}>🗑</button>}
          <button className="btn btn-caramel btn-full" onClick={save} disabled={saving}>
            {saving ? 'Salvando…' : '💾 Salvar'}
          </button>
        </div>
      </div>
    </div>
  )
}
