import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from './useAuth';

interface ServerTime {
  time: string;
  timestamp: number;
}

export const useWebSocket = () => {
  const ws = useRef<WebSocket | null>(null);
  const { user } = useAuth();
  const [serverTime, setServerTime] = useState<ServerTime | null>(null);

  const connect = useCallback(() => {
    const wsUrl = `ws://${window.location.hostname}:3000`;
    ws.current = new WebSocket(wsUrl);

    ws.current.onopen = () => {
      console.log('Connected to WebSocket');
      if (user?.id) {
        ws.current?.send(JSON.stringify({
          type: 'IDENTIFY',
          payload: { userId: user.id }
        }));
      }
    };

    ws.current.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        switch (message.type) {
          case 'SERVER_TIME':
            setServerTime(message.payload);
            break;
          default:
            console.log('Unknown message type:', message.type);
        }
      } catch (error) {
        console.error('Error parsing message:', error);
      }
    };

    ws.current.onclose = () => {
      console.log('Disconnected from WebSocket');
      // Try to reconnect after 1 second
      setTimeout(connect, 1000);
    };

    ws.current.onerror = (error) => {
      console.error('WebSocket error:', error);
      ws.current?.close();
    };
  }, [user]);

  useEffect(() => {
    connect();
    return () => {
      ws.current?.close();
    };
  }, [connect]);

  return { serverTime };
};
