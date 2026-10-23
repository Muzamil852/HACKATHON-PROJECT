import api from './client';

export const getDepartments = () => api.get('/departments/').then(r => r.data);
export const getDepartmentContact = (nameOrCode) => api.get(`/departments/${encodeURIComponent(nameOrCode)}`).then(r => r.data);
export const createDispatchAction = (complaintId, data) => api.post(`/departments/complaints/${complaintId}/dispatch`, data).then(r => r.data);
export const getDispatchLogs = (complaintId) => api.get(`/departments/complaints/${complaintId}/dispatch-logs`).then(r => r.data);
