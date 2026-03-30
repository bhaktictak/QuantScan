import { useLocation, useNavigate } from 'react-router-dom';

const NAV = [
  { path: '/home',      icon: '⌂', label: 'Home'            },
  { path: '/inventory', icon: '★', label: 'Asset Inventory'  },
  { path: '/discovery', icon: '⊡', label: 'Asset Discovery'  },
  { path: '/cbom',      icon: '◈', label: 'CBOM'             },
  { path: '/posture',   icon: '♟', label: 'Posture of PQC'   },
  { path: '/rating',    icon: '☆', label: 'Cyber Rating'     },
  { path: '/reporting', icon: '▦', label: 'Reporting'        },
];

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div style={{
      width: '210px',
      background: '#5a0000',
      flexShrink: 0,
      paddingTop: '8px',
      minHeight: '100vh',
    }}>
      {NAV.map(n => {
        const active = location.pathname === n.path;
        return (
          <div
            key={n.path}
            onClick={() => navigate(n.path)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '12px 18px',
              color: active ? '#fff' : 'rgba(255,255,255,0.7)',
              fontSize: '13px',
              cursor: 'pointer',
              borderLeft: active ? '3px solid #e6a817' : '3px solid transparent',
              background: active ? 'rgba(255,255,255,0.12)' : 'transparent',
              transition: 'all 0.15s',
            }}
          >
            <span style={{ fontSize: '15px', width: '20px', textAlign: 'center' }}>
              {n.icon}
            </span>
            {n.label}
          </div>
        );
      })}
    </div>
  );
}