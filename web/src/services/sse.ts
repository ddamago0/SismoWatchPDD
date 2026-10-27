const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export type SSEConnectionStatus = 'connected' | 'reconnecting' | 'disconnected';

export function connectSSE(
  token: string,
  onEarthquake: (event: any) => void,
  onStatusChange: (status: SSEConnectionStatus) => void
): () => void {
  let eventSource: EventSource | null = null;
  let isClosed = false;
  let retryCount = 0;
  let reconnectTimeout: any = null;

  function initConnection() {
    if (isClosed) return;

    const url = `${API_BASE}/api/stream?token=${encodeURIComponent(token)}`;
    eventSource = new EventSource(url);

    eventSource.onopen = () => {
      retryCount = 0;
      onStatusChange('connected');
    };

    eventSource.addEventListener('connect', () => {
      retryCount = 0;
      onStatusChange('connected');
    });

    eventSource.addEventListener('earthquake', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        onEarthquake(data);
      } catch (err) {
        console.error('Error parsing SSE earthquake event', err);
      }
    });

    eventSource.addEventListener('ping', () => {
      onStatusChange('connected');
    });

    eventSource.onerror = () => {
      if (isClosed) return;
      onStatusChange('reconnecting');
      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }
      // Reintento con backoff exponencial: 1s, 1.5s, 2.2s... hasta 30s máx
      const delay = Math.min(1000 * Math.pow(1.5, retryCount), 30000);
      retryCount++;
      reconnectTimeout = setTimeout(() => {
        initConnection();
      }, delay);
    };
  }

  initConnection();

  return () => {
    isClosed = true;
    if (reconnectTimeout) clearTimeout(reconnectTimeout);
    if (eventSource) eventSource.close();
    onStatusChange('disconnected');
  };
}

