import { useState, useEffect, useRef } from 'react'
import { apiFetch } from '../api'
import { Btn, Card, Alert, Spinner, RulesetDropdown } from '../components/UI'
import ReportCard from '../components/ReportCard'
import Footer from '../components/Footer'

const CHECKS = [
  { title: 'Структура документа', color: 'var(--blue-500)', items: ['Наличие обязательных разделов по выбранному набору правил', 'Корректность иерархии заголовков', 'Минимальный объём содержимого'] },
  { title: 'Терминология', color: 'var(--green-500)', items: ['Запрещённые и жаргонные слова', 'Нежелательные формулировки и замены', 'Морфологический анализ всех форм слова'] },
  { title: 'Оформление текста', color: 'var(--amber-500)', items: ['Двойные пробелы и типографика', 'Точки в конце заголовков', 'Строчная буква в начале абзаца', 'Длина параграфов и пользовательские шаблоны'] },
  { title: 'Параметры страницы', color: 'var(--red-500)', items: ['Поля страницы (левое, правое, верхнее, нижнее)', 'Гарнитура и кегль шрифта', 'Межстрочный интервал', 'Величина абзацного отступа'] },
]

export default function CheckPage({ user }) {
  const [rulesets, setRulesets] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [file, setFile] = useState(null)
  const [skipPages, setSkipPages] = useState(new Set())
  const [skipInput, setSkipInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [report, setReport] = useState(null)
  const [error, setError] = useState('')
  const [isDrag, setIsDrag] = useState(false)
  const fileRef = useRef()
  const resultRef = useRef()

  useEffect(() => {
    apiFetch('GET', '/rulesets')
      .then(rs => { setRulesets(rs); const a = rs.filter(r => r.is_active); if (a.length) setSelectedId(a[0].id) })
      .catch(() => {})
  }, [])

  const setF = f => { if (f?.name.endsWith('.docx')) { setFile(f); setReport(null); setError('') } else alert('Только .docx') }
  const addSkip = () => { const v = parseInt(skipInput); if (v > 0) { setSkipPages(p => new Set([...p, v])); setSkipInput('') } }
  const rmSkip = p => setSkipPages(prev => { const s = new Set(prev); s.delete(p); return s })

  const run = async () => {
    if (!file || !selectedId) return
    setLoading(true); setError(''); setReport(null)
    try {
      const fd = new FormData()
      fd.append('file', file); fd.append('ruleset_id', selectedId)
      if (skipPages.size > 0) fd.append('skip_pages', [...skipPages].join(','))
      const res = await apiFetch('POST', '/check/upload', fd, true)
      setReport(res)
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  const sorted = [...skipPages].sort((a, b) => a - b)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      <div style={{ flex: 1, padding: '28px 32px 0' }}>
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text)', letterSpacing: '-.3px', marginBottom: 4 }}>
            Проверить документ
          </h1>
          <p style={{ fontSize: 13.5, color: 'var(--text-secondary)' }}>
            Загрузите DOCX и выберите набор стандартов для проверки
          </p>
        </div>

        {/* Upload */}
        <div
          onClick={() => fileRef.current.click()}
          onDragOver={e => { e.preventDefault(); setIsDrag(true) }}
          onDragLeave={() => setIsDrag(false)}
          onDrop={e => { e.preventDefault(); setIsDrag(false); setF(e.dataTransfer.files[0]) }}
          style={{
            border: `1px dashed ${isDrag ? 'var(--accent)' : 'var(--gray-300)'}`,
            borderRadius: 'var(--radius-lg)', padding: '32px 24px', textAlign: 'center',
            cursor: 'pointer', transition: 'all .12s', marginBottom: 12,
            background: isDrag ? 'var(--blue-50)' : 'var(--white)',
          }}
        >
          <div style={{ width: 40, height: 40, borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--gray-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontSize: 18 }}>📄</div>
          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--gray-800)', marginBottom: 4 }}>Выберите файл или перетащите сюда</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            Поддерживается <span style={{ fontWeight: 500, color: 'var(--text)' }}>.docx</span> до 10 МБ
          </div>
        </div>
        <input ref={fileRef} type="file" accept=".docx" style={{ display: 'none' }} onChange={e => setF(e.target.files[0])} />

        {/* Settings panel */}
        {file && (
          <Card>
            {/* File */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 16, marginBottom: 16, borderBottom: '1px solid var(--border)' }}>
              <div style={{ width: 32, height: 32, borderRadius: 'var(--radius-sm)', background: 'var(--gray-50)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>📄</div>
              <span style={{ fontSize: 13.5, fontWeight: 500, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</span>
              <Btn size="xs" variant="ghost" onClick={() => { setFile(null); setReport(null); setError('') }}>Убрать</Btn>
            </div>

            {/* Ruleset */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12.5, fontWeight: 500, color: 'var(--gray-700)', marginBottom: 6 }}>Набор правил</label>
              {rulesets.length > 0
                ? <RulesetDropdown rulesets={rulesets} value={selectedId} onChange={setSelectedId} />
                : <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Загрузка…</div>
              }
            </div>

            {/* Skip pages */}
            <div style={{ marginBottom: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
              <label style={{ display: 'block', fontSize: 12.5, fontWeight: 500, color: 'var(--gray-700)', marginBottom: 4 }}>Страницы для пропуска</label>
              <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginBottom: 8 }}>Укажите страницы, которые не нужно проверять (титульный лист, задание и т.п.)</p>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input type="number" min="1" placeholder="Номер страницы" value={skipInput}
                  onChange={e => setSkipInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && addSkip()}
                  style={{ width: 150, background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '7px 10px', fontSize: 13.5, outline: 'none', fontFamily: 'var(--font)' }}
                  onFocus={e => { e.target.style.borderColor = 'var(--accent)'; e.target.style.boxShadow = '0 0 0 3px var(--blue-50)' }}
                  onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none' }}
                />
                <Btn size="sm" variant="outline" onClick={addSkip}>+ Добавить</Btn>
              </div>
              {sorted.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                  {sorted.map(p => (
                    <span key={p} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'var(--gray-100)', border: '1px solid var(--border)', borderRadius: 3, padding: '3px 8px', fontSize: 12.5, color: 'var(--gray-700)' }}>
                      Стр. {p}
                      <span onClick={() => rmSkip(p)} style={{ cursor: 'pointer', color: 'var(--gray-400)', lineHeight: 1, fontSize: 14 }}>×</span>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Run */}
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <Btn onClick={run} disabled={!file || !selectedId || loading}>
                {loading ? <Spinner size={14} /> : (
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="5,3 19,12 5,21"/></svg>
                )}
                {loading ? 'Анализируем…' : 'Запустить проверку'}
              </Btn>
              {sorted.length > 0 && <span style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>Пропуск: стр. {sorted.join(', ')}</span>}
            </div>
          </Card>
        )}

        {error && <Alert type="error">{error}</Alert>}
        {report && <div ref={resultRef}><ReportCard report={report} isAuth={!!user} onShareTokenUpdate={t => setReport(r => ({ ...r, share_token: t }))} /></div>}

        {/* Landing — показывается пока файл не выбран */}
        {!file && !report && (
          <div>
            {/* What we check */}
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 12 }}>
              Что проверяется
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10, marginBottom: 20 }}>
              {CHECKS.map(c => (
                <div key={c.title} style={{ background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '16px 18px', borderLeft: `3px solid ${c.color}` }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--gray-800)', marginBottom: 10 }}>{c.title}</div>
                  <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {c.items.map((item, i) => (
                      <li key={i} style={{ display: 'flex', gap: 8, fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                        <span style={{ width: 4, height: 4, borderRadius: '50%', background: c.color, flexShrink: 0, marginTop: 6 }} />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            {/* How it works */}
            <div style={{ background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '18px 20px', marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 16 }}>
                Как это работает
              </div>
              <div className="hiw" style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                {[
                  ['01', 'Загрузите .docx', 'До 10 МБ'],
                  ['02', 'Выберите набор правил', 'Публичный или приватный'],
                  ['03', 'Укажите исключения', 'Страницы для пропуска'],
                  ['04', 'Получите отчёт', 'Страница, абзац, цитата'],
                ].map(([n, t, d], idx, arr) => (
                  <div key={n} className="hiw-itemwrap" style={{ display: 'contents' }}>
                    <div className="hiw-item" style={{ flex: '1 1 180px', minWidth: 180 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent)', marginBottom: 6, fontVariantNumeric: 'tabular-nums' }}>{n}</div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--gray-800)', marginBottom: 3 }}>{t}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{d}</div>
                    </div>
                    {idx < arr.length - 1 && (
                      <div className="hiw-arrow" aria-hidden="true" style={{ flex: '0 0 auto', opacity: .55 }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--gray-400)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="5" y1="12" x2="19" y2="12"></line>
                          <polyline points="13 6 19 12 13 18"></polyline>
                        </svg>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <style>{`
                @media (max-width: 880px) {
                  .hiw { gap: 12px !important; }
                  .hiw-item { flex-basis: 220px !important; }
                }
                @media (max-width: 640px) {
                  .hiw { flex-direction: column !important; align-items: stretch !important; }
                  .hiw-item { min-width: 0 !important; flex: 1 1 auto !important; }
                  .hiw-arrow { display: flex !important; justify-content: center !important; padding: 2px 0 !important; transform: rotate(90deg) !important; }
                }
              `}</style>
            </div>
          </div>
        )}
      </div>
      <Footer />
    </div>
  )
}
