import api from './client';
export const queryAI = (question) => api.post('/ai/query', { question }).then(r => r.data);
