import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useSelector } from 'react-redux';
import type { RootState } from '../store';

export const useTrafficSocket = () => {
  const token = useSelector((state: RootState) => state.auth.token);
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    if (!token) return;

    const socketUrl = import.meta.env.VITE_SOCKET_URL || (window.location.protocol === 'https:' ? `wss://${window.location.host}` : `ws://${window.location.host}`);
    const newSocket = io(socketUrl + '/traffic', {
      auth: { token }
    });

    newSocket.on('connect_error', (err) => {
      console.error('Socket connection error:', err.message);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [token]);

  return socket;
};
