import api from "../api/axiosInstance";

const specialTournamentService = {
  // ── Tournaments ────────────────────────────────────────────────────────────
  list: () => api.get("/api/special-tournament"),
  getById: (id) => api.get(`/api/special-tournament/${id}`),
  create: (data) => api.post("/api/special-tournament", data),
  update: (id, data) => api.put(`/api/special-tournament/${id}`, data),
  delete: (id) => api.delete(`/api/special-tournament/${id}`),

  // ── Participants ───────────────────────────────────────────────────────────
  addParticipant: (id, data) =>
    api.post(`/api/special-tournament/${id}/participants`, data),
  updateParticipant: (id, pid, data) =>
    api.put(`/api/special-tournament/${id}/participants/${pid}`, data),
  removeParticipant: (id, pid) =>
    api.delete(`/api/special-tournament/${id}/participants/${pid}`),

  // ── Bracket / Group generation ─────────────────────────────────────────────
  generateBracket: (id) =>
    api.post(`/api/special-tournament/${id}/generate-bracket`),
  generateGroups: (id) =>
    api.post(`/api/special-tournament/${id}/generate-groups`),
  advanceFromGroups: (id) =>
    api.post(`/api/special-tournament/${id}/advance-from-groups`),
  resetBracket: (id, phase = "all") =>
    api.post(`/api/special-tournament/${id}/reset-bracket?phase=${phase}`),

  // ── Match results ──────────────────────────────────────────────────────────
  reportResult: (matchId, data) =>
    api.post(`/api/special-tournament/matches/${matchId}/report`, data),
};

export default specialTournamentService;
