import axiosInstance from "./axiosInstance";

export const getFixtures = (params) =>
  axiosInstance.get("/api/fixtures", { params });

export const getFixtureSeasons = () =>
  axiosInstance.get("/api/fixtures/seasons");

export const updateFixtureScore = (fixtureId, homeScore, awayScore) =>
  axiosInstance.put(`/api/fixtures/${fixtureId}/score`, { homeScore, awayScore });

