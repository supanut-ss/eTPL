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

  // Fixture Generator
  getFixtureGeneratePreview: () => api.get("/api/fixtures/generate-preview"),
  generateFixture: () => api.post("/api/fixtures/generate", {}),
  resetFixtures: (data) => api.post("/api/fixtures/reset", data),

  // Special Bonus
  getBonuses: () => api.get("/api/bonus"),
  requestBonus: (data) => api.post("/api/bonus/request", data),
  approveBonus: (data) => api.post("/api/bonus/approve", data),
  rejectBonus: (bonusId) => api.post("/api/bonus/reject", bonusId),
  // ── Cup Management ──────────────────────────────────────────
  generateCupBracket: () => api.post("/api/cup/generate"),
  resetCupBracket: () => api.post("/api/cup/reset"),

  // ── Season Management ───────────────────────────────────────
  closeSeason: (platform = "PC", division = "D1") => api.post(`/api/season/close?platform=${platform}&division=${division}`),
  openSeason: (platform = "PC", division = "D1") => api.post(`/api/season/open?platform=${platform}&division=${division}`),
};

export default adminService;
