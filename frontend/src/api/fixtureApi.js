import axiosInstance from "./axiosInstance";
import axios from "axios";

export const getFixtures = (params) =>
  axiosInstance.get("/api/fixtures", { params });

export const getFixtureSeasons = () =>
  axiosInstance.get("/api/fixtures/seasons");

// Resolve the API base URL (mirrors the logic in axiosInstance.js).
const resolvePublicApiBaseUrl = () => {
  if (import.meta.env.VITE_API_BASE_URL) return import.meta.env.VITE_API_BASE_URL;

  if (typeof window !== "undefined") {
    const { protocol, hostname } = window.location;
    if (hostname === "thaipesleague.com" || hostname === "www.thaipesleague.com") {
      return `${protocol}//coreapi.thaipesleague.com`;
    }
  }

  return "";
};

// Public endpoint — no auth required
const publicAxios = axios.create({
  baseURL: resolvePublicApiBaseUrl(),
  headers: {
    "Content-Type": "application/json",
    "Cache-Control": "no-cache",
    Pragma: "no-cache",
  },
});

export const getPublicFixtures = () => publicAxios.get("/api/fixtures/public");

export const getPublicLastFixtures = () =>
  publicAxios.get("/api/fixtures/last10");

export const getPublicH2H = (home, away) =>
  publicAxios.get("/api/fixtures/h2h", { params: { home, away } });
