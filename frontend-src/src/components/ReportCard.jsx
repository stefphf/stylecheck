import { useState } from 'react'
import { apiFetch } from '../api'
import { Btn, Alert, StatusPill } from './UI'

const CAT = { structure: 'Структура', terminology: 'Терминология', formatting: 'Оформление' }
const SEV = { error: 'Ошибка', warning: 'Предупреждение', info: 'Замечание' }
const SEV_O = { error: 0, warning: 1, info: 2 }
const SEV_STYLE = {
  error: { bg: 'var(--red-50)', border: '1px solid var(--red-100)', stripe: 'var(--red-500)', tag: { bg: 'var(--red-50)', color: 'var(--red-600)', border: '1px solid var(--red-100)' } },
  warning: { bg: 'var(--amber-50)', border: '1px solid var(--amber-100)', stripe: 'var(--amber-500)', tag: { bg: 'var(--amber-50)', color: 'var(--amber-600)', border: '1px solid var(--amber-100)' } },
  info: { bg: 'var(--blue-50)', border: '1px solid var(--blue-100)', stripe: 'var(--blue-500)', tag: { bg: 'var(--blue-50)', color: 'var(--blue-600)', border: '1px solid var(--blue-100)' } },
}

function FilterBtn({ active, color, onClick, children }) {
  const colors = { all: 'var(--gray-900)', error: 'var(--red-600)', warning: 'var(--amber-600)', info: 'var(--blue-600)', sort: 'var(--gray-900)' }
  const bgs = { all: 'var(--gray-900)', error: 'var(--red-50)', warning: 'var(--amber-50)', info: 'var(--blue-50)', sort: 'var(--gray-900)' }
  return (
    <button onClick={onClick} style={{
      padding: '4px 11px', fontSize: 12.5, fontWeight: 500,
      borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font)', cursor: 'pointer',
      border: active ? `1px solid ${color === 'all' || color === 'sort' ? 'var(--gray-200)' : colors[color]}` : '1px solid var(--border)',
      background: active ? (color === 'all' || color === 'sort' ? 'var(--gray-900)' : bgs[color]) : 'var(--white)',
      color: active ? (color === 'all' || color === 'sort' ? 'var(--white)' : colors[color]) : 'var(--text-secondary)',
      transition: 'all .1s',
    }}>{children}</button>
  )
}

export default function ReportCard({ report, isAuth, onShareTokenUpdate }) {
  const [fSev, setFSev] = useState('all')
  const [sort, setSort] = useState('doc')
  const [sharing, setSharing] = useState(false)
  const [copied, setCopied] = useState(false)

  const { violations = [], page_count, skip_pages = [], ruleset_name, filename, checked_at, passed, total_errors, total_warnings, id, share_token } = report
  const nE = violations.filter(v => v.severity === 'error').length
  const nW = violations.filter(v => v.severity === 'warning').length
  const nI = violations.filter(v => v.severity === 'info').length

  let filtered = fSev === 'all' ? [...violations] : violations.filter(v => v.severity === fSev)
  if (sort === 'doc') filtered.sort((a, b) => (a.global_index ?? 9999) - (b.global_index ?? 9999))
  else filtered.sort((a, b) => (SEV_O[a.severity] ?? 3) - (SEV_O[b.severity] ?? 3) || (a.global_index ?? 9999) - (b.global_index ?? 9999))

  const doShare = async () => {
    setSharing(true)
    try { const r = await apiFetch('POST', `/check/history/${id}/share`); onShareTokenUpdate?.(r.share_token) }
    catch (e) { alert(e.message) }
    finally { setSharing(false) }
  }

  const doCopy = () => {
    const url = `${location.origin}/shared/${share_token}`
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
    } else {
      const t = document.createElement('textarea'); t.value = url; t.style.cssText = 'position:fixed;opacity:0'
      document.body.appendChild(t); t.focus(); t.select()
      try { document.execCommand('copy'); setCopied(true); setTimeout(() => setCopied(false), 2000) } catch { prompt('Скопируйте:', url) }
      document.body.removeChild(t)
    }
  }

  return (
    <div className="rc-root" style={{ background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px 24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <StatusPill passed={passed} />
          {ruleset_name && <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{ruleset_name}</span>}
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <span style={{ fontSize: 12.5, color: 'var(--text-tertiary)' }}>{filename}</span>
          {checked_at && <span style={{ fontSize: 12.5, color: 'var(--text-tertiary)' }}>· {new Date(checked_at).toLocaleString('ru')}</span>}
        </div>
      </div>

      {/* Stats */}
      <div className="rc-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 8, marginBottom: 16 }}>
        {[
          [total_errors, 'Ошибок', total_errors > 0 ? 'var(--red-600)' : 'var(--gray-700)'],
          [total_warnings, 'Предупреждений', total_warnings > 0 ? 'var(--amber-600)' : 'var(--gray-700)'],
          [nI, 'Замечаний', nI > 0 ? 'var(--blue-600)' : 'var(--gray-700)'],
          [page_count || 1, 'Страниц', 'var(--gray-700)'],
        ].map(([v, l, c]) => (
          <div key={l} style={{ background: 'var(--gray-50)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '12px 14px', textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 600, color: c, letterSpacing: '-.5px' }}>{v}</div>
            <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', marginTop: 2 }}>{l}</div>
          </div>
        ))}
      </div>

      {skip_pages.length > 0 && (
        <Alert type="info" style={{ marginBottom: 12 }}>
          Страницы не проверялись: {[...skip_pages].sort((a, b) => a - b).join(', ')}
        </Alert>
      )}

      {share_token && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--blue-50)', border: '1px solid var(--blue-100)', borderRadius: 'var(--radius)', padding: '9px 12px', marginBottom: 12 }}>
          <span style={{ flex: 1, fontSize: 12, color: 'var(--blue-600)', fontFamily: 'monospace', wordBreak: 'break-all' }}>
            {location.origin}/shared/{share_token}
          </span>
          <Btn size="xs" variant="outline" onClick={doCopy}>{copied ? '✓ Скопировано' : 'Копировать'}</Btn>
        </div>
      )}

      {violations.length === 0 ? (
        <Alert type="success" style={{ marginBottom: 0 }}>Документ соответствует всем правилам набора!</Alert>
      ) : (
        <>
          {/* Filter bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', padding: '10px 0', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', marginBottom: 14 }}>
            <span style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--text-tertiary)', marginRight: 2 }}>Фильтр:</span>
            <FilterBtn active={fSev === 'all'} color="all" onClick={() => setFSev('all')}>Все {violations.length}</FilterBtn>
            <FilterBtn active={fSev === 'error'} color="error" onClick={() => setFSev('error')}>Ошибки {nE}</FilterBtn>
            <FilterBtn active={fSev === 'warning'} color="warning" onClick={() => setFSev('warning')}>Предупреждения {nW}</FilterBtn>
            <FilterBtn active={fSev === 'info'} color="info" onClick={() => setFSev('info')}>Замечания {nI}</FilterBtn>
            <div style={{ width: 1, height: 14, background: 'var(--border)', margin: '0 4px' }} />
            <FilterBtn active={sort === 'doc'} color="sort" onClick={() => setSort('doc')}>По документу</FilterBtn>
            <FilterBtn active={sort === 'sev'} color="sort" onClick={() => setSort('sev')}>По приоритету</FilterBtn>
            {isAuth && id > 0 && !share_token && (
              <div style={{ marginLeft: 'auto' }}>
                <Btn size="xs" variant="outline" onClick={doShare} disabled={sharing}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                  </svg>
                  {sharing ? '…' : 'Поделиться'}
                </Btn>
              </div>
            )}
          </div>

          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px', fontSize: 13, color: 'var(--text-secondary)' }}>
              Нарушений с таким фильтром нет
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {filtered.length < violations.length && (
                <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginBottom: 4 }}>
                  Показано {filtered.length} из {violations.length}
                </div>
              )}
              {filtered.map((v, i) => {
                const s = SEV_STYLE[v.severity]
                return (
                  <div key={i} style={{ background: s.bg, border: s.border, borderLeft: `3px solid ${s.stripe}`, borderRadius: 'var(--radius)', padding: '12px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 11, fontWeight: 500, padding: '2px 6px', borderRadius: 3, background: 'rgba(0,0,0,.05)', color: 'var(--gray-500)' }}>
                        {CAT[v.category] || v.category}
                      </span>
                      <span style={{ fontSize: 11, fontWeight: 500, padding: '2px 6px', borderRadius: 3, background: s.tag.bg, color: s.tag.color, border: s.tag.border }}>
                        {SEV[v.severity] || v.severity}
                      </span>
                      {v.in_table && <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>· таблица</span>}
                      {v.is_image && <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>· изображение</span>}
                    </div>
                    <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--gray-800)', lineHeight: 1.45 }}>{v.message}</div>
                    {v.page_number && (
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 5 }}>
                        Стр. {v.page_number}, абз. {v.para_on_page || '?'}
                      </div>
                    )}
                    {v.context && (
                      <div style={{ marginTop: 7, padding: '6px 10px', background: 'rgba(0,0,0,.04)', borderRadius: 4, fontSize: 12, fontFamily: 'ui-monospace, monospace', color: 'var(--gray-700)', wordBreak: 'break-word', lineHeight: 1.5 }}>
                        «{v.context}»
                      </div>
                    )}
                    {v.suggestion && (
                      <div style={{ fontSize: 12, color: 'var(--blue-600)', marginTop: 5 }}>→ {v.suggestion}</div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      <style>{`
        @media (max-width: 820px) {
          .rc-root { padding: 16px 16px !important; }
          .rc-stats { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
        }
        @media (max-width: 420px) {
          .rc-stats { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}
