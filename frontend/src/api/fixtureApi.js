import axiosInstance from "./axiosInstance";

export const getFixtures = (params) =>
  axiosInstance.get("/api/fixtures", { params });

export const getFixtureSeasons = () =>
  axiosInstance.get("/api/fixtures/seasons");
