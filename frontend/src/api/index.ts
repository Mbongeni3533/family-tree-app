import axios from 'axios';
import { FamilyMember, FamilyTree } from '../types';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add token to requests automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authAPI = {
  login: (email: string, password: string) => api.post('/auth/login', { email, password }),
  register: (email: string, password: string, invitationToken: string, name?: string) => 
    api.post('/auth/register', { email, password, invitationToken, name }),
  generateInvite: (email: string, name?: string) => api.post('/auth/invite', { email, name }),
  getMe: () => api.get('/auth/me')
};

export const familyAPI = {
  getAll: () => api.get('/family'),
  getTree: () => api.get('/family/tree'),
  createMember: (data: Omit<FamilyMember, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => 
    api.post('/family/person', data),
  updateMember: (id: string, data: Partial<FamilyMember>) => 
    api.put(`/family/person/${id}`, data),
  deleteMember: (id: string) => api.delete(`/family/person/${id}`),
  exportGedcom: () => api.get('/family/export/gedcom', {
    responseType: 'text'
  })
};

export default api;