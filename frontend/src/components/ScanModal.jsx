import { useState } from 'react';
import { api } from '../api';

export default function ScanModal({ onClose, onDone }) {
  const [input, setInput]       = useState('');
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [current, setCurrent]   = useState('');
  const [results, setResults]   = useState(null);
  const [subdomainResults, setSubdomainResults] = useState(null);
  const [error, setError]       = useState('');

  const handleScan = async () => {
    const hosts = input
      .split(/[\n,]+/)
      .map(h => h.trim())
      .filter(Boolean);

    if (!hosts.length) {
      setError('Please enter at least one domain');
      return;
    }

    setScanning(true);
    setError('');
    setProgress(5);

    let tick = 0;
    const interval = setInterval(() => {
      tick++;
      setProgress(p => Math.min(p + 1.5, 88));
      setCurrent(hosts[tick % hosts.length]);
    }, 250);

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 120000);
      const data = await api.scan(hosts, controller.signal);
      clearTimeout(timeout);
      clearInterval(interval);
      setProgress(100);
      setCurrent('Scan complete!');
      setResults(data);
      setTimeout(() => { onDone(); }, 1200);
    } catch (e) {
      clearInterval(interval);
      setScanning(false);
      setProgress(0);
      setError(
        'Cannot connect to backend. Make sure uvicorn is running:\n' +
        'python -m uvicorn main:app --reload'
      );
    }
  };

  const handleSubdomainScan = async () => {
  if (!input.trim()) {
    setError('Please enter a domain');
    return;
  }

  setScanning(true);
  setError('');
  setSubdomainResults(null);

  try {
    const response = await fetch("http://127.0.0.1:8000/scan-subdomains", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ host: input.trim() })
    });

    const data = await response.json();
    setScanning(false);
    setSubdomainResults(data);  // ✅ save results to state

  } catch (err) {
    setScanning(false);
    setError('Cannot connect to backend. Make sure uvicorn is running:\npython -m uvicorn main:app --reload');
  }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.55)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000,
    }}>
      <div style={{
        background: '#fff',
        borderRadius: '16px',
        padding: '30px',
        width: '460px',
        boxShadow: '0 12px 48px rgba(0,0,0,0.25)',
      }}>

        {/* Header */}
        <div style={{ marginBottom: '18px' }}>
          <div style={{ fontSize: '17px', fontWeight: 700, color: '#8b0000', marginBottom: '4px' }}>
            🔐 Initiate Quantum Scan
          </div>
          <div style={{ fontSize: '12px', color: '#888' }}>
            Enter one domain per line or comma-separated
          </div>
        </div>

        {!scanning ? (
          <>
            <textarea
              rows={5}
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder={'google.com\ngithub.com\npnb.co.in'}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1.5px solid #e0d8d0',
                borderRadius: '8px',
                fontSize: '13px',
                resize: 'vertical',
                fontFamily: 'monospace',
                marginBottom: '12px',
                outline: 'none',
                transition: 'border-color 0.15s',
              }}
              onFocus={e => e.target.style.borderColor = '#8b0000'}
              onBlur={e  => e.target.style.borderColor = '#e0d8d0'}
            />
            {subdomainResults && (
  <div style={{
    marginBottom: '12px',
    background: '#f0f8ff',
    border: '1px solid #c0d8f0',
    borderRadius: '8px',
    padding: '12px 14px',
    maxHeight: '200px',
    overflowY: 'auto',
  }}>
    <div style={{ fontWeight: 700, color: '#8b0000', marginBottom: '8px', fontSize: '13px' }}>
       Found {subdomainResults.subdomains.length} subdomains for {subdomainResults.host}
    </div>
    {subdomainResults.subdomains.length === 0 ? (
      <div style={{ color: '#888', fontSize: '12px' }}>No subdomains found</div>
    ) : (
      subdomainResults.subdomains.map((sub, i) => (
        <div key={i} style={{
          fontSize: '12px',
          color: '#333',
          padding: '4px 0',
          borderBottom: '1px solid #e0eef8',
          fontFamily: 'monospace',
        }}>
          {sub}
          {subdomainResults.subdomain_ports[sub]?.open_ports?.length > 0 && (
            <span style={{ color: '#888', marginLeft: '8px' }}>
              ({subdomainResults.subdomain_ports[sub].open_ports.join(', ')})
            </span>
          )}
        </div>
      ))
    )}
  </div>
)}

            {error && (
              <div style={{
                background: '#fde8e8',
                border: '1px solid #f5c6c6',
                borderRadius: '8px',
                padding: '10px 14px',
                color: '#c0392b',
                fontSize: '12px',
                marginBottom: '12px',
                whiteSpace: 'pre-line',
                lineHeight: 1.6,
              }}>
                ⚠ {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={onClose}
                style={{
                  padding: '9px 20px',
                  border: '1.5px solid #e0d8d0',
                  borderRadius: '8px',
                  background: '#fff',
                  fontSize: '13px',
                  color: '#555',
                  cursor: 'pointer',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => e.target.style.background = '#f9f5f0'}
                onMouseLeave={e => e.target.style.background = '#fff'}
              >
                Cancel
              </button>

              <button
                onClick={handleScan}
                style={{
                  padding: '9px 24px',
                  background: 'linear-gradient(135deg, #8b0000, #c0392b)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 14px rgba(139,0,0,0.3)',
                  transition: 'opacity 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
                onMouseLeave={e => e.currentTarget.style.opacity = '1'}
              >
                <span>▶</span> Start Scan
              </button>

              <button onClick={handleSubdomainScan}
                style={{
                  padding: '9px 24px',
                  background: 'linear-gradient(135deg, #8b0000, #c0392b)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 14px rgba(139,0,0,0.3)',
                  transition: 'opacity 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
                onMouseLeave={e => e.currentTarget.style.opacity = '1'}
              >
               Scan Subdomains
               </button>
            </div>
          </>
        ) : (
          <div>
            {/* Scanning host name */}
            <div style={{
              fontSize: '13px', color: '#8b0000',
              marginBottom: '8px', fontWeight: 600,
              animation: 'pulse 1.2s infinite',
            }}>
              🔍 Scanning: {current}
            </div>

            {/* Progress bar */}
            <div style={{
              background: '#f0ebe4', borderRadius: '10px',
              height: '10px', overflow: 'hidden', marginBottom: '8px',
            }}>
              <div style={{
                height: '100%',
                width: `${progress}%`,
                borderRadius: '10px',
                background: 'linear-gradient(90deg, #8b0000, #e6a817)',
                transition: 'width 0.3s ease',
              }} />
            </div>

            <div style={{ fontSize: '11px', color: '#888', marginBottom: '16px' }}>
              {Math.round(progress)}% — performing real TLS handshake & PQC evaluation...
            </div>

            {/* Steps */}
            {['Connecting to host...', 'TLS handshake...', 'Parsing X.509 certificate...', 'Evaluating PQC readiness...', 'Saving to CBOM...'].map((step, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                fontSize: '12px', color: progress > (i+1)*18 ? '#27ae60' : '#bbb',
                marginBottom: '4px', transition: 'color 0.3s',
              }}>
                <span>{progress > (i+1)*18 ? '✅' : '⏳'}</span>
                {step}
              </div>
            ))}

            {results && (
              <div style={{
                marginTop: '16px',
                background: '#e8f8f0',
                borderRadius: '10px',
                padding: '12px 16px',
                fontSize: '13px',
                color: '#27ae60',
                fontWeight: 600,
              }}>
                ✅ {results.total} asset{results.total !== 1 ? 's' : ''} scanned! Loading dashboard...
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}