import { useState } from 'react'

const NAV = [
  { page: 'check', label: 'Проверить документ', roles: ['guest','user','admin','superadmin'] },
  { page: 'history', label: 'История проверок', roles: ['user','admin','superadmin'] },
]
const ADMIN = [
  { page: 'admin-rulesets', label: 'Наборы правил', roles: ['admin','superadmin'] },
  { page: 'admin-group', label: 'Группа', roles: ['admin','superadmin'] },
  { page: 'admin-history', label: 'История группы', roles: ['admin','superadmin'] },
]
const SA = [
  { page: 'sa-rulesets', label: 'Публичные наборы', roles: ['superadmin'] },
  { page: 'sa-admins', label: 'Администраторы', roles: ['superadmin'] },
]

function NavItem({ item, current, onClick }) {
  const active = current === item.page
  return (
    <button onClick={() => onClick(item.page)} style={{
      width: '100%', display: 'flex', alignItems: 'center', gap: 8,
      padding: '6px 10px', margin: '1px 0', border: 'none', cursor: 'pointer',
      borderRadius: 'var(--radius-sm)', textAlign: 'left', fontFamily: 'var(--font)',
      fontSize: 13.5, fontWeight: active ? 500 : 400, transition: 'all .1s',
      background: active ? 'var(--gray-100)' : 'transparent',
      color: active ? 'var(--gray-900)' : 'var(--gray-500)',
    }}
    onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'var(--gray-50)'; e.currentTarget.style.color = 'var(--gray-700)' }}}
    onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--gray-500)' }}}
    >
      {item.label}
    </button>
  )
}

function SectionLabel({ children }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '.6px', padding: '14px 10px 4px' }}>
      {children}
    </div>
  )
}

export default function Sidebar({ current, onNav, user }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const role = user?.role || 'guest'
  const go = p => { onNav(p); setMobileOpen(false) }

  const inner = (
    <aside style={{
      width: 'var(--sidebar-w)', height: '100vh', background: 'var(--white)',
      borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column',
    }}>
      {/* Logo */}
      <div style={{ padding: '16px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 24, height: 24, background: 'var(--gray-900)', borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14,2 14,8 20,8"/>
            <line x1="9" y1="13" x2="15" y2="13"/>
          </svg>
        </div>
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', letterSpacing: '-.3px' }}>StyleCheck</span>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '6px 8px' }}>
        {NAV.filter(i => i.roles.includes(role)).map(i =>
          <NavItem key={i.page} item={i} current={current} onClick={go} />
        )}

        {(role === 'admin' || role === 'superadmin') && (
          <>
            <SectionLabel>Администратор</SectionLabel>
            {ADMIN.filter(i => i.roles.includes(role)).map(i =>
              <NavItem key={i.page} item={i} current={current} onClick={go} />
            )}
          </>
        )}

        {role === 'superadmin' && (
          <>
            <SectionLabel>Система</SectionLabel>
            {SA.map(i => <NavItem key={i.page} item={i} current={current} onClick={go} />)}
          </>
        )}
      </nav>

      {/* User */}
      <div style={{ padding: '10px 8px', borderTop: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 'var(--radius-sm)', background: 'var(--gray-50)', border: '1px solid var(--border)' }}>
          <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--gray-200)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, color: 'var(--gray-600)', flexShrink: 0 }}>
            {user?.email ? user.email[0].toUpperCase() : 'G'}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--gray-800)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.email || 'Гость'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 1 }}>
              {{ user: 'Пользователь', admin: 'Администратор', superadmin: 'Суперадмин' }[role] || 'Без входа'}
            </div>
          </div>
          {user ? (
            <button onClick={() => { localStorage.removeItem('token'); window.location.reload() }}
              title="Выйти"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)', padding: 3, borderRadius: 3, lineHeight: 1, transition: 'color .1s' }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--gray-700)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--gray-400)'}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16,17 21,12 16,7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
            </button>
          ) : (
            <button onClick={() => onNav('__auth')}
              title="Войти"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', padding: 3, borderRadius: 3, lineHeight: 1, fontSize: 12, fontWeight: 500, fontFamily: 'var(--font)' }}
            >
              Войти
            </button>
          )}
        </div>
      </div>
    </aside>
  )

  return (
    <>
      <div className="sb-desk" style={{ position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 100, width: 'var(--sidebar-w)' }}>{inner}</div>

      <button className="sb-ham" onClick={() => setMobileOpen(o => !o)} style={{
        display: 'none', position: 'fixed', top: 12, left: 12, zIndex: 200,
        background: 'var(--white)', border: '1px solid var(--border)', cursor: 'pointer',
        width: 34, height: 34, borderRadius: 'var(--radius-sm)',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--gray-700)" strokeWidth="2">
          <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
        </svg>
      </button>

      {mobileOpen && (
        <>
          <div onClick={() => setMobileOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.3)', zIndex: 99 }} />
          <div style={{ position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 100, width: 'var(--sidebar-w)' }}>{inner}</div>
        </>
      )}

      <style>{`
        @media(max-width:768px) { .sb-desk { display: none !important; } .sb-ham { display: flex !important; } }
      `}</style>
    </>
  )
}
