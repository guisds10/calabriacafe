import { useState } from 'react'
import { supabase } from '../lib/supabase'

const money = n => Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const uid = () => 'x' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
const CATS = ['Bebidas', 'Doces', 'Salgados', 'Outros']
const PAYMENTS = ['Dinheiro', 'Pix', 'Débito', 'Crédito']

export default function PDV({ products, tables, orders, clients, onSale }) {
  const [mode, setMode] = useState('mesas') // mesas | balcao
  const [activeTable, setActiveTable] = useState(null)
  const [balcaoCart, setBalcaoCart] = useState([])
  const [cat, setCat] = useState('Todos')
  const [q, setQ] = useState('')
  const [checkout, setCheckout] = useState(false)
  const [payment, setPayment] = useState('Dinheiro')
  const [clientId, setClientId] = useState('')
  const [saving, setSaving] = useState(false)

  const cart = mode === 'balcao' ? balcaoCart : (orders[activeTable] || [])

  async function setTableCart(tableId, items) {
    if (items.length === 0) {
      await supabase.from('orders').delete().eq('table_id', tableId)
    } else {
      await supabase.from('orders').upsert({ table_id: tableId, items, updated_at: new Date().toISOString() })
    }
  }

  async function addToCart(productId) {
    const p = products.find(x => x.id === productId)
    if (!p) return
    if (mode === 'balcao') {
      setBalcaoCart(prev => {
        const ex = prev.find(c => c.product_id === productId)
        if (ex) return prev.map(c => c.product_id === productId ? { ...c, qty: c.qty + 1 } : c)
        return [...prev, { product_id: productId, name: p.name, price: Number(p.price), qty: 1 }]
      })
    } else {
      const curr = orders[activeTable] || []
      const ex = curr.find(c => c.product_id === productId)
      const next = ex
        ? curr.map(c => c.product_id === productId ? { ...c, qty: c.qty + 1 } : c)
        : [...curr, { product_id: productId, name: p.name, price: Number(p.price), qty: 1 }]
      await setTableCart(activeTable, next)
    }
  }

  async function changeQty(productId, delta) {
    if (mode === 'balcao') {
      setBalcaoCart(prev => prev.map(c => c.product_id === productId ? { ...c, qty: c.qty + delta } : c).filter(c => c.qty > 0))
    } else {
      const next = (orders[activeTable] || [])
        .map(c => c.product_id === productId ? { ...c, qty: c.qty + delta } : c)
        .filter(c => c.qty > 0)
      await setTableCart(activeTable, next)
    }
  }

  async function confirmSale() {
    setSaving(true)
    const total = cart.reduce((s, c) => s + c.price * c.qty, 0)
    const source = mode === 'balcao' ? 'Balcão' : tables.find(t => t.id === activeTable)?.label || 'Mesa'
    const id = uid()

    await supabase.from('sales').insert({
      id, date: new Date().toISOString().slice(0, 10),
      time: new Date().toISOString(), items: cart, total, payment,
      client_id: clientId || null, source
    })

    // baixa de estoque
    for (const it of cart) {
      const p = products.find(x => x.id === it.product_id)
      if (p && p.track_stock) {
        await supabase.from('products').update({ stock: Math.max(0, p.stock - it.qty) }).eq('id', p.id)
      }
    }

    // atualiza cliente
    if (clientId) {
      const cl = clients.find(c => c.id === clientId)
      if (cl) {
        await supabase.from('clients').update({
          total_spent: Number(cl.total_spent || 0) + total,
          visits: (cl.visits || 0) + 1
        }).eq('id', cl.id)
      }
    }

    // limpa carrinho
    if (mode === 'mesas') {
      await setTableCart(activeTable, [])
      setActiveTable(null)
    } else {
      setBalcaoCart([])
    }

    setCheckout(false)
    setClientId('')
    setPayment('Dinheiro')
    setSaving(false)
    onSale()
  }

  const cartTotal = cart.reduce((s, c) => s + c.price * c.qty, 0)
  const filtered = products.filter(p => {
    const mc = cat === 'Todos' || p.cat === cat
    const mq = p.name.toLowerCase().includes(q.toLowerCase())
    return mc && mq
  })

  // ── MESAS VIEW ──
  if (mode === 'mesas' && !activeTable) {
    return (
      <div className="section-pad">
        <div className="mode-switch">
          <button className="mode-btn active" onClick={() => setMode('mesas')}>🪑 Mesas</button>
          <button className="mode-btn" onClick={() => { setMode('balcao'); setActiveTable(null) }}>🛍 Balcão</button>
        </div>
        <div className="table-grid">
          {tables.map(t => {
            const items = orders[t.id] || []
            const tot = items.reduce((s, c) => s + c.price * c.qty, 0)
            const occ = items.length > 0
            return (
              <button key={t.id} className={`table-card ${occ ? 'occupied' : ''}`} onClick={() => setActiveTable(t.id)}>
                <div className="table-icon">{occ ? '🪑' : '○'}</div>
                <div className="table-name">{t.label}</div>
                <div className="table-info">{occ ? `${money(tot)} em aberto` : 'Livre'}</div>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  // ── PRODUCTS VIEW ──
  const sourceName = mode === 'mesas' ? tables.find(t => t.id === activeTable)?.label : 'Balcão'
  return (
    <div className="section-pad">
      <div className="mode-switch">
        <button className={`mode-btn ${mode==='mesas'?'active':''}`} onClick={() => { setMode('mesas'); setActiveTable(null) }}>🪑 Mesas</button>
        <button className={`mode-btn ${mode==='balcao'?'active':''}`} onClick={() => { setMode('balcao'); setActiveTable(null) }}>🛍 Balcão</button>
      </div>
      {activeTable && (
        <button className="back-btn" onClick={() => setActiveTable(null)}>← {sourceName}</button>
      )}
      <div className="product-search-row">
        <input className="input" placeholder="Buscar produto…" value={q} onChange={e => setQ(e.target.value)} />
      </div>
      <div className="cat-pills">
        {['Todos', ...CATS].map(c => (
          <button key={c} className={`cat-pill ${cat === c ? 'active' : ''}`} onClick={() => setCat(c)}>{c}</button>
        ))}
      </div>
      <div className="product-grid">
        {filtered.map(p => {
          const out = p.track_stock && p.stock <= 0
          return (
            <button key={p.id} className={`product-card ${out ? 'out' : ''}`} onClick={() => !out && addToCart(p.id)} disabled={out}>
              <div className="p-name">{p.name}</div>
              <div className="p-price">{money(p.price)}</div>
              {out ? <div className="p-stock red">Sem estoque</div>
                : p.track_stock ? <div className="p-stock">{p.stock} {p.unit}</div> : null}
            </button>
          )
        })}
      </div>

      {cart.length > 0 && (
        <div className="cart-bar">
          <div className="cart-items">
            {cart.map(c => (
              <div key={c.product_id} className="cart-row">
                <div className="cart-name">{c.name}</div>
                <div className="qty-ctrl">
                  <button className="qty-btn" onClick={() => changeQty(c.product_id, -1)}>−</button>
                  <span className="qty-num">{c.qty}</span>
                  <button className="qty-btn" onClick={() => changeQty(c.product_id, 1)}>+</button>
                </div>
                <div className="cart-item-total">{money(c.price * c.qty)}</div>
              </div>
            ))}
          </div>
          <div className="cart-total-row">
            <span className="cart-total-label">Total</span>
            <span className="cart-total-val">{money(cartTotal)}</span>
          </div>
          <button className="btn btn-caramel btn-full" onClick={() => setCheckout(true)}>✓ Finalizar venda</button>
        </div>
      )}

      {checkout && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setCheckout(false)}>
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">Finalizar venda</div>
              <button className="modal-close" onClick={() => setCheckout(false)}>×</button>
            </div>
            <div className="total-display">
              <div className="total-label-sm">Total a receber</div>
              <div className="total-big">{money(cartTotal)}</div>
            </div>
            <div className="field"><label>Forma de pagamento</label>
              <div className="payment-grid">
                {PAYMENTS.map(p => (
                  <button key={p} className={`pay-btn ${payment === p ? 'active' : ''}`} onClick={() => setPayment(p)}>{p}</button>
                ))}
              </div>
            </div>
            <div className="field"><label>Cliente (opcional)</label>
              <select className="input" value={clientId} onChange={e => setClientId(e.target.value)}>
                <option value="">Sem identificação</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <button className="btn btn-caramel btn-full" onClick={confirmSale} disabled={saving}>
              {saving ? 'Salvando…' : `✓ Confirmar venda de ${money(cartTotal)}`}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
