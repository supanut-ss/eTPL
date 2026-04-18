import axios from "axios";

// Resolve the API base URL at runtime.
// Priority: explicit env var → host-based detection → same-origin fallback.
const resolveApiBaseUrl = () => {
  if (import.meta.env.VITE_API_BASE_URL)
    return import.meta.env.VITE_API_BASE_URL;

  if (typeof window !== "undefined") {
    const { hostname } = window.location;
    // For any subdomain of thaipesleague.com, point to the apicore subdomain.
    if (hostname.includes("thaipesleague.com")) {
      return "https://apicore.thaipesleague.com";
    }
    // If we're not on localhost and not on the main domain, still try to use the API subdomain as a fallback for production
    if (hostname !== "localhost" && hostname !== "127.0.0.1") {
      return "https://apicore.thaipesleague.com";
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
