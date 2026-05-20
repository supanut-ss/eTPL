import axiosInstance from "./axiosInstance";

export const getStandings = (division = "D1") => axiosInstance.get(`/api/standings?division=${division}`);
