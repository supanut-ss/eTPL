import api from "../api/axiosInstance";

const leagueOpsService = {
  getCycles: () => api.get("/api/leagueops/cycles"),
  saveCycle: (data) => api.post("/api/leagueops/cycle", data),
  getCycleStats: (cycleId) => api.get(`/api/leagueops/cycle/${cycleId}/stats`),
  runAutoJudge: (cycleId) => api.post(`/api/leagueops/autojudge/${cycleId}`),
  getAutoJudgePreview: (cycleId) => api.get(`/api/leagueops/autojudge/${cycleId}/preview`),
  applyBatchResults: (cycleId, results, configSnapshot) =>
    api.post("/api/leagueops/batch-apply", {
      cycleId,
      results,
      configSnapshot,
    }),
  getJudgeHistory: (cycleId) => api.get(`/api/leagueops/history/${cycleId}`),
  deleteJudgeHistory: (id) => api.delete(`/api/leagueops/history/${id}`),
  addCheckin: (data) => api.post("/api/leagueops/checkin", data),
  getUserCheckinStatus: () => api.get("/api/leagueops/user-checkin-status"),
  userCheckin: () => api.post("/api/leagueops/user-checkin"),
};

export default leagueOpsService;
