import axios from "axios";

// Resolve the API base URL at runtime.
// Priority: explicit env var → host-based detection → same-origin fallback.
const resolveApiBaseUrl = () => {
  if (import.meta.env.VITE_API_BASE_URL)
    return import.meta.env.VITE_API_BASE_URL;

  if (typeof window !== "undefined") {
    const { hostname } = window.location;
    // When the frontend is served from the main web domain, point to the API subdomain.
    // Always use HTTPS for API subdomain
    if (
      hostname === "thaipesleague.com" ||
      hostname === "www.thaipesleague.com"
    ) {
      return "https://apicore.thaipesleague.com";
    }
  }

  // Default: same-origin (frontend is served directly by the backend).
  return "";
};

const axiosInstance = axios.create({
  baseURL: resolveApiBaseUrl(),
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const requestUrl = error.config?.url || "";
    const isLoginRequest = requestUrl.includes("/api/auth/login");

    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      if (!isLoginRequest && window.location.pathname !== "/main") {
        window.location.href = "/main";
      }
    }
    return Promise.reject(error);
  },
);

export default axiosInstance;
