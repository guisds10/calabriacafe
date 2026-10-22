import { useState, useEffect, useCallback } from 'react'
import { supabase } from './lib/supabase'
import Dashboard from './components/Dashboard'
import PDV from './components/PDV'
import Estoque from './components/Estoque'
import Clientes from './components/Clientes'

const PAGES = ['dash', 'pdv', 'estoque', 'clientes']

export default function App() {
  const [page, setPage] = useState('dash')
  const [products, setProducts] = useState([])
  const [clients, setClients] = useState([])
  const [sales, setSales] = useState([])
  const [tables, setTables] = useState([])
  const [orders, setOrders] = useState({}) // { tableId: items[] }
  const [loading, setLoading] = useState(true)
  const [clock, setClock] = useState('')

  // ── CLOCK ──
  useEffect(() => {
    const tick = () => setClock(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }))
    tick()
    const id = setInterval(tick, 30000)
    return () => clearInterval(id)
  }, [])

  // ── LOAD ──
  useEffect(() => {
    async function load() {
      const [p, c, s, t, o] = await Promise.all([
        supabase.from('products').select('*').order('name'),
        supabase.from('clients').select('*').order('name'),
        supabase.from('sales').select('*').order('created_at', { ascending: false }),
        supabase.from('tables').select('*').order('id'),
        supabase.from('orders').select('*'),
      ])
      setProducts(p.data || [])
      setClients(c.data || [])
      setSales(s.data || [])
      setTables(t.data || [])
      const ordMap = {}
      ;(o.data || []).forEach(r => { ordMap[r.table_id] = r.items || [] })
      setOrders(ordMap)
      setLoading(false)
    }
    load()

    // ── REALTIME ──
    const chProducts = supabase.channel('rt-products')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
        supabase.from('products').select('*').order('name').then(r => setProducts(r.data || []))
      }).subscribe()

    const chClients = supabase.channel('rt-clients')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clients' }, () => {
        supabase.from('clients').select('*').order('name').then(r => setClients(r.data || []))
      }).subscribe()

    const chOrders = supabase.channel('rt-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, payload => {
        const row = payload.new || payload.old
        if (!row) return
        if (payload.eventType === 'DELETE') {
          setOrders(prev => { const n = {...prev}; delete n[row.table_id]; return n })
        } else {
          setOrders(prev => ({ ...prev, [row.table_id]: row.items || [] }))
        }
      }).subscribe()

    return () => {
      supabase.removeChannel(chProducts)
      supabase.removeChannel(chClients)
      supabase.removeChannel(chOrders)
    }
  }, [])

  const refreshSales = useCallback(() => {
    supabase.from('sales').select('*').order('created_at', { ascending: false })
      .then(r => setSales(r.data || []))
  }, [])

  if (loading) return (
    <div className="loading">
      <div className="spinner" />
      <span>Carregando…</span>
    </div>
  )

  return (
    <div className="app">
      <header className="header">
        <div className="header-brand">
          <div className="header-logo">☕</div>
          <div>
            <div className="header-name">Calábria Café</div>
            <div className="header-sub">Gestão</div>
          </div>
        </div>
        <div className="header-time">{clock}</div>
      </header>

      <main className="content">
        {page === 'dash'     && <Dashboard products={products} sales={sales} />}
        {page === 'pdv'      && <PDV products={products} tables={tables} orders={orders} clients={clients} onSale={refreshSales} />}
        {page === 'estoque'  && <Estoque products={products} />}
        {page === 'clientes' && <Clientes clients={clients} />}
      </main>

      <nav className="nav">
        <NavBtn id="dash"     label="Painel"   active={page==='dash'}     onClick={() => setPage('dash')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="9" height="9" rx="1"/><rect x="13" y="3" width="9" height="9" rx="1"/><rect x="13" y="14" width="9" height="7" rx="1"/><rect x="2" y="14" width="9" height="7" rx="1"/></svg>
        </NavBtn>
        <NavBtn id="pdv"      label="Vendas"   active={page==='pdv'}      onClick={() => setPage('pdv')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
        </NavBtn>
        <NavBtn id="estoque"  label="Estoque"  active={page==='estoque'}  onClick={() => setPage('estoque')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
        </NavBtn>
        <NavBtn id="clientes" label="Clientes" active={page==='clientes'} onClick={() => setPage('clientes')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
        </NavBtn>
      </nav>
    </div>
  )
}

function NavBtn({ label, active, onClick, children }) {
  return (
    <button className={`nav-btn ${active ? 'active' : ''}`} onClick={onClick}>
      <span className="nav-icon">{children}</span>
      <span className="nav-label">{label}</span>
    </button>
  )
}
