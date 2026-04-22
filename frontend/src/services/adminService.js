import api from "../api/axios";

const adminService = {
  getUsers: () => api.get("/admin/users"),
  scrapePlayer: (id) => api.post(`/admin/scrape-player/${id}`),
  addHof: (data) => api.post("/admin/add-hof", data),
};

export default adminService;
