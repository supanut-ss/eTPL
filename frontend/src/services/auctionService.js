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
      maxAge = null,
      ownedOnly = false
    } = filters;

    const res = await api.get("/api/auction/players", {
      params: { 
        searchTerm, page, pageSize, freeAgentOnly, grade,
        league, teamName, position, playingStyle, foot, nationality,
        minHeight, maxHeight, minWeight, maxWeight, minAge, maxAge, ownedOnly
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

  renewContract: async (squadId, cost, addSeasons) => {
    const res = await api.post("/api/auction/squad/renew", { squadId, cost, addSeasons });
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

  // ── Transfer Market & Offers ──────────────────────────────────────────
  listPlayer: async (squadId, listingPrice) => {
    const res = await api.post("/api/auction/transfer/list", { squadId, listingPrice });
    return res.data;
  },

  delistPlayer: async (squadId) => {
    const res = await api.post("/api/auction/transfer/delist", { squadId });
    return res.data;
  },

  getTransferBoard: async () => {
    const res = await api.get("/api/auction/transfer/board");
    return res.data;
  },

  submitOffer: async (squadId, offerType, amount) => {
    const res = await api.post("/api/auction/transfer/offers", { squadId, offerType, amount });
    return res.data;
  },

  respondOffer: async (offerId, accept) => {
    const res = await api.post(`/api/auction/transfer/offers/${offerId}/respond`, { accept });
    return res.data;
  },

  cancelOffer: async (offerId) => {
    const res = await api.post(`/api/auction/transfer/offers/${offerId}/cancel`);
    return res.data;
  },

  getIncomingOffers: async () => {
    const res = await api.get("/api/auction/transfer/offers/incoming");
    return res.data;
  },

  getOutgoingOffers: async () => {
    const res = await api.get("/api/auction/transfer/offers/outgoing");
    return res.data;
  },
};

export default auctionService;
