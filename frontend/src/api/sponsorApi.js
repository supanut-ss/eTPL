import axiosInstance from "./axiosInstance";

export const getSponsors = () => axiosInstance.get("/api/sponsors");
export const createSponsor = (data) => axiosInstance.post("/api/sponsors", data);
export const updateSponsor = (id, data) => axiosInstance.put(`/api/sponsors/${id}`, data);
export const deleteSponsor = (id) => axiosInstance.delete(`/api/sponsors/${id}`);
