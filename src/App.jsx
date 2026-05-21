import { useState, useEffect, useRef } from 'react'
import { Chart, registerables } from 'chart.js'
import { supabase } from './supabase'
Chart.register(...registerables)

const PAY_TYPES = {
  CP: { label: 'Customer pay', color: '#378ADD' },
  WA: { label: 'Warranty',     color: '#639922' },
  IN: { label: 'Internal',     color: '#BA7517' },
  GW: { label: 'Goodwill',     color: '#D4537E' },
}

const STATUSES = {
  IP: { label: 'In progress',         color: '#185FA5', bg: '#E6F1FB' },
  WP: { label: 'Waiting on parts',    color: '#854F0B', bg: '#FAEEDA' },
  WC: { label: 'Waiting on customer', color: '#993556', bg: '#FBEAF0' },
  DN: { label: 'Complete',            color: '#3B6D11', bg: '#EAF3DE' },
}

function Badge({ type }) {
  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px', borderRadius: 6,
      fontSize: 11, fontWeight: 600,
      background: `var(--${type.toLowerCase()}-bg)`,
      color: `var(--${type.toLowerCase()})`,
    }}>
      {PAY_TYPES[type].label}
    </span>
  )
}

function StatusBadge({ status }) {
  const s = STATUSES[status] || STATUSES.IP
  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px', borderRadius: 6,
      fontSize: 11, fontWeight: 600, background: s.bg, color: s.color,
    }}>
      {s.label}
    </span>
  )
}

function StatCard({ label, value, sub }) {
  return (
    <div style={{ background: 'var(--surface2)', borderRadius: 'var(--radius-md)', padding: '12px 14px' }}>
      <p style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 4 }}>{label}</p>
      <p style={{ fontSize: 22, fontWeight: 600, color: 'var(--text)' }}>{value}</p>
      {sub && <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{sub}</p>}
    </div>
  )
}

function Auth() {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    setLoading(true)
    setMsg('')
    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setMsg(error.message)
    } else {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) setMsg(error.message)
      else setMsg('Check your email to confirm your account, then log in.')
    }
    setLoading(false)
  }

  const labelStyle = { display: 'block', fontSize: 12, color: 'var(--text2)', marginBottom: 4 }

  return (
    <div style={{ maxWidth: 380, margin: '6rem auto', padding: '0 1rem' }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Tech Hours</h1>
      <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 32 }}>Track flagged vs. clock hours by pay type</p>
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {['login', 'signup'].map(m => (
          <button key={m} onClick={() => setMode(m)} style={{
            padding: '6px 16px', borderRadius: 'var(--radius-md)',
            border: '0.5px solid var(--border2)',
            background: mode === m ? 'var(--accent)' : 'transparent',
            color: mode === m ? 'var(--bg)' : 'var(--text2)',
            fontSize: 13, fontWeight: 500, textTransform: 'capitalize'
          }}>{m === 'login' ? 'Log in' : 'Sign up'}</button>
        ))}
      </div>
      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>Email</label>
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
      </div>
      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Password</label>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••"
          onKeyDown={e => e.key === 'Enter' && submit()} />
      </div>
      <button onClick={submit} disabled={loading} style={{
        width: '100%', padding: '10px', background: 'var(--accent)', color: 'var(--bg)',
        border: 'none', borderRadius: 'var(--radius-md)', fontSize: 14, fontWeight: 600
      }}>
        {loading ? 'Please wait...' : mode === 'login' ? 'Log in' : 'Sign up'}
      </button>
      {msg && <p style={{ fontSize: 13, color: msg.includes('Check') ? '#3B6D11' : '#A32D2D', marginTop: 10, textAlign: 'center' }}>{msg}</p>}
    </div>
  )
}

function Dashboard({ jobs }) {
  const chartRef = useRef(null)
  const chartInstance = useRef(null)

  const now = new Date()
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - ((now.getDay() + 6) % 7))
  weekStart.setHours(0, 0, 0, 0)

  const weekJobs = jobs.filter(j => new Date(j.date) >= weekStart)
  const totFlag = weekJobs.reduce((s, j) => s + j.flagged, 0)
  const totClock = weekJobs.reduce((s, j) => s + j.clock, 0)
  const eff = totClock > 0 ? (totFlag / totClock * 100) : 0

  const byPay = {}
  Object.keys(PAY_TYPES).forEach(p => { byPay[p] = 0 })
  weekJobs.forEach(j => { byPay[j.pay] += j.flagged })
  const maxPay = Math.max(...Object.values(byPay), 0.1)

  const effColor = eff >= 110 ? '#3B6D11' : eff >= 90 ? '#854F0B' : '#A32D2D'
  const effBg = eff >= 110 ? '#EAF3DE' : eff >= 90 ? '#FAEEDA' : '#FCEBEB'
  const effLabel = eff >= 110 ? 'Excellent' : eff >= 90 ? 'On track' : 'Below 100%'

  const trendLabels = []
  const trendData = []
  for (let i = 3; i >= 0; i--) {
    const ws = new Date(weekStart)
    ws.setDate(ws.getDate() - i * 7)
    const we = new Date(ws)
    we.setDate(ws.getDate() + 7)
    const hrs = jobs.filter(j => {
      const d = new Date(j.date)
      return d >= ws && d < we
    }).reduce((s, j) => s + j.flagged, 0)
    trendLabels.push(i === 0 ? 'This week' : `${i}w ago`)
    trendData.push(parseFloat(hrs.toFixed(1)))
  }

  const byStatus = {}
  Object.keys(STATUSES).forEach(s => { byStatus[s] = 0 })
  weekJobs.forEach(j => { if (j.status) byStatus[j.status]++ })

  useEffect(() => {
    if (!chartRef.current) return
    if (chartInstance.current) chartInstance.current.destroy()
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    chartInstance.current = new Chart(chartRef.current, {
      type: 'line',
      data: {
        labels: trendLabels,
        datasets: [{
          label: 'Flagged hrs',
          data: trendData,
          borderColor: isDark ? '#85B7EB' : '#185FA5',
          backgroundColor: isDark ? '#85B7EB22' : '#185FA522',
          borderWidth: 2, pointRadius: 4, fill: true, tension: 0.35,
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: '#888' }, grid: { color: 'rgba(128,128,128,0.1)' } },
          y: { ticks: { color: '#888' }, grid: { color: 'rgba(128,128,128,0.1)' }, beginAtZero: true }
        }
      }
    })
    return () => { if (chartInstance.current) chartInstance.current.destroy() }
  }, [jobs])

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, marginBottom: 24 }}>
        <StatCard label="Flagged this week" value={totFlag.toFixed(1)} sub="hrs" />
        <StatCard label="Clock this week" value={totClock.toFixed(1)} sub="hrs" />
        <StatCard label="Jobs this week" value={weekJobs.length} />
        <StatCard label="All-time jobs" value={jobs.length} />
      </div>

      {weekJobs.some(j => j.status) && (
        <>
          <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Job status this week</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
            {Object.entries(STATUSES).map(([key, s]) => byStatus[key] > 0 && (
              <span key={key} style={{ fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 99, background: s.bg, color: s.color }}>
                {s.label} · {byStatus[key]}
              </span>
            ))}
          </div>
        </>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>This week by pay type</p>
        {totClock > 0 && (
          <span style={{ fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 99, background: effBg, color: effColor }}>
            {eff.toFixed(0)}% — {effLabel}
          </span>
        )}
      </div>

      {Object.entries(PAY_TYPES).map(([key, { color }]) => (
        <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <span style={{ fontSize: 12, width: 110, flexShrink: 0 }}><Badge type={key} /></span>
          <div style={{ flex: 1, background: 'var(--surface2)', borderRadius: 4, height: 8, overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: 4, background: color, width: `${(byPay[key] / maxPay * 100).toFixed(1)}%`, transition: 'width 0.4s' }} />
          </div>
          <span style={{ fontSize: 13, fontWeight: 500, width: 44, textAlign: 'right', flexShrink: 0 }}>{byPay[key].toFixed(1)}h</span>
        </div>
      ))}

      <hr style={{ border: 'none', borderTop: '0.5px solid var(--border)', margin: '24px 0' }} />
      <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Weekly trend (flagged hrs)</p>
      <div style={{ position: 'relative', height: 200 }}>
        <canvas ref={chartRef} role="img" aria-label="Line chart of flagged hours over 4 weeks" />
      </div>
    </div>
  )
}

function LogJob({ onAdd }) {
  const emptyLine = () => ({ id: Date.now() + Math.random(), description: '', flagged: '', clock: '' })
  const [form, setForm] = useState({ ro: '', tag: '', vehicle: '', pay: 'CP', status: 'IP', notes: '' })
  const [lines, setLines] = useState([emptyLine()])
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)

  const setForm_ = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const setLine = (id, k, v) => setLines(ls => ls.map(l => l.id === id ? { ...l, [k]: v } : l))
  const addLine = () => setLines(ls => [...ls, emptyLine()])
  const removeLine = (id) => setLines(ls => ls.filter(l => l.id !== id))

  const totFlag = lines.reduce((s, l) => s + (parseFloat(l.flagged) || 0), 0)
  const totClock = lines.reduce((s, l) => s + (parseFloat(l.clock) || 0), 0)

  const submit = async () => {
    if (!form.ro) { setMsg('error'); return }
    if (lines.some(l => !l.description)) { setMsg('errorlines'); return }
    setLoading(true)
    await onAdd({
      ...form,
      flagged: totFlag,
      clock: totClock,
      lines: lines.map(l => ({ description: l.description, flagged: parseFloat(l.flagged) || 0, clock: parseFloat(l.clock) || 0 })),
    })
    setForm({ ro: '', tag: '', vehicle: '', pay: 'CP', status: 'IP', notes: '' })
    setLines([emptyLine()])
    setMsg('success')
    setLoading(false)
    setTimeout(() => setMsg(''), 2500)
  }

  const labelStyle = { display: 'block', fontSize: 12, color: 'var(--text2)', marginBottom: 4 }
  const fieldStyle = { marginBottom: 12 }

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div style={fieldStyle}>
          <label style={labelStyle}>RO number</label>
          <input value={form.ro} onChange={e => setForm_('ro', e.target.value)} placeholder="e.g. 123456" />
        </div>
        <div style={fieldStyle}>
          <label style={labelStyle}>Tag number</label>
          <input value={form.tag} onChange={e => setForm_('tag', e.target.value)} placeholder="e.g. T-482" />
        </div>
        <div style={{ ...fieldStyle, gridColumn: '1 / -1' }}>
          <label style={labelStyle}>Vehicle</label>
          <input value={form.vehicle} onChange={e => setForm_('vehicle', e.target.value)} placeholder="e.g. 2021 VW Tiguan" />
        </div>
        <div style={fieldStyle}>
          <label style={labelStyle}>Pay type</label>
          <select value={form.pay} onChange={e => setForm_('pay', e.target.value)}>
            {Object.entries(PAY_TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
        <div style={fieldStyle}>
          <label style={labelStyle}>Status</label>
          <select value={form.status} onChange={e => setForm_('status', e.target.value)}>
            {Object.entries(STATUSES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
      </div>

      <div style={{ margin: '4px 0 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Labour lines</p>
          <button onClick={addLine} style={{
            padding: '4px 12px', borderRadius: 'var(--radius-md)',
            border: '0.5px solid var(--border2)', background: 'transparent',
            color: 'var(--text2)', fontSize: 12
          }}>+ Add line</button>
        </div>

        {lines.map((line, idx) => (
          <div key={line.id} style={{
            background: 'var(--surface2)', borderRadius: 'var(--radius-md)',
            padding: '10px 12px', marginBottom: 8,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600, minWidth: 20 }}>#{idx + 1}</span>
              <input
                value={line.description}
                onChange={e => setLine(line.id, 'description', e.target.value)}
                placeholder="e.g. DSG fluid and filter"
                style={{ flex: 1 }}
              />
              {lines.length > 1 && (
                <button onClick={() => removeLine(line.id)} style={{
                  background: 'none', border: 'none', color: 'var(--text3)',
                  fontSize: 16, padding: '0 4px', cursor: 'pointer', lineHeight: 1
                }}>✕</button>
              )}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div>
                <label style={{ ...labelStyle, fontSize: 11 }}>Flagged hrs</label>
                <input
                  type="number" step="0.1" min="0"
                  value={line.flagged}
                  onChange={e => setLine(line.id, 'flagged', e.target.value)}
                  placeholder="0.0"
                />
              </div>
              <div>
                <label style={{ ...labelStyle, fontSize: 11 }}>Clock hrs</label>
                <input
                  type="number" step="0.1" min="0"
                  value={line.clock}
                  onChange={e => setLine(line.id, 'clock', e.target.value)}
                  placeholder="0.0"
                />
              </div>
            </div>
          </div>
        ))}

        <div style={{
          display: 'flex', justifyContent: 'flex-end', gap: 16,
          padding: '8px 12px', background: 'var(--surface2)',
          borderRadius: 'var(--radius-md)', fontSize: 13, fontWeight: 600
        }}>
          <span style={{ color: 'var(--text2)' }}>Total flagged: <span style={{ color: 'var(--text)' }}>{totFlag.toFixed(1)} hrs</span></span>
          <span style={{ color: 'var(--text2)' }}>Total clock: <span style={{ color: 'var(--text)' }}>{totClock.toFixed(1)} hrs</span></span>
        </div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>Notes</label>
        <textarea value={form.notes} onChange={e => setForm_('notes', e.target.value)} placeholder="e.g. needs follow up, customer advised..." style={{ height: 60 }} />
      </div>

      <button onClick={submit} disabled={loading} style={{
        width: '100%', padding: '10px', background: 'var(--accent)', color: 'var(--bg)',
        border: 'none', borderRadius: 'var(--radius-md)', fontSize: 14, fontWeight: 600, marginTop: 4
      }}>
        {loading ? 'Saving...' : '+ Add job'}
      </button>
      {msg === 'success' && <p style={{ textAlign: 'center', fontSize: 13, color: '#3B6D11', marginTop: 8 }}>Job logged!</p>}
      {msg === 'error' && <p style={{ textAlign: 'center', fontSize: 13, color: '#A32D2D', marginTop: 8 }}>Please fill in the RO number.</p>}
      {msg === 'errorlines' && <p style={{ textAlign: 'center', fontSize: 13, color: '#A32D2D', marginTop: 8 }}>Please add a description to every labour line.</p>}
    </div>
  )
}

function History({ jobs, onDelete, onUpdateStatus }) {
  const [payFilter, setPayFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [sort, setSort] = useState('recent')
  const [expanded, setExpanded] = useState(null)

  let list = [...jobs]
  if (payFilter !== 'ALL') list = list.filter(j => j.pay === payFilter)
  if (statusFilter !== 'ALL') list = list.filter(j => j.status === statusFilter)
  if (sort === 'recent') list.sort((a, b) => new Date(b.date) - new Date(a.date))
  if (sort === 'flagged') list.sort((a, b) => b.flagged - a.flagged)
  if (sort === 'eff') list.sort((a, b) => (b.flagged / b.clock) - (a.flagged / a.clock))

  const sortBtn = (key, label) => (
    <button onClick={() => setSort(key)} style={{
      padding: '5px 12px', borderRadius: 'var(--radius-md)',
      border: '0.5px solid var(--border2)', fontSize: 12,
      background: sort === key ? 'var(--surface2)' : 'transparent',
      color: sort === key ? 'var(--text)' : 'var(--text2)',
      fontWeight: sort === key ? 600 : 400,
    }}>{label}</button>
  )

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <select value={payFilter} onChange={e => setPayFilter(e.target.value)} style={{ width: 'auto' }}>
          <option value="ALL">All pay types</option>
          {Object.entries(PAY_TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ width: 'auto' }}>
          <option value="ALL">All statuses</option>
          {Object.entries(STATUSES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {sortBtn('recent', '🕐 Recent')}
        {sortBtn('flagged', '📊 Most hrs')}
        {sortBtn('eff', '📈 Best eff.')}
      </div>

      {list.length === 0 && (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text3)', fontSize: 14 }}>
          No jobs logged yet
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {list.map(j => {
          const eff = j.clock > 0 ? (j.flagged / j.clock * 100).toFixed(0) : '—'
          const d = new Date(j.date).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })
          const isOpen = expanded === j.id
          const statusColor = STATUSES[j.status]?.color || '#888'
          const jobLines = j.lines || []
          return (
            <div key={j.id} style={{
              background: 'var(--surface)', border: '0.5px solid var(--border)',
              borderRadius: 'var(--radius-lg)', overflow: 'hidden',
              borderLeft: `3px solid ${statusColor}`,
            }}>
              <div
                onClick={() => setExpanded(isOpen ? null : j.id)}
                style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 80 }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>RO {j.ro}</span>
                  {j.tag && <span style={{ fontSize: 11, color: 'var(--text2)' }}>Tag {j.tag}</span>}
                </div>
                {j.vehicle && <span style={{ fontSize: 12, color: 'var(--text2)', flex: 1, minWidth: 80 }}>{j.vehicle}</span>}
                <Badge type={j.pay} />
                {j.status && <StatusBadge status={j.status} />}
                <span style={{ fontSize: 13, fontWeight: 500, marginLeft: 'auto' }}>{j.flagged.toFixed(1)}<span style={{ fontSize: 11, color: 'var(--text3)' }}> flag</span></span>
                <span style={{ fontSize: 13, fontWeight: 500 }}>{j.clock.toFixed(1)}<span style={{ fontSize: 11, color: 'var(--text3)' }}> clk</span></span>
                <span style={{ fontSize: 13, fontWeight: 500 }}>{eff}<span style={{ fontSize: 11, color: 'var(--text3)' }}>%</span></span>
                <span style={{ fontSize: 11, color: 'var(--text3)' }}>{d}</span>
              </div>

              {isOpen && (
                <div style={{ padding: '0 16px 14px', borderTop: '0.5px solid var(--border)' }}>
                  {jobLines.length > 0 && (
                    <div style={{ marginTop: 12, marginBottom: 12 }}>
                      <p style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Labour lines</p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {jobLines.map((line, idx) => (
                          <div key={idx} style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            background: 'var(--surface2)', borderRadius: 'var(--radius-md)',
                            padding: '8px 12px', flexWrap: 'wrap'
                          }}>
                            <span style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600, minWidth: 20 }}>#{idx + 1}</span>
                            <span style={{ fontSize: 13, color: 'var(--text)', flex: 1 }}>{line.description}</span>
                            <span style={{ fontSize: 12, fontWeight: 500 }}>{line.flagged.toFixed(1)}<span style={{ fontSize: 11, color: 'var(--text3)' }}> flag</span></span>
                            <span style={{ fontSize: 12, fontWeight: 500 }}>{line.clock.toFixed(1)}<span style={{ fontSize: 11, color: 'var(--text3)' }}> clk</span></span>
                            <span style={{ fontSize: 12, color: line.clock > 0 && (line.flagged / line.clock) >= 1 ? '#3B6D11' : '#A32D2D', fontWeight: 600 }}>
                              {line.clock > 0 ? (line.flagged / line.clock * 100).toFixed(0) : '—'}%
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {j.notes && <p style={{ fontSize: 13, color: 'var(--text2)', margin: '6px 0 12px' }}><strong>Notes:</strong> {j.notes}</p>}
                  <div style={{ display: 'flex', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                    <select
                      value={j.status || 'IP'}
                      onChange={e => onUpdateStatus(j.id, e.target.value)}
                      style={{ width: 'auto', fontSize: 12 }}
                      onClick={e => e.stopPropagation()}
                    >
                      {Object.entries(STATUSES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                    <button
                      onClick={e => { e.stopPropagation(); onDelete(j.id) }}
                      style={{ padding: '5px 12px', borderRadius: 'var(--radius-md)', border: '0.5px solid #E24B4A', color: '#E24B4A', background: 'transparent', fontSize: 12 }}
                    >
                      Delete job
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function App() {
  const [session, setSession] = useState(null)
  const [tab, setTab] = useState('dashboard')
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (session) fetchJobs()
  }, [session])

  const fetchJobs = async () => {
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .order('date', { ascending: false })
    if (!error) setJobs(data)
  }

  const addJob = async (form) => {
    const { data, error } = await supabase.from('jobs').insert([{
      ...form,
      id: Date.now(),
      user_id: session.user.id,
      date: new Date().toISOString(),
    }]).select()
    if (!error) { setJobs(j => [data[0], ...j]); setTab('dashboard') }
  }

  const deleteJob = async (id) => {
    await supabase.from('jobs').delete().eq('id', id)
    setJobs(j => j.filter(x => x.id !== id))
  }

  const updateStatus = async (id, status) => {
    await supabase.from('jobs').update({ status }).eq('id', id)
    setJobs(j => j.map(x => x.id === id ? { ...x, status } : x))
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setJobs([])
    setTab('dashboard')
  }

  if (loading) return <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text2)' }}>Loading...</div>
  if (!session) return <Auth />

  const tabs = [['dashboard', 'Dashboard'], ['log', 'Log job'], ['history', 'History']]

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '2rem 1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 2 }}>Tech Hours</h1>
          <p style={{ fontSize: 13, color: 'var(--text2)' }}>{session.user.email}</p>
        </div>
        <button onClick={signOut} style={{
          padding: '6px 14px', borderRadius: 'var(--radius-md)',
          border: '0.5px solid var(--border2)', background: 'transparent',
          color: 'var(--text2)', fontSize: 12
        }}>Sign out</button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {tabs.map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} style={{
            padding: '6px 16px', borderRadius: 'var(--radius-md)',
            border: '0.5px solid var(--border2)',
            background: tab === key ? 'var(--accent)' : 'transparent',
            color: tab === key ? 'var(--bg)' : 'var(--text2)',
            fontSize: 13, fontWeight: 500,
          }}>{label}</button>
        ))}
      </div>

      {tab === 'dashboard' && <Dashboard jobs={jobs} />}
      {tab === 'log' && <LogJob onAdd={addJob} />}
      {tab === 'history' && <History jobs={jobs} onDelete={deleteJob} onUpdateStatus={updateStatus} />}
    </div>
  )
}