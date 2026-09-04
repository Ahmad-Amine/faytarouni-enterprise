import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useSelector } from 'react-redux';
import { selectUser } from '../store/slices/authSlice';

export function useSocket(onNotification) {
  const user = useSelector(selectUser);
  const socketRef = useRef(null);

  useEffect(() => {
    if (!user) return undefined;

    // Connect to the frontend origin. The production frontend server proxies
    // /socket.io to the Railway backend, avoiding third-party cookie behavior.
    const socket = io('/', {
      withCredentials: true,
      transports: ['websocket', 'polling'],
    });
    socketRef.current = socket;

    if (onNotification) socket.on('notification', onNotification);

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?._id]);

  return socketRef;
}
