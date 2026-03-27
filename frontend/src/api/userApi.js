import axiosInstance from "./axiosInstance";

export const getUsers = () => axiosInstance.get("/api/users");
export const getUserById = (userId) =>
  axiosInstance.get(`/api/users/${userId}`);
export const createUser = (data) => axiosInstance.post("/api/users", data);
export const updateUser = (userId, data) =>
  axiosInstance.put(`/api/users/${userId}`, data);
export const deleteUser = (userId) =>
  axiosInstance.delete(`/api/users/${userId}`);
