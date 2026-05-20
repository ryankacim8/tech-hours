import { useState, useEffect, useRef } from 'react'
import { Chart, registerables } from 'chart.js'
Chart.register(...registerables)

const PAY_TYPES = {
  CP: { label: 'Customer pay', color: '#378ADD' },
  WA: { label: 'Warranty',     color: '#639922' },
  IN: { label: 'Internal',     color: '#BA7517' },
  GW: { label: 'Goodwill',     color: '#D4537E' },
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

function StatCard({ label, value, sub }) {
  return (
    <div style={{ background: 'var(--surface2)', borderRadius: 'var(--radius-md)', padding: '12px 14px' }}>
      <p style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 4 }}>{label}</p>
      <p style={{ fontSize: 22, fontWeight: 600, color: 'var(--text)' }}>{value}</p>
      {sub && <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{sub}</p>}
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

  // Build 4-week trend data
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
          borderWidth: 2,
          pointRadius: 4,
          fill: true,
          tension: 0.35,
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

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>This week by pay type</p>
        {totClock > 0 && (
          <span style={{ fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 99, background: effBg, color: effColor }}>
            {eff.toFixed(0)}% — {effLabel}
          </span>
        )}
      </div>

      {Object.entries(PAY_TYPES).map(([key, { label, color }]) => (
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
  const [form, setForm] = useState({ ro: '', pay: 'CP', flagged: '', clock: '', desc: '' })
  const [msg, setMsg] = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const submit = () => {
    if (!form.ro || !form.flagged || !form.clock) {
      setMsg('error'); return
    }
    onAdd({ id: Date.now(), ...form, flagged: parseFloat(form.flagged), clock: parseFloat(form.clock), date: new Date().toISOString() })
    setForm({ ro: '', pay: 'CP', flagged: '', clock: '', desc: '' })
    setMsg('success')
    setTimeout(() => setMsg(''), 2500)
  }

  const fieldStyle = { marginBottom: 12 }
  const labelStyle = { display: 'block', fontSize: 12, color: 'var(--text2)', marginBottom: 4 }

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div style={fieldStyle}>
          <label style={labelStyle}>RO number</label>
          <input value={form.ro} onChange={e => set('ro', e.target.value)} placeholder="e.g. 123456" />
        </div>
        <div style={fieldStyle}>
          <label style={labelStyle}>Pay type</label>
          <select value={form.pay} onChange={e => set('pay', e.target.value)}>
            {Object.entries(PAY_TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
        <div style={fieldStyle}>
          <label style={labelStyle}>Flagged hrs</label>
          <input type="number" value={form.flagged} onChange={e => set('flagged', e.target.value)} placeholder="e.g. 2.5" step="0.1" min="0" />
        </div>
        <div style={fieldStyle}>
          <label style={labelStyle}>Clock hrs</label>
          <input type="number" value={form.clock} onChange={e => set('clock', e.target.value)} placeholder="e.g. 1.8" step="0.1" min="0" />
        </div>
        <div style={{ ...fieldStyle, gridColumn: '1 / -1' }}>
          <label style={labelStyle}>Job description</label>
          <textarea value={form.desc} onChange={e => set('desc', e.target.value)} placeholder="e.g. DSG service, brake fluid flush, oil service..." style={{ height: 70 }} />
        </div>
      </div>
      <button onClick={submit} style={{
        width: '100%', padding: '10px', background: 'var(--accent)', color: 'var(--bg)',
        border: 'none', borderRadius: 'var(--radius-md)', fontSize: 14, fontWeight: 600, marginTop: 4
      }}>
        + Add job
      </button>
      {msg === 'success' && <p style={{ textAlign: 'center', fontSize: 13, color: '#3B6D11', marginTop: 8 }}>Job logged!</p>}
      {msg === 'error' && <p style={{ textAlign: 'center', fontSize: 13, color: '#A32D2D', marginTop: 8 }}>Please fill in RO, flagged hrs, and clock hrs.</p>}
    </div>
  )
}

function History({ jobs, onDelete }) {
  const [payFilter, setPayFilter] = useState('ALL')
  const [sort, setSort] = useState('recent')

  let list = payFilter === 'ALL' ? [...jobs] : jobs.filter(j => j.pay === payFilter)
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
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <select value={payFilter} onChange={e => setPayFilter(e.target.value)} style={{ width: 'auto' }}>
          <option value="ALL">All pay types</option>
          {Object.entries(PAY_TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
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
          return (
            <div key={j.id} style={{
              background: 'var(--surface)', border: '0.5px solid var(--border)',
              borderRadius: 'var(--radius-lg)', padding: '12px 16px',
              display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap'
            }}>
              <span style={{ fontSize: 13, fontWeight: 600, minWidth: 72 }}>{j.ro}</span>
              <Badge type={j.pay} />
              <span style={{ flex: 1, fontSize: 13, color: 'var(--text2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 80 }}>{j.desc || '—'}</span>
              <span style={{ fontSize: 13, fontWeight: 500 }}>{j.flagged.toFixed(1)}<span style={{ fontSize: 11, color: 'var(--text3)' }}> flag</span></span>
              <span style={{ fontSize: 13, fontWeight: 500 }}>{j.clock.toFixed(1)}<span style={{ fontSize: 11, color: 'var(--text3)' }}> clk</span></span>
              <span style={{ fontSize: 13, fontWeight: 500 }}>{eff}<span style={{ fontSize: 11, color: 'var(--text3)' }}>%</span></span>
              <span style={{ fontSize: 11, color: 'var(--text3)', minWidth: 54 }}>{d}</span>
              <button onClick={() => onDelete(j.id)} style={{
                background: 'none', border: 'none', color: 'var(--text3)',
                fontSize: 16, padding: '2px 4px', borderRadius: 4, lineHeight: 1
              }}>✕</button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function App() {
  const [tab, setTab] = useState('dashboard')
  const [jobs, setJobs] = useState(() => {
    try { return JSON.parse(localStorage.getItem('tht_jobs') || '[]') } catch { return [] }
  })

  useEffect(() => {
    localStorage.setItem('tht_jobs', JSON.stringify(jobs))
  }, [jobs])

  const addJob = job => setJobs(j => [job, ...j])
  const deleteJob = id => setJobs(j => j.filter(x => x.id !== id))

  const tabs = [['dashboard', 'Dashboard'], ['log', 'Log job'], ['history', 'History']]

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '2rem 1rem' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 2 }}>Tech Hours</h1>
        <p style={{ fontSize: 13, color: 'var(--text2)' }}>Track flagged vs. clock hours by pay type</p>
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
      {tab === 'log' && <LogJob onAdd={job => { addJob(job); setTab('dashboard') }} />}
      {tab === 'history' && <History jobs={jobs} onDelete={deleteJob} />}
    </div>
  )
}