import { io } from "socket.io-client";

const base = (import.meta.env.VITE_API_BASE_URL || "https://api.mehustaja.fi").replace(/\/$/, "");
export const socket = io(base, { transports: ["websocket"], autoConnect: true });
