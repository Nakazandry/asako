import axios from 'axios';

const configuredApiUrl = import.meta.env.VITE_API_URL;
const isBrowser = typeof window !== 'undefined';
const isNetworkHost = isBrowser && !['localhost', '127.0.0.1'].includes(window.location.hostname);
const localNetworkApiUrl = isBrowser ? `${window.location.protocol}//${window.location.hostname}:5000/api` : 'http://localhost:5000/api';
const baseURL = configuredApiUrl?.includes('localhost') && isNetworkHost
  ? localNetworkApiUrl
  : configuredApiUrl || localNetworkApiUrl;

const api = axios.create({
  baseURL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('asako_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('asako_token');
      localStorage.removeItem('asako_user');
    }
    return Promise.reject(error);
  }
);

export const fileUrl = (path) => {
  if (!path) return '#';
  if (path.startsWith('http')) return path;
  return `${baseURL.replace('/api', '')}${path}`;
};

export default api;
