import { useState } from 'react'
import { apiFetch } from '../api'

export default function AuthScreen({ onAuth, onGuest }) {
  const [tab, setTab] = useState('login')
  const [form, setForm] = useState({ email: '', password: '', name: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    setError(''); setLoading(true)
    try {
      if (tab === 'login') {
        const res = await apiFetch('POST', '/auth/login', { email: form.email.trim(), password: form.password })
        localStorage.setItem('token', res.access_token)
        onAuth(await apiFetch('GET', '/auth/me'))
      } else {
        if (form.password.length < 6) { setError('Пароль минимум 6 символов'); setLoading(false); return }
        const res = await apiFetch('POST', '/auth/register', { email: form.email.trim(), password: form.password, full_name: form.name || null })
        localStorage.setItem('token', res.access_token)
        onAuth(await apiFetch('GET', '/auth/me'))
      }
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: 'var(--gray-50)' }}>
      {/* Left: branding */}
      <div className="auth-left" style={{
        width: 420, flexShrink: 0, background: 'var(--white)',
        borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        padding: '48px 40px',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 28, height: 28, background: 'var(--gray-900)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14,2 14,8 20,8"/>
              <line x1="9" y1="13" x2="15" y2="13"/>
            </svg>
          </div>
          <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', letterSpacing: '-.3px' }}>StyleCheck</span>
        </div>

        {/* Main text */}
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 600, color: 'var(--text)', letterSpacing: '-.5px', lineHeight: 1.25, marginBottom: 14 }}>
            Проверка документов<br />по стандартам оформления
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.65, marginBottom: 32 }}>
            Автоматически проверяет структуру, терминологию и оформление DOCX-файлов по ГОСТ 7.32-2017 и корпоративным стандартам.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              'Структура и обязательные разделы',
              'Терминология с морфологическим анализом',
              'Поля, шрифты и интервалы по ГОСТ',
              'Точное указание страницы и абзаца ошибки',
            ].map((t, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'var(--blue-50)', border: '1px solid var(--blue-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="var(--blue-600)" strokeWidth="3"><polyline points="20,6 9,17 4,12"/></svg>
                </div>
                <span style={{ fontSize: 13.5, color: 'var(--gray-700)' }}>{t}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
          © 2025 StyleCheck
        </div>
      </div>

      {/* Right: form */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 32px' }}>
        <div style={{ width: '100%', maxWidth: 360 }}>
          <h2 style={{ fontSize: 20, fontWeight: 600, color: 'var(--text)', marginBottom: 4, letterSpacing: '-.3px' }}>
            {tab === 'login' ? 'Войти в аккаунт' : 'Создать аккаунт'}
          </h2>
          <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', marginBottom: 28 }}>
            {tab === 'login' ? 'Введите email и пароль' : 'Регистрация занимает меньше минуты'}
          </p>

          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: 24 }}>
            {[['login', 'Вход'], ['register', 'Регистрация']].map(([t, l]) => (
              <button key={t} onClick={() => { setTab(t); setError('') }} style={{
                padding: '8px 0', marginRight: 20, border: 'none', background: 'transparent',
                fontSize: 13.5, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font)',
                color: tab === t ? 'var(--text)' : 'var(--text-secondary)',
                borderBottom: tab === t ? '2px solid var(--text)' : '2px solid transparent',
                marginBottom: -1, transition: 'all .12s',
              }}>{l}</button>
            ))}
          </div>

          {error && (
            <div style={{ background: 'var(--red-50)', border: '1px solid var(--red-100)', borderRadius: 'var(--radius)', padding: '10px 12px', fontSize: 13, color: 'var(--red-600)', marginBottom: 16 }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {tab === 'register' && <FormField label="Имя" type="text" placeholder="Иван Иванов" value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} />}
            <FormField label="Email" type="email" placeholder="you@company.com" value={form.email} onChange={v => setForm(f => ({ ...f, email: v }))} onEnter={submit} />
            <FormField label="Пароль" type="password" placeholder={tab === 'register' ? 'Минимум 6 символов' : '••••••••'} value={form.password} onChange={v => setForm(f => ({ ...f, password: v }))} onEnter={submit} />
          </div>

          <button onClick={submit} disabled={loading} style={{
            width: '100%', marginTop: 20, padding: '9px', borderRadius: 'var(--radius)',
            border: 'none', background: 'var(--gray-900)', color: 'var(--white)',
            fontSize: 13.5, fontWeight: 500, cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? .6 : 1, transition: 'background .12s', fontFamily: 'var(--font)',
          }}
          onMouseEnter={e => { if (!loading) e.currentTarget.style.background = 'var(--gray-800)' }}
          onMouseLeave={e => e.currentTarget.style.background = 'var(--gray-900)'}
          >
            {loading ? 'Подождите…' : tab === 'login' ? 'Войти' : 'Создать аккаунт'}
          </button>

          <div style={{ textAlign: 'center', marginTop: 16, fontSize: 13, color: 'var(--text-secondary)' }}>
            или{' '}
            <span onClick={onGuest} style={{ color: 'var(--accent)', cursor: 'pointer', fontWeight: 500 }}>
              продолжить без входа
            </span>
          </div>
        </div>
      </div>

      <style>{`
        @media(max-width:768px) { .auth-left { display: none !important; } }
      `}</style>
    </div>
  )
}

function FormField({ label, type, placeholder, value, onChange, onEnter }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 12.5, fontWeight: 500, color: 'var(--gray-700)', marginBottom: 5 }}>{label}</label>
      <input type={type} placeholder={placeholder} value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && onEnter?.()}
        style={{
          width: '100%', background: 'var(--white)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius)', padding: '8px 11px', fontSize: 13.5,
          outline: 'none', color: 'var(--text)', transition: 'border-color .12s',
        }}
        onFocus={e => { e.target.style.borderColor = 'var(--accent)'; e.target.style.boxShadow = '0 0 0 3px var(--blue-50)' }}
        onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none' }}
      />
    </div>
  )
}
