import axios from 'axios';

const BASE = 'http://localhost:8000';

export const api = {
  scan: (hosts, port = 443) =>
    axios.post(`${BASE}/scan`, { hosts, port }).then(r => r.data),

  getAssets: () =>
    axios.get(`${BASE}/assets`).then(r => r.data),

  getAsset: (host) =>
    axios.get(`${BASE}/assets/${host}`).then(r => r.data),

  deleteAsset: (host) =>
    axios.delete(`${BASE}/assets/${host}`).then(r => r.data),

  getDashboard: () =>
    axios.get(`${BASE}/dashboard`).then(r => r.data),

  getCBOM: () =>
    axios.get(`${BASE}/cbom`).then(r => r.data),
};