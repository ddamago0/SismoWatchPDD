export interface User {
  username: string;
  role: 'admin' | 'viewer';
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  role: 'admin' | 'viewer';
  username: string;
}

export interface EarthquakeEvent {
  id: string;
  mag: number;
  place: string;
  time: string;
  updated: string;
  url: string;
  detail: string;
  felt?: number | null;
  cdi?: number | null;
  mmi?: number | null;
  alert?: string | null;
  status: string;
  tsunami: number;
  sig: number;
  net: string;
  code: string;
  sources?: string;
  mag_type: string;
  type: string;
  title: string;
  longitude: number;
  latitude: number;
  depth_km: number;
  is_validated?: boolean;
  batch_id?: string;
  curated_at?: string;
}

export interface EventsResponse {
  total: number;
  page: number;
  limit: number;
  total_pages: number;
  events: EarthquakeEvent[];
}

export interface KpiData {
  total_events_24h: number;
  max_magnitude: number | null;
  max_magnitude_24h?: number | null;
  avg_magnitude: number | null;
  avg_magnitude_24h?: number | null;
  tsunami_alerts_count: number;
  tsunami_alerts_24h?: number;
  quality_score: number;
  data_quality_score?: number;
  latest_update?: string;
  last_updated?: string;
}

export interface TimelinePoint {
  time_bucket: string;
  count: number;
  avg_magnitude: number;
  max_magnitude: number;
}

export interface MagnitudeBucket {
  bucket: string;
  count: number;
}

export interface RegionCount {
  region: string;
  count: number;
  avg_magnitude: number;
}

export interface StatsResponse {
  timeline: TimelinePoint[];
  magnitude_distribution: MagnitudeBucket[];
  top_regions: RegionCount[];
}

export interface AiReport {
  id: number;
  report_date: string;
  summary_text: string;
  total_earthquakes: number;
  max_magnitude: number;
  anomalies_detected: number;
  provider: 'gemini' | 'groq' | 'template';
  model_name: string;
  validation_passed: boolean;
  created_at: string;
}

export interface QuarantineRecord {
  quarantine_id: number;
  event_id: string;
  raw_payload: any;
  rejection_reason: string;
  rule_failed: string;
  batch_id: string;
  failed_at: string;
}

export interface SqlQueryResult {
  sender?: string;
  reply?: string;
  question?: string | null;
  executed_sql?: string | null;
  columns?: string[];
  data?: Record<string, any>[];
  row_count?: number;
  provider_used?: string;
  status?: string;
}

export interface SeismicAnomaly {
  id: number;
  type: string;
  region: string;
  event_id?: string;
  cluster_size?: number;
  latitude?: number;
  longitude?: number;
  radius_km?: number;
  z_score?: number;
  max_magnitude?: number;
  severity: string;
  explanation: string;
  detected_at: string;
}
