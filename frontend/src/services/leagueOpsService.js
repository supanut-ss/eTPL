import api from "../api/axiosInstance";

const leagueOpsService = {
  getCycles: () => api.get("/api/leagueops/cycles"),
  saveCycle: (data) => api.post("/api/leagueops/cycle", data),
  getCycleStats: (cycleId) => api.get(`/api/leagueops/cycle/${cycleId}/stats`),
  runAutoJudge: (cycleId) => api.post(`/api/leagueops/autojudge/${cycleId}`),
  addCheckin: (data) => api.post("/api/leagueops/checkin", data),
};

export default leagueOpsService;
