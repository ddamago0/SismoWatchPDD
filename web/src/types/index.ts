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
  felt: number | null;
  cdi: number | null;
  mmi: number | null;
  alert: string | null;
  status: string;
  tsunami: number;
  sig: number;
  net: string;
  code: string;
  sources: string;
  nst: number | null;
  dmin: number | null;
  rms: number | null;
  gap: number | null;
  mag_type: string;
  type: string;
  title: string;
  longitude: number;
  latitude: number;
  depth_km: number;
  ingestion_timestamp: string;
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
  max_magnitude_24h: number | null;
  avg_magnitude_24h: number | null;
  tsunami_alerts_24h: number;
  high_energy_count_24h: number;
  data_quality_score: number;
  last_updated: string;
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
  question?: string | null;
  executed_sql: string;
  columns: string[];
  data: Record<string, any>[];
  row_count: number;
}
