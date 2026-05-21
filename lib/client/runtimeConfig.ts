const defaultApiUrl = "https://ddingtion-back.onrender.com";

export const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || defaultApiUrl).replace(/\/$/, "");
export const SOCKET_URL = API_BASE_URL;
