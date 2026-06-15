import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("asako_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("asako_token");
      localStorage.removeItem("asako_user");
    }
    return Promise.reject(error);
  }
);

export const fileUrl = (path) => {
  if (!path) return "#";
  if (path.startsWith("http")) return path;

  const apiUrl = import.meta.env.VITE_API_URL || "";
  const serverUrl = apiUrl.replace("/api", "");

  return `${serverUrl}${path}`;
};

export default api;