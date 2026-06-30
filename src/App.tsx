import { useEffect, useState } from 'react'
import { AlertTriangle, Clock3, Droplets, ExternalLink, HeartPulse, MapPin, PauseCircle, PlayCircle, Radio, RefreshCw, Settings, Shield, Truck, X, Zap } from 'lucide-react'
import './App.css'
import sitrepData from './sitrep.json'

type Tab = 'brief' | 'health' | 'operations'
type Need = 'wash' | 'emt'
const icons = [Shield, Droplets, HeartPulse, Zap, Radio, Truck, AlertTriangle]

const capabilityNeeds = {
  wash: {
    label: 'WASH', title: 'Hospital WASH and biosafety support',
    requested: ['Water and soap stations at affected facilities', 'PPE and Class A / infectious-waste bags', 'Hospital hygiene and healthcare-waste controls', 'Reactivation of non-operational incinerators'],
    trMatch: ['Water, sanitation and hygiene assessment', 'Safe-water and hygiene support', 'Facility-level WASH systems and infection-prevention support'],
    context: ['9 of 10 assessed facilities report WASH deficits', 'Alfredo Machado: water affected; no backup generator', 'Vargas IVSS: water, power, generator and medical gases affected', 'Shelters lack organized health support and pharmacies'],
    boundary: 'PAHO also identifies pharmaceutical logistics, forensic support and wider health-system needs that are not represented here as TR WASH capabilities.'
  },
  emt: {
    label: 'TYPE 1 EMT', title: 'Outpatient emergency and essential-care support',
    requested: ['Deploy EMT Level 1 near structurally affected hospitals, away from the rescue front line', 'Support patient flow, stabilization and coordinated referral', 'Maintain essential outpatient, maternal and chronic-disease care', 'Support family medicine and health coverage in shelters'],
    trMatch: ['WHO-verified Type 1 Mobile EMT capability', 'Outpatient emergency care, stabilization and referral', 'Mobile clinical support near degraded facilities'],
    context: ['Macuto Maternity: evacuated; zero operational beds', 'Rafael Medina Jiménez: 35 of 108 beds operational', 'Alfredo Machado: 46 beds; X-ray non-operational', 'Vargas IVSS: ground-floor operations only; several services critical'],
    boundary: 'PAHO separately requests a specialized EMT-3 for trauma orthopaedics and neurosurgery. That requirement is outside TR’s Type 1 EMT scope.'
  }
} as const

function App() {
  const data = sitrepData
  const [tab, setTab] = useState<Tab>('brief')
  const [selectedLifeline, setSelectedLifeline] = useState<number | null>(1)
  const [selectedNeed, setSelectedNeed] = useState<Need | null>(null)
  const [showSources, setShowSources] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(() => localStorage.getItem('sitrep-auto-refresh') !== 'off')
  const lifeline = selectedLifeline === null ? null : data.lifelines[selectedLifeline]

  useEffect(() => {
    localStorage.setItem('sitrep-auto-refresh', autoRefresh ? 'on' : 'off')
    if (!autoRefresh || window.location.protocol === 'file:') return
    let version = ''
    const check = async () => {
      try {
        const response = await fetch(`./version.json?ts=${Date.now()}`, { cache: 'no-store' })
        if (!response.ok) return
        const current = (await response.json()).version as string
        if (version && current !== version) window.location.reload()
        version = current
      } catch { /* Preserve the current verified view if the refresh endpoint is unavailable. */ }
    }
    void check()
    const timer = window.setInterval(check, 60_000)
    return () => window.clearInterval(timer)
  }, [autoRefresh])

  return <main className="briefing-shell">
    <header className="brief-topbar">
      <div className="brief-brand"><span className="flag"/><b>VENEZUELA EARTHQUAKE</b><span>SITUATION BRIEF</span></div>
      <nav aria-label="Dashboard views">
        <button className={tab === 'brief' ? 'active' : ''} onClick={() => setTab('brief')}>BRIEF</button>
        <button className={tab === 'health' ? 'active' : ''} onClick={() => setTab('health')}>HEALTH + WASH</button>
        <button className={tab === 'operations' ? 'active' : ''} onClick={() => setTab('operations')}>OPERATIONS</button>
      </nav>
      <div className="brief-actions">
        <button className="auto-refresh" aria-label={`${autoRefresh ? 'Disable' : 'Enable'} automatic refresh`} title={`${autoRefresh ? 'Disable' : 'Enable'} automatic refresh`} onClick={() => setAutoRefresh(value => !value)}>{autoRefresh ? <PauseCircle size={16}/> : <PlayCircle size={16}/>}<span>AUTO {autoRefresh ? 'ON' : 'OFF'}</span></button>
        <button aria-label="Refresh local dashboard" title="Refresh" onClick={() => window.location.reload()}><RefreshCw size={16}/></button>
        <button aria-label="Open sources and methodology" title="Sources and methodology" onClick={() => setShowSources(true)}><Settings size={17}/></button>
      </div>
    </header>

    <section className="brief-header">
      <div><span className="event-id">EQ-2026-000093-VEN</span><h1>Operational Snapshot</h1><p>{data.headline}</p></div>
      <div className="time-box"><Clock3 size={18}/><div><small>INFORMATION CUTOFF</small><b>{data.meta.cutoff}</b></div><div><small>NEXT REFRESH</small><b>{data.meta.nextUpdate}</b></div><em>GOV / UN FIGURES NOT RECONCILED</em></div>
    </section>

    <section className="delta-strip"><b>CHANGES SINCE PRIOR UPDATE</b>{data.deltas.map(item => <div key={item.label} className={item.status}><span>{item.label}</span><strong><i>{item.from}</i> → {item.to}</strong><small>{item.note}</small></div>)}</section>

    <section className="brief-metrics">
      {data.metrics.map(metric => <article key={metric.label}><small>{metric.label}</small><b>{metric.value}</b><span>{metric.note}</span></article>)}
    </section>

    {tab === 'brief' && <>
      <section className="executive-summary">
        <header><div><b>EXECUTIVE SUMMARY</b><span>{data.executiveSummary.window}</span></div><p>{data.executiveSummary.assessment}</p></header>
        <div>{data.executiveSummary.changes.map(item => <article key={item.title} className={item.type.toLowerCase().replaceAll(' ','-')}><span>{item.type}</span><b>{item.title}</b><p>{item.detail}</p></article>)}</div>
      </section>
      <section className="brief-main">
        <div className="need-column">
          <div className="section-label">HIGH-VALUE NEEDS · TR CAPABILITY ALIGNMENT</div>
          <button className="need-card wash" onClick={() => setSelectedNeed('wash')}><div className="need-icon"><Droplets size={27}/></div><div><span>WASH</span><h2>9 of 10 assessed health facilities report WASH deficits</h2><p>PAHO asks for water/soap stations, PPE, infectious-waste controls, hygiene and incinerator restoration.</p></div><b>VIEW FIT</b></button>
          <button className="need-card emt" onClick={() => setSelectedNeed('emt')}><div className="need-icon"><HeartPulse size={27}/></div><div><span>TYPE 1 EMT</span><h2>PAHO recommends EMT Level 1 near structurally affected hospitals</h2><p>Requested role: outpatient emergency care, stabilization, referral and continuity of essential services—not specialized EMT-3 trauma surgery.</p></div><b>VIEW FIT</b></button>
          <div className="fit-caveat">TR announced an advance team · Arrival, acceptance and field tasking remain unverified</div>
        </div>

        <div className="impact-column">
          <div className="section-label">COMMUNITY LIFELINE IMPACTS · SELECT AN ICON</div>
          <div className="impact-icons">{data.lifelines.map((line, i) => { const Icon = icons[i]; return <button key={line.name} className={`${line.status} ${selectedLifeline === i ? 'selected' : ''}`} onClick={() => setSelectedLifeline(i)}><Icon size={23}/><span>{line.name}</span><i>{line.assessment}</i></button> })}</div>
          {lifeline && <article className="impact-detail"><div><b>{lifeline.name}</b><span>{lifeline.assessment} · {lifeline.confidence} confidence</span></div><ul>{lifeline.dataPoints.map(point => <li key={point}>{point}</li>)}</ul></article>}
        </div>
      </section>
      <section className="relevance-strip"><div className="confirmed"><b>NEED</b><span>Confirmed by PAHO assessment</span></div><div className="confirmed"><b>TR MATCH</b><span>WASH + Type 1 EMT</span></div><div className="partial"><b>REQUEST SIGNAL</b><span>PAHO recommendation; no government RFA verified</span></div><div className="partial"><b>ACCESS</b><span>Controlled and logistically constrained</span></div><div className="unknown"><b>TR STATUS</b><span>Advance team announced; arrival unverified</span></div></section>
      <section className="risk-ribbon"><b>RISK OUTLOOK</b>{data.riskAssessment.slice(0,3).map(item => <span key={item.risk}><i>{item.level}</i>{item.risk}</span>)}</section>
      <section className="brief-footer-row"><div><b>RESPONSE PHASE</b><span>{data.meta.phase}</span></div><div><b>KEY LIMITATION</b><span>No reconciled patient, missing-person or worksite completion picture</span></div><div><b>PAHO ASSESSMENT</b><span>10 facilities · fieldwork 25–27 Jun · reported 29 Jun</span></div></section>
    </>}

    {tab === 'health' && <><section className="drill-view">
      <div className="health-summary"><div className="section-label">PAHO HEALTH SYSTEM SNAPSHOT</div><div className="health-kpis">{data.pahoSnapshot.kpis.map(kpi => <div key={kpi.label}><b>{kpi.value}</b><span>{kpi.label}</span></div>)}</div><div className="needs-list">{data.medicalNeeds.map(item => <article key={item.priority}><span className={item.status}/><div><b>{item.priority}</b><p>{item.evidence}</p></div></article>)}</div></div>
      <div className="hospital-panel"><div className="section-label">FACILITIES REQUIRING CLOSE ATTENTION</div>{data.pahoSnapshot.hospitals.map(h => <article key={h.name}><div><b>{h.name}</b><span>{h.priority}</span></div><p>{h.status}</p></article>)}<div className="capability-note"><HeartPulse size={19}/><p>{data.pahoSnapshot.trFit}</p></div></div>
    </section><section className="capacity-panel"><div className="section-label">CAPACITY VS. REMAINING GAP <span>prevents double-counting incoming capability as unmet need</span></div><div>{data.capacityGaps.slice(0,2).map(item => <article key={item.capability}><header><b>{item.capability}</b><span>{item.tr}</span></header><div><p><small>CAPACITY IN SYSTEM</small>{item.capacity}</p><p><small>REMAINING GAP</small>{item.gap}</p><p><small>REQUEST / ACCEPTANCE</small>{item.request}</p></div></article>)}</div></section></>}

    {tab === 'operations' && <><section className="access-panel"><div className="section-label"><Truck size={14}/> ACCESS & LOGISTICS <span>last verified source and confidence shown</span></div><div>{data.accessStatus.map(item => <article key={item.node}><header><b>{item.node}</b><span className={item.status.toLowerCase().replaceAll(' ','-')}>{item.status}</span></header><p>{item.detail}</p><small>{item.verified} · {item.confidence} confidence</small></article>)}</div></section><section className="geo-panel"><div className="section-label"><MapPin size={14}/> OPERATIONAL GEOGRAPHY SCHEMATIC <span>PAHO/OCHA locations · not to scale</span></div><div className="geo-canvas"><div className="coastline"/><div className="route"/><div className="geo-node caracas"><i>6</i><b>CAPITAL DISTRICT</b><span>6 facilities assessed · 50 provisional camps reported</span></div><div className="geo-node airport"><i>✈</i><b>AIR ACCESS</b><span>Throughput expanding · exact civil status unresolved</span></div><div className="geo-node catia"><i>●</i><b>CATIA LA MAR</b><span>Alfredo Machado Clinic</span></div><div className="geo-node macuto"><i>●</i><b>MACUTO</b><span>Maternity evacuated · primary shelter</span></div><div className="geo-node pariata"><i>2</i><b>PARIATA</b><span>Vargas IVSS + Medina Jiménez</span></div><div className="geo-caption">LA GUAIRA · PORT OPERATIONAL · 15 CAMPS REPORTED</div></div></section><section className="risk-panel"><div className="section-label"><AlertTriangle size={14}/> RISK ASSESSMENT <span>evidence-based analytic assessment</span></div><div>{data.riskAssessment.map(item => <article key={item.risk}><header><b>{item.risk}</b><span className={item.level.toLowerCase().replaceAll(' ','-')}>{item.level}</span></header><p>{item.basis}</p><small>{item.type} · {item.confidence} confidence</small></article>)}</div></section><section className="drill-view operations-view">
      <div><div className="section-label">OPERATIONAL ASSESSMENT</div>{data.operations.map(op => <article className="operation-row" key={op.title}><div><b>{op.title}</b><span>{op.confidence}</span></div><p>{op.detail}</p></article>)}</div>
      <div><div className="section-label">PRIORITY INFORMATION GAPS</div><ol className="gap-list">{data.gaps.map(gap => <li key={gap}>{gap}</li>)}</ol><div className="section-label responder-label">REPORTED RESPONSE POSTURE</div><div className="response-chips">{data.responders.slice(0,8).map(org => <span key={org.name}>{org.name}</span>)}</div></div>
    </section></>}

    <footer className="brief-disclaimer">Public-source reconstruction · FEMA lifelines are an analytic mapping, not an official FEMA assessment · Figures remain provisional</footer>

    {showSources && <div className="source-overlay" role="dialog" aria-modal="true" aria-label="Sources and methodology"><div className="source-drawer"><header><div><Settings size={18}/><b>Sources & methodology</b></div><button aria-label="Close sources" onClick={() => setShowSources(false)}><X size={18}/></button></header><p className="method-note">Primary and corroborating sources are separated from lead-only or credential-gated channels. No VOSOCC credential gate was bypassed.</p><div className="source-list">{data.sourceWatch.map(source => <article key={source.name}><div><b>{source.name}</b><span className={source.status.toLowerCase().replaceAll(' ','-')}>{source.status}</span></div><p>{source.use}</p><small>{source.caveat}</small><a href={source.url} target="_blank" rel="noreferrer" aria-label={`Open ${source.name}`}><ExternalLink size={13}/></a></article>)}</div><details><summary>Full source ledger ({data.sources.length})</summary><div className="ledger">{data.sources.map(source => <a href={source.url} target="_blank" rel="noreferrer" key={source.url}><span>{source.tier}</span>{source.name}</a>)}</div></details></div></div>}
    {selectedNeed && <div className="need-overlay" role="dialog" aria-modal="true" aria-label={`${capabilityNeeds[selectedNeed].label} capability alignment`}><div className="need-drawer"><header><div>{selectedNeed === 'wash' ? <Droplets size={21}/> : <HeartPulse size={21}/>}<span><small>HIGH-VALUE NEED</small><b>{capabilityNeeds[selectedNeed].title}</b></span></div><button aria-label="Close capability detail" onClick={() => setSelectedNeed(null)}><X size={18}/></button></header><div className="need-evidence"><section><h3>WHAT PAHO IS ASKING FOR</h3>{capabilityNeeds[selectedNeed].requested.map(item => <p key={item}>{item}</p>)}</section><section className="match"><h3>WHAT MATCHES TR</h3>{capabilityNeeds[selectedNeed].trMatch.map(item => <p key={item}>{item}</p>)}</section><section><h3>OPERATIONAL CONTEXT</h3>{capabilityNeeds[selectedNeed].context.map(item => <p key={item}>{item}</p>)}</section></div><div className="scope-boundary"><AlertTriangle size={17}/><p><b>SCOPE BOUNDARY</b>{capabilityNeeds[selectedNeed].boundary}</p></div><div className="deployment-line"><span><b>Evidence</b> PAHO 29 Jun call</span><span><b>Request</b> Technical recommendation</span><span><b>TR posture</b> Deployment unconfirmed</span></div></div></div>}
  </main>
}

export default App
