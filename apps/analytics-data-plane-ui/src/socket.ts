import { io } from "socket.io-client";

export const socket = io(window.location.origin, {
  path: `${window.location.pathname.replace(/\/$/, "")}/api/socket.io`
});

socket.on("connect", () => {
  console.log("WebSocket connected");
});

socket.on("connect_error", (error) => {
  console.error("WebSocket connection error:", error);
});

socket.on("disconnect", () => {
  console.log("WebSocket disconnected");
});
