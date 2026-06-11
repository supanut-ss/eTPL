import api from "../api/axiosInstance";

const worldCupService = {
  getPredictions: () => api.get("/api/worldcup/predictions"),
  submitPrediction: (predictedTeam) =>
    api.post("/api/worldcup/predictions", { predictedTeam }),
  deletePrediction: (id) =>
    api.delete(`/api/worldcup/predictions/${id}`),
  updateDeadline: (deadline) =>
    api.post("/api/worldcup/deadline", { deadline }),
};

export default worldCupService;
