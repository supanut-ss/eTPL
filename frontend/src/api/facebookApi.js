import axiosInstance from "./axiosInstance";

export const getFacebookSettings = () => axiosInstance.get("/api/facebook/settings");
export const getFacebookAppConfig = () => axiosInstance.get("/api/facebook/app-config");
export const updateFacebookToken = (data) => axiosInstance.post("/api/facebook/update-token", data);
export const testFacebookPost = (message) => axiosInstance.post("/api/facebook/post-message", { message });
