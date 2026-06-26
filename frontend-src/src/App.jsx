import { useState, useEffect, Component } from 'react'
import { apiFetch } from './api'
import Sidebar from './components/Sidebar'
import AuthScreen from './components/AuthScreen'
import ReportCard from './components/ReportCard'
import CheckPage from './pages/CheckPage'
import { HistoryPage, AdminRulesetsPage, AdminGroupPage, AdminHistoryPage, SaRulesetsPage, SaAdminsPage } from './pages/OtherPages'
import { Spinner, Card } from './components/UI'

const PAGES = {
  check: CheckPage,
  history: HistoryPage,
  'admin-rulesets': AdminRulesetsPage,
  'admin-group': AdminGroupPage,
  'admin-history': AdminHistoryPage,
  'sa-rulesets': SaRulesetsPage,
  'sa-admins': SaAdminsPage,
}

// Catches JS crashes and shows a readable error instead of blank page
class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null } }
  static getDerivedStateFromError(e) { return { error: e } }
  componentDidCatch(e, info) { console.error('Page crash:', e, info) }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 32 }}>
          <div style={{ background: 'var(--red-50)', border: '1px solid var(--red-100)', borderRadius: 8, padding: '16px 20px' }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--red-600)', marginBottom: 8 }}>
              Ошибка загрузки страницы
            </div>
            <div style={{ fontSize: 13, color: 'var(--red-600)', fontFamily: 'monospace', marginBottom: 12 }}>
              {this.state.error.message}
            </div>
            <button
              onClick={() => this.setState({ error: null })}
              style={{ fontSize: 13, color: 'var(--red-600)', background: 'none', border: '1px solid var(--red-100)', borderRadius: 6, padding: '5px 12px', cursor: 'pointer' }}
            >
              Попробовать снова
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

export default function App() {
  const [user, setUser] = useState(undefined)
  const [page, setPage] = useState('check')
  const [showAuth, setShowAuth] = useState(false)
  const [sharedReport, setSharedReport] = useState(null)
  const [sharedLoading, setSharedLoading] = useState(false)

  useEffect(() => {
    if (location.pathname.startsWith('/shared/')) {
      const token = location.pathname.split('/').pop()
      setSharedLoading(true)
      apiFetch('GET', `/check/shared/${token}`)
        .then(setSharedReport).catch(() => {}).finally(() => setSharedLoading(false))
    }
  }, [])

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      apiFetch('GET', '/auth/me')
        .then(setUser)
        .catch(() => { localStorage.removeItem('token'); setUser(null) })
    } else {
      setUser(null)
    }
  }, [])

  if (user === undefined) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spinner size={28} />
      </div>
    )
  }

  if (showAuth) {
    return (
      <AuthScreen
        onAuth={u => { setUser(u); setShowAuth(false) }}
        onGuest={() => setShowAuth(false)}
      />
    )
  }

  const Page = PAGES[page] || CheckPage

  return (
    <>
      <div style={{ display: 'flex', minHeight: '100vh' }}>
        <Sidebar
          current={page}
          onNav={p => { if (p === '__auth') setShowAuth(true); else setPage(p) }}
          user={user}
        />
        <main style={{
          marginLeft: 'var(--sidebar-w)', flex: 1, minHeight: '100vh',
          display: 'flex', flexDirection: 'column',
          maxWidth: 'calc(100vw - var(--sidebar-w))',
        }}>
          {(sharedLoading || sharedReport) ? (
            <div style={{ padding: 32 }}>
              <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--gray-900)' }}>Общий отчёт</div>
                <button
                  onClick={() => { setSharedReport(null); history.pushState(null, '', '/') }}
                  style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 12.5, color: 'var(--text-secondary)' }}
                >
                  ✕ Закрыть
                </button>
              </div>
              {sharedLoading
                ? <Card><div style={{ textAlign: 'center', padding: '40px 20px', display: 'flex', justifyContent: 'center' }}><Spinner /></div></Card>
                : <ReportCard report={sharedReport} isAuth={false} />
              }
            </div>
          ) : (
            <ErrorBoundary key={page}>
              <Page user={user} />
            </ErrorBoundary>
          )}
        </main>
      </div>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media(max-width:768px) {
          main { margin-left: 0 !important; max-width: 100vw !important; padding-top: 50px; }
        }
      `}</style>
    </>
  )
}
