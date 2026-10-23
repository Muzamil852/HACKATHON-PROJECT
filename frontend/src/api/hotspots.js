import api from './client';
export const getHotspots = () => api.get('/hotspots/').then(r => r.data);
