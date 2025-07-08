import axios from 'axios';

// Create a reusable axios instance
const api = axios.create({
  baseURL: 'http://localhost:5001/',
});

export default api;
