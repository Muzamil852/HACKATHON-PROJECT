import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MapContainer, TileLayer, Circle, Popup } from 'react-leaflet';
import L from 'leaflet';
import { motion } from 'framer-motion';
import { Radar, Zap, AlertTriangle, ArrowRight, MapPin, Building, Loader2 } from 'lucide-react';
import { getHotspots } from '../api/hotspots';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Skeleton from '../components/ui/Skeleton';
import ComplaintDetailDrawer from '../components/complaints/ComplaintDetailDrawer';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

export default function HotspotsPage() {
  const [selectedComplaintId, setSelectedComplaintId] = useState(null);
  const [activeFilter, setActiveFilter] = useState(null);

  const { data: hotspots = [], isLoading } = useQuery({
    queryKey: ['hotspots'],
    queryFn: getHotspots,
    refetchInterval: 20000,
  });

  const filteredHotspots = activeFilter
    ? hotspots.filter((h) => h.severity === activeFilter || h.category === activeFilter)
    : hotspots;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <Radar className="w-7 h-7 text-blue-600" />
            Civic Radar — Hotspot Intelligence
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time spatial clustering and emerging incident hotspots across Karachi municipal zones.
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={() => setActiveFilter(null)}
            className={`px-3 py-1.5 rounded-xl border transition-colors ${
              !activeFilter
                ? 'bg-blue-50 text-blue-700 border-blue-200 font-bold'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            All Hotspots ({hotspots.length})
          </button>
          <button
            onClick={() => setActiveFilter('SEVERE')}
            className={`px-3 py-1.5 rounded-xl border transition-colors ${
              activeFilter === 'SEVERE'
                ? 'bg-red-50 text-red-700 border-red-200 font-bold'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            Severe ({hotspots.filter((h) => h.severity === 'SEVERE').length})
          </button>
          <button
            onClick={() => setActiveFilter('MODERATE')}
            className={`px-3 py-1.5 rounded-xl border transition-colors ${
              activeFilter === 'MODERATE'
                ? 'bg-amber-50 text-amber-800 border-amber-200 font-bold'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            Moderate ({hotspots.filter((h) => h.severity === 'MODERATE').length})
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" style={{ height: '540px' }}>
        {/* Map */}
        <Card className="lg:col-span-2 h-full flex flex-col p-0 overflow-hidden relative border-slate-200">
          <div className="absolute top-3 left-3 z-[400] pointer-events-none">
            <div className="bg-white/90 backdrop-blur-xs px-3 py-2 rounded-xl border border-slate-200 shadow-sm flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-600" />
              <span className="text-xs font-bold text-slate-900">Active Spatial Radar</span>
            </div>
          </div>

          <div className="flex-1 w-full bg-slate-100">
            {isLoading ? (
              <div className="h-full flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
              </div>
            ) : (
              <MapContainer center={[24.87, 67.05]} zoom={12} style={{ height: '100%', width: '100%' }} zoomControl={false}>
                <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />

                {filteredHotspots.map((h) => (
                  <Circle
                    key={h.id}
                    center={[h.latitude, h.longitude]}
                    radius={h.radius_meters || 500}
                    pathOptions={{
                      color: h.severity === 'SEVERE' ? '#dc2626' : h.severity === 'MODERATE' ? '#d97706' : '#2563eb',
                      fillColor: h.severity === 'SEVERE' ? '#dc2626' : h.severity === 'MODERATE' ? '#d97706' : '#2563eb',
                      fillOpacity: 0.25,
                      weight: 2,
                    }}
                  >
                    <Popup>
                      <div className="p-2 min-w-[220px] text-xs space-y-1">
                        <div className="font-bold text-sm flex items-center justify-between text-slate-900">
                          <span>🔴 {h.severity} Hotspot</span>
                          <span className="text-blue-600 font-mono">+{h.growth_rate}%</span>
                        </div>
                        <div className="text-slate-700 font-medium">{h.category} in {h.area || 'Karachi'}</div>
                        <div className="text-slate-500">Reports: {h.report_count} (Critical: {h.critical_count})</div>
                        <div className="text-blue-800 font-semibold pt-1 border-t border-slate-100">{h.ai_recommendation}</div>
                      </div>
                    </Popup>
                  </Circle>
                ))}
              </MapContainer>
            )}
          </div>
        </Card>

        {/* Hotspots Dossier */}
        <Card className="flex flex-col overflow-hidden border-slate-200">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-3 flex items-center justify-between">
            <span>Cluster Intelligence</span>
            <span className="text-slate-400 font-normal">{filteredHotspots.length} detected</span>
          </h2>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {isLoading ? (
              Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-28 w-full" />)
            ) : filteredHotspots.length > 0 ? (
              filteredHotspots.map((h, i) => (
                <motion.div
                  key={h.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="p-4 rounded-xl bg-slate-50 border border-slate-200 hover:border-blue-400 transition-all space-y-2 group"
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                      h.severity === 'SEVERE' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-amber-50 text-amber-800 border border-amber-200'
                    }`}>
                      {h.severity}
                    </span>
                    <span className="text-xs font-mono font-bold text-blue-600">+{h.growth_rate}% growth</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-900">{h.category} Cluster</h3>
                    <span className="text-xs text-slate-500 flex items-center gap-1 font-medium">
                      <MapPin className="w-3 h-3 text-slate-400" /> {h.area || 'Karachi'}
                    </span>
                  </div>

                  <p className="text-xs text-slate-700 line-clamp-2 leading-relaxed font-medium">{h.ai_recommendation}</p>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 text-[11px]">
                    <span className="text-slate-500 font-medium">
                      <strong>{h.report_count}</strong> reports ({h.critical_count} critical)
                    </span>
                    {h.complaint_ids && h.complaint_ids.length > 0 && (
                      <button
                        onClick={() => setSelectedComplaintId(h.complaint_ids[0])}
                        className="text-blue-600 group-hover:text-blue-800 font-bold flex items-center gap-1 hover:underline"
                      >
                        Inspect ticket <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs">
                No active hotspots matching filter.
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Complaint Detail Drawer */}
      {selectedComplaintId && (
        <ComplaintDetailDrawer
          complaintId={selectedComplaintId}
          onClose={() => setSelectedComplaintId(null)}
        />
      )}
    </div>
  );
}
