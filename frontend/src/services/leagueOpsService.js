import api from "../api/axiosInstance";

const leagueOpsService = {
  getCycles: () => api.get("/api/leagueops/cycles"),
  saveCycle: (data) => api.post("/api/leagueops/cycle", data),
  getCycleStats: (cycleId) => api.get(`/api/leagueops/cycle/${cycleId}/stats`),
  runAutoJudge: (cycleId) => api.post(`/api/leagueops/autojudge/${cycleId}`),
  getAutoJudgePreview: (cycleId) => api.get(`/api/leagueops/autojudge/${cycleId}/preview`),
  applyBatchResults: (results) => api.post("/api/leagueops/batch-apply", results),
  addCheckin: (data) => api.post("/api/leagueops/checkin", data),
};

export default leagueOpsService;
