import axiosInstance from "./axiosInstance";

export const getNotifications = () => axiosInstance.get("/api/notifications");
export const getUnreadCount = () => axiosInstance.get("/api/notifications/unread-count");
export const markAsRead = (id) => axiosInstance.post(`/api/notifications/${id}/read`);
export const markAllAsRead = () => axiosInstance.post("/api/notifications/read-all");
