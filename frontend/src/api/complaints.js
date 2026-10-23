import api from './client';

export const getComplaints = (params) => api.get('/complaints/', { params }).then(r => r.data);
export const getComplaint = (id) => api.get(`/complaints/${id}`).then(r => r.data);
export const createComplaint = (data) => api.post('/complaints/', data).then(r => r.data);
export const updateComplaint = (id, data) => api.patch(`/complaints/${id}`, data).then(r => r.data);
export const analyzeComplaint = (id) => api.post(`/complaints/${id}/analyze`).then(r => r.data);
export const getSimilarComplaints = (id) => api.get(`/complaints/${id}/similar`).then(r => r.data);
export const analyzeText = (data) => api.post('/complaints/analyze-text', data).then(r => r.data);

export const getComplaintExplainability = (id) => api.get(`/complaints/${id}/explainability`).then(r => r.data);
export const smartSearchComplaints = (query) => api.post('/complaints/smart-search', { query }).then(r => r.data);
