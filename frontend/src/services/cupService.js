import api from "../api/axiosInstance";

const cupService = {
  getBracket: () => api.get("/api/cup/bracket"),
  reportResult: (id, payload) => api.post(`/api/cup/${id}/report`, payload),
};

export default cupService;
