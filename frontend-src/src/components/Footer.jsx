export default function Footer() {
  return (
    <footer style={{
      borderTop: '1px solid var(--border)',
      padding: '16px 32px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: 12,
    }}>
      <span style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--gray-700)' }}>StyleCheck</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        <a href="mailto:stepan_tsoy500@mail.ru"
          style={{ fontSize: 12.5, color: 'var(--text-secondary)', textDecoration: 'none', transition: 'color .12s' }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
        >
          stepan_tsoy500@mail.ru
        </a>
        <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>© 2025</span>
      </div>
    </footer>
  )
}
