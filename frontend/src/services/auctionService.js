import api from "../api/axiosInstance";

const auctionService = {
  searchPlayers: async (filters = {}) => {
    const { 
      searchTerm = "", 
      page = 1, 
      pageSize = 20, 
      freeAgentOnly = false, 
      grade = "",
      league = "",
      teamName = "",
      position = "",
      playingStyle = "",
      foot = "",
      nationality = "",
      minHeight = null,
      maxHeight = null,
      minWeight = null,
      maxWeight = null,
      minAge = null,
      maxAge = null
    } = filters;

    const res = await api.get("/api/auction/players", {
      params: { 
        searchTerm, page, pageSize, freeAgentOnly, grade,
        league, teamName, position, playingStyle, foot, nationality,
        minHeight, maxHeight, minWeight, maxWeight, minAge, maxAge
      },
    });
    return res.data;
  },

  getFilterOptions: async (league = "") => {
    const res = await api.get("/api/auction/filter-options", { params: { league } });
    return res.data;
  },

  getBoard: async () => {
    const res = await api.get("/api/auction/board");
    return res.data;
  },

  startAuction: async (playerId) => {
    const res = await api.post(`/api/auction/start/${playerId}`);
    return res.data;
  },

  placeNormalBid: async (auctionId, bidAmount) => {
    const res = await api.post(`/api/auction/${auctionId}/bid/normal`, { bidAmount });
    return res.data;
  },

  placeFinalBid: async (auctionId, bidAmount) => {
    const res = await api.post(`/api/auction/${auctionId}/bid/final`, { bidAmount });
    return res.data;
  },

  confirmAuction: async (auctionId) => {
    const res = await api.post(`/api/auction/${auctionId}/confirm`);
    return res.data;
  },

  getSummary: async () => {
    const res = await api.get("/api/auction/summary");
    return res.data;
  },

  getWallet: async () => {
    const res = await api.get("/api/auction/wallet");
    return res.data;
  },

  getSettings: async () => {
    const res = await api.get("/api/auction/settings");
    return res.data;
  },

  updateSettings: async (settings) => {
    const res = await api.put("/api/auction/settings", settings);
    return res.data;
  },

  getMySquad: async () => {
    const res = await api.get("/api/auction/my-squad");
    return res.data;
  },

  getQuotas: async () => {
    const res = await api.get("/api/auction/quotas");
    return res.data;
  },

  updateQuotas: async (quotas) => {
    const res = await api.put("/api/auction/quotas", quotas);
    return res.data;
  },

  // ── Transaction History ──────────────────────────────────────────────
  getTransactions: async (page = 1, pageSize = 20) => {
    const res = await api.get("/api/auction/transactions", {
      params: { page, pageSize },
    });
    return res.data;
  },

  // ── Squad Lifecycle ──────────────────────────────────────────────────
  releasePlayer: async (squadId, refundAmount = 0) => {
    const res = await api.post("/api/auction/squad/release", { squadId, refundAmount });
    return res.data;
  },

  renewContract: async (squadId, cost, contractUntil) => {
    const res = await api.post("/api/auction/squad/renew", { squadId, cost, contractUntil });
    return res.data;
  },

  loanPlayer: async (squadId, targetUserId, loanFee, loanExpiry) => {
    const res = await api.post("/api/auction/squad/loan", { squadId, targetUserId, loanFee, loanExpiry });
    return res.data;
  },

  transferPlayer: async (squadId, buyerUserId, transferFee) => {
    const res = await api.post("/api/auction/squad/transfer", { squadId, buyerUserId, transferFee });
    return res.data;
  },

  giveBonus: async (targetUserId, amount, reason) => {
    const res = await api.post("/api/auction/bonus", { targetUserId, amount, reason });
    return res.data;
  },
};

export default auctionService;
