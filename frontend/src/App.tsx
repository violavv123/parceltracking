import { useEffect, useState, type FormEvent } from 'react'
import { createOrder, findAdminOrder, loginAdmin, trackOrder, updateStatus } from './api'
import ParcelMap from './ParcelMap'
import { statuses, statusLabels, type CreateOrder, type ParcelOrder, type Status } from './types'

const emptyForm: CreateOrder = { customerName: '', customerEmail: '', productDescription: '', originAddress: '', destinationAddress: '' }
const date = (value: string) => new Date(value).toLocaleString('sq-XK', { dateStyle: 'medium', timeStyle: 'short' })
type Page = 'customer' | 'login' | 'admin'

export default function App() {
  const [page, setPage] = useState<Page>('customer')
  const [form, setForm] = useState(emptyForm)
  const [trackingNumber, setTrackingNumber] = useState('')
  const [trackedOrder, setTrackedOrder] = useState<ParcelOrder | null>(null)
  const [password, setPassword] = useState('')
  const [token, setToken] = useState('')
  const [adminSearch, setAdminSearch] = useState('')
  const [adminOrder, setAdminOrder] = useState<ParcelOrder | null>(null)
  const [newStatus, setNewStatus] = useState<Status>('Processing')
  const [note, setNote] = useState('')
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (page !== 'customer' || !trackedOrder) return
    const timer = window.setInterval(() => {
      void trackOrder(trackedOrder.trackingNumber).then(setTrackedOrder).catch(() => undefined)
    }, 15000)
    return () => window.clearInterval(timer)
  }, [page, trackedOrder?.trackingNumber])

  const run = async (action: () => Promise<void>) => {
    setNotice(''); setError(''); setBusy(true)
    try { await action() } catch (e) { setError(e instanceof Error ? e.message : 'Ndodhi një gabim.') }
    finally { setBusy(false) }
  }
  const submitOrder = (e: FormEvent) => {
    e.preventDefault()
    void run(async () => {
      const order = await createOrder(form)
      setTrackedOrder(order); setTrackingNumber(order.trackingNumber); setForm(emptyForm)
      setNotice(`Porosia u regjistrua. Ruaje numrin e përcjelljes: ${order.trackingNumber}`)
    })
  }
  const track = (e: FormEvent) => {
    e.preventDefault()
    void run(async () => { setTrackedOrder(await trackOrder(trackingNumber.trim())) })
  }
  const login = (e: FormEvent) => {
    e.preventDefault()
    void run(async () => {
      const result = await loginAdmin(password)
      setToken(result.token); setPassword(''); setPage('admin'); setNotice('U kyçe me sukses si admin.')
    })
  }
  const searchAdminOrder = (e: FormEvent) => {
    e.preventDefault()
    void run(async () => {
      const order = await findAdminOrder(adminSearch.trim(), token)
      setAdminOrder(order); setNewStatus(order.status); setNote('')
    })
  }
  const saveStatus = () => {
    if (!adminOrder) return
    void run(async () => {
      const order = await updateStatus(adminOrder.trackingNumber, newStatus, note, token)
      setAdminOrder(order); setNotice(`Statusi për ${order.trackingNumber} u ruajt.`)
      setNote('')
    })
  }
  const goHome = () => { setPage('customer'); setNotice(''); setError('') }
  const logout = () => { setToken(''); setAdminOrder(null); setAdminSearch(''); goHome() }

  return <main className="shell">
    <header className="topbar"><a className="brand" href="#top" onClick={goHome}><span className="brand-mark">P</span><span>Parcel<span className="brand-light">Track</span><small>Dërgesat, nën kontroll.</small></span></a>
      {page === 'admin' ? <button className="quiet-button" onClick={logout}>Dil nga llogaria</button> : page === 'login' ? <button className="quiet-button" onClick={goHome}>← Kthehu te klienti</button> : <button className="quiet-button" onClick={() => { setPage('login'); setNotice(''); setError('') }}>Hyr si admin →</button>}
    </header>

    {page === 'customer' && <>
      <section className="hero"><div><p className="eyebrow">SHËRBIM PËR DËRGESA</p><h1>Porosia jote,<br/><em>gjithmonë e përcjellshme.</em></h1><p className="hero-copy">Regjistro një dërgesë ose përcille pakon në hartë me numrin e porosisë.</p></div><div className="hero-art"><div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className="parcel">▧<span>PT</span></div><div className="route route-a">● ─ ─ ─ ●</div><div className="route route-b">● ─ ─ ●</div></div></section>
      {notice && <div className="alert success">{notice}</div>}{error && <div className="alert error">{error}</div>}
      <div className="columns">
        <section className="card"><div className="card-heading"><div><p className="eyebrow">HAPI 1</p><h2>Regjistro një porosi</h2></div><span className="step">01</span></div>
          <form onSubmit={submitOrder} className="form-grid">
            <label>Emri i klientit<input required value={form.customerName} onChange={e => setForm({ ...form, customerName: e.target.value })} placeholder="p.sh. Arta Berisha" /></label>
            <label>Email<input required type="email" value={form.customerEmail} onChange={e => setForm({ ...form, customerEmail: e.target.value })} placeholder="arta@email.com" /></label>
            <label className="wide">Produkti<input required value={form.productDescription} onChange={e => setForm({ ...form, productDescription: e.target.value })} placeholder="Përshkrimi i produktit" /></label>
            <label className="wide">Adresa e nisjes<input required value={form.originAddress} onChange={e => setForm({ ...form, originAddress: e.target.value })} placeholder="Rruga, qyteti, shteti" /></label>
            <label className="wide">Adresa e destinacionit<input required value={form.destinationAddress} onChange={e => setForm({ ...form, destinationAddress: e.target.value })} placeholder="Rruga, qyteti, shteti" /></label>
            <button className="primary wide" disabled={busy}>{busy ? 'Duke gjetur adresat…' : 'Regjistro porosinë'} <span>→</span></button>
            <p className="form-hint wide">Shkruaj adresat sa më saktë, përfshirë qytetin dhe shtetin, që të shfaqen në hartë.</p>
          </form>
        </section>
        <section className="card tracking-card"><div className="card-heading"><div><p className="eyebrow">HAPI 2</p><h2>Përcille porosinë</h2></div><span className="step">02</span></div><p className="muted">Fut numrin e përcjelljes që u krijua kur regjistrove porosinë.</p>
          <form onSubmit={track} className="track-form"><input required value={trackingNumber} onChange={e => setTrackingNumber(e.target.value)} placeholder="p.sh. PT-A1B2C3D4"/><button className="primary" disabled={busy}>Kërko <span>→</span></button></form>
          {trackedOrder && <OrderDetails order={trackedOrder}/>}
        </section>
      </div>
    </>}

    {page === 'login' && <section className="login-shell"><div className="card login-card"><p className="eyebrow">QASJE E ADMINISTRATORIT</p><h1>Mirë se u ktheve.</h1><p className="muted">Kyçja kërkohet për të ndryshuar statuset e porosive.</p>{error && <div className="alert error">{error}</div>}
      <form onSubmit={login} className="login-form"><label>Fjalëkalimi<input autoFocus required type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Shkruaj fjalëkalimin"/></label><button className="primary" disabled={busy}>{busy ? 'Duke verifikuar…' : 'Kyçu si admin'} <span>→</span></button></form>
    </div></section>}

    {page === 'admin' && <><section className="hero admin-hero"><div><p className="eyebrow">PANELI I ADMINIT</p><h1>Menaxho statusin<br/><em>e çdo dërgese.</em></h1><p className="hero-copy">Kërko sipas numrit të porosisë dhe regjistro përditësimin e radhës.</p></div><div className="admin-stamp">ADMIN<span>✓</span></div></section>
      {notice && <div className="alert success">{notice}</div>}{error && <div className="alert error">{error}</div>}
      <section className="card admin-card"><div className="card-heading"><div><p className="eyebrow">KËRKO POROSINË</p><h2>Vendos numrin e përcjelljes</h2></div><span className="step">01</span></div>
        <form className="admin-search" onSubmit={searchAdminOrder}><input required value={adminSearch} onChange={e => setAdminSearch(e.target.value)} placeholder="p.sh. PT-A1B2C3D4"/><button className="primary" disabled={busy}>Gjej porosinë <span>→</span></button></form>
        {adminOrder && <div className="admin-edit"><div className="order-summary"><span className="tracking-code">{adminOrder.trackingNumber}</span><strong>{adminOrder.productDescription}</strong><span>{adminOrder.originAddress} → {adminOrder.destinationAddress}</span><small>{adminOrder.customerName} · {adminOrder.customerEmail}</small><span className={`badge ${adminOrder.status.toLowerCase()}`}>Statusi aktual: {statusLabels[adminOrder.status]}</span></div>
          <div className="edit-fields"><label>Statusi i ri<select value={newStatus} onChange={e => setNewStatus(e.target.value as Status)}>{statuses.map(s => <option key={s} value={s}>{statusLabels[s]}</option>)}</select></label><label>Shënim për historikun<input value={note} onChange={e => setNote(e.target.value)} placeholder="p.sh. Pakoja u nis nga Prishtina"/></label><button className="primary" onClick={saveStatus} disabled={busy}>Ruaj ndryshimin e statusit <span>→</span></button></div>
        </div>}
      </section>
    </>}
    <footer><span>ParcelTrack · Projekt demonstrues</span><span>Harta: © OpenStreetMap contributors</span></footer>
  </main>
}

function OrderDetails({ order }: { order: ParcelOrder }) {
  return <div className="order-details"><div className="detail-top"><div><span className="muted">Numri i përcjelljes</span><strong className="tracking-code">{order.trackingNumber}</strong></div><span className={`badge ${order.status.toLowerCase()}`}>{statusLabels[order.status]}</span></div>
    <ParcelMap order={order}/><p className="refresh-hint">Statusi rifreskohet automatikisht çdo 15 sekonda.</p><h3>Historiku i porosisë</h3><div className="timeline">{[...order.updates].reverse().map((update, i) => <div className="timeline-item" key={`${update.updatedAtUtc}-${i}`}><span className="timeline-dot"/><div><strong>{statusLabels[update.status]}</strong><p>{update.note}</p><small>{date(update.updatedAtUtc)}</small></div></div>)}</div>
  </div>
}
