import api from "../api/axiosInstance";

const fixtureService = {
  getFixtures: (search) => api.get("/api/fixtures", { params: { search } }),
};

export default fixtureService;
