import React, { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { api } from './services/api';
import { connectSSE, SSEConnectionStatus } from './services/sse';
import { EarthquakeEvent, KpiData, StatsResponse, AiReport, SeismicAnomaly } from './types';
import { Navbar, MainNavTab } from './components/Navbar';
import { HomePage } from './components/HomePage';
import { LoginModal } from './components/LoginModal';
import { TsunamiBanner } from './components/TsunamiBanner';
import { KpiCards } from './components/KpiCards';
import { FiltersBar } from './components/FiltersBar';
import { TacticalMap } from './components/TacticalMap';
import { SeismicGlobe3D } from './components/SeismicGlobe3D';
import { Globe2, Map, Bot, Sparkles } from 'lucide-react';
import { LiveEventsFeed } from './components/LiveEventsFeed';
import { AnalyticsCharts } from './components/AnalyticsCharts';
import { EventsTable } from './components/EventsTable';
import { AiReportCard } from './components/AiReportCard';
import { PipelineHealthPanel } from './components/PipelineHealthPanel';
import { AdminAuditPanel } from './components/AdminAuditPanel';
import { AiChatDrawer } from './components/AiChatDrawer';
import { computeHubImpacts } from './data/superAppHubs';

const MainApp: React.FC = () => {
  const { token, isAuthenticated, isAdmin, showLoginModal, setShowLoginModal } = useAuth();
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
  const [cartographyMode, setCartographyMode] = useState<'3d' | '2d'>('3d');

  // Hubs Logísticos de SuperApp en riesgo sísmico
  const hubAlertsCount = React.useMemo(() => {
    return computeHubImpacts(events).filter((h) => h.status !== 'OPERATIVO').length;
  }, [events]);

  // Strict RBAC Navigation Guard: Viewer must NEVER stay on admin_audit
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
      console.error('Error fetching operational data', err);
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

  // 1. Visitante Sin Sesión: Muestra la Landing Page Human-Crafted y permite abrir el Login
  if (!isAuthenticated) {
    return (
      <>
        <HomePage onOpenLogin={() => setShowLoginModal(true)} />
        <LoginModal
          isOpen={showLoginModal}
          onClose={() => setShowLoginModal(false)}
        />
      </>
    );
  }

  // 2. Usuario Autenticado (Viewer o Admin): Consola Operativa Completa
  return (
    <div className="min-h-screen bg-[#120e0d] text-[#ececf1] flex flex-col font-sans selection:bg-[#844dea]/30 selection:text-[#d5c4fb]">
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
            {/* Tsunami Emergency Banner (Only triggers when active alerts exist) */}
            <TsunamiBanner
              alertsCount={kpis?.tsunami_alerts_count || 0}
              events={events}
            />

            {/* Tactical Operational KPIs */}
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

            {/* Selector de Cartografía: Globo 3D (Default) vs Mapa 2D Satelital */}
            <div className="flex items-center justify-between bg-[#1b1514] border border-[#2d2421] p-2.5 px-4 rounded-xl text-xs shadow-sm">
              <div className="flex items-center gap-2.5">
                <span className="text-[#a8a29e] font-medium hidden sm:inline">Visualización Geoespacial:</span>
                <div className="flex items-center bg-[#120e0d] p-0.5 rounded-lg border border-[#2d2421]">
                  <button
                    onClick={() => setCartographyMode('3d')}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                      cartographyMode === '3d'
                        ? 'bg-[#844dea] text-white shadow-md'
                        : 'text-[#a8a29e] hover:text-[#ececf1]'
                    }`}
                  >
                    <Globe2 className="w-3.5 h-3.5" />
                    <span>Globo 3D Táctico (WebGL)</span>
                  </button>
                  <button
                    onClick={() => setCartographyMode('2d')}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                      cartographyMode === '2d'
                        ? 'bg-[#844dea] text-white shadow-md'
                        : 'text-[#a8a29e] hover:text-[#ececf1]'
                    }`}
                  >
                    <Map className="w-3.5 h-3.5" />
                    <span>Mapa 2D (Satélite Esri)</span>
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {hubAlertsCount > 0 ? (
                  <span className="flex items-center gap-1.5 text-[11px] font-mono font-medium text-rose-300 bg-rose-500/15 border border-rose-500/30 px-2.5 py-1 rounded-md animate-pulse">
                    🚨 {hubAlertsCount} Hub(s) en Riesgo Sísmico
                  </span>
                ) : (
                  <span className="hidden sm:flex items-center gap-1.5 text-[11px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-1 rounded-md">
                    🏢 Red SuperApp Activa (10 Hubs)
                  </span>
                )}
                <span className="text-[11px] text-[#78716c] font-mono hidden md:inline">
                  {cartographyMode === '3d' ? '✦ Render 3D con ondas concéntricas y balizas láser' : '✦ Cartografía vectorial de precisión GIS'}
                </span>
              </div>
            </div>

            {/* Zona de Operaciones: Cartografía Táctica + Feed Reciente */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              <div className="lg:col-span-7 w-full">
                {cartographyMode === '3d' ? (
                  <SeismicGlobe3D
                    events={events}
                    anomalies={anomalies}
                    selectedEvent={selectedEvent}
                    onSelectEvent={setSelectedEvent}
                  />
                ) : (
                  <TacticalMap
                    events={events}
                    anomalies={anomalies}
                    selectedEvent={selectedEvent}
                    onSelectEvent={setSelectedEvent}
                  />
                )}
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

      {/* Floating Action Button Bubble (Pregúntale a SismoBot) */}
      {!isAiDrawerOpen && (
        <div className="fixed bottom-6 right-6 z-40 flex items-center gap-3 animate-in fade-in duration-200">
          <button
            onClick={() => setIsAiDrawerOpen(true)}
            className="hidden sm:flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#1a1413]/95 backdrop-blur-md border border-[#2d2421] text-xs font-semibold text-[#ececf1] shadow-xl hover:shadow-2xl hover:border-[#844dea]/60 hover:text-[#d5c4fb] transition-all cursor-pointer group"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#844dea] group-hover:rotate-12 transition-transform" />
            <span>Pregúntale a SismoBot</span>
          </button>

          <button
            onClick={() => setIsAiDrawerOpen(true)}
            aria-label="Abrir asistente SismoBot"
            className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-xl bg-gradient-to-tr from-[#6b35d6] via-[#844dea] to-[#a855f7] text-white shadow-[#844dea]/30 hover:shadow-[#844dea]/50 hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer border border-[#c084fc]/30 group"
          >
            <div className="relative">
              <Bot className="w-6 h-6 group-hover:scale-110 transition-transform" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#86efac] border-2 border-[#120e0d] animate-pulse" />
            </div>
          </button>
        </div>
      )}

      {/* Lateral Slide-Over Drawer: Asistente IA (Text-to-SQL + AST Guard) */}
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
