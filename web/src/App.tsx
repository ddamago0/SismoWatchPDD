import React, { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { api } from './services/api';
import { connectSSE, SSEConnectionStatus } from './services/sse';
import { EarthquakeEvent, KpiData, StatsResponse, AiReport, SeismicAnomaly } from './types';
import { Navbar, MainNavTab } from './components/Navbar';
import { KpiCards } from './components/KpiCards';
import { FiltersBar } from './components/FiltersBar';
import { SeismicMap } from './components/SeismicMap';
import { LiveEventsFeed } from './components/LiveEventsFeed';
import { AnalyticsCharts } from './components/AnalyticsCharts';
import { EventsTable } from './components/EventsTable';
import { AiReportCard } from './components/AiReportCard';
import { PipelineHealthPanel } from './components/PipelineHealthPanel';
import { AdminAuditPanel } from './components/AdminAuditPanel';
import { AiChatDrawer } from './components/AiChatDrawer';
import { LoginScreen } from './components/LoginScreen';

const MainApp: React.FC = () => {
  const { token, isAuthenticated, isAdmin } = useAuth();
  const [connectionStatus, setConnectionStatus] = useState<SSEConnectionStatus>('disconnected');
  const [activeTab, setActiveTab] = useState<MainNavTab>('monitoring');
  const [isAiDrawerOpen, setIsAiDrawerOpen] = useState(false);

  // Filters State
  const [timeRange, setTimeRange] = useState('24h');
  const [minMagnitude, setMinMagnitude] = useState(0);
  const [searchRegion, setSearchRegion] = useState('');
  const [onlyTsunami, setOnlyTsunami] = useState(false);

  // Data State
  const [kpis, setKpis] = useState<KpiData | null>(null);
  const [events, setEvents] = useState<EarthquakeEvent[]>([]);
  const [anomalies, setAnomalies] = useState<SeismicAnomaly[]>([]);
  const [totalEvents, setTotalEvents] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [report, setReport] = useState<AiReport | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<EarthquakeEvent | null>(null);

  // UI State
  const [loading, setLoading] = useState(true);

  // Ensure Viewer is redirected if trying to access admin_audit
  useEffect(() => {
    if (activeTab === 'admin_audit' && !isAdmin) {
      setActiveTab('monitoring');
    }
  }, [activeTab, isAdmin]);

  // Fetch Core Data
  const loadDashboardData = useCallback(async () => {
    if (!token) return;
    setLoading(true);

    try {
      let hours = 24;
      if (timeRange === '1h') hours = 1;
      if (timeRange === '7d') hours = 168;
      if (timeRange === '30d') hours = 720;

      const startTime = new Date(Date.now() - hours * 3600 * 1000).toISOString();

      const [kpiRes, eventsRes, statsRes, reportRes, anomRes] = await Promise.allSettled([
        api.getKpis(),
        api.getEvents({
          page,
          limit: 15,
          min_magnitude: minMagnitude > 0 ? minMagnitude : undefined,
          start_time: startTime,
          search: searchRegion.trim() || undefined,
          has_tsunami: onlyTsunami,
        }),
        api.getStats(hours),
        api.getLatestReport(),
        api.getAnomalies(),
      ]);

      if (kpiRes.status === 'fulfilled') setKpis(kpiRes.value);
      if (eventsRes.status === 'fulfilled') {
        setEvents(eventsRes.value.events);
        setTotalEvents(eventsRes.value.total);
        setTotalPages(eventsRes.value.total_pages);
      }
      if (statsRes.status === 'fulfilled') setStats(statsRes.value);
      if (reportRes.status === 'fulfilled') setReport(reportRes.value);
      if (anomRes.status === 'fulfilled') setAnomalies(anomRes.value);
    } catch (err: any) {
      console.error('Error fetching dashboard data', err);
    } finally {
      setLoading(false);
    }
  }, [token, timeRange, minMagnitude, searchRegion, onlyTsunami, page]);

  useEffect(() => {
    if (isAuthenticated) {
      loadDashboardData();
    }
  }, [isAuthenticated, loadDashboardData]);

  // Connect SSE for Real-time streaming
  useEffect(() => {
    if (!token) {
      setConnectionStatus('disconnected');
      return;
    }

    const cleanup = connectSSE(
      token,
      (ssePayload) => {
        if (ssePayload.type === 'NEW_EARTHQUAKE' && ssePayload.event) {
          const newEvt = ssePayload.event;
          setEvents((prev) => [newEvt, ...prev.slice(0, 14)]);
          setTotalEvents((prev) => prev + 1);

          setKpis((prev) => {
            if (!prev) return null;
            return {
              ...prev,
              total_events_24h: prev.total_events_24h + 1,
              max_magnitude: Math.max(prev.max_magnitude || 0, newEvt.mag),
              tsunami_alerts_count: prev.tsunami_alerts_count + (newEvt.tsunami ? 1 : 0),
            };
          });
        }
      },
      (status) => setConnectionStatus(status)
    );

    return cleanup;
  }, [token]);

  // Sin sesión: Vista de Visitante (Solo Login Screen)
  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  return (
    <div className="min-h-screen bg-[#080d16] text-slate-100 flex flex-col font-sans">
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenAiDrawer={() => setIsAiDrawerOpen(true)}
        connectionStatus={connectionStatus}
      />

      {/* Main Container */}
      <main className="flex-grow max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Tab 1: Monitoreo & Cartografía Operativa */}
        {activeTab === 'monitoring' && (
          <div className="space-y-5 animate-in fade-in duration-150">
            {/* KPIs */}
            <KpiCards kpis={kpis} loading={loading} />

            {/* Barra Unificada de Filtros */}
            <FiltersBar
              timeRange={timeRange}
              onTimeRangeChange={setTimeRange}
              minMagnitude={minMagnitude}
              onMinMagnitudeChange={setMinMagnitude}
              searchRegion={searchRegion}
              onSearchRegionChange={setSearchRegion}
              onlyTsunami={onlyTsunami}
              onOnlyTsunamiChange={setOnlyTsunami}
              onRefresh={loadDashboardData}
              loading={loading}
            />

            {/* Zona de Operaciones: Mapa (60%) + Feed en Vivo (40%) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              <div className="lg:col-span-7 w-full">
                <SeismicMap
                  events={events}
                  anomalies={anomalies}
                  selectedEvent={selectedEvent}
                  onSelectEvent={setSelectedEvent}
                />
              </div>

              <div className="lg:col-span-5 w-full">
                <LiveEventsFeed
                  events={events}
                  connectionStatus={connectionStatus}
                  selectedEventId={selectedEvent?.id}
                  onSelectEvent={setSelectedEvent}
                />
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Análisis & Gráficos */}
        {activeTab === 'analytics' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            <AnalyticsCharts stats={stats} loading={loading} />

            <EventsTable
              events={events}
              total={totalEvents}
              page={page}
              limit={15}
              totalPages={totalPages}
              onPageChange={setPage}
              loading={loading}
            />
          </div>
        )}

        {/* Tab 3: Reportes Ejecutivos */}
        {activeTab === 'reports' && (
          <div className="animate-in fade-in duration-150">
            <AiReportCard report={report} loading={loading} />
          </div>
        )}

        {/* Tab 4: Estado del Pipeline (Resumen para Viewer / Detalle) */}
        {activeTab === 'pipeline' && (
          <div className="animate-in fade-in duration-150">
            <PipelineHealthPanel kpis={kpis} />
          </div>
        )}

        {/* Tab 5: Auditoría & Cuarentena (Exclusivo Administrador) */}
        {activeTab === 'admin_audit' && isAdmin && (
          <div className="animate-in fade-in duration-150">
            <AdminAuditPanel />
          </div>
        )}
      </main>

      {/* Lateral Slide-Over Drawer: Asistente IA (Text-to-SQL) */}
      <AiChatDrawer
        isOpen={isAiDrawerOpen}
        onClose={() => setIsAiDrawerOpen(false)}
      />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
};

export default App;
