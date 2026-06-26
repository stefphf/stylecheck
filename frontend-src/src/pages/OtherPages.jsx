import { useState, useEffect } from 'react'
import { apiFetch } from '../api'
import { Btn, Card, Alert, Field, Input, Textarea, Spinner, StatusPill, EmptyState } from '../components/UI'
import ReportCard from '../components/ReportCard'

// ── Shared table styles ───────────────────────────────────────────────────────
const TH = { textAlign: 'left', padding: '8px 12px', borderBottom: '1px solid var(--border)', fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '.5px', whiteSpace: 'nowrap' }
const TD = { padding: '9px 12px', borderBottom: '1px solid var(--border)', verticalAlign: 'middle', color: 'var(--gray-800)', fontSize: 13.5 }

function Table({ headers, children, empty }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead><tr>{headers.map(h => <th key={h} style={TH}>{h}</th>)}</tr></thead>
        <tbody>{children}</tbody>
      </table>
      {empty}
    </div>
  )
}

function Pill({ role }) {
  const map = { admin: ['#fef3e2', '#b45309'], superadmin: ['var(--red-50)', 'var(--red-600)'], user: ['var(--blue-50)', 'var(--accent)'] }
  const [bg, color] = map[role] || ['var(--gray-100)', 'var(--text-secondary)']
  return <span style={{ display: 'inline-block', fontSize: 12, fontWeight: 500, padding: '2px 8px', borderRadius: 12, background: bg, color }}>{role}</span>
}

function PageHeader({ title, sub }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--gray-900)', letterSpacing: '-.3px' }}>{title}</div>
      {sub && <div style={{ fontSize: 13.5, color: 'var(--text-secondary)', marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

function LoadingCard() {
  return <Card><div style={{ textAlign: 'center', padding: '40px 20px', display:'flex',flexDirection:'column',alignItems:'center',gap:12 }}><Spinner /><p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Загружаем данные…</p></div></Card>
}

// ── History Page ──────────────────────────────────────────────────────────────
export function HistoryPage() {
  const [rows, setRows] = useState(null)
  const [openReport, setOpenReport] = useState(null)
  const [loadingReport, setLoadingReport] = useState(false)

  useEffect(() => {
    apiFetch('GET', '/check/history').then(setRows).catch(e => setRows([]))
  }, [])

  const viewReport = async (id) => {
    setLoadingReport(true); setOpenReport(null)
    try { const r = await apiFetch('GET', `/check/history/${id}`); setOpenReport(r) }
    catch (e) { alert(e.message) }
    finally { setLoadingReport(false) }
  }

  return (
    <div style={{ padding: 32 }}>
      <PageHeader title="История проверок" />
      {rows === null ? <LoadingCard /> : (
        <Card>
          {rows.length === 0 ? (
            <EmptyState icon="📋" title="Нет проверенных документов" sub="Загрузите документ и запустите первую проверку" />
          ) : (
            <Table headers={['Документ', 'Набор правил', 'Дата', 'Статус', 'Ошибок', '']}>
              {rows.map(r => (
                <tr key={r.id} onMouseEnter={e => { [...e.currentTarget.cells].forEach(c => c.style.background = 'var(--gray-50)') }} onMouseLeave={e => { [...e.currentTarget.cells].forEach(c => c.style.background = '') }}>
                  <td style={{ ...TD, fontWeight: 500 }}>{r.filename}</td>
                  <td style={{ ...TD, color: 'var(--text-secondary)' }}>{r.ruleset_name || '—'}</td>
                  <td style={{ ...TD, color: 'var(--text-secondary)' }}>{new Date(r.checked_at).toLocaleString('ru')}</td>
                  <td style={TD}><StatusPill passed={r.passed} /></td>
                  <td style={{ ...TD, fontWeight: 600, color: r.total_errors ? 'var(--red-600)' : 'var(--green-600)' }}>{r.total_errors}</td>
                  <td style={TD}><Btn size="xs" variant="outline" onClick={() => viewReport(r.id)}>Открыть</Btn></td>
                </tr>
              ))}
            </Table>
          )}
        </Card>
      )}
      {loadingReport && <LoadingCard />}
      {openReport && (
        <ReportCard
          report={openReport}
          isAuth={true}
          onShareTokenUpdate={token => setOpenReport(r => ({ ...r, share_token: token }))}
        />
      )}
    </div>
  )
}

// ── Admin Rulesets ────────────────────────────────────────────────────────────
export function AdminRulesetsPage() {
  const [rulesets, setRulesets] = useState(null)
  const [form, setForm] = useState({ name: '', desc: '', config: '' })
  const [error, setError] = useState('')

  const load = () => {
    apiFetch('GET', '/rulesets/admin/my').then(setRulesets).catch(() => setRulesets([]))
  }
  useEffect(() => { load() }, [])

  const create = async () => {
    setError('')
    if (!form.name.trim()) { setError('Введите название'); return }
    try { JSON.parse(form.config) } catch { setError('Некорректный JSON в конфигурации'); return }
    try {
      await apiFetch('POST', '/rulesets/admin/my', { name: form.name, description: form.desc || null, config_json: form.config, is_public: false })
      setForm({ name: '', desc: '', config: '' }); load()
    } catch (e) { setError(e.message) }
  }

  const toggle = async (id, active) => {
    try { await apiFetch('PUT', `/rulesets/admin/my/${id}`, { is_active: !active }); load() }
    catch (e) { alert(e.message) }
  }
  const del = async (id) => {
    if (!confirm('Удалить набор правил?')) return
    try { await apiFetch('DELETE', `/rulesets/admin/my/${id}`); load() }
    catch (e) { alert(e.message) }
  }

  return (
    <div style={{ padding: 32 }}>
      <PageHeader title="Наборы правил" sub="Приватные правила для вашей группы пользователей" />
      <Card>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 18 }}>Создать набор</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
          <Field label="Название" style={{ margin: 0, gridColumn: '1/-1' }}>
            <Input placeholder="Корпоративный стандарт 2025" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </Field>
          <Field label="Описание" style={{ margin: 0, gridColumn: '1/-1' }}>
            <Input placeholder="Для внутренних регламентов и инструкций" value={form.desc} onChange={e => setForm(f => ({ ...f, desc: e.target.value }))} />
          </Field>
        </div>
        <Field label="Конфигурация правил (JSON)" style={{ margin: 0, marginBottom: 14 }}>
          <Textarea placeholder='{"enabled_checkers":["structure","terminology","formatting"],...}' value={form.config} onChange={e => setForm(f => ({ ...f, config: e.target.value }))} />
        </Field>
        {error && <Alert type="error">{error}</Alert>}
        <Btn onClick={create}>Создать набор</Btn>
      </Card>

      {rulesets === null ? <LoadingCard /> : rulesets.length === 0 ? (
        <EmptyState icon="📋" title="Наборов пока нет" sub="Создайте первый набор правил выше" />
      ) : (
        rulesets.map(r => (
          <div key={r.id} style={{ background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '18px 20px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 14, boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: r.is_public ? 'var(--green-50)' : 'var(--blue-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
              {r.is_public ? '🌐' : '🔒'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 500 }}>{r.name}</div>
              {r.description && <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginTop: 2 }}>{r.description}</div>}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 12, background: r.is_active ? 'var(--green-50)' : 'var(--gray-100)', color: r.is_active ? 'var(--green-600)' : 'var(--text-secondary)', border: r.is_active ? '1px solid var(--green-100)' : '1px solid var(--border)' }}>
                {r.is_active ? 'Активен' : 'Неактивен'}
              </span>
              <Btn size="xs" variant="outline" onClick={() => toggle(r.id, r.is_active)}>{r.is_active ? 'Откл.' : 'Вкл.'}</Btn>
              <Btn size="xs" variant="danger" onClick={() => del(r.id)}>Удалить</Btn>
            </div>
          </div>
        ))
      )}
    </div>
  )
}

// ── Admin Group ───────────────────────────────────────────────────────────────
export function AdminGroupPage() {
  const [members, setMembers] = useState(null)
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')

  const load = () => {
    apiFetch('GET', '/admin/group').then(setMembers).catch(() => setMembers([]))
  }
  useEffect(() => { load() }, [])

  const add = async () => {
    setError(''); if (!email.trim()) return
    try { await apiFetch('POST', `/admin/group?email=${encodeURIComponent(email)}`); setEmail(''); load() }
    catch (e) { setError(e.message) }
  }

  const remove = async (id) => {
    if (!confirm('Удалить пользователя из группы?')) return
    try { await apiFetch('DELETE', `/admin/group/${id}`); load() }
    catch (e) { alert(e.message) }
  }

  return (
    <div style={{ padding: 32 }}>
      <PageHeader title="Моя группа" sub="Пользователи с доступом к вашим приватным наборам правил" />
      <Card>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Добавить пользователя</div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <Field label="Email пользователя" style={{ margin: 0, flex: 1, minWidth: 220 }}>
            <Input type="email" placeholder="user@company.com" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()} />
          </Field>
          <Btn onClick={add}>Добавить</Btn>
        </div>
        {error && <Alert type="error" style={{ marginTop: 12 }}>{error}</Alert>}
      </Card>
      <Card>
        {members === null ? <div style={{ textAlign: 'center', padding: 20 }}><Spinner /></div> : members.length === 0 ? (
          <EmptyState icon="👥" title="Группа пуста" sub="Добавьте пользователей по email выше" />
        ) : (
          <Table headers={['Email', 'Имя', '']}>
            {members.map(u => (
              <tr key={u.id} onMouseEnter={e => [...e.currentTarget.cells].forEach(c => c.style.background = 'var(--gray-50)')} onMouseLeave={e => [...e.currentTarget.cells].forEach(c => c.style.background = '')}>
                <td style={{ ...TD, fontWeight: 500 }}>{u.email}</td>
                <td style={{ ...TD, color: 'var(--text-secondary)' }}>{u.full_name || '—'}</td>
                <td style={TD}><Btn size="xs" variant="danger" onClick={() => remove(u.id)}>Удалить</Btn></td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  )
}

// ── Admin History ─────────────────────────────────────────────────────────────
export function AdminHistoryPage() {
  const [rows, setRows] = useState(null)
  useEffect(() => { apiFetch('GET', '/admin/group/history').then(setRows).catch(() => setRows([])) }, [])
  return (
    <div style={{ padding: 32 }}>
      <PageHeader title="История группы" sub="Проверки всех пользователей вашей группы" />
      {rows === null ? <LoadingCard /> : (
        <Card>
          {rows.length === 0 ? <EmptyState icon="📊" title="Нет проверок" sub="Пользователи ещё не проверяли документы" /> : (
            <Table headers={['Документ', 'Пользователь', 'Набор', 'Дата', 'Статус', 'Ошибок']}>
              {rows.map((r, i) => (
                <tr key={i} onMouseEnter={e => [...e.currentTarget.cells].forEach(c => c.style.background = 'var(--gray-50)')} onMouseLeave={e => [...e.currentTarget.cells].forEach(c => c.style.background = '')}>
                  <td style={{ ...TD, fontWeight: 500 }}>{r.filename}</td>
                  <td style={{ ...TD, color: 'var(--text-secondary)' }}>{r.user_email}</td>
                  <td style={{ ...TD, color: 'var(--text-secondary)' }}>{r.ruleset_name || '—'}</td>
                  <td style={{ ...TD, color: 'var(--text-secondary)' }}>{new Date(r.checked_at).toLocaleString('ru')}</td>
                  <td style={TD}><StatusPill passed={r.passed} /></td>
                  <td style={{ ...TD, fontWeight: 600, color: r.total_errors ? 'var(--red-600)' : 'var(--green-600)' }}>{r.total_errors}</td>
                </tr>
              ))}
            </Table>
          )}
        </Card>
      )}
    </div>
  )
}

// ── SA Rulesets ───────────────────────────────────────────────────────────────
export function SaRulesetsPage() {
  const [rulesets, setRulesets] = useState(null)
  const [form, setForm] = useState({ name: '', desc: '', config: '' })
  const [error, setError] = useState('')

  const load = () => {
    apiFetch('GET', '/rulesets/admin/my').then(rs => setRulesets(rs.filter(r => r.is_public))).catch(() => setRulesets([]))
  }
  useEffect(() => { load() }, [])

  const create = async () => {
    setError('')
    if (!form.name.trim()) { setError('Введите название'); return }
    try { JSON.parse(form.config) } catch { setError('Некорректный JSON'); return }
    try {
      await apiFetch('POST', '/rulesets/admin/my', { name: form.name, description: form.desc || null, config_json: form.config, is_public: true })
      setForm({ name: '', desc: '', config: '' }); load()
    } catch (e) { setError(e.message) }
  }

  const toggle = async (id, active) => {
    try { await apiFetch('PUT', `/rulesets/admin/my/${id}`, { is_active: !active }); load() }
    catch (e) { alert(e.message) }
  }
  const del = async (id) => {
    if (!confirm('Удалить публичный набор?')) return
    try { await apiFetch('DELETE', `/rulesets/admin/my/${id}`); load() }
    catch (e) { alert(e.message) }
  }

  return (
    <div style={{ padding: 32 }}>
      <PageHeader title="Публичные наборы" sub="Доступны всем пользователям и гостям" />
      <Card>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 18 }}>Создать публичный набор</div>
        <Field label="Название" style={{ marginBottom: 14 }}><Input placeholder="ГОСТ 7.32-2017" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></Field>
        <Field label="Описание" style={{ marginBottom: 14 }}><Input value={form.desc} onChange={e => setForm(f => ({ ...f, desc: e.target.value }))} /></Field>
        <Field label="Конфигурация (JSON)" style={{ marginBottom: 14 }}><Textarea value={form.config} onChange={e => setForm(f => ({ ...f, config: e.target.value }))} /></Field>
        {error && <Alert type="error">{error}</Alert>}
        <Btn onClick={create}>Создать</Btn>
      </Card>
      {rulesets === null ? <LoadingCard /> : rulesets.length === 0 ? (
        <EmptyState icon="🌐" title="Нет публичных наборов" sub="Создайте первый набор выше" />
      ) : rulesets.map(r => (
        <div key={r.id} style={{ background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '18px 20px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 14, boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--green-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>🌐</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 500 }}>{r.name}</div>
            {r.description && <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginTop: 2 }}>{r.description}</div>}
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <span style={{ fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 12, background: r.is_active ? 'var(--green-50)' : 'var(--gray-100)', color: r.is_active ? 'var(--green-600)' : 'var(--text-secondary)', border: r.is_active ? '1px solid var(--green-100)' : '1px solid var(--border)' }}>{r.is_active ? 'Активен' : 'Неактивен'}</span>
            <Btn size="xs" variant="outline" onClick={() => toggle(r.id, r.is_active)}>{r.is_active ? 'Откл.' : 'Вкл.'}</Btn>
            <Btn size="xs" variant="danger" onClick={() => del(r.id)}>Удалить</Btn>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── SA Admins ─────────────────────────────────────────────────────────────────
export function SaAdminsPage() {
  const [admins, setAdmins] = useState(null)
  const [form, setForm] = useState({ email: '', name: '', pass: '' })
  const [error, setError] = useState('')

  const load = () => {
    apiFetch('GET', '/superadmin/admins').then(setAdmins).catch(() => setAdmins([]))
  }
  useEffect(() => { load() }, [])

  const create = async () => {
    setError('')
    try {
      await apiFetch('POST', '/superadmin/admins', { email: form.email, password: form.pass, full_name: form.name || null })
      setForm({ email: '', name: '', pass: '' }); load()
    } catch (e) { setError(e.message) }
  }

  return (
    <div style={{ padding: 32 }}>
      <PageHeader title="Администраторы" />
      <Card>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Создать администратора</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
          <Field label="Email" style={{ margin: 0 }}><Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></Field>
          <Field label="Имя" style={{ margin: 0 }}><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></Field>
          <Field label="Временный пароль" style={{ margin: 0, gridColumn: '1/-1' }}><Input type="password" value={form.pass} onChange={e => setForm(f => ({ ...f, pass: e.target.value }))} /></Field>
        </div>
        {error && <Alert type="error">{error}</Alert>}
        <Btn onClick={create}>Создать</Btn>
      </Card>
      {admins === null ? <LoadingCard /> : (
        <Card>
          {admins.length === 0 ? <EmptyState icon="👤" title="Нет администраторов" /> : (
            <Table headers={['Email', 'Имя', 'Создан']}>
              {admins.map(a => (
                <tr key={a.id} onMouseEnter={e => [...e.currentTarget.cells].forEach(c => c.style.background = 'var(--gray-50)')} onMouseLeave={e => [...e.currentTarget.cells].forEach(c => c.style.background = '')}>
                  <td style={{ ...TD, fontWeight: 500 }}>{a.email}</td>
                  <td style={{ ...TD, color: 'var(--text-secondary)' }}>{a.full_name || '—'}</td>
                  <td style={{ ...TD, color: 'var(--text-secondary)' }}>{new Date(a.created_at).toLocaleDateString('ru')}</td>
                </tr>
              ))}
            </Table>
          )}
        </Card>
      )}
    </div>
  )
}
