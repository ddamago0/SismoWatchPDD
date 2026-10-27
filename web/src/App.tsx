import React, { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { api } from './services/api';
import { connectSSE, SSEConnectionStatus } from './services/sse';
import { EarthquakeEvent, KpiData, StatsResponse, AiReport, SeismicAnomaly } from './types';
import { Navbar } from './components/Navbar';
import { KpiCards } from './components/KpiCards';
import { FiltersBar } from './components/FiltersBar';
import { SeismicMap } from './components/SeismicMap';
import { LiveEventsFeed } from './components/LiveEventsFeed';
import { AnalyticsCharts } from './components/AnalyticsCharts';
import { EventsTable } from './components/EventsTable';
import { AiReportCard } from './components/AiReportCard';
import { QualityPanel } from './components/QualityPanel';
import { LineagePanel } from './components/LineagePanel';
import { AiQueryModal } from './components/AiQueryModal';
import { LoginModal } from './components/LoginModal';
import { LandingPage } from './components/LandingPage';
import { BarChart3, Bot, ShieldCheck, ListFilter } from 'lucide-react';

const DashboardContent: React.FC = () => {
  const { token, isAuthenticated, setShowLoginModal } = useAuth();
  const [connectionStatus, setConnectionStatus] = useState<SSEConnectionStatus>('disconnected');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'lineage'>('dashboard');
  const [activeAnalyticsSubTab, setActiveAnalyticsSubTab] = useState<'charts' | 'ai' | 'quality' | 'table'>('charts');
  const [isAiQueryOpen, setIsAiQueryOpen] = useState(false);

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
    loadDashboardData();
  }, [loadDashboardData]);

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

  // If user is not authenticated, render visitor Landing Page
  if (!isAuthenticated) {
    return (
      <>
        <LandingPage onOpenLogin={() => setShowLoginModal(true)} />
        <LoginModal />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-dark-950 text-slate-100 flex flex-col font-sans">
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenAiQuery={() => setIsAiQueryOpen(true)}
        connectionStatus={connectionStatus}
      />

      {/* Main Container */}
      <main className="flex-grow max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {activeTab === 'lineage' ? (
          <LineagePanel />
        ) : (
          <>
            {/* 1. Hero / Resumen: KPIs Esenciales */}
            <KpiCards kpis={kpis} loading={loading} />

            {/* 2. Barra Unificada de Filtros */}
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

            {/* 3. Zona de Operaciones: Mapa (60%) + Feed en Vivo (40%) */}
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

            {/* 4. Sección Analítica Consolidada con Sub-Tabs */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-2 border-b border-white/10 pb-3">
                <button
                  onClick={() => setActiveAnalyticsSubTab('charts')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all ${
                    activeAnalyticsSubTab === 'charts'
                      ? 'bg-cobalt-500 text-white shadow-glow-cobalt'
                      : 'bg-dark-900 text-slate-400 hover:text-white border border-white/5'
                  }`}
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  <span>Distribución & Tendencias</span>
                </button>

                <button
                  onClick={() => setActiveAnalyticsSubTab('ai')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all ${
                    activeAnalyticsSubTab === 'ai'
                      ? 'bg-cobalt-500 text-white shadow-glow-cobalt'
                      : 'bg-dark-900 text-slate-400 hover:text-white border border-white/5'
                  }`}
                >
                  <Bot className="w-3.5 h-3.5" />
                  <span>Boletín Ejecutivo IA</span>
                </button>

                <button
                  onClick={() => setActiveAnalyticsSubTab('quality')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all ${
                    activeAnalyticsSubTab === 'quality'
                      ? 'bg-cobalt-500 text-white shadow-glow-cobalt'
                      : 'bg-dark-900 text-slate-400 hover:text-white border border-white/5'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Quality Gate & Cuarentena</span>
                </button>

                <button
                  onClick={() => setActiveAnalyticsSubTab('table')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all ${
                    activeAnalyticsSubTab === 'table'
                      ? 'bg-cobalt-500 text-white shadow-glow-cobalt'
                      : 'bg-dark-900 text-slate-400 hover:text-white border border-white/5'
                  }`}
                >
                  <ListFilter className="w-3.5 h-3.5" />
                  <span>Registro Tabular ({totalEvents})</span>
                </button>
              </div>

              {/* Sub-tab views */}
              {activeAnalyticsSubTab === 'charts' && (
                <AnalyticsCharts stats={stats} loading={loading} />
              )}

              {activeAnalyticsSubTab === 'ai' && (
                <AiReportCard report={report} loading={loading} />
              )}

              {activeAnalyticsSubTab === 'quality' && (
                <QualityPanel />
              )}

              {activeAnalyticsSubTab === 'table' && (
                <EventsTable
                  events={events}
                  total={totalEvents}
                  page={page}
                  limit={15}
                  totalPages={totalPages}
                  onPageChange={setPage}
                  loading={loading}
                />
              )}
            </div>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-4 px-6 text-center text-xs font-mono text-slate-500 bg-dark-950">
        SismoWatch PDD &bull; Arquitectura Medallion &bull; PostgreSQL 16 &bull; Airflow 2.8.1 &bull; FastAPI SSE &bull; React 18 Leaflet
      </footer>

      {/* Modals */}
      <AiQueryModal isOpen={isAiQueryOpen} onClose={() => setIsAiQueryOpen(false)} />
      <LoginModal />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <DashboardContent />
    </AuthProvider>
  );
};

export default App;
