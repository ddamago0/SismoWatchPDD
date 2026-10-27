import React, { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { api } from './services/api';
import { connectSSE } from './services/sse';
import { EarthquakeEvent, KpiData, StatsResponse, AiReport } from './types';
import { Navbar } from './components/Navbar';
import { KpiCards } from './components/KpiCards';
import { FiltersBar } from './components/FiltersBar';
import { SeismicMap } from './components/SeismicMap';
import { AnalyticsCharts } from './components/AnalyticsCharts';
import { EventsTable } from './components/EventsTable';
import { AiReportCard } from './components/AiReportCard';
import { QualityPanel } from './components/QualityPanel';
import { AiQueryModal } from './components/AiQueryModal';
import { LoginModal } from './components/LoginModal';
import { LoadingState, ErrorState } from './components/States';

const DashboardContent: React.FC = () => {
  const { token, user } = useAuth();
  const [isLive, setIsLive] = useState(false);
  const [isAiQueryOpen, setIsAiQueryOpen] = useState(false);

  // Filters State
  const [timeRange, setTimeRange] = useState('24h');
  const [minMagnitude, setMinMagnitude] = useState(0);
  const [searchRegion, setSearchRegion] = useState('');

  // Data State
  const [kpis, setKpis] = useState<KpiData | null>(null);
  const [events, setEvents] = useState<EarthquakeEvent[]>([]);
  const [totalEvents, setTotalEvents] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [report, setReport] = useState<AiReport | null>(null);

  // UI State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch Core Data
  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Calculate time filters
      let hours = 24;
      if (timeRange === '1h') hours = 1;
      if (timeRange === '7d') hours = 168;
      if (timeRange === '30d') hours = 720;

      const startTime = new Date(Date.now() - hours * 3600 * 1000).toISOString();

      const [kpiRes, eventsRes, statsRes, reportRes] = await Promise.allSettled([
        api.getKpis(),
        api.getEvents({
          page,
          limit: 10,
          min_magnitude: minMagnitude > 0 ? minMagnitude : undefined,
          start_time: startTime,
          search: searchRegion.trim() || undefined,
        }),
        api.getStats(hours),
        api.getLatestReport(),
      ]);

      if (kpiRes.status === 'fulfilled') setKpis(kpiRes.value);
      if (eventsRes.status === 'fulfilled') {
        setEvents(eventsRes.value.events);
        setTotalEvents(eventsRes.value.total);
        setTotalPages(eventsRes.value.total_pages);
      }
      if (statsRes.status === 'fulfilled') setStats(statsRes.value);
      if (reportRes.status === 'fulfilled') setReport(reportRes.value);
    } catch (err: any) {
      setError(err.message || 'Error al conectar con la API');
    } finally {
      setLoading(false);
    }
  }, [timeRange, minMagnitude, searchRegion, page]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Connect SSE for Real-time streaming
  useEffect(() => {
    if (!token) return;

    const cleanup = connectSSE(
      token,
      (ssePayload) => {
        if (ssePayload.type === 'NEW_EARTHQUAKE' && ssePayload.event) {
          const newEvt = ssePayload.event;
          // Prepend new earthquake into events list
          setEvents((prev) => [newEvt, ...prev.slice(0, 9)]);
          setTotalEvents((prev) => prev + 1);

          // Update KPIs dynamically
          setKpis((prev) => {
            if (!prev) return null;
            return {
              ...prev,
              total_events_24h: prev.total_events_24h + 1,
              max_magnitude_24h: Math.max(prev.max_magnitude_24h || 0, newEvt.mag),
              tsunami_alerts_24h: prev.tsunami_alerts_24h + (newEvt.tsunami ? 1 : 0),
            };
          });
        }
      },
      (connected) => setIsLive(connected)
    );

    return cleanup;
  }, [token]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Navbar isLive={isLive} onOpenAiQuery={() => setIsAiQueryOpen(true)} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* KPI Summary Cards */}
        <KpiCards kpis={kpis} loading={loading} />

        {/* Filters Toolbar */}
        <FiltersBar
          timeRange={timeRange}
          onTimeRangeChange={(r) => {
            setTimeRange(r);
            setPage(1);
          }}
          minMagnitude={minMagnitude}
          onMinMagnitudeChange={(m) => {
            setMinMagnitude(m);
            setPage(1);
          }}
          searchRegion={searchRegion}
          onSearchRegionChange={(s) => {
            setSearchRegion(s);
            setPage(1);
          }}
          onRefresh={loadDashboardData}
          loading={loading}
        />

        {error && (
          <ErrorState
            title="Error de sincronización"
            message={error}
            onRetry={loadDashboardData}
          />
        )}

        {/* Map & Live Visualizer */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Cartografía Sísmica Georreferenciada (USGS)
            </h2>
            <span className="text-[11px] text-slate-500">
              {events.length} sismos mostrados en mapa
            </span>
          </div>
          <SeismicMap events={events} />
        </div>

        {/* Recharts Analytics Charts */}
        <AnalyticsCharts stats={stats} loading={loading} />

        {/* Events Table */}
        <EventsTable
          events={events}
          total={totalEvents}
          page={page}
          limit={10}
          totalPages={totalPages}
          onPageChange={setPage}
          loading={loading}
        />

        {/* AI Executive Report View */}
        <AiReportCard report={report} loading={loading} />

        {/* Data Quality & Quarantine (RBAC) */}
        <QualityPanel />
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 py-6 text-center text-xs text-slate-500">
        <p>
          SismoWatch PDD — Plataforma de IA & Automatización para Mitigación Sísmica en SuperApp.
        </p>
        <p className="mt-1 text-[11px] text-slate-600">
          PostgreSQL 16 Medallion · Apache Airflow 2.8.1 · Pandera Quarantine · Gemini 3.8 Flash & Groq Fallback · FastAPI SSE · React Leaflet
        </p>
      </footer>

      {/* Modals */}
      <LoginModal />
      <AiQueryModal isOpen={isAiQueryOpen} onClose={() => setIsAiQueryOpen(false)} />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <DashboardContent />
    </AuthProvider>
  );
}
