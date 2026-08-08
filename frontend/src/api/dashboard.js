import api from './client';

export const getDashboardSummary = () => api.get('/dashboard/summary').then(r => r.data);
export const getAnalytics = () => api.get('/analytics/').then(r => r.data);
export const getDailyBriefing = () => api.post('/ai/daily-briefing').then(r => r.data);
