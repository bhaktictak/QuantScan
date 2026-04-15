import { useState, useEffect } from 'react';
import { api } from '../api';

export default function CyberRating() {
  const [dash, setDash] = useState(null);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.getDashboard(), api.getAssets()])
      .then(([d, a]) => {
        setDash(d);
        setAssets(a.assets || []);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading">Calculating cyber rating...</div>;

  const scoreTier = (score) => {
    if (score >= 85) return { label: 'Quantum-Safe', cls: 'badge-green' };
    if (score >= 70) return { label: 'PQC-Ready', cls: 'badge-green' };
    if (score >= 55) return { label: 'Modern Secure', cls: 'badge-blue' };
    if (score >= 40) return { label: 'Transitional Risk', cls: 'badge-orange' };
    return { label: 'Critical Risk', cls: 'badge-red' };
  };

  const overallTier = (() => {
    const avg = dash?.avg_pqc_score ?? 0;
    if (avg >= 85) return "Quantum-Safe";
    if (avg >= 70) return "PQC-Ready";
    if (avg >= 55) return "Modern Secure";
    if (avg >= 40) return "Transitional Risk";
    return "Critical Risk";
  })();

  const tierDesc = {
    "Quantum-Safe": "Strongest observable post-quantum posture",
    "PQC-Ready": "Post-quantum migration in place or partially adopted",
    "Modern Secure": "Strong modern crypto, but not yet fully PQC-ready",
    "Transitional Risk": "Migration recommended to reduce future quantum exposure",
    "Critical Risk": "High-risk cryptographic posture requiring immediate action"
  };

  return (
    <div className="page-wrapper">
      <div className="page-title">Cyber Rating</div>

      <div className="two-col" style={{ marginBottom: '14px' }}>
        {/* Big score */}
        <div style={{
          background: 'linear-gradient(135deg, #6b0000, #8b0000)',
          borderRadius: '12px',
          padding: '28px',
          textAlign: 'center',
          color: '#fff',
        }}>
          <div style={{ fontSize: '13px', opacity: 0.7, marginBottom: '8px' }}>
            Consolidated Enterprise-Level Cyber-Rating Score
          </div>

          <div style={{ fontSize: '56px', fontWeight: 900, lineHeight: 1 }}>
            {dash?.cyber_rating ?? 0}
            <span style={{ fontSize: '24px', opacity: 0.6 }}>/1000</span>
          </div>

          <div style={{
            display: 'inline-block',
            background: '#e6a817',
            color: '#4a1b0c',
            padding: '5px 16px',
            borderRadius: '20px',
            fontSize: '13px',
            fontWeight: 700,
            marginTop: '12px',
          }}>
            {overallTier} — {tierDesc[overallTier]}
          </div>

          <div style={{ marginTop: '16px', fontSize: '12px', opacity: 0.8 }}>
            Average PQC Score: {dash?.avg_pqc_score ?? 0}/100
          </div>
        </div>

        {/* Tier table */}
        <div className="card">
          <div className="card-title">PQC Rating Tiers</div>

          {[
            { tier: 'Quantum-Safe', range: '85–100', desc: 'Strongest observable post-quantum posture', color: '#27ae60' },
            { tier: 'PQC-Ready', range: '70–84', desc: 'Hybrid/PQC migration underway', color: '#2ecc71' },
            { tier: 'Modern Secure', range: '55–69', desc: 'Strong modern cryptography but not PQC-ready', color: '#3498db' },
            { tier: 'Transitional Risk', range: '40–54', desc: 'Needs crypto modernization and PQC planning', color: '#f39c12' },
            { tier: 'Critical Risk', range: '0–39', desc: 'Weak or outdated cryptographic posture', color: '#e74c3c' },
          ].map(t => (
            <div key={t.tier} style={{
              display: 'flex',
              alignItems: 'center',
              padding: '10px 0',
              borderBottom: '1px solid #f0ebe4',
              gap: '12px',
              background: overallTier === t.tier ? '#faf7f0' : 'transparent',
            }}>
              <div style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: t.color,
                flexShrink: 0
              }} />

              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: '13px', color: t.color }}>{t.tier}</div>
                <div style={{ fontSize: '11px', color: '#888' }}>{t.desc}</div>
              </div>

              <div style={{ fontWeight: 700, color: t.color, fontSize: '13px' }}>{t.range}</div>

              {overallTier === t.tier && (
                <span className="badge badge-green" style={{ fontSize: '10px' }}>
                  YOU ARE HERE
                </span>
              )}
            </div>
          ))}

          <div style={{
            marginTop: '10px',
            padding: '10px',
            background: '#f9f5f0',
            borderRadius: '8px',
            fontSize: '11px',
            color: '#888'
          }}>
            * Maximum normalized score = 1000. Score = avg PQC score × 10
          </div>
        </div>
      </div>

      {/* Per-Asset table */}
      <div className="card">
        <div className="card-title">Per-Asset Cyber Rating</div>

        {assets.length === 0 ? (
          <div className="empty-state">
            <h3>No assets scanned</h3>
            <p>Go to Home and scan assets first</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Host</th>
                <th>IP</th>
                <th>Asset Type</th>
                <th>PQC Score</th>
                <th>Cyber Score</th>
                <th>Tier</th>
                <th>HNDL Risk</th>
                <th>Action Required</th>
              </tr>
            </thead>
            <tbody>
              {assets.map(a => {
                const cyberScore = Math.round(a.pqc_score * 10);
                const t = scoreTier(a.pqc_score);

                return (
                  <tr key={a.id}>
                    <td><b>{a.host}</b></td>
                    <td style={{ fontSize: '11px', fontFamily: 'monospace' }}>{a.ip_address}</td>
                    <td>{a.asset_type}</td>

                    <td>
                      <b style={{
                        color: a.pqc_score >= 75 ? '#27ae60' :
                               a.pqc_score >= 40 ? '#e67e22' : '#c0392b'
                      }}>
                        {a.pqc_score}/100
                      </b>
                    </td>

                    <td>
                      <b style={{
                        color: cyberScore >= 700 ? '#27ae60' :
                               cyberScore >= 400 ? '#e67e22' : '#c0392b'
                      }}>
                        {cyberScore}/1000
                      </b>
                    </td>

                    <td><span className={`badge ${t.cls}`}>{t.label}</span></td>

                    <td>
                      <span className={`badge ${
                        a.hndl_risk === 'High'
                          ? 'badge-red'
                          : a.hndl_risk === 'Moderate'
                          ? 'badge-orange'
                          : 'badge-green'
                      }`}>
                        {a.hndl_risk}
                      </span>
                    </td>

                    <td style={{
                      fontSize: '11px',
                      color: a.pqc_score >= 75 ? '#27ae60' :
                             a.pqc_score >= 40 ? '#e67e22' : '#c0392b'
                    }}>
                      {a.pqc_score >= 75
                        ? 'Maintain & Monitor'
                        : a.pqc_score >= 40
                        ? 'Plan PQC Migration'
                        : 'Immediate PQC Remediation Required'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Tier criteria */}
      <div className="card">
        <div className="card-title">Tier Compliance Criteria</div>

        <table>
          <thead>
            <tr>
              <th>Tier</th>
              <th>Security Level</th>
              <th>Compliance Criteria</th>
              <th>Priority / Action</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><span className="badge badge-green">Quantum-Safe</span></td>
              <td>Strongest observable posture</td>
              <td>Hybrid/PQC key exchange, strong TLS, modern cert posture, minimal future quantum exposure</td>
              <td style={{ color: '#27ae60' }}>Maintain and continuously monitor</td>
            </tr>

            <tr>
              <td><span className="badge badge-green">PQC-Ready</span></td>
              <td>Migration-ready enterprise posture</td>
              <td>Strong crypto hygiene, PQC migration underway, crypto-agility supported</td>
              <td style={{ color: '#2ecc71' }}>Complete migration roadmap</td>
            </tr>

            <tr>
              <td><span className="badge badge-blue">Modern Secure</span></td>
              <td>Secure today, not fully PQC-ready</td>
              <td>TLS 1.3, strong ciphers, modern certificates, but no clear PQC adoption</td>
              <td style={{ color: '#3498db' }}>Plan PQC transition</td>
            </tr>

            <tr>
              <td><span className="badge badge-orange">Transitional Risk</span></td>
              <td>Needs migration planning</td>
              <td>TLS 1.2 / mixed posture, some modernization but future quantum risk remains</td>
              <td style={{ color: '#f39c12' }}>Upgrade crypto posture</td>
            </tr>

            <tr>
              <td><span className="badge badge-red">Critical Risk</span></td>
              <td>High-risk posture</td>
              <td>Legacy TLS, weak cryptography, missing forward secrecy, high future decryption risk</td>
              <td style={{ color: '#c0392b', fontWeight: 700 }}>Immediate action required</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}