import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Topbar() {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [user, setUser] = useState(null);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    try {
      const stored = localStorage.getItem('qs_user');
      if (stored) setUser(JSON.parse(stored));
    } catch {}
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('qs_token');
    localStorage.removeItem('qs_user');
    localStorage.removeItem('qs_auth');
    navigate('/');
  };

  const displayName = user?.full_name || user?.username || 'User';
  const initials = displayName
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
  const role = user?.role || 'analyst';

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

      {/* User area with dropdown */}
      <div className="topbar-user-area" ref={dropdownRef}
        onClick={() => setDropdownOpen(!dropdownOpen)}>
        <div className="topbar-user-info">
          <div className="topbar-user-name">{displayName}</div>
          <div className="topbar-user-role">{role} · PSB 2026</div>
        </div>
        <div className="topbar-avatar">{initials}</div>

        {dropdownOpen && (
          <div className="topbar-dropdown">
            <div className="topbar-dropdown-header">
              <div className="name">{displayName}</div>
              <div className="email">{user?.email || 'N/A'}</div>
              <span className={`role-badge ${role}`}>{role}</span>
            </div>
            <div className="topbar-dropdown-item" onClick={(e) => { e.stopPropagation(); }}>
              <span>👤</span> Profile
            </div>
            <div className="topbar-dropdown-item" onClick={(e) => { e.stopPropagation(); }}>
              <span>⚙️</span> Settings
            </div>
            <div className="topbar-dropdown-item logout" onClick={(e) => {
              e.stopPropagation();
              handleLogout();
            }}>
              <span>🚪</span> Sign Out
            </div>
          </div>
        )}
      </div>
    </div>
  );
}