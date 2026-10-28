import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import {
  Database,
  RefreshCw,
  Workflow,
} from 'lucide-react';

interface LineageNode {
  id: string;
  name: string;
  layer: 'source' | 'bronze' | 'silver' | 'quality' | 'gold' | 'analytics';
  category: string;
  description: string;
  records?: number;
  policy?: string;
  status: string;
  protocol?: string;
}

// Fallback architectural architecture metadata model
const FALLBACK_LINEAGE_NODES: LineageNode[] = [
  {
    id: 'usgs_source',
    name: 'USGS Real-Time Feed',
    layer: 'source',
    category: 'Fuente Externa',
    description: 'Feed GeoJSON all_hour.geojson • Ingesta cada 5 min por Airflow',
    protocol: 'HTTPS REST / GeoJSON',
    status: 'ONLINE',
  },
  {
    id: 'bronze_raw',
    name: 'raw.usgs_earthquakes_raw',
    layer: 'bronze',
    category: 'Bronze • Crudo',
    description: 'Payload GeoJSON crudo en formato JSONB con timestamp de ingesta',
    policy: 'ON CONFLICT (id) DO UPDATE',
    status: 'HEALTHY',
    records: 19,
  },
  {
    id: 'silver_staging',
    name: 'staging.earthquakes_staging',
    layer: 'silver',
    category: 'Silver • Normalizado',
    description: 'Aplanado tabular, coordenadas numéricas y marcas temporales UTC',
    status: 'HEALTHY',
    records: 19,
  },
  {
    id: 'quality_gate',
    name: 'Pandera Quality Gate',
    layer: 'quality',
    category: 'Quality Gate Bloqueante',
    description: 'Validación estricta de coordenadas en rangos globales, magnitud y frescura',
    status: 'ACTIVE',
    records: 19,
  },
  {
    id: 'quarantine',
    name: 'curated.quality_quarantine',
    layer: 'gold',
    category: 'Aislamiento de Calidad',
    description: 'Registros corruptos desviados automáticamente con motivo de rechazo',
    status: 'ISOLATED',
    records: 2,
  },
  {
    id: 'gold_curated',
    name: 'curated.earthquakes_curated',
    layer: 'gold',
    category: 'Gold • Certificado',
    description: 'Hechos sísmicos 100% verificados, indexados y particionados',
    policy: 'ON CONFLICT (id) DO UPDATE',
    status: 'CERTIFIED',
    records: 17,
  },
  {
    id: 'analytics_swarms',
    name: 'curated.seismic_anomalies',
    layer: 'analytics',
    category: 'Analítica Espacio-Temporal',
    description: 'Clustering geodésico Haversine • Enjambres con 3 o más eventos en radio de 75 km y Z-score',
    status: 'HEALTHY',
    records: 1,
  },
  {
    id: 'ai_reports',
    name: 'curated.ai_reports',
    layer: 'analytics',
    category: 'Reportes Ejecutivos IA',
    description: 'Resumen narrativo con Gemini y Groq con validador numérico anti-alucinación',
    status: 'HEALTHY',
    records: 4,
  },
];

export const LineagePanel: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [isUsingFallback, setIsUsingFallback] = useState(false);
  const [selectedNode, setSelectedNode] = useState<LineageNode | null>(FALLBACK_LINEAGE_NODES[3]);

  const fetchLineage = async () => {
    setLoading(true);
    try {
      const res = await api.getLineage();
      setData(res);
      setIsUsingFallback(false);
    } catch {
      setIsUsingFallback(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLineage();
  }, []);

  const reconciliation = data?.reconciliation || {
    equation: 'N_raw = N_curated + N_quarantine + N_duplicates',
    total_curated: 17,
    total_quarantined: 2,
    quality_score_pct: 100.0,
    freshness_lag_seconds: 3600,
  };

  const nodes: LineageNode[] = data?.nodes || FALLBACK_LINEAGE_NODES;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner & Reconciliation Formula */}
      <div className="p-6 bg-[#171211] rounded-2xl border border-[#261f1c] relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#261f1c] pb-5 mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#241a2e] text-[#d5c4fb] rounded-xl border border-[#4a365f]/40">
              <Workflow className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-[#f7f7f9] tracking-tight">
                  Gobernanza y Linaje de Datos Medallion
                </h2>
                {isUsingFallback && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-[#292214] text-[#fde047] border border-[#4a3b1d]/60">
                    MODO ARQUITECTÓNICO RESILIENTE
                  </span>
                )}
              </div>
              <p className="text-xs text-[#9b9baa] font-mono">
                Trazabilidad determinista desde la API de USGS hasta el consumo analítico en Gold
              </p>
            </div>
          </div>

          <button
            onClick={fetchLineage}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#1f1715] hover:bg-[#281e1b] text-xs font-mono font-medium text-[#ececf1] border border-[#2b211e] transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#d5c4fb]' : ''}`} />
            <span>{loading ? 'Sincronizando...' : 'Refrescar Grafo'}</span>
          </button>
        </div>

        {/* Ecuación de Conciliación Matemática */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3.5 bg-[#120e0d] rounded-xl border border-[#241c19] flex flex-col justify-between h-full min-h-[96px]">
            <span className="text-[10px] font-mono font-medium uppercase tracking-wider text-[#9b9baa]">
              Ecuación de Conciliación
            </span>
            <div className="text-xs font-mono font-semibold text-[#f87171] mt-1">
              {reconciliation.equation || 'N_raw = N_curated + N_quarantine'}
            </div>
            <div className="text-[10px] text-[#9b9baa] mt-0.5">Tolerancia cero a pérdida de datos</div>
          </div>

          <div className="p-3.5 bg-[#120e0d] rounded-xl border border-[#241c19] flex flex-col justify-between h-full min-h-[96px]">
            <span className="text-[10px] font-mono font-medium uppercase tracking-wider text-[#9b9baa]">
              Capa Gold • Certificados
            </span>
            <div className="text-xl font-mono font-bold text-[#86efac] mt-1">
              {reconciliation.total_curated ?? 17} sismos
            </div>
            <div className="text-[10px] text-[#9b9baa] mt-0.5">Disponibles para consulta en la API</div>
          </div>

          <div className="p-3.5 bg-[#120e0d] rounded-xl border border-[#241c19] flex flex-col justify-between h-full min-h-[96px]">
            <span className="text-[10px] font-mono font-medium uppercase tracking-wider text-[#9b9baa]">
              Aislados en Cuarentena
            </span>
            <div className="text-xl font-mono font-bold text-[#fde047] mt-1">
              {reconciliation.total_quarantined ?? 2} registros
            </div>
            <div className="text-[10px] text-[#9b9baa] mt-0.5">Rechazados por Pandera Guard</div>
          </div>

          <div className="p-3.5 bg-[#120e0d] rounded-xl border border-[#241c19] flex flex-col justify-between h-full min-h-[96px]">
            <span className="text-[10px] font-mono font-medium uppercase tracking-wider text-[#9b9baa]">
              Índice de Calidad
            </span>
            <div className="text-xl font-mono font-bold text-[#d5c4fb] mt-1">
              {reconciliation.quality_score_pct ?? 100}%
            </div>
            <div className="text-[10px] text-[#9b9baa] mt-0.5">Conformidad estricta de esquemas</div>
          </div>
        </div>
      </div>

      {/* Visual Pipeline Graph & Interactive Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Nodes Grid (8 cols) */}
        <div className="lg:col-span-8 bg-[#171211] p-5 rounded-2xl border border-[#261f1c] space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-mono font-semibold text-[#f7f7f9] uppercase tracking-wider">
              Flujo Dirigido de Transformación y Enrutamiento &bull; DAG Medallion
            </h3>
            <span className="text-[10px] font-mono text-[#9b9baa]">Haz clic en un nodo para auditar</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {nodes.map((node) => {
              const isSelected = selectedNode?.id === node.id;
              let badgeColor = 'bg-[#241a2e] text-[#d5c4fb] border-[#4a365f]/50';
              if (node.layer === 'bronze') badgeColor = 'bg-[#292214] text-[#fde047] border-[#4a3b1d]/60';
              if (node.layer === 'silver') badgeColor = 'bg-[#201a18] text-[#ececf1] border-[#332b27]';
              if (node.layer === 'quality') badgeColor = 'bg-[#241a2e] text-[#d5c4fb] border-[#4a365f]/50';
              if (node.layer === 'gold') badgeColor = 'bg-[#14231b] text-[#86efac] border-[#234231]/60';
              if (node.layer === 'analytics') badgeColor = 'bg-[#2b1418] text-[#f87171] border-[#4f2026]/70';

              return (
                <div
                  key={node.id}
                  onClick={() => setSelectedNode(node)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all duration-150 flex flex-col justify-between h-full min-h-[140px] ${
                    isSelected
                      ? 'bg-[#241a2e] border-[#844dea]'
                      : 'bg-[#120e0d] hover:bg-[#1a1413] border-[#241c19] hover:border-[#332b27]'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-medium uppercase border ${badgeColor}`}>
                        {node.category}
                      </span>
                      <span className="text-[10px] font-mono text-[#86efac] font-medium flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#86efac] animate-pulse" />
                        {node.status}
                      </span>
                    </div>

                    <h4 className="text-xs font-mono font-semibold text-[#f7f7f9] truncate mb-1">{node.name}</h4>
                    <p className="text-[11px] text-[#9b9baa] line-clamp-2 leading-relaxed">{node.description}</p>
                  </div>

                  {node.records !== undefined && (
                    <div className="mt-2.5 pt-2 border-t border-[#241c19] flex items-center justify-between text-[10px] font-mono text-[#9b9baa]">
                      <span>Registros:</span>
                      <span className="font-semibold text-[#ececf1]">{node.records} filas</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Node Inspector (4 cols) */}
        <div className="lg:col-span-4 bg-[#171211] p-5 rounded-2xl border border-[#261f1c] flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono font-semibold text-[#d5c4fb] uppercase tracking-wider mb-4 pb-2 border-b border-[#261f1c]">
              <Database className="w-4 h-4" />
              <span>Inspector de Capa y Políticas</span>
            </div>

            {selectedNode ? (
              <div className="space-y-4">
                <div>
                  <span className="text-[10px] font-mono text-[#9b9baa] uppercase">Nodo Seleccionado</span>
                  <h4 className="text-sm font-mono font-semibold text-[#f7f7f9] mt-0.5">{selectedNode.name}</h4>
                  <p className="text-xs text-[#9b9baa] mt-1 leading-relaxed">{selectedNode.description}</p>
                </div>

                <div className="p-3 bg-[#120e0d] rounded-xl border border-[#241c19] space-y-2 text-xs font-mono">
                  <div className="flex justify-between">
                    <span className="text-[#9b9baa]">Capa:</span>
                    <span className="text-[#ececf1] uppercase font-semibold">{selectedNode.layer}</span>
                  </div>
                  {selectedNode.protocol && (
                    <div className="flex justify-between">
                      <span className="text-[#9b9baa]">Protocolo:</span>
                      <span className="text-[#ececf1]">{selectedNode.protocol}</span>
                    </div>
                  )}
                  {selectedNode.policy && (
                    <div className="flex justify-between">
                      <span className="text-[#9b9baa]">Idempotencia:</span>
                      <span className="text-[#86efac]">{selectedNode.policy}</span>
                    </div>
                  )}
                  {selectedNode.records !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-[#9b9baa]">Volumen Auditado:</span>
                      <span className="text-[#d5c4fb] font-semibold">{selectedNode.records} registros</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-[#9b9baa]">Estado de Salud:</span>
                    <span className="text-[#86efac] font-medium">{selectedNode.status}</span>
                  </div>
                </div>

                <div className="p-3 bg-[#120e0d] rounded-xl border border-[#241c19] text-[11px] text-[#9b9baa] space-y-1">
                  <div className="font-semibold text-[#ececf1] mb-1">Criterio de Aceptación:</div>
                  <p>
                    {selectedNode.layer === 'quality'
                      ? 'Rechazo inmediato de latitudes fuera de [-90, 90] o profundidades anómalas sin frenar la ingesta global.'
                      : selectedNode.layer === 'gold'
                      ? 'Solo datos limpios con índice Pandera verificado son accesibles por el rol sismo_reader.'
                      : 'Preservación íntegra de la fuente cruda en JSONB para auditoría y reconstrucción histórica.'}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-[#9b9baa] font-mono">Selecciona un nodo del grafo para ver su detalle.</p>
            )}
          </div>

          <div className="pt-4 border-t border-[#261f1c] text-[10px] font-mono text-[#9b9baa] flex items-center justify-between">
            <span>Segregación RBAC Activa</span>
            <span className="text-[#86efac] font-semibold">MÍNIMO PRIVILEGIO</span>
          </div>
        </div>
      </div>
    </div>
  );
};
