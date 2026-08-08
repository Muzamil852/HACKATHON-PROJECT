import api from './client';

export const getNotifications = () => api.get('/notifications/').then((r) => r.data);
