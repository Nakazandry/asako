import axios from "axios";

const apiBaseUrl = import.meta.env.VITE_API_URL;

const api = axios.create({
  baseURL: apiBaseUrl,
});

const getFinalUrl = (config) => api.getUri(config);

console.debug("[ASAKO API] VITE_API_URL =", apiBaseUrl);

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("asako_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  console.debug("[ASAKO API] request", {
    method: config.method?.toUpperCase(),
    baseURL: config.baseURL,
    url: config.url,
    finalUrl: getFinalUrl(config),
  });

  return config;
});

api.interceptors.response.use(
  (response) => {
    console.debug("[ASAKO API] response", {
      status: response.status,
      finalUrl: getFinalUrl(response.config),
    });
    return response;
  },
  (error) => {
    const config = error.config || {};
    console.error("[ASAKO API] error", {
      message: error.message,
      code: error.code,
      status: error.response?.status,
      finalUrl: config.url ? getFinalUrl(config) : undefined,
      response: error.response?.data,
    });

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

  const apiUrl = apiBaseUrl || "";
  const serverUrl = apiUrl.replace("/api", "");

  return `${serverUrl}${path}`;
};

// URL absolue vers une route de l'API (garde le prefixe /api).
// A utiliser pour les routes servies par l'API (ex: /offres/:id/photo).
export const apiUrl = (path) => {
  if (!path) return "#";
  if (path.startsWith("http")) return path;
  return api.getUri({ url: path });
};

export const voirCv = async (candidatureId) => {
  try {
    const response = await api.get(`/candidatures/${candidatureId}/cv`, {
      responseType: "blob",
    });
    if (response.data?.type === "application/json") {
      throw new Error("CV non disponible");
    }
    const url = URL.createObjectURL(
      new Blob([response.data], { type: "application/pdf" })
    );
    window.open(url, "_blank");
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  } catch (error) {
    if (error.response?.status === 404) {
      throw new Error("CV non disponible");
    }
    throw error;
  }
};

export default api;
