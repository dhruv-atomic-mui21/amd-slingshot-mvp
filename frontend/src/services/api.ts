import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

export const api = {
  getHealth: async () => {
    const r = await axios.get(`http://localhost:5000/health`);
    return r.data;
  },

  getConfig: async () => {
    const r = await axios.get(`${API_BASE_URL}/config`);
    return r.data;
  },

  getLiveData: async () => {
    const r = await axios.get(`${API_BASE_URL}/live-data`);
    return r.data;
  },

  getRoute: async (start: string, end: string) => {
    const r = await axios.post(`${API_BASE_URL}/route`, { start, end });
    return r.data;
  },

  getRouteFromLatLon: async (startLat: number, startLon: number, endLat: number, endLon: number) => {
    const r = await axios.post(`${API_BASE_URL}/route`, {
      start_lat: startLat,
      start_lon: startLon,
      end_lat: endLat,
      end_lon: endLon
    });
    return r.data;
  }
};
