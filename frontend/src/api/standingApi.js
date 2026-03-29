import axiosInstance from "./axiosInstance";

export const getStandings = () => axiosInstance.get("/api/standings");
