import axios from "axios";
import axiosInstance from "./axiosInstance";

const publicAxios = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "",
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
