import axiosInstance from "./axiosInstance";

export const getPermissions = () => axiosInstance.get("/api/permissions");
export const getMyMenus = () => axiosInstance.get("/api/permissions/my");
export const updatePermissions = (permissions) =>
  axiosInstance.put("/api/permissions", { permissions });
