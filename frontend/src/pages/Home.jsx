import { useState, useEffect } from 'react';
import { api } from '../api';
import ScanModal from '../components/ScanModal';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  Tooltip, ResponsiveContainer, XAxis, YAxis
} from 'recharts';

const COLORS = ['#8b0000','#e6a817','#3498db','#27ae60','#888'];

export default function Home() {
  const [dash, setDash]       = useState(null);
  const [assets, setAssets]   = useState([]);
  const [showScan, setShowScan] = useState(false);
  const [loading, setLoading]   = useState(true);

  const load = async () => {
    try {
      const [d, a] = await Promise.all([api.getDashboard(), api.getAssets()]);
      setDash(d);
      setAssets(a.assets || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const pqcBadge = (label) => {
    const map = {
  'Quantum-Safe': 'badge-green',
  'PQC-Ready': 'badge-green',
  'Modern Secure (Not PQC Ready)': 'badge-blue',
  'Transitional Risk': 'badge-orange',
  'Critical Risk': 'badge-red',
};
    return <span className={`badge ${map[label] || 'badge-gray'}`}>{label}</span>;
  };

  const certBadge = (status) => {
    if (!status) return null;
    const map = {
      'Valid':         'badge-green',
      'Expiring':      'badge-orange',
      'Expiring Soon': 'badge-red',
      'Expired':       'badge-red',
    };
    return <span className={`badge ${map[status] || 'badge-gray'}`}>{status}</span>;
  };

  if (loading) return <div className="loading">Loading dashboard...</div>;

  const riskCounts = {};
  assets.forEach(a => {
    const label = a.pqc_label || "Unknown";
    riskCounts[label] = (riskCounts[label] || 0) + 1;
});

const riskData = Object.entries(riskCounts).map(([k, v]) => ({
  name: k,
  value: v
}));

  const typeData = dash?.type_breakdown
    ? Object.entries(dash.type_breakdown).map(([k, v]) => ({ name: k, value: v }))
    : [];

  return (
    <div className="page-wrapper">
      {showScan && (
    <ScanModal
      onClose={() => setShowScan(false)}
      onDone={() => {
        setShowScan(false);
        setLoading(true);
        load();
     }}
    />
    )}

      {/* Stats */}
      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
        <div className="stat-box">
          <div className="stat-num">{dash?.total_assets ?? 0}</div>
          <div className="stat-label">Total Assets</div>
        </div>
        <div className="stat-box">
          <div className="stat-num good">{dash?.pqc_ready ?? 0}</div>
          <div className="stat-label">PQC Ready</div>
        </div>
        <div className="stat-box">
          <div className="stat-num alert">{dash?.vulnerable ?? 0}</div>
          <div className="stat-label">Migration Needed</div>
        </div>
        <div className="stat-box">
          <div className="stat-num warn">{dash?.expiring_certs ?? 0}</div>
          <div className="stat-label">Expiring Certs</div>
        </div>
        <div className="stat-box">
          <div className="stat-num alert">{dash?.hndl_exposed ?? 0}</div>
          <div className="stat-label">HNDL Exposed</div>
        </div>
      </div>

      {/* Charts */}
      <div className="two-col">
        <div className="card">
          <div className="card-title">Post-Quantum Readiness Distribution</div>
          {riskData.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={riskData}>
                <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="value" radius={[6,6,0,0]}>
  {riskData.map((entry, index) => {
    const colorMap = {
      "Quantum-Safe": "#27ae60",
      "PQC-Ready": "#2ecc71",
      "Modern Secure (Not PQC Ready)": "#3498db",
      "Transitional Risk": "#f39c12",
      "Critical Risk": "#c0392b",
    };
    return <Cell key={`cell-${index}`} fill={colorMap[entry.name] || "#888"} />;
  })}
</Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <div className="empty-state"><p>No data yet — run a scan</p></div>}
        </div>
        <div className="card">
          <div className="card-title">Asset Type Breakdown</div>
          {typeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={typeData} dataKey="value" nameKey="name"
                  cx="50%" cy="50%" outerRadius={70} label={({name,value}) => `${name}: ${value}`}
                  labelLine={false}>
                  {typeData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : <div className="empty-state"><p>No data yet — run a scan</p></div>}
        </div>
      </div>

      {/* Asset table */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div className="card-title" style={{ margin: 0 }}>Asset Inventory</div>
          <button className="btn-primary" onClick={() => setShowScan(true)}>
            🔍 Scan New Assets
          </button>
        </div>

        {assets.length === 0 ? (
          <div className="empty-state">
            <h3>No assets scanned yet</h3>
            <p>Click "Scan New Assets" to start</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Host</th><th>IP</th><th>Type</th><th>TLS</th>
                  <th>Cipher Suite</th><th>Key Exchange</th>
                  <th>PQC Score</th><th>PQC Label</th>
                  <th>Cert Status</th><th>Scanned</th>
                </tr>
              </thead>
              <tbody>
                {assets.map(a => (
                  <tr key={a.id}>
                    <td><b>{a.host}</b></td>
                    <td style={{ fontFamily: 'monospace', fontSize: '11px' }}>{a.ip_address}</td>
                    <td>{a.asset_type}</td>
                    <td>
                      <span className={`badge ${a.tls_version === 'TLSv1.3' ? 'badge-green' : a.tls_version === 'TLSv1.2' ? 'badge-orange' : 'badge-red'}`}>
                        {a.tls_version}
                      </span>
                    </td>
                    <td style={{ fontSize: '10px', fontFamily: 'monospace' }}>{a.cipher_suite}</td>
                    <td>{a.key_exchange}</td>
                    <td>
                      <b style={{ color: a.pqc_score >= 75 ? '#27ae60' : a.pqc_score >= 40 ? '#e67e22' : '#c0392b' }}>
                        {a.pqc_score}/100
                      </b>
                    </td>
                    <td>{pqcBadge(a.pqc_label)}</td>
                    <td>{certBadge(a.cert_status)}</td>
                    <td style={{ fontSize: '10px', color: '#888' }}>
                      {new Date(a.scan_timestamp).toLocaleString()}
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