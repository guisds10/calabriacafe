import { useState } from 'react'
import { supabase } from '../lib/supabase'

const money = n => Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const uid = () => 'x' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
const CATS = ['Bebidas', 'Doces', 'Salgados', 'Outros']

export default function Estoque({ products }) {
  const [q, setQ] = useState('')
  const [modal, setModal] = useState(null) // null | product

  const list = products.filter(p => p.name.toLowerCase().includes(q.toLowerCase()))

  return (
    <div className="section-pad">
      <div className="product-search-row">
        <input className="input" placeholder="Buscar produto…" value={q} onChange={e => setQ(e.target.value)} />
        <button className="btn btn-caramel" onClick={() => setModal({})}>+ Novo</button>
      </div>
      <div className="card">
        {list.length ? list.map(p => {
          const low = p.track_stock && p.stock <= p.min_stock
          return (
            <div key={p.id} className="prod-row" onClick={() => setModal(p)}>
              <div className="prod-row-main">
                <div className="prod-row-name">{p.name}</div>
                <div className="prod-row-sub">{p.cat} · {money(p.price)}</div>
              </div>
              <div className="prod-row-right">
                {p.track_stock
                  ? <span className={`pill ${low ? 'pill-red' : 'pill-ok'}`}>{p.stock} {p.unit}</span>
                  : <span className="pill pill-neutral">Sem controle</span>}
              </div>
              <span className="chevron">›</span>
            </div>
          )
        }) : (
          <div className="empty"><div className="empty-icon">📦</div><div className="empty-msg">Nenhum produto encontrado.</div></div>
        )}
      </div>

      {modal !== null && (
        <ProdModal product={modal} onClose={() => setModal(null)} />
      )}
    </div>
  )
}

function ProdModal({ product, onClose }) {
  const isNew = !product.id
  const [name, setName] = useState(product.name || '')
  const [cat, setCat] = useState(product.cat || 'Bebidas')
  const [price, setPrice] = useState(product.price || '')
  const [cost, setCost] = useState(product.cost || '')
  const [trackStock, setTrackStock] = useState(product.track_stock ?? true)
  const [stock, setStock] = useState(product.stock ?? 0)
  const [unit, setUnit] = useState(product.unit || 'un')
  const [minStock, setMinStock] = useState(product.min_stock ?? 0)
  const [saving, setSaving] = useState(false)

  async function save() {
    if (!name.trim()) { alert('Nome obrigatório.'); return }
    setSaving(true)
    const data = {
      id: product.id || uid(),
      name: name.trim(), cat,
      price: parseFloat(price) || 0,
      cost: parseFloat(cost) || 0,
      track_stock: trackStock,
      stock: trackStock ? parseInt(stock) || 0 : 999,
      unit: unit || 'un',
      min_stock: trackStock ? parseInt(minStock) || 0 : 0,
    }
    await supabase.from('products').upsert(data)
    setSaving(false)
    onClose()
  }

  async function remove() {
    if (!confirm('Excluir este produto?')) return
    await supabase.from('products').delete().eq('id', product.id)
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title">{isNew ? 'Novo produto' : 'Editar produto'}</div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="field"><label>Nome</label>
          <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Cappuccino" />
        </div>
        <div className="field"><label>Categoria</label>
          <select className="input" value={cat} onChange={e => setCat(e.target.value)}>
            {CATS.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div className="row-2">
          <div className="field"><label>Preço venda</label>
            <input className="input" type="number" step="0.01" value={price} onChange={e => setPrice(e.target.value)} placeholder="0,00" />
          </div>
          <div className="field"><label>Custo</label>
            <input className="input" type="number" step="0.01" value={cost} onChange={e => setCost(e.target.value)} placeholder="0,00" />
          </div>
        </div>
        <div className="field"><label>Controlar estoque?</label>
          <div className="toggle-row">
            <button className={`toggle-opt ${trackStock ? 'active' : ''}`} onClick={() => setTrackStock(true)}>Sim</button>
            <button className={`toggle-opt ${!trackStock ? 'active' : ''}`} onClick={() => setTrackStock(false)}>Não (ex: café)</button>
          </div>
        </div>
        {trackStock && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            <div className="field"><label>Qtd. atual</label>
              <input className="input" type="number" value={stock} onChange={e => setStock(e.target.value)} />
            </div>
            <div className="field"><label>Unidade</label>
              <input className="input" value={unit} onChange={e => setUnit(e.target.value)} placeholder="un, kg…" />
            </div>
            <div className="field"><label>Mínimo</label>
              <input className="input" type="number" value={minStock} onChange={e => setMinStock(e.target.value)} />
            </div>
          </div>
        )}
        <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
          {!isNew && <button className="btn btn-danger" onClick={remove}>🗑</button>}
          <button className="btn btn-caramel btn-full" onClick={save} disabled={saving}>
            {saving ? 'Salvando…' : '💾 Salvar'}
          </button>
        </div>
      </div>
    </div>
  )
}
