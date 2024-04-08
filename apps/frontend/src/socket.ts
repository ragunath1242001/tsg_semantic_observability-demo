import { io } from "socket.io-client";

const localUrl = process.env.BACKEND
  ? process.env.BACKEND
  : "http://localhost:3000";
// "undefined" means the URL will be computed from the `window.location` object
const URL = process.env.NODE_ENV === "production" ? undefined : localUrl;

export const socket = io(URL);
