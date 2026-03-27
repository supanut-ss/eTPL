import axiosInstance from "./axiosInstance";

export const login = (credentials) =>
  axiosInstance.post("/api/auth/login", credentials);
