import axiosInstance from './axiosInstance';

export const hofApi = {
  getHof: async () => {
    try {
      const response = await axiosInstance.get('/api/Hof');
      return response.data;
    } catch (error) {
      console.error('Error fetching Hall of Fame data:', error);
      throw error;
    }
  }
};
