import {
  AuthResponse,
  EventsResponse,
  KpiData,
  StatsResponse,
  AiReport,
  QuarantineRecord,
  SqlQueryResult,
} from '../types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('sismowatch_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const api = {
  async login(username: string, password: string): Promise<AuthResponse> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Error de autenticación' }));
      throw new Error(err.detail || 'Credenciales inválidas');
    }
    return res.json();
  },

  async getKpis(): Promise<KpiData> {
    const res = await fetch(`${API_BASE}/api/kpis`, {
      headers: { ...getAuthHeader() },
    });
    if (!res.ok) throw new Error('Error al obtener KPIs');
    return res.json();
  },

  async getEvents(params: {
    page?: number;
    limit?: number;
    min_magnitude?: number;
    start_time?: string;
    end_time?: string;
    search?: string;
  }): Promise<EventsResponse> {
    const query = new URLSearchParams();
    if (params.page) query.append('page', params.page.toString());
    if (params.limit) query.append('limit', params.limit.toString());
    if (params.min_magnitude !== undefined) query.append('min_magnitude', params.min_magnitude.toString());
    if (params.start_time) query.append('start_date', params.start_time.slice(0, 10));
    if (params.end_time) query.append('end_date', params.end_time.slice(0, 10));
    if (params.search) query.append('region', params.search);

    const res = await fetch(`${API_BASE}/api/events?${query.toString()}`, {
      headers: { ...getAuthHeader() },
    });
    if (!res.ok) throw new Error('Error al obtener eventos');
    return res.json();
  },

  async getStats(hours: number = 24): Promise<StatsResponse> {
    const res = await fetch(`${API_BASE}/api/stats?hours=${hours}`, {
      headers: { ...getAuthHeader() },
    });
    if (!res.ok) throw new Error('Error al obtener estadísticas');
    return res.json();
  },

  async getLatestReport(): Promise<AiReport> {
    const res = await fetch(`${API_BASE}/api/reports/latest`, {
      headers: { ...getAuthHeader() },
    });
    if (!res.ok) throw new Error('Error al obtener reporte de IA');
    return res.json();
  },

  async exportReport(format: 'csv' | 'html'): Promise<void> {
    const res = await fetch(`${API_BASE}/api/reports/export?format=${format}`, {
      headers: { ...getAuthHeader() },
    });
    if (!res.ok) throw new Error(`Error al exportar reporte en ${format}`);
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sismowatch_report_${new Date().toISOString().slice(0, 10)}.${format}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  },

  async getQuarantine(): Promise<QuarantineRecord[]> {
    const res = await fetch(`${API_BASE}/api/quality/quarantine`, {
      headers: { ...getAuthHeader() },
    });
    if (res.status === 403) {
      throw new Error('ACCESO_DENEGADO_ROL: Se requiere rol de Administrador para acceder a la cuarentena');
    }
    if (!res.ok) throw new Error('Error al obtener registros de cuarentena');
    return res.json();
  },

  async runNaturalQuery(query: string): Promise<SqlQueryResult> {
    const res = await fetch(`${API_BASE}/api/ai/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify({ query }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Error al ejecutar consulta' }));
      throw new Error(err.detail || 'Fallo en consulta analítica');
    }
    return res.json();
  },

  async triggerDag(dagId: string): Promise<{ status: string; message: string }> {
    const res = await fetch(`${API_BASE}/api/pipeline/trigger`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify({ dag_id: dagId }),
    });
    if (res.status === 403) {
      throw new Error('ACCESO_DENEGADO_ROL: Solo administradores pueden ejecutar pipelines');
    }
    if (!res.ok) throw new Error('Error al disparar pipeline en Airflow');
    return res.json();
  },

  async getLineage(): Promise<any> {
    const res = await fetch(`${API_BASE}/api/pipeline/lineage`, {
      headers: { ...getAuthHeader() },
    });
    if (!res.ok) throw new Error('Error al obtener linaje de datos');
    return res.json();
  },

  async getAnomalies(): Promise<any[]> {
    const res = await fetch(`${API_BASE}/api/anomalies`, {
      headers: { ...getAuthHeader() },
    });
    if (!res.ok) return [];
    return res.json();
  },
};
