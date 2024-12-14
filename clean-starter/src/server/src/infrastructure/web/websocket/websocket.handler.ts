import { WebSocket, WebSocketServer } from 'ws';
import { TimeService } from '../../../core/application/time.service';

interface WebSocketMessage {
  type: string;
  payload?: any;
}

export class WebSocketHandler {
  private clients: Map<WebSocket, { userId?: string }> = new Map();

  constructor(
    private wss: WebSocketServer,
    private timeService: TimeService
  ) {
    this.setupWebSocket();
    this.startTimeUpdates();
  }

  private setupWebSocket() {
    this.wss.on('connection', (ws: WebSocket) => {
      console.log('New WebSocket connection');
      this.clients.set(ws, {});

      ws.on('message', (data: string) => {
        try {
          const message: WebSocketMessage = JSON.parse(data.toString());
          this.handleMessage(ws, message);
        } catch (error) {
          console.error('Error parsing message:', error);
        }
      });

      ws.on('close', () => {
        console.log('Client disconnected');
        this.clients.delete(ws);
      });

      // Send initial time
      this.sendToClient(ws, {
        type: 'SERVER_TIME',
        payload: this.timeService.getServerTime()
      });
    });
  }

  private startTimeUpdates() {
    // Update time every second
    setInterval(() => {
      this.broadcast({
        type: 'SERVER_TIME',
        payload: this.timeService.getServerTime()
      });
    }, 1000);
  }

  private handleMessage(ws: WebSocket, message: WebSocketMessage) {
    switch (message.type) {
      case 'IDENTIFY':
        if (message.payload?.userId) {
          this.clients.set(ws, { userId: message.payload.userId });
        }
        break;
      default:
        console.log('Unknown message type:', message.type);
    }
  }

  private sendToClient(ws: WebSocket, message: WebSocketMessage) {
    ws.send(JSON.stringify(message));
  }

  private broadcast(message: WebSocketMessage) {
    this.wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
      }
    });
  }
}
