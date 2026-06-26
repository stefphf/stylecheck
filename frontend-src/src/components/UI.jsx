import { useState, useRef } from 'react'

export function Btn({ variant = 'primary', size, full, disabled, onClick, children, style }) {
  const base = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    gap: 6, border: 'none', cursor: 'pointer', fontFamily: 'var(--font)',
    fontWeight: 500, transition: 'all .12s', whiteSpace: 'nowrap',
    borderRadius: 'var(--radius)',
  }
  const v = {
    primary: {
      background: 'var(--gray-900)', color: 'var(--white)',
      padding: '7px 14px', fontSize: 13,
    },
    outline: {
      background: 'var(--white)', border: '1px solid var(--border)',
      color: 'var(--gray-700)', padding: '6px 13px', fontSize: 13,
    },
    danger: {
      background: 'var(--white)', border: '1px solid var(--red-100)',
      color: 'var(--red-600)', padding: '6px 13px', fontSize: 13,
    },
    ghost: {
      background: 'transparent', color: 'var(--gray-500)',
      padding: '6px 10px', fontSize: 13,
    },
  }
  const sz = { sm: { padding: '5px 11px', fontSize: 12.5 }, xs: { padding: '3px 8px', fontSize: 12 } }

  const hover = {
    primary: e => { e.currentTarget.style.background = 'var(--gray-800)' },
    outline: e => { e.currentTarget.style.background = 'var(--gray-50)' },
    danger: e => { e.currentTarget.style.background = 'var(--red-50)' },
    ghost: e => { e.currentTarget.style.background = 'var(--gray-100)'; e.currentTarget.style.color = 'var(--gray-700)' },
  }
  const leave = {
    primary: e => { e.currentTarget.style.background = 'var(--gray-900)' },
    outline: e => { e.currentTarget.style.background = 'var(--white)' },
    danger: e => { e.currentTarget.style.background = 'var(--white)' },
    ghost: e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--gray-500)' },
  }

  return (
    <button
      onClick={onClick} disabled={disabled}
      onMouseEnter={hover[variant]} onMouseLeave={leave[variant]}
      style={{ ...base, ...v[variant], ...(size ? sz[size] : {}), ...(full ? { width: '100%' } : {}), ...(disabled ? { opacity: .45, cursor: 'not-allowed', pointerEvents: 'none' } : {}), ...style }}
    >{children}</button>
  )
}

export function Card({ children, style }) {
  return (
    <div style={{
      background: 'var(--white)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)', padding: '20px 24px',
      marginBottom: 12, ...style,
    }}>{children}</div>
  )
}

export function Alert({ type = 'error', children, style }) {
  const t = {
    error: { background: 'var(--red-50)', color: 'var(--red-600)', border: '1px solid var(--red-100)' },
    success: { background: 'var(--green-50)', color: 'var(--green-600)', border: '1px solid var(--green-100)' },
    info: { background: 'var(--blue-50)', color: 'var(--blue-600)', border: '1px solid var(--blue-100)' },
  }
  return (
    <div style={{ borderRadius: 'var(--radius)', padding: '10px 14px', fontSize: 13, marginBottom: 12, ...t[type], ...style }}>
      {children}
    </div>
  )
}

export function Field({ label, hint, children, style }) {
  return (
    <div style={{ marginBottom: 14, ...style }}>
      {label && (
        <label style={{ display: 'block', fontSize: 12.5, fontWeight: 500, color: 'var(--gray-700)', marginBottom: 5 }}>
          {label}
        </label>
      )}
      {children}
      {hint && <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4 }}>{hint}</div>}
    </div>
  )
}

export function Input({ style, ...props }) {
  return (
    <input {...props}
      style={{
        width: '100%', background: 'var(--white)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius)', padding: '7px 11px', fontSize: 13.5,
        outline: 'none', color: 'var(--text)', transition: 'border-color .12s',
        ...style,
      }}
      onFocus={e => { e.target.style.borderColor = 'var(--accent)'; e.target.style.boxShadow = '0 0 0 3px var(--blue-50)' }}
      onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none' }}
    />
  )
}

export function Textarea({ style, ...props }) {
  return (
    <textarea {...props}
      style={{
        width: '100%', background: 'var(--white)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius)', padding: '8px 11px', fontSize: 13,
        outline: 'none', color: 'var(--text)', transition: 'border-color .12s',
        resize: 'vertical', minHeight: 120, lineHeight: 1.55, ...style,
      }}
      onFocus={e => { e.target.style.borderColor = 'var(--accent)' }}
      onBlur={e => { e.target.style.borderColor = 'var(--border)' }}
    />
  )
}

export function Spinner({ size = 20 }) {
  return (
    <div style={{
      width: size, height: size,
      border: '1.5px solid var(--border)', borderTopColor: 'var(--accent)',
      borderRadius: '50%', animation: 'spin .6s linear infinite', flexShrink: 0,
    }} />
  )
}

export function StatusPill({ passed }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 500,
      background: passed ? 'var(--green-50)' : 'var(--red-50)',
      color: passed ? 'var(--green-600)' : 'var(--red-600)',
      border: `1px solid ${passed ? 'var(--green-100)' : 'var(--red-100)'}`,
    }}>
      <span style={{ fontSize: 10 }}>{passed ? '●' : '●'}</span>
      {passed ? 'Прошёл' : 'Не прошёл'}
    </span>
  )
}

export function EmptyState({ icon, title, sub }) {
  return (
    <div style={{ textAlign: 'center', padding: '48px 24px' }}>
      <div style={{ fontSize: 32, marginBottom: 12, opacity: .35 }}>{icon}</div>
      <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--gray-700)', marginBottom: 4 }}>{title}</div>
      {sub && <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{sub}</div>}
    </div>
  )
}

export function RulesetDropdown({ rulesets, value, onChange }) {
  const [open, setOpen] = useState(false)
  const selected = rulesets.find(r => r.id === value)
  const ref = useRef()

  return (
    <div ref={ref} style={{ position: 'relative' }}
      onBlur={e => { if (!ref.current?.contains(e.relatedTarget)) setOpen(false) }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', background: 'var(--white)',
          border: open ? '1px solid var(--accent)' : '1px solid var(--border)',
          borderRadius: open ? 'var(--radius) var(--radius) 0 0' : 'var(--radius)',
          padding: '8px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center',
          gap: 10, textAlign: 'left', fontFamily: 'var(--font)',
          boxShadow: open ? '0 0 0 3px var(--blue-50)' : 'none',
          transition: 'all .12s',
        }}
      >
        <div style={{ flex: 1 }}>
          {selected ? (
            <>
              <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--text)' }}>{selected.name}</div>
              {selected.description && (
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 1 }}>{selected.description}</div>
              )}
            </>
          ) : (
            <span style={{ color: 'var(--text-tertiary)', fontSize: 13.5 }}>Выберите набор правил…</span>
          )}
        </div>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--gray-400)" strokeWidth="2"
          style={{ flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }}>
          <polyline points="6,9 12,15 18,9"/>
        </svg>
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
          background: 'var(--white)', border: '1px solid var(--accent)', borderTop: '1px solid var(--border)',
          borderRadius: '0 0 var(--radius) var(--radius)',
          boxShadow: '0 8px 24px rgba(0,0,0,.08)', maxHeight: 280, overflowY: 'auto',
        }}>
          {rulesets.filter(r => r.is_active).map((r, i, arr) => (
            <button key={r.id} tabIndex={0}
              onClick={() => { onChange(r.id); setOpen(false) }}
              style={{
                width: '100%', background: r.id === value ? 'var(--blue-50)' : 'var(--white)',
                border: 'none', borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none',
                padding: '10px 12px', cursor: 'pointer', display: 'flex',
                alignItems: 'flex-start', gap: 10, textAlign: 'left',
                fontFamily: 'var(--font)', transition: 'background .1s',
              }}
              onMouseEnter={e => { if (r.id !== value) e.currentTarget.style.background = 'var(--gray-50)' }}
              onMouseLeave={e => { e.currentTarget.style.background = r.id === value ? 'var(--blue-50)' : 'var(--white)' }}
            >
              <div style={{
                width: 6, height: 6, borderRadius: '50%', flexShrink: 0, marginTop: 6,
                background: r.id === value ? 'var(--accent)' : 'var(--border-strong)',
              }} />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--text)' }}>{r.name}</span>
                  <span style={{
                    fontSize: 11, fontWeight: 500, padding: '1px 6px', borderRadius: 3,
                    background: r.is_public ? 'var(--green-50)' : 'var(--blue-50)',
                    color: r.is_public ? 'var(--green-600)' : 'var(--blue-600)',
                    border: r.is_public ? '1px solid var(--green-100)' : '1px solid var(--blue-100)',
                  }}>
                    {r.is_public ? 'Публичный' : 'Приватный'}
                  </span>
                </div>
                {r.description && (
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{r.description}</div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
