import { useState, useEffect } from 'react';
import { api } from '../api';

export default function AssetDiscovery() {
  const [assets, setAssets] = useState([]);
  const [tab, setTab]       = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getAssets()
      .then(d => setAssets(d.assets || []))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading">Loading discovery data...</div>;

  const byType = (type) => assets.filter(a => a.asset_type === type);
  const webServers  = assets.filter(a => a.asset_type?.includes('Web') || a.asset_type?.includes('Portal'));
  const apis        = assets.filter(a => a.asset_type?.includes('API'));
  const vpns        = assets.filter(a => a.asset_type?.includes('VPN'));
  const others      = assets.filter(a => !webServers.includes(a) && !apis.includes(a) && !vpns.includes(a));

  const displayed = tab === 'web' ? webServers
    : tab === 'api' ? apis
    : tab === 'vpn' ? vpns
    : tab === 'other' ? others
    : assets;

  return (
    <div className="page-wrapper">
      <div className="page-title">Asset Discovery</div>

      <div className="stat-grid" style={{ gridTemplateColumns:'repeat(4,1fr)', marginBottom:'14px' }}>
        <div className="stat-box"><div className="stat-num">{assets.length}</div><div className="stat-label">Total Discovered</div></div>
        <div className="stat-box"><div className="stat-num">{webServers.length}</div><div className="stat-label">Web Servers</div></div>
        <div className="stat-box"><div className="stat-num">{apis.length}</div><div className="stat-label">API Gateways</div></div>
        <div className="stat-box"><div className="stat-num">{vpns.length}</div><div className="stat-label">VPN Endpoints</div></div>
      </div>

      <div className="tabs">
        {[['all','All'],['web','Web Servers'],['api','APIs'],['vpn','VPNs'],['other','Other']].map(([k,l])=>(
          <div key={k} className={`tab ${tab===k?'active':''}`} onClick={()=>setTab(k)}>
            {l} ({k==='all'?assets.length:k==='web'?webServers.length:k==='api'?apis.length:k==='vpn'?vpns.length:others.length})
          </div>
        ))}
      </div>

      <div className="card" style={{padding:0,overflow:'hidden'}}>
        {displayed.length === 0 ? (
          <div className="empty-state" style={{padding:'32px'}}>
            <h3>No assets in this category</h3>
            <p>Scan more domains from the Home page</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Host</th><th>IP Address</th><th>Port</th><th>Asset Type</th>
                <th>TLS</th><th>Cipher Suite</th><th>Cert Issuer</th>
                <th>Cert Expiry</th><th>PQC Score</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {displayed.map(a => (
                <tr key={a.id}>
                  <td><b style={{color:'#1a56db'}}>{a.host}</b></td>
                  <td style={{fontFamily:'monospace',fontSize:'11px'}}>{a.ip_address}</td>
                  <td>{a.port}</td>
                  <td>{a.asset_type}</td>
                  <td>
                    <span className={`badge ${a.tls_version==='TLSv1.3'?'badge-green':a.tls_version==='TLSv1.2'?'badge-orange':'badge-red'}`}>
                      {a.tls_version}
                    </span>
                  </td>
                  <td style={{fontSize:'10px',fontFamily:'monospace',maxWidth:'160px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                    {a.cipher_suite}
                  </td>
                  <td style={{fontSize:'11px',maxWidth:'140px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                    {a.cert_issuer}
                  </td>
                  <td style={{fontSize:'11px'}}>{a.cert_expiry}</td>
                  <td>
                    <b style={{color:a.pqc_score>=75?'#27ae60':a.pqc_score>=40?'#e67e22':'#c0392b'}}>
                      {a.pqc_score}/100
                    </b>
                  </td>
                  <td>
                    <span className={`badge ${a.is_pqc_ready?'badge-green':'badge-orange'}`}>
                      {a.is_pqc_ready?'PQC Ready':'Needs Action'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}