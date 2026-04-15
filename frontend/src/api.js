import axios from 'axios';

const BASE = 'http://127.0.0.1:8000';

// Helper to get auth headers
const authHeaders = () => {
  const token = localStorage.getItem('qs_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const api = {
  // ── Auth ─────────────────────────────────────────────────────────
  login: (username, password) =>
    axios.post(`${BASE}/auth/login`, { username, password }).then(r => r.data),

  register: (data) =>
    axios.post(`${BASE}/auth/register`, data).then(r => r.data),

  resetPassword: (username, security_answer, new_password) =>
    axios.post(`${BASE}/auth/reset-password`, { username, security_answer, new_password }).then(r => r.data),

  getSecurityQuestion: (username) =>
    axios.get(`${BASE}/auth/security-question/${username}`).then(r => r.data),

  getMe: () =>
    axios.get(`${BASE}/auth/me`, { headers: authHeaders() }).then(r => r.data),

  // ── Scan & Assets ───────────────────────────────────────────────
  scan: (hosts, signal) =>
    axios.post(`${BASE}/scan`, { hosts }, { signal, headers: authHeaders() }).then(r => r.data),

  getAssets: () =>
    axios.get(`${BASE}/assets`, { headers: authHeaders() }).then(r => r.data),

  getAsset: (host) =>
    axios.get(`${BASE}/assets/${host}`, { headers: authHeaders() }).then(r => r.data),

  deleteAsset: (host) =>
    axios.delete(`${BASE}/assets/${host}`, { headers: authHeaders() }).then(r => r.data),

  getDashboard: () =>
    axios.get(`${BASE}/dashboard`, { headers: authHeaders() }).then(r => r.data),

  getCBOM: () =>
    axios.get(`${BASE}/cbom`, { headers: authHeaders() }).then(r => r.data),
};