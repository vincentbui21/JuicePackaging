import axios from 'axios';

const api = axios.create({
<<<<<<< HEAD
   // baseURL: 'https://api.mehustaja.fi/', // <-- your production backend
=======
  //  baseURL: 'https://api.mehustaja.fi/', // <-- your production backend
>>>>>>> a145e9f5367d53783b63cdbd08bcce2c9d7b0d8b
   baseURL: "http://localhost:5001", // <-- your local backend
  withCredentials: false,
});

export default api;
