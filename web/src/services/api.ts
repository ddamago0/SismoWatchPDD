import {
  AuthResponse,
  EventsResponse,
  KpiData,
  StatsResponse,
  AiReport,
  QuarantineRecord,
  SqlQueryResult,
  SeismicAnomaly,
} from '../types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('sismowatch_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = {
    ...getAuthHeader(),
    ...(options.headers || {}),
  };

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (res.status === 401 && !endpoint.includes('/auth/login')) {
    localStorage.removeItem('sismowatch_token');
    localStorage.removeItem('sismowatch_user');
    window.dispatchEvent(new CustomEvent('sismowatch:session_expired'));
    throw new Error('SESION_REQUERIDA: Tu sesión ha expirado o requiere autenticación.');
  }

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(errorBody.detail || `Error en la petición: ${res.status}`);
  }

  return res.json();
}

export const api = {
  async login(username: string, password: string): Promise<AuthResponse> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Credenciales inválidas' }));
      throw new Error(err.detail || 'Fallo de autenticación');
    }

    const data: AuthResponse = await res.json();
    return data;
  },

  async getKpis(): Promise<KpiData> {
    const raw = await request<any>('/api/kpis');
    return {
      total_events_24h: raw.total_events_24h ?? 0,
      max_magnitude: raw.max_magnitude ?? raw.max_magnitude_24h ?? null,
      max_magnitude_24h: raw.max_magnitude ?? raw.max_magnitude_24h ?? null,
      avg_magnitude: raw.avg_magnitude ?? raw.avg_magnitude_24h ?? null,
      avg_magnitude_24h: raw.avg_magnitude ?? raw.avg_magnitude_24h ?? null,
      tsunami_alerts_count: raw.tsunami_alerts_count ?? raw.tsunami_alerts_24h ?? 0,
      tsunami_alerts_24h: raw.tsunami_alerts_count ?? raw.tsunami_alerts_24h ?? 0,
      quality_score: raw.quality_score ?? raw.data_quality_score ?? 100,
      data_quality_score: raw.quality_score ?? raw.data_quality_score ?? 100,
      latest_update: raw.latest_update ?? raw.last_updated ?? new Date().toISOString(),
    };
  },

  async getEvents(params: {
    page?: number;
    limit?: number;
    min_magnitude?: number;
    start_time?: string;
    end_time?: string;
    search?: string;
    has_tsunami?: boolean;
  }): Promise<EventsResponse> {
    const query = new URLSearchParams();
    if (params.page) query.append('page', params.page.toString());
    const limit = params.limit || 10;
    query.append('limit', limit.toString());

    if (params.min_magnitude !== undefined && params.min_magnitude > 0) {
      query.append('min_magnitude', params.min_magnitude.toString());
    }
    if (params.start_time) {
      query.append('start_date', params.start_time.slice(0, 10));
    }
    if (params.end_time) {
      query.append('end_date', params.end_time.slice(0, 10));
    }
    if (params.search && params.search.trim()) {
      query.append('region', params.search.trim());
    }

    const raw = await request<any>(`/api/events?${query.toString()}`);
    const eventsList = Array.isArray(raw) ? raw : (raw.events || []);
    const totalCount = raw.total ?? eventsList.length;

    // Optional frontend filter for tsunami if param present
    let filteredEvents = eventsList;
    if (params.has_tsunami) {
      filteredEvents = filteredEvents.filter((e: any) => e.tsunami === 1);
    }

    return {
      total: totalCount,
      page: raw.page || params.page || 1,
      limit,
      total_pages: Math.ceil(totalCount / limit) || 1,
      events: filteredEvents,
    };
  },

  async getStats(hours: number = 24): Promise<StatsResponse> {
    return request<StatsResponse>(`/api/stats?hours=${hours}`);
  },

  async getLatestReport(): Promise<AiReport> {
    return request<AiReport>('/api/reports/latest');
  },

  async exportReport(format: 'csv' | 'html'): Promise<void> {
    const headers = getAuthHeader();
    const res = await fetch(`${API_BASE}/api/reports/export?format=${format}`, { headers });
    if (!res.ok) throw new Error(`Fallo al exportar reporte en formato ${format}`);
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sismowatch_boletin_${new Date().toISOString().slice(0, 10)}.${format}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  },

  async getQuarantine(): Promise<QuarantineRecord[]> {
    return request<QuarantineRecord[]>('/api/quality/quarantine');
  },

  async runNaturalQuery(
    query: string,
    history?: Array<{ role: string; content: string }>
  ): Promise<SqlQueryResult> {
    return request<SqlQueryResult>('/api/ai/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: query,
        question: query,
        query,
        sql_query: query,
        history,
      }),
    });
  },

  async queryAi(
    query: string,
    history?: Array<{ role: string; content: string }>
  ): Promise<SqlQueryResult> {
    return this.runNaturalQuery(query, history);
  },

  async getLineage(): Promise<any> {
    return request<any>('/api/pipeline/lineage');
  },

  async getAnomalies(): Promise<SeismicAnomaly[]> {
    return request<SeismicAnomaly[]>('/api/anomalies').catch(() => []);
  },

  async triggerDag(dagId: string): Promise<{ status: string; message: string }> {
    return request<{ status: string; message: string }>('/api/pipeline/trigger', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dag_id: dagId }),
    });
  },
};
