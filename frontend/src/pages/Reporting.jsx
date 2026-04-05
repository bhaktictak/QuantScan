import { useState, useEffect } from 'react';
import { api } from '../api';
import jsPDF from 'jspdf';

export default function Reporting() {
  const [view, setView]   = useState('menu');
  const [cbom, setCbom]   = useState(null);
  const [assets, setAssets] = useState([]);
  const [dash, setDash]   = useState(null);
  const [generated, setGenerated] = useState(false);

  useEffect(() => {
    Promise.all([api.getCBOM(), api.getAssets(), api.getDashboard()])
      .then(([c,a,d]) => { setCbom(c); setAssets(a.assets||[]); setDash(d); });
  }, []);

  const downloadJSON = (data, name) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type:'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = name; a.click();
  };

  const downloadPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.setTextColor(139, 0, 0);
    doc.text('QuantScan - Executive Summary Report', 14, 20);

    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30);

    doc.setFontSize(13);
    doc.setTextColor(139, 0, 0);
    doc.text('Key Metrics', 14, 45);

    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text(`Total Assets:     ${dash?.total_assets ?? 0}`, 14, 55);
    doc.text(`PQC Ready:        ${dash?.pqc_ready ?? 0}`, 14, 63);
    doc.text(`Vulnerable:       ${dash?.vulnerable ?? 0}`, 14, 71);
    doc.text(`Expiring Certs:   ${dash?.expiring_certs ?? 0}`, 14, 79);
    doc.text(`Cyber Rating:     ${dash?.cyber_rating ?? 0}/1000 (${dash?.cyber_tier ?? 'Unknown'})`, 14, 87);
    doc.text(`Avg PQC Score:    ${dash?.avg_pqc_score ?? 0}/100`, 14, 95);

    doc.setFontSize(13);
    doc.setTextColor(139, 0, 0);
    doc.text('Summary', 14, 110);

    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    const summary = `QuantScan scanned ${dash?.total_assets ?? 0} public-facing assets. ${dash?.pqc_ready ?? 0} assets are PQC-ready. ${dash?.vulnerable ?? 0} assets require immediate quantum migration. ${dash?.expiring_certs ?? 0} certificates are expiring soon. Recommended action: migrate key exchange to ML-KEM-1024 (NIST FIPS 203) and certificates to ML-DSA-65 (NIST FIPS 204).`;
    const lines = doc.splitTextToSize(summary, 180);
    doc.text(lines, 14, 120);

    doc.setFontSize(13);
    doc.setTextColor(139, 0, 0);
    doc.text('Asset List', 14, 145);

    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    let y = 155;
    assets.slice(0, 20).forEach((a, i) => {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.text(`${i+1}. ${a.host} | ${a.pqc_label} | Score: ${a.pqc_score}/100 | ${a.cert_status}`, 14, y);
      y += 8;
    });

    doc.save('quanscan-executive-report.pdf');
  };

  const downloadSBOM = () => {
    const sbom = {
      bomFormat: "CycloneDX",
      specVersion: "1.6",
      version: 1,
      serialNumber: `urn:uuid:${crypto.randomUUID()}`,
      metadata: {
        timestamp: new Date().toISOString(),
        tool: {
          vendor: "QuantScan",
          name: "QuantScan PQC Scanner",
          version: "1.0.0"
        },
        component: {
          type: "application",
          name: "Punjab National Bank - Public Assets",
        }
      },
      components: assets.map(a => ({
        type: "cryptographic-asset",
        name: a.host,
        version: "1.0",
        description: `PQC Label: ${a.pqc_label}`,
        properties: [
          { name: "ip_address",   value: a.ip_address   ?? "N/A" },
          { name: "tls_version",  value: a.tls_version  ?? "N/A" },
          { name: "cipher_suite", value: a.cipher_suite ?? "N/A" },
          { name: "key_exchange", value: a.key_exchange ?? "N/A" },
          { name: "cert_algo",    value: a.cert_algo    ?? "N/A" },
          { name: "cert_expiry",  value: a.cert_expiry  ?? "N/A" },
          { name: "cert_status",  value: a.cert_status  ?? "N/A" },
          { name: "pqc_score",    value: String(a.pqc_score ?? 0) },
          { name: "pqc_label",    value: a.pqc_label    ?? "N/A" },
          { name: "hndl_risk",    value: a.hndl_risk    ?? "N/A" },
          { name: "is_pqc_ready", value: String(a.is_pqc_ready ?? false) },
        ]
      }))
    };
    const blob = new Blob([JSON.stringify(sbom, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const el   = document.createElement('a');
    el.href = url; el.download = 'quanscan-sbom-cyclonedx.json'; el.click();
  };

  

  const downloadCSV = () => {
    const headers = ['host','ip_address','asset_type','tls_version','cipher_suite',
      'key_exchange','cert_algo','cert_key_size','cert_expiry','cert_status',
      'pqc_score','pqc_label','hndl_risk','is_pqc_ready','scan_timestamp'];
    const rows = assets.map(a => headers.map(h => `"${a[h]??''}"`).join(','));
    const csv  = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type:'text/csv' });
    const url  = URL.createObjectURL(blob);
    const el   = document.createElement('a');
    el.href = url; el.download = 'quanscan-cbom.csv'; el.click();
  };

  const cards = [
    { key:'executive', icon:'📊', label:'Executive Report',  sub:'Summary for leadership'  },
    { key:'scheduled', icon:'📅', label:'Scheduled Report',  sub:'Set up recurring reports' },
    { key:'ondemand',  icon:'🔍', label:'On-Demand Report',  sub:'Generate any report now'  },
  ];

  return (
    <div className="page-wrapper">
      <div className="page-title">Reporting</div>

      {view === 'menu' && (
        <div style={{display:'flex',gap:'24px',justifyContent:'center',padding:'40px 0'}}>
          {cards.map(c => (
            <div key={c.key} onClick={() => setView(c.key)}
              style={{
                border:'2px solid #e0d8d0', borderRadius:'50%',
                width:'170px', height:'170px',
                display:'flex', flexDirection:'column',
                alignItems:'center', justifyContent:'center',
                cursor:'pointer', background:'#fff', transition:'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor='#8b0000'; e.currentTarget.style.background='#fff8f8'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor='#e0d8d0'; e.currentTarget.style.background='#fff'; }}
            >
              <div style={{fontSize:'34px',marginBottom:'8px'}}>{c.icon}</div>
              <div style={{fontSize:'13px',fontWeight:700,color:'#8b0000',textAlign:'center'}}>{c.label}</div>
              <div style={{fontSize:'11px',color:'#888',textAlign:'center',marginTop:'3px'}}>{c.sub}</div>
            </div>
          ))}
        </div>
      )}

      {view !== 'menu' && (
        <div style={{marginBottom:'12px'}}>
          <button onClick={() => { setView('menu'); setGenerated(false); }}
            style={{background:'none',border:'1px solid #e0d8d0',padding:'6px 14px',borderRadius:'6px',fontSize:'12px',cursor:'pointer'}}>
            ← Back
          </button>
        </div>
      )}

      {view === 'executive' && (
        <div className="card">
          <div style={{fontSize:'16px',fontWeight:700,color:'#8b0000',marginBottom:'16px'}}>
            📊 Executive Summary Report
          </div>
          <div className="stat-grid" style={{gridTemplateColumns:'repeat(4,1fr)',marginBottom:'16px'}}>
            <div className="stat-box"><div className="stat-num">{dash?.total_assets??0}</div><div className="stat-label">Total Assets</div></div>
            <div className="stat-box"><div className="stat-num good">{dash?.pqc_ready??0}</div><div className="stat-label">PQC Ready</div></div>
            <div className="stat-box"><div className="stat-num alert">{dash?.vulnerable??0}</div><div className="stat-label">Vulnerable</div></div>
            <div className="stat-box"><div className="stat-num">{dash?.cyber_rating??0}</div><div className="stat-label">Cyber Score /1000</div></div>
          </div>
          <div style={{marginBottom:'16px',padding:'14px',background:'#f9f5f0',borderRadius:'8px',fontSize:'12px',lineHeight:1.8}}>
            <b>Summary:</b> QuantScan scanned {dash?.total_assets??0} public-facing assets for Punjab National Bank.
            {' '}{dash?.pqc_ready??0} assets are PQC-ready. {dash?.vulnerable??0} assets require immediate quantum migration.
            {' '}{dash?.expiring_certs??0} certificates are expiring soon. Enterprise Cyber Rating: {dash?.cyber_rating??0}/1000 ({dash?.cyber_tier??'Unknown'} tier).
            {' '}Recommended action: migrate key exchange to ML-KEM-1024 (NIST FIPS 203) and certificates to ML-DSA-65 (NIST FIPS 204).
          </div>
          <div style={{display:'flex',gap:'8px',flexWrap:'wrap'}}>
            <button className="btn-primary" onClick={() => downloadJSON({summary:dash,assets,cbom},'quanscan-executive-report.json')}>
              ⬇ Download JSON
            </button>
            <button className="btn-gold" onClick={downloadCSV}>
              ⬇ Download CSV
            </button>
            <button className="btn-primary" onClick={downloadPDF}
              style={{background:'linear-gradient(135deg,#c0392b,#8b0000)'}}>
              ⬇ Download PDF
            </button>
            <button className="btn-gold" onClick={downloadSBOM}
              style={{background:'linear-gradient(135deg,#1a6b3c,#27ae60)',color:'#fff',border:'none'}}>
              ⬇ Export SBOM
            </button>
            <button className="btn-primary" onClick={() => downloadJSON(cbom,'quanscan-cbom-cyclonedx.json')}>
              ⬇ Export CBOM (CycloneDX)
            </button>
          </div>
        </div>
      )}

      {view === 'scheduled' && (
        <div className="card">
          <div style={{fontSize:'16px',fontWeight:700,color:'#8b0000',marginBottom:'16px'}}>
            📅 Schedule Reporting
          </div>
          <div className="two-col" style={{marginBottom:'12px'}}>
            <div>
              <div style={{fontSize:'11px',color:'#666',marginBottom:'4px',fontWeight:600}}>Report Type</div>
              <select style={{width:'100%',padding:'8px 10px',border:'1px solid #e0d8d0',borderRadius:'7px',fontSize:'12px'}}>
                <option>Executive Summary</option>
                <option>CBOM Report</option>
                <option>PQC Posture Report</option>
                <option>Full Scan Report</option>
              </select>
            </div>
            <div>
              <div style={{fontSize:'11px',color:'#666',marginBottom:'4px',fontWeight:600}}>Frequency</div>
              <select style={{width:'100%',padding:'8px 10px',border:'1px solid #e0d8d0',borderRadius:'7px',fontSize:'12px'}}>
                <option>Weekly</option>
                <option>Daily</option>
                <option>Monthly</option>
              </select>
            </div>
          </div>
          <div className="two-col" style={{marginBottom:'12px'}}>
            <div>
              <div style={{fontSize:'11px',color:'#666',marginBottom:'4px',fontWeight:600}}>Select Assets</div>
              <select style={{width:'100%',padding:'8px 10px',border:'1px solid #e0d8d0',borderRadius:'7px',fontSize:'12px'}}>
                <option>All Assets</option>
                <option>High Risk Only</option>
                <option>PQC Ready Only</option>
              </select>
            </div>
            <div>
              <div style={{fontSize:'11px',color:'#666',marginBottom:'4px',fontWeight:600}}>Delivery Email</div>
              <input type="email" placeholder="executives@pnb.bank.in"
                style={{width:'100%',padding:'8px 10px',border:'1px solid #e0d8d0',borderRadius:'7px',fontSize:'12px'}} />
            </div>
          </div>
          <button className="btn-primary" onClick={() => alert('Schedule saved! (Demo mode)')}>
            Schedule Report →
          </button>
        </div>
      )}

      {view === 'ondemand' && (
        <div className="card">
          <div style={{fontSize:'16px',fontWeight:700,color:'#8b0000',marginBottom:'16px'}}>
            🔍 On-Demand Reporting
          </div>
          <div className="two-col" style={{marginBottom:'12px'}}>
            <div>
              <div style={{fontSize:'11px',color:'#666',marginBottom:'4px',fontWeight:600}}>Report Type</div>
              <select id="rtype" style={{width:'100%',padding:'8px 10px',border:'1px solid #e0d8d0',borderRadius:'7px',fontSize:'12px'}}>
                <option value="full">Full Scan Report</option>
                <option value="cbom">CBOM Only</option>
                <option value="exec">Executive Summary</option>
              </select>
            </div>
            <div>
              <div style={{fontSize:'11px',color:'#666',marginBottom:'4px',fontWeight:600}}>File Format</div>
              <select id="rformat" style={{width:'100%',padding:'8px 10px',border:'1px solid #e0d8d0',borderRadius:'7px',fontSize:'12px'}}>
                <option>JSON</option>
                <option>CSV</option>
              </select>
            </div>
          </div>
          <div style={{display:'flex',gap:'8px'}}>
            <button className="btn-primary"
              onClick={() => { downloadJSON({assets,dashboard:dash,cbom},'quanscan-report.json'); setGenerated(true); }}>
              Generate Report →
            </button>
            <button className="btn-gold" onClick={() => { downloadCSV(); setGenerated(true); }}>
              Export CSV →
            </button>
          </div>
          {generated && (
            <div style={{marginTop:'12px',padding:'12px',background:'#e8f8f0',borderRadius:'8px',fontSize:'12px',color:'#27ae60'}}>
              ✅ Report generated and downloaded successfully!
            </div>
          )}
        </div>
      )}
    </div>
  );
}