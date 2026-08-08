import axios from 'axios';
const API_BASE = 'http://localhost:8000';
const api = axios.create({ baseURL: API_BASE, timeout: 30000 });
export default api;
export { API_BASE };
