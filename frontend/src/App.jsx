import { Routes, Route, Navigate } from 'react-router-dom';
import Topbar  from './components/Topbar';
import Sidebar from './components/Sidebar';
import Login          from './pages/Login';
import Home           from './pages/Home';
import AssetInventory from './pages/AssetInventory';
import AssetDiscovery from './pages/AssetDiscovery';
import CBOM           from './pages/CBOM';
import PostureOfPQC   from './pages/PostureOfPQC';
import CyberRating    from './pages/CyberRating';
import Reporting      from './pages/Reporting';

function Layout({ children }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', minHeight:'100vh' }}>
      <Topbar />
      <div style={{ display:'flex', flex:1 }}>
        <Sidebar />
        <div style={{ flex:1, overflowY:'auto', background:'#f3f0eb' }}>
          {children}
        </div>
      </div>
    </div>
  );
}

function Protected({ children }) {
  const token = localStorage.getItem('qs_token');
  const auth = localStorage.getItem('qs_auth');
  // Valid if we have either the new token or the legacy flag
  return (token || auth) ? children : <Navigate to="/" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/home"      element={<Protected><Layout><Home /></Layout></Protected>} />
      <Route path="/inventory" element={<Protected><Layout><AssetInventory /></Layout></Protected>} />
      <Route path="/discovery" element={<Protected><Layout><AssetDiscovery /></Layout></Protected>} />
      <Route path="/cbom"      element={<Protected><Layout><CBOM /></Layout></Protected>} />
      <Route path="/posture"   element={<Protected><Layout><PostureOfPQC /></Layout></Protected>} />
      <Route path="/rating"    element={<Protected><Layout><CyberRating /></Layout></Protected>} />
      <Route path="/reporting" element={<Protected><Layout><Reporting /></Layout></Protected>} />
      <Route path="*"          element={<Navigate to="/" replace />} />
    </Routes>
  );
}
