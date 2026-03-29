import axiosInstance from "./axiosInstance";

export const login = (credentials) =>
  axiosInstance.post("/api/auth/login", credentials);

export const lineLogin = (data) =>
  axiosInstance.post("/api/auth/line-login", data);

export const getLineLoginUrl = (params) =>
  axiosInstance.get("/api/auth/line-login-url", { params });
