import axiosInstance from "./axiosInstance";

export const login = (credentials) =>
  axiosInstance.post("/api/auth/login", credentials);

export const lineLogin = (data) =>
  axiosInstance.post("/api/auth/line-login", data);

export const lineAuth = (data) =>
  axiosInstance.post("/api/auth/line-auth", data);

export const lineBind = (data) =>
  axiosInstance.post("/api/auth/line-bind", data);

export const getLineAvailableUsers = () =>
  axiosInstance.get("/api/auth/line-available-users");

export const getLineLoginUrl = (params) =>
  axiosInstance.get("/api/auth/line-login-url", { params });

export const getLineConfigStatus = () =>
  axiosInstance.get("/api/auth/line-config-status");
