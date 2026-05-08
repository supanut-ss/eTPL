import axiosInstance from "./axiosInstance";

export const uploadNewsImage = (file) => {
  const formData = new FormData();
  formData.append("file", file);
  return axiosInstance.post("/api/upload/news", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

export const uploadProfileImage = (file) => {
  const formData = new FormData();
  formData.append("file", file);
  return axiosInstance.post("/api/upload/profile", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};
