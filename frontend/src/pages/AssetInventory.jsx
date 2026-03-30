import { useState, useEffect } from 'react';
import { api } from '../api';

export default function AssetInventory() {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.getAssets()
      .then(d => setAssets(d.assets || []))
      .finally(() => setLoading(false));
  }, []);

  const filtered = assets.filter(a =>
    a.host.toLowerCase().includes(search.toLowerCase()) ||
    (a.ip_address || '').includes(search)
  );

  if (loading) return <div className="loading">Loading assets...</div>;

  return (
    <div className="page-wrapper">
      <div className="page-title">Asset Inventory</div>

      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
        <div className="stat-box"><div className="stat-num">{assets.length}</div><div className="stat-label">Total Assets</div></div>
        <div className="stat-box"><div className="stat-num good">{assets.filter(a=>a.is_pqc_ready).length}</div><div className="stat-label">PQC Ready</div></div>
        <div className="stat-box"><div className="stat-num alert">{assets.filter(a=>!a.is_pqc_ready).length}</div><div className="stat-label">Vulnerable</div></div>
        <div className="stat-box"><div className="stat-num warn">{assets.filter(a=>a.cert_status==='Expiring'||a.cert_status==='Expiring Soon').length}</div><div className="stat-label">Expiring Certs</div></div>
      </div>

      <div className="card">
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'12px' }}>
          <div className="card-title" style={{margin:0}}>All Scanned Assets</div>
          <input
            placeholder="Search host or IP..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ padding:'6px 12px', border:'1px solid #e0d8d0', borderRadius:'6px', fontSize:'12px', width:'220px' }}
          />
        </div>

        {filtered.length === 0 ? (
          <div className="empty-state">
            <h3>{search ? 'No results found' : 'No assets yet'}</h3>
            <p>{search ? 'Try a different search' : 'Go to Home and scan some assets first'}</p>
          </div>
        ) : (
          <div style={{ overflowX:'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>#</th><th>Host</th><th>IP Address</th><th>Asset Type</th>
                  <th>TLS Version</th><th>Key Exchange</th><th>Cert Algorithm</th>
                  <th>Key Size</th><th>Cert Expiry</th><th>Cert Status</th>
                  <th>PQC Score</th><th>HNDL Risk</th><th>PQC Label</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a,i) => (
                  <tr key={a.id}>
                    <td style={{color:'#aaa'}}>{i+1}</td>
                    <td><b style={{color:'#8b0000'}}>{a.host}</b></td>
                    <td style={{fontFamily:'monospace',fontSize:'11px'}}>{a.ip_address}</td>
                    <td>{a.asset_type}</td>
                    <td>
                      <span className={`badge ${a.tls_version==='TLSv1.3'?'badge-green':a.tls_version==='TLSv1.2'?'badge-orange':'badge-red'}`}>
                        {a.tls_version}
                      </span>
                    </td>
                    <td>{a.key_exchange}</td>
                    <td style={{fontSize:'11px'}}>{a.cert_algo?.toUpperCase()}</td>
                    <td>{a.cert_key_size ? `${a.cert_key_size}-bit` : '—'}</td>
                    <td style={{fontSize:'11px'}}>{a.cert_expiry}</td>
                    <td>
                      <span className={`badge ${a.cert_status==='Valid'?'badge-green':a.cert_status==='Expired'?'badge-red':'badge-orange'}`}>
                        {a.cert_status}
                      </span>
                    </td>
                    <td>
                      <b style={{color:a.pqc_score>=75?'#27ae60':a.pqc_score>=40?'#e67e22':'#c0392b'}}>
                        {a.pqc_score}/100
                      </b>
                    </td>
                    <td>
                      <span className={`badge ${a.hndl_risk==='High'?'badge-red':'badge-green'}`}>
                        {a.hndl_risk}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${a.is_pqc_ready?'badge-green':'badge-orange'}`}>
                        {a.pqc_label}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}