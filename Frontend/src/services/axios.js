import axios from "axios";

const instance = axios.create({
  baseURL: "http://localhost:3001", // ✅ your actual backend port
});

export default instance;
import axios from 'axios';

// Create a reusable axios instance
const api = axios.create({
  baseURL: 'http://localhost:5000/' // your API base URL here
});

export default api;
