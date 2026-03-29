import axiosInstance from "./axiosInstance";

export const login = (credentials) =>
  axiosInstance.post("/api/auth/login", credentials);

export const lineLogin = (data) =>
  axiosInstance.post("/api/auth/line-login", data);
