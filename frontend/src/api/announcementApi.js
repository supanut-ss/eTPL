import axios from "axios";
import axiosInstance from "./axiosInstance";

// Resolve the API base URL (mirrors the logic in axiosInstance.js).
const resolvePublicApiBaseUrl = () => {
  if (import.meta.env.VITE_API_BASE_URL)
    return import.meta.env.VITE_API_BASE_URL;

  if (typeof window !== "undefined") {
    const { hostname } = window.location;
    if (
      hostname === "thaipesleague.com" ||
      hostname === "www.thaipesleague.com"
    ) {
      return "https://apicore.thaipesleague.com";
    }
  }

  return "";
};

const publicAxios = axios.create({
  baseURL: resolvePublicApiBaseUrl(),
  headers: {
    "Content-Type": "application/json",
    "Cache-Control": "no-cache",
    Pragma: "no-cache",
  },
});

export const getPublicAnnouncements = () =>
  publicAxios.get("/api/announcements/public");

export const getAnnouncements = () => axiosInstance.get("/api/announcements");
export const createAnnouncement = (data) =>
  axiosInstance.post("/api/announcements", data);
export const updateAnnouncement = (id, data) =>
  axiosInstance.post(`/api/announcements/${id}/update`, data);
export const toggleAnnouncement = (id, isActive) =>
  axiosInstance.post(`/api/announcements/${id}/toggle`, { isActive });
export const deleteAnnouncement = (id) =>
  axiosInstance.post(`/api/announcements/${id}/delete`);
