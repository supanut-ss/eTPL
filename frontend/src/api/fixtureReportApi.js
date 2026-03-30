import axiosInstance from "./axiosInstance";

export const reportFixtureResult = (fixtureId, data) =>
  axiosInstance.post(`/api/fixtures/${fixtureId}/report`, data);

export const editFixtureResult = (fixtureId, data) =>
  axiosInstance.post(`/api/fixtures/${fixtureId}/report/edit`, data);

export const getFixtureDetail = (fixtureId) =>
  axiosInstance.get(`/api/fixtures/${fixtureId}/detail`);
