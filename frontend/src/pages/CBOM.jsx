import { useState, useEffect } from 'react';
import { api } from '../api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#3498db','#e74c3c','#27ae60','#e67e22','#888'];

export default function CBOM() {
  const [cbom, setCbom]     = useState(null);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.getCBOM(), api.getAssets()])
      .then(([c, a]) => { setCbom(c); setAssets(a.assets || []); })
      .finally(() => setLoading(false));
  }, []);

  const downloadCBOM = () => {
    const blob = new Blob([JSON.stringify(cbom, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'quanscan-cbom.json'; a.click();
  };

  if (loading) return <div className="loading">Generating CBOM...</div>;

  const weakCrypto = assets.filter(a =>
    a.cipher_suite?.includes('DES') ||
    a.cipher_suite?.includes('RC4') ||
    a.cipher_suite?.includes('CBC') ||
    (a.cert_key_size && a.cert_key_size < 2048 && a.cert_algo !== 'EC')
  );

  const cipherMap = {};
  assets.forEach(a => {
    if (a.cipher_suite) {
      cipherMap[a.cipher_suite] = (cipherMap[a.cipher_suite] || 0) + 1;
    }
  });
  const cipherData = Object.entries(cipherMap)
    .map(([name, count]) => ({ name: name.length > 30 ? name.slice(0,30)+'…' : name, count }))
    .sort((a,b) => b.count - a.count);

  const tlsMap = {};
  assets.forEach(a => {
    if (a.tls_version) tlsMap[a.tls_version] = (tlsMap[a.tls_version] || 0) + 1;
  });
  const tlsData = Object.entries(tlsMap).map(([name, value]) => ({ name, value }));

  const issuerMap = {};
  assets.forEach(a => {
    if (a.cert_issuer) {
      const short = a.cert_issuer.split(',')[0].replace('CN=','').trim();
      issuerMap[short] = (issuerMap[short] || 0) + 1;
    }
  });
  const issuerData = Object.entries(issuerMap).map(([name, value]) => ({ name, value }));

  return (
    <div className="page-wrapper">
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px' }}>
        <div className="page-title" style={{margin:0}}>Cryptographic Bill of Materials</div>
        <button className="btn-primary" onClick={downloadCBOM}>⬇ Export CBOM (CycloneDX JSON)</button>
      </div>

      <div className="stat-grid" style={{gridTemplateColumns:'repeat(5,1fr)'}}>
        <div className="stat-box"><div className="stat-num">{assets.length}</div><div className="stat-label">Assets Scanned</div></div>
        <div className="stat-box"><div className="stat-num">{cbom?.components?.length ?? 0}</div><div className="stat-label">CBOM Components</div></div>
        <div className="stat-box"><div className="stat-num good">{assets.filter(a=>a.cert_status==='Valid').length}</div><div className="stat-label">Valid Certs</div></div>
        <div className="stat-box"><div className="stat-num alert">{weakCrypto.length}</div><div className="stat-label">Weak Cryptography</div></div>
        <div className="stat-box"><div className="stat-num warn">{assets.filter(a=>a.cert_status?.includes('Expiring')).length}</div><div className="stat-label">Cert Issues</div></div>
      </div>

      <div className="two-col">
        <div className="card" style={{background:'#1a2540',color:'#fff'}}>
          <div className="card-title" style={{color:'#e6a817'}}>Cipher Suite Usage</div>
          {cipherData.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={cipherData} layout="vertical">
                <XAxis type="number" tick={{fill:'#aaa',fontSize:10}} />
                <YAxis type="category" dataKey="name" width={200} tick={{fill:'#ccc',fontSize:9}} />
                <Tooltip contentStyle={{background:'#1a2540',border:'1px solid #333',color:'#fff',fontSize:11}} />
                <Bar dataKey="count" fill="#378add" radius={[0,4,4,0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <div style={{color:'#888',padding:'20px',textAlign:'center'}}>No data yet</div>}
        </div>

        <div className="card" style={{background:'#1a2540',color:'#fff'}}>
          <div className="card-title" style={{color:'#e6a817'}}>TLS Protocol Distribution</div>
          {tlsData.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={tlsData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70}
                  label={({name,value})=>`${name}: ${value}`}>
                  {tlsData.map((_,i) => <Cell key={i} fill={COLORS[i]} />)}
                </Pie>
                <Tooltip contentStyle={{background:'#1a2540',border:'1px solid #333',color:'#fff',fontSize:11}} />
              </PieChart>
            </ResponsiveContainer>
          ) : <div style={{color:'#888',padding:'20px',textAlign:'center'}}>No data yet</div>}
        </div>
      </div>

      <div className="two-col">
        <div className="card" style={{background:'#1a2540',color:'#fff'}}>
          <div className="card-title" style={{color:'#e6a817'}}>Certificate Authorities</div>
          {issuerData.length > 0 ? (
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={issuerData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60}
                  label={({name,value})=>`${name}: ${value}`}>
                  {issuerData.map((_,i) => <Cell key={i} fill={COLORS[i]} />)}
                </Pie>
                <Tooltip contentStyle={{background:'#1a2540',border:'1px solid #333',color:'#fff',fontSize:11}} />
              </PieChart>
            </ResponsiveContainer>
          ) : <div style={{color:'#888',padding:'20px',textAlign:'center'}}>No data yet</div>}
        </div>

        <div className="card" style={{background:'#1a2540',color:'#fff'}}>
          <div className="card-title" style={{color:'#e6a817'}}>Key Size Distribution</div>
          {assets.length > 0 ? (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={
                Object.entries(
                  assets.reduce((acc,a) => {
                    const k = a.cert_key_size ? `${a.cert_key_size}-bit` : 'Unknown';
                    acc[k] = (acc[k]||0)+1; return acc;
                  }, {})
                ).map(([name,count])=>({name,count}))
              }>
                <XAxis dataKey="name" tick={{fill:'#aaa',fontSize:10}} />
                <YAxis tick={{fill:'#aaa',fontSize:10}} />
                <Tooltip contentStyle={{background:'#1a2540',border:'1px solid #333',color:'#fff',fontSize:11}} />
                <Bar dataKey="count" fill="#e6a817" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <div style={{color:'#888',padding:'20px',textAlign:'center'}}>No data yet</div>}
        </div>
      </div>

      {/* CBOM Table */}
      <div className="card">
        <div className="card-title">CBOM — Full Cryptographic Inventory (CERT-In Annexure-A)</div>
        <div style={{overflowX:'auto'}}>
          <table>
            <thead>
              <tr>
                <th>Host</th><th>Asset Type</th><th>TLS</th><th>Cipher Suite</th>
                <th>Key Exchange</th><th>Cert Algorithm</th><th>Key Size</th>
                <th>Valid From</th><th>Expiry</th><th>Issuer</th>
                <th>PQC Score</th><th>HNDL Risk</th>
              </tr>
            </thead>
            <tbody>
              {assets.map(a => (
                <tr key={a.id}>
                  <td><b>{a.host}</b></td>
                  <td>{a.asset_type}</td>
                  <td><span className={`badge ${a.tls_version==='TLSv1.3'?'badge-green':a.tls_version==='TLSv1.2'?'badge-orange':'badge-red'}`}>{a.tls_version}</span></td>
                  <td style={{fontSize:'10px',fontFamily:'monospace'}}>{a.cipher_suite}</td>
                  <td>{a.key_exchange}</td>
                  <td>{a.cert_algo?.toUpperCase()}</td>
                  <td>{a.cert_key_size ? `${a.cert_key_size}-bit` : '—'}</td>
                  <td style={{fontSize:'11px'}}>{a.cert_valid_from}</td>
                  <td style={{fontSize:'11px'}}>{a.cert_expiry}</td>
                  <td style={{fontSize:'10px',maxWidth:'120px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{a.cert_issuer}</td>
                  <td><b style={{color:a.pqc_score>=75?'#27ae60':a.pqc_score>=40?'#e67e22':'#c0392b'}}>{a.pqc_score}/100</b></td>
                  <td><span className={`badge ${a.hndl_risk==='High'?'badge-red':'badge-green'}`}>{a.hndl_risk}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}