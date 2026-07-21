import api from "../api/axiosInstance";

const cupService = {
  getBracket: () => api.get("/api/cup/bracket"),
  reportResult: (id, payload) => api.post(`/api/cup/${id}/report`, payload),
  distributePrizes: (season) => api.post(`/api/cup/distribute-prizes${season ? `?season=${season}` : ""}`),
};

export default cupService;
