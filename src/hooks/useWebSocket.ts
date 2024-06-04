import { useEffect } from 'react';

const useWebSocket = (url: string) => {
  useEffect(() => {
    let retryInterval = 1000; // Start with a 1-second interval
    let ws: WebSocket;

    const connectWebSocket = () => {
      ws = new WebSocket(url);

      ws.onopen = () => {
        console.log('WebSocket connection opened');
        retryInterval = 1000; // Reset retry interval on successful connection
      };

      ws.onmessage = (event) => {
        console.log('WebSocket message received:', event.data);
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      ws.onclose = () => {
        console.log('WebSocket connection closed. Reconnecting...');
        retryInterval = Math.min(retryInterval * 2, 30000); // Exponential backoff up to 30 seconds
        setTimeout(connectWebSocket, retryInterval);
      };
    };

    connectWebSocket();

    // Cleanup function to close WebSocket on component unmount
    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, [url]);
};

export default useWebSocket;
