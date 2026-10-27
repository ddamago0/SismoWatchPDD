const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export type SSECallback = (event: any) => void;

export function connectSSE(
  token: string,
  onEarthquake: (event: any) => void,
  onStatusChange: (connected: boolean) => void
): () => void {
  const url = `${API_BASE}/api/stream?token=${encodeURIComponent(token)}`;
  const eventSource = new EventSource(url);

  eventSource.onopen = () => {
    onStatusChange(true);
  };

  eventSource.addEventListener('connect', (e: MessageEvent) => {
    onStatusChange(true);
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
    onStatusChange(true);
  });

  eventSource.onerror = () => {
    onStatusChange(false);
  };

  return () => {
    eventSource.close();
    onStatusChange(false);
  };
}

