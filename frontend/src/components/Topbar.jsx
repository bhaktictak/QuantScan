export default function Topbar() {
  return (
    <div style={{
      background: 'linear-gradient(90deg, #6b0000, #8b0000)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      height: '52px',
      color: '#fff',
      flexShrink: 0,
      boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{
          background: '#e6a817',
          color: '#4a1b0c',
          fontSize: '10px',
          fontWeight: 800,
          padding: '4px 10px',
          borderRadius: '12px',
          letterSpacing: '0.5px',
        }}>PQC-Ready</div>
        <span style={{ fontSize: '17px', fontWeight: 700, letterSpacing: '0.5px' }}>
          QuantScan
        </span>
      </div>
      <div style={{ fontSize: '13px', opacity: 0.85 }}>
        Welcome, test_user &nbsp;·&nbsp; PSB Hackathon 2026
      </div>
    </div>
  );
}