import axiosInstance from "./axiosInstance";
import axios from "axios";

const publicAxios = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "",
  headers: {
    "Content-Type": "application/json",
    "Cache-Control": "no-cache",
    Pragma: "no-cache",
  },
});

// Public (no auth) — used by MainPage to display YouTube section
export const getPublicHighlights = () =>
  publicAxios.get("/api/highlights/public");

// Admin CRUD (auth required)
export const getHighlights = () =>
  axiosInstance.get("/api/highlights");

export const createHighlight = (data) =>
  axiosInstance.post("/api/highlights", data);

export const updateHighlight = (id, data) =>
  axiosInstance.post(`/api/highlights/${id}/update`, data);

export const toggleHighlight = (id, isActive) =>
  axiosInstance.post(`/api/highlights/${id}/toggle`, { isActive });

export const deleteHighlight = (id) =>
  axiosInstance.post(`/api/highlights/${id}/delete`);
