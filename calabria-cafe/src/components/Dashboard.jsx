const money = n => Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const todayStr = () => new Date().toISOString().slice(0, 10)

export default function Dashboard({ products, sales }) {
  const today = todayStr()
  const todaySales = sales.filter(s => s.date === today)
  const total = todaySales.reduce((s, x) => s + Number(x.total), 0)
  const count = todaySales.length
  const avg = count ? total / count : 0
  const lowStock = products.filter(p => p.track_stock && p.stock <= p.min_stock)

  // 7-day chart
  const days = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i)
    const k = d.toISOString().slice(0, 10)
    const t = sales.filter(s => s.date === k).reduce((s, x) => s + Number(x.total), 0)
    days.push({ lbl: d.toLocaleDateString('pt-BR', { weekday: 'short' }).slice(0, 3), total: t, isToday: k === today })
  }
  const maxV = Math.max(...days.map(d => d.total), 1)

  // top products
  const counts = {}
  sales.forEach(s => (s.items || []).forEach(it => {
    counts[it.name] = (counts[it.name] || 0) + it.qty
  }))
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5)

  return (
    <div className="section-pad">
      <div className="stat-grid">
        <div className="stat-tile">
          <div className="stat-label">💰 Vendido hoje</div>
          <div className="stat-value accent">{money(total)}</div>
        </div>
        <div className="stat-tile">
          <div className="stat-label">🧾 Pedidos hoje</div>
          <div className="stat-value">{count}</div>
        </div>
        <div className="stat-tile">
          <div className="stat-label">📈 Ticket médio</div>
          <div className="stat-value accent">{money(avg)}</div>
        </div>
        <div className="stat-tile">
          <div className="stat-label">⚠️ Estoque baixo</div>
          <div className="stat-value" style={{ color: lowStock.length ? 'var(--red)' : 'var(--green)' }}>{lowStock.length}</div>
        </div>
      </div>

      <div className="section-title">Últimos 7 dias</div>
      <div className="card" style={{ padding: '16px' }}>
        <div className="bar-chart">
          {days.map((d, i) => (
            <div key={i} className="bar-col">
              <div
                className={`bar-fill ${d.isToday ? 'today' : ''}`}
                style={{ height: `${Math.max(4, (d.total / maxV) * 88)}px` }}
                title={money(d.total)}
              />
              <div className="bar-lbl">{d.lbl}</div>
            </div>
          ))}
        </div>
      </div>

      {lowStock.length > 0 && <>
        <div className="section-title" style={{ marginTop: 18 }}>Alertas de estoque</div>
        {lowStock.map(p => (
          <div key={p.id} className="alert-warn">⚠️ <b>{p.name}</b>: apenas {p.stock} {p.unit} em estoque</div>
        ))}
      </>}

      <div className="section-title" style={{ marginTop: 18 }}>Mais vendidos (geral)</div>
      <div className="card">
        {top.length ? top.map(([name, qty], i) => (
          <div key={name} className="top-row">
            <div className="top-rank">{i + 1}</div>
            <div className="top-name">{name}</div>
            <div className="top-qty">{qty}×</div>
          </div>
        )) : <div className="empty"><div className="empty-msg">Sem vendas ainda.</div></div>}
      </div>
    </div>
  )
}
