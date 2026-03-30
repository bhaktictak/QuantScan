import { useState, useEffect } from 'react';
import { api } from '../api';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

const COLORS = {
  "Quantum-Safe": "#27ae60",
  "PQC-Ready": "#2ecc71",
  "Modern Secure (Not PQC Ready)": "#3498db",
  "Transitional Risk": "#f39c12",
  "Critical Risk": "#e74c3c"
};

export default function PostureOfPQC() {
  const [assets, setAssets]   = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    api.getAssets()
      .then(d => { setAssets(d.assets||[]); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading">Loading PQC posture...</div>;

  // ✅ REAL LABEL COUNTS (FROM BACKEND)
  const counts = {};
  assets.forEach(a => {
    const label = a.pqc_label || "Unknown";
    counts[label] = (counts[label] || 0) + 1;
  });

  const pieData = Object.entries(counts).map(([k,v]) => ({
    name: k,
    value: v
  }));

  const allRecs = [...new Set(assets.flatMap(a => a.recommendations || []))];

  return (
    <div className="page-wrapper">

      {/* TOP BAR */}
      <div style={{
        display:'flex', gap:'10px', background:'#1a2540', color:'#fff',
        borderRadius:'10px', padding:'12px 18px', marginBottom:'14px',
        fontSize:'12px', flexWrap:'wrap',
      }}>
        {Object.entries(counts).map(([k,v]) => (
          <span key={k} style={{color: COLORS[k] || '#ccc', fontWeight:700}}>
            {k}: {v}
          </span>
        ))}
      </div>

      <div className="two-col">

        {/* LEFT */}
        <div>

          {/* CARDS */}
          <div className="card">
            <div className="card-title">PQC Classification</div>

            <div style={{display:'flex',gap:'10px',flexWrap:'wrap'}}>
              {Object.entries(counts).map(([label,count]) => (
                <div key={label} style={{
                  background:'#fff',
                  border:`2px solid ${COLORS[label] || '#ccc'}`,
                  borderRadius:'8px',
                  padding:'12px 16px',
                  textAlign:'center',
                  flex:'1',
                  minWidth:'110px'
                }}>
                  <div style={{fontSize:'28px',fontWeight:800,color:COLORS[label] || '#333'}}>
                    {count}
                  </div>
                  <div style={{fontSize:'10px',color:'#666',marginTop:'3px'}}>
                    {label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* PIE */}
          <div className="card">
            <div className="card-title">Application Status</div>

            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({percent}) => `${Math.round(percent*100)}%`}
                  >
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={COLORS[entry.name] || '#888'} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-state"><p>No data yet</p></div>
            )}
          </div>
        </div>

        {/* RIGHT */}
        <div>

          {/* ASSETS LIST */}
          <div className="card">
            <div className="card-title">All Assets — PQC Support</div>

            <div style={{maxHeight:'320px',overflowY:'auto'}}>
              {assets.length === 0 ? (
                <div className="empty-state"><p>No assets scanned yet</p></div>
              ) : assets.map(a => (
                <div key={a.id}
                  onClick={() => setSelected(selected?.id===a.id ? null : a)}
                  style={{
                    display:'flex',
                    justifyContent:'space-between',
                    alignItems:'center',
                    padding:'9px 12px',
                    background: selected?.id===a.id ? '#fff8f0' : '#fff',
                    border:'1px solid #e0d8d0',
                    borderRadius:'7px',
                    marginBottom:'6px',
                    cursor:'pointer'
                  }}>

                  <div>
                    <div style={{fontSize:'13px',fontWeight:600}}>{a.host}</div>
                    <div style={{fontSize:'10px',color:'#888'}}>
                      {a.ip_address} · Score: {a.pqc_score}/100
                    </div>
                  </div>

                  <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                    <span>{a.is_pqc_ready ? '✅' : '❌'}</span>
                    <span className="badge" style={{
                      background: COLORS[a.pqc_label] || '#ccc',
                      color:'#fff'
                    }}>
                      {a.pqc_label}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* DETAILS */}
          {selected && (
            <div className="card" style={{border:'2px solid #f39c12'}}>
              <div className="card-title">{selected.host} — Details</div>

              <div style={{
                fontSize:'12px',
                display:'grid',
                gridTemplateColumns:'1fr 1fr',
                gap:'8px'
              }}>
                {[
                  ['TLS Version', selected.tls_version],
                  ['Key Exchange', selected.key_exchange],
                  ['Cert Algorithm', selected.cert_algo],
                  ['Key Size', selected.cert_key_size ? `${selected.cert_key_size}-bit` : '—'],
                  ['Cert Expiry', selected.cert_expiry],
                  ['HNDL Risk', selected.hndl_risk],
                ].map(([k,v]) => (
                  <div key={k}>
                    <div style={{color:'#888',fontSize:'10px'}}>{k}</div>
                    <div style={{fontWeight:600}}>{v || '—'}</div>
                  </div>
                ))}
              </div>

              {(selected.recommendations||[]).length > 0 && (
                <>
                  <div className="card-title">Recommendations</div>
                  {selected.recommendations.map((r,i) => (
                    <div key={i} className="rec-item">⚡ {r}</div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* GLOBAL RECOMMENDATIONS */}
      <div className="card">
        <div className="card-title">Enterprise-Wide Improvement Recommendations</div>

        {allRecs.length === 0
          ? <div className="empty-state"><p>All assets are well secured</p></div>
          : allRecs.map((r,i) => (
              <div key={i} className="rec-item">⚡ {r}</div>
            ))
        }
      </div>
    </div>
  );
}