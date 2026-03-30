import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = () => {
    if (user === 'test_user' && pass === '1234') {
      localStorage.setItem('qs_auth', '1');
      navigate('/home');
    } else {
      setError('Invalid credentials. Use the default credentials shown below.');
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #6b0000 0%, #9f4d4d 40%, #e6a817 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        display: 'flex', borderRadius: '16px', overflow: 'hidden',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)', width: '820px', minHeight: '460px',
      }}>
        {/* Left panel */}
        <div style={{
          background: 'rgba(0,0,0,0.35)', flex: 1,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: '40px', color: '#fff',
        }}>
          <div style={{
            background: '#e6a817', color: '#4a1b0c',
            fontSize: '12px', fontWeight: 800,
            padding: '6px 16px', borderRadius: '20px',
            marginBottom: '16px', letterSpacing: '0.5px',
          }}>PQC-Ready</div>
          <div style={{ fontSize: '32px', fontWeight: 900, marginBottom: '8px' }}>QuantScan</div>
          <div style={{ fontSize: '14px', opacity: 0.8, textAlign: 'center', marginBottom: '6px' }}>
            PSB Hackathon Series 2026
          </div>
          <div style={{ fontSize: '13px', opacity: 0.7, textAlign: 'center' }}>
            In collaboration with IIT Kanpur
          </div>
          <div style={{
            marginTop: '30px', fontSize: '20px', fontWeight: 700,
            color: '#e6a817', textAlign: 'center', lineHeight: 1.4,
          }}>
            PNB Cybersecurity<br />Hackathon 2026
          </div>
          <div style={{ fontSize: '13px', marginTop: '8px', opacity: 0.7 }}>
            Cyber Innovation Begins
          </div>
        </div>

        {/* Right panel - login form */}
        <div style={{
          background: '#fff', width: '340px',
          display: 'flex', flexDirection: 'column',
          justifyContent: 'center', padding: '40px',
        }}>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#8b0000', marginBottom: '6px' }}>
            Sign In
          </div>
          <div style={{ fontSize: '12px', color: '#888', marginBottom: '24px' }}>
            QuantScan · Cipher Sen
          </div>

          <label style={{ fontSize: '11px', color: '#666', marginBottom: '4px', fontWeight: 600 }}>
            Email / Username
          </label>
          <input
            type="text"
            value={user}
            onChange={e => setUser(e.target.value)}
            placeholder="test_user"
            style={{
              padding: '10px 12px', border: '1px solid #e0d8d0',
              borderRadius: '8px', marginBottom: '14px', width: '100%',
            }}
          />

          <label style={{ fontSize: '11px', color: '#666', marginBottom: '4px', fontWeight: 600 }}>
            Password
          </label>
          <input
            type="password"
            value={pass}
            onChange={e => setPass(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            placeholder="••••••••"
            style={{
              padding: '10px 12px', border: '1px solid #e0d8d0',
              borderRadius: '8px', marginBottom: '6px', width: '100%',
            }}
          />

          {error && (
            <div style={{ fontSize: '11px', color: '#c0392b', marginBottom: '10px' }}>
              {error}
            </div>
          )}

          <div style={{ fontSize: '11px', color: '#aaa', marginBottom: '16px' }}>
            Default: test_user / 1234
          </div>

          <button
            className="btn-primary"
            onClick={handleLogin}
            style={{ width: '100%', padding: '11px', fontSize: '14px' }}>
            Sign In →
          </button>
        </div>
      </div>
    </div>
  );
}