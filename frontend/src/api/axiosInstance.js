import axios from "axios";

// Resolve the API base URL at runtime.
// Priority: explicit env var → host-based detection → same-origin fallback.
const resolveApiBaseUrl = () => {
  // 1. Check for manual override from environment
  if (import.meta.env.VITE_API_BASE_URL)
    return import.meta.env.VITE_API_BASE_URL;

  // 2. Browser logic for dynamic origin detection
  if (typeof window !== "undefined") {
    const { hostname, origin } = window.location;
    
    // If we are already running on the same host (same origin), return empty string
    // to use relative paths. This is the goal for "Single Host" deployment.
    // We check if this is the target domain.
    if (hostname.includes("thaipesleague.com")) {
      // If the user wants to keep them separate, they can define VITE_API_BASE_URL.
      // Otherwise, assume they are now hosted together.
      return ""; 
    }
    
    // Localhost development fallback (if not defined in ENV)
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return "";
    }
  }

  return "";
};

export const API_BASE_URL = resolveApiBaseUrl();

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
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
