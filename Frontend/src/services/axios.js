import axios from 'axios';

// Create a reusable axios instance
const api = axios.create({
  baseURL: 'http://localhost:5000/' // your API base URL here
});

export default api;
