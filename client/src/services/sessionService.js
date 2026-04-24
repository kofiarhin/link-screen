import api from '../lib/api';

export const createSession = async () => {
  const res = await api.post('/api/sessions');
  return res.data.data;
};

export const getSession = async (id) => {
  const res = await api.get(`/api/sessions/${id}`);
  return res.data.data;
};

export const endSession = async (id) => {
  const res = await api.delete(`/api/sessions/${id}`);
  return res.data;
};
