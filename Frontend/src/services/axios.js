import axios from 'axios';

const api = axios.create({
   baseURL: 'https://api.mehustaja.fi/', // <-- your production backend
   //baseURL: "http://localhost:5001", // <-- your local backend
  withCredentials: false,
});

export default api;
