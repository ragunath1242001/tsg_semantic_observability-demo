import { useEffect, useRef, useState } from "react";
import type { Socket } from "socket.io-client";

import type { ApiClient } from "../api/client.js";

export type SocketStatus =
  | "connecting"
  | "connected"
  | "disconnected"
  | "error";

/**
 * Opens and maintains a Socket.IO connection via the ApiClient for the
 * lifetime of the component.  Returns the socket instance and its
 * current connection status.
 *
 * The socket is automatically disconnected when the component unmounts.
 */
export function useSocket(client: ApiClient): {
  socket: Socket | undefined;
  status: SocketStatus;
} {
  const [status, setStatus] = useState<SocketStatus>("connecting");
  const socketRef = useRef<Socket | undefined>(undefined);

  useEffect(() => {
    const socket = client.connectSocket();
    socketRef.current = socket;

    if (socket.connected) {
      setStatus("connected");
    } else {
      setStatus("connecting");
    }

    const onConnect = () => setStatus("connected");
    const onDisconnect = () => setStatus("disconnected");
    const onError = () => setStatus("error");

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onError);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("connect_error", onError);
      client.disconnectSocket();
    };
  }, [client]);

  return { socket: socketRef.current, status };
}
