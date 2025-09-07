import axios from 'axios';

const api = axios.create({
  baseURL: 'https://api.mehustaja.fi/',
  withCredentials: false,
});

export default api;
