import api from "../api/axiosInstance";

const auctionService = {
  searchPlayers: async (searchTerm = "", page = 1, pageSize = 20) => {
    const res = await api.get("/api/auction/players", {
      params: { searchTerm, page, pageSize },
    });
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

  getSettings: async () => {
    const res = await api.get("/api/auction/settings");
    return res.data;
  },

  updateSettings: async (settings) => {
    const res = await api.put("/api/auction/settings", settings);
    return res.data;
  },
};

export default auctionService;
