import api from "../api/axiosInstance";

const adminService = {
  getUsers: () => api.get("/api/admin/users"),
  scrapePlayer: (id) => api.post(`/api/admin/scrape-player/${id}`),
  addPlayerManual: (data) => api.post("/api/admin/add-player-manual", data),
  addHof: (data) => api.post("/api/admin/add-hof", data),
  getUserTeam: (userId, platform, season) => api.get(`/api/admin/get-user-team?userId=${userId}&platform=${platform}&season=${season}`),
  getQuotaSummary: () => api.get("/api/admin/quota-summary"),
  getPrizes: () => api.get("/api/admin/prizes"),
  savePrizes: (data) => api.post("/api/admin/prizes", data),
  
  // Special Bonus
  getBonuses: () => api.get("/api/bonus"),
  requestBonus: (data) => api.post("/api/bonus/request", data),
  approveBonus: (data) => api.post("/api/bonus/approve", data),
  rejectBonus: (bonusId) => api.post("/api/bonus/reject", bonusId),
};

export default adminService;
