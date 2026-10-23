import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  AlertTriangle, Clock, Target, CheckCircle2, Zap, ArrowRight, Loader2, 
  Radar, BarChart3, MapPin, Search, Filter, X, Eye, ChevronRight,
  Sparkles, RefreshCw, AlertCircle, ShieldAlert, TrendingUp, Brain, FileText,
  SlidersHorizontal
} from 'lucide-react';
import { getDashboardSummary, getDailyBriefing } from '../api/dashboard';
import { getComplaints, smartSearchComplaints } from '../api/complaints';
import { getHotspots } from '../api/hotspots';

import KpiCard from '../components/ui/KpiCard';
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

const createIcon = (priority) => {
  const colors = { CRITICAL: '#dc2626', HIGH: '#d97706', MEDIUM: '#2563eb', LOW: '#16a34a' };
  const color = colors[priority] || '#64748b';
  return L.divIcon({
    className: '',
    html: `<div style="background:${color};width:12px;height:12px;border-radius:50%;border:2px solid #fff;box-shadow:0 2px 6px ${color}80;"></div>`,
    iconSize: [12, 12],
    iconAnchor: [6, 6],
  });
};

function formatTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function DashboardPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [selectedComplaintId, setSelectedComplaintId] = useState(() => searchParams.get('complaint_id') || null);
  const [priorityFilter, setPriorityFilter] = useState(() => searchParams.get('priority') || null);
  const [statusFilter, setStatusFilter] = useState(() => searchParams.get('status') || null);
  const [categoryFilter, setCategoryFilter] = useState(() => searchParams.get('category') || null);
  const [searchQuery, setSearchQuery] = useState(() => searchParams.get('search') || '');

  // AI Smart Search State
  const [smartSearchQuery, setSmartSearchQuery] = useState('');
  const [isSmartSearching, setIsSmartSearching] = useState(false);
  const [smartSearchResult, setSmartSearchResult] = useState(null);

  // AI Daily Operations Briefing State
  const [briefingData, setBriefingData] = useState(null);
  const [isGeneratingBriefing, setIsGeneratingBriefing] = useState(false);
  const [briefingError, setBriefingError] = useState(null);

  const handleGenerateBriefing = async () => {
    setIsGeneratingBriefing(true);
    setBriefingError(null);
    try {
      const data = await getDailyBriefing();
      setBriefingData(data);
    } catch (err) {
      console.error('Failed to fetch daily briefing:', err);
      setBriefingError('Unable to generate briefing right now.');
    } finally {
      setIsGeneratingBriefing(false);
    }
  };

  const scrollToReports = () => {
    setTimeout(() => {
      const el = document.getElementById('reports-section');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 50);
  };

  const handleKpiClick = (type) => {
    if (type === 'TOTAL') {
      clearAllFilters();
    } else if (type === 'CRITICAL') {
      setPriorityFilter('CRITICAL');
      setStatusFilter(null);
    } else if (type === 'HIGH') {
      setPriorityFilter('HIGH');
      setStatusFilter(null);
    } else if (type === 'OPEN') {
      setStatusFilter('OPEN');
      setPriorityFilter(null);
    } else if (type === 'RESOLVED') {
      setStatusFilter('RESOLVED');
      setPriorityFilter(null);
    }
    scrollToReports();
  };

  const handleSmartSearch = async (queryText) => {
    const q = queryText !== undefined ? queryText : smartSearchQuery;
    if (!q || !q.trim()) {
      setSmartSearchResult(null);
      return;
    }
    setSmartSearchQuery(q);
    setIsSmartSearching(true);
    try {
      const res = await smartSearchComplaints(q);
      setSmartSearchResult(res);
      scrollToReports();
    } catch (err) {
      console.error('Smart search failed:', err);
    } finally {
      setIsSmartSearching(false);
    }
  };

  const handleClearSmartSearch = () => {
    setSmartSearchQuery('');
    setSmartSearchResult(null);
  };

  const { data: summary, isLoading: loadingSummary } = useQuery({
    queryKey: ['dashboardSummary'],
    queryFn: getDashboardSummary,
    refetchInterval: 15000,
  });

  const { data: complaints = [], isLoading: loadingComplaints } = useQuery({
    queryKey: ['complaints'],
    queryFn: () => getComplaints({ limit: 100 }),
    refetchInterval: 15000,
  });

  const { data: hotspots = [], isLoading: loadingHotspots } = useQuery({
    queryKey: ['hotspots'],
    queryFn: getHotspots,
    refetchInterval: 20000,
  });

  // Single Source of Truth Filtered Reports
  const filteredComplaints = useMemo(() => {
    const source = smartSearchResult ? smartSearchResult.results : complaints;
    return source.filter((c) => {
      if (priorityFilter && c.priority !== priorityFilter) return false;
      if (statusFilter) {
        if (statusFilter === 'OPEN' && c.status === 'RESOLVED') return false;
        if (statusFilter === 'RESOLVED' && c.status !== 'RESOLVED') return false;
        if (statusFilter !== 'OPEN' && statusFilter !== 'RESOLVED' && c.status !== statusFilter) return false;
      }
      if (categoryFilter && c.category !== categoryFilter) return false;
      if (searchQuery.trim() && !smartSearchResult) {
        const q = searchQuery.toLowerCase();
        const matchDesc = c.description?.toLowerCase().includes(q);
        const matchId = c.complaint_id?.toLowerCase().includes(q);
        const matchLoc = c.location?.toLowerCase().includes(q);
        const matchCat = c.category?.toLowerCase().includes(q);
        if (!matchDesc && !matchId && !matchLoc && !matchCat) return false;
      }
      return true;
    });
  }, [complaints, smartSearchResult, priorityFilter, statusFilter, categoryFilter, searchQuery]);

  const urgentQueue = useMemo(() => {
    return complaints
      .filter((c) => c.status !== 'RESOLVED' && (c.priority === 'CRITICAL' || c.priority === 'HIGH'))
      .sort((a, b) => {
        if (a.priority === 'CRITICAL' && b.priority !== 'CRITICAL') return -1;
        if (b.priority === 'CRITICAL' && a.priority !== 'CRITICAL') return 1;
        return new Date(b.created_at || 0) - new Date(a.created_at || 0);
      });
  }, [complaints]);

  const clearAllFilters = () => {
    setPriorityFilter(null);
    setStatusFilter(null);
    setCategoryFilter(null);
    setSearchQuery('');
    setSmartSearchResult(null);
    setSmartSearchQuery('');
    setSearchParams({});
  };

  const activeFilterCount = (priorityFilter ? 1 : 0) + (statusFilter ? 1 : 0) + (categoryFilter ? 1 : 0) + (searchQuery ? 1 : 0) + (smartSearchResult ? 1 : 0);

  // Dynamic Section Heading Helper
  const headingInfo = useMemo(() => {
    const count = filteredComplaints.length;
    if (priorityFilter === 'CRITICAL') {
      return { title: 'REPORTS REQUIRING ATTENTION', badge: `${count} Critical Reports` };
    }
    if (priorityFilter === 'HIGH') {
      return { title: 'REPORTS REQUIRING ATTENTION', badge: `${count} High Priority Reports` };
    }
    if (statusFilter === 'OPEN') {
      return { title: 'OPEN REPORTS', badge: `${count} Open Reports` };
    }
    if (statusFilter === 'RESOLVED') {
      return { title: 'RESOLVED REPORTS', badge: `${count} Resolved Reports` };
    }
    if (categoryFilter) {
      return { title: `${categoryFilter} REPORTS`, badge: `${count} Reports` };
    }
    if (smartSearchResult) {
      return { title: 'SMART SEARCH INVESTIGATION', badge: `${count} Matching Reports` };
    }
    return { title: 'ALL CIVIC REPORTS', badge: `${count} Reports` };
  }, [filteredComplaints, priorityFilter, statusFilter, categoryFilter, smartSearchResult]);

  return (
    <div className="space-y-6 w-full max-w-full overflow-hidden">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <Radar className="w-6 h-6 text-blue-600 shrink-0" />
            Civic Operations
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">Real-time civic operations overview & municipal dispatch.</p>
        </div>

        {activeFilterCount > 0 && (
          <div className="flex flex-wrap items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 text-xs shadow-sm">
            <span className="text-slate-500 font-medium">Active Filters:</span>
            {smartSearchResult && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-purple-100 text-purple-800 border border-purple-200 font-bold">
                ✦ Smart Search: "{smartSearchQuery}"
                <X className="w-3 h-3 cursor-pointer hover:text-purple-950" onClick={handleClearSmartSearch} />
              </span>
            )}
            {priorityFilter && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-semibold">
                Priority: {priorityFilter}
                <X className="w-3 h-3 cursor-pointer hover:text-blue-900" onClick={() => setPriorityFilter(null)} />
              </span>
            )}
            {statusFilter && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-semibold">
                Status: {statusFilter}
                <X className="w-3 h-3 cursor-pointer hover:text-blue-900" onClick={() => setStatusFilter(null)} />
              </span>
            )}
            {categoryFilter && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200 font-semibold">
                Category: {categoryFilter}
                <X className="w-3 h-3 cursor-pointer hover:text-purple-900" onClick={() => setCategoryFilter(null)} />
              </span>
            )}
            <button
              onClick={clearAllFilters}
              className="text-xs text-red-600 hover:text-red-800 underline font-bold ml-1"
            >
              Clear Filter
            </button>
          </div>
        )}
      </div>

      {/* ── AI DAILY OPERATIONS BRIEFING PANEL ── */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-purple-50 border border-purple-200 text-purple-700 shrink-0 mt-0.5">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-1.5">
                  <span className="text-purple-600">✦</span> AI DAILY OPERATIONS BRIEFING
                </h2>
              </div>
              <p className="text-xs text-slate-500 font-medium">Your city's most important signals, summarized for action.</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {briefingData && !isGeneratingBriefing && (
              <span className="text-[11px] font-mono text-slate-400 font-medium hidden sm:inline">
                {briefingData.generated_at ? `Generated ${briefingData.generated_at}` : 'Generated just now'}
              </span>
            )}

            <button
              onClick={handleGenerateBriefing}
              disabled={isGeneratingBriefing}
              className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-4 py-2 rounded-xl text-xs transition-all shadow-xs flex items-center justify-center gap-2 shrink-0 disabled:opacity-50"
            >
              {isGeneratingBriefing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-400" />
                  <span>ANALYZING CIVIC ACTIVITY...</span>
                </>
              ) : briefingData ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 text-purple-400" />
                  <span>Refresh ↻</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-purple-400 fill-current" />
                  <span>Generate Today's Briefing</span>
                </>
              )}
            </button>
          </div>
        </div>

        {!briefingData && !isGeneratingBriefing && !briefingError && (
          <div className="p-6 bg-slate-50/70 rounded-xl border border-dashed border-slate-300 text-center space-y-3">
            <p className="text-xs text-slate-600 font-medium">
              "Generate a live briefing to discover what requires attention today."
            </p>
            <button
              onClick={handleGenerateBriefing}
              className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-bold px-5 py-2.5 rounded-xl text-xs transition-colors shadow-xs"
            >
              <Sparkles className="w-4 h-4" />
              <span>Generate Today's Briefing</span>
            </button>
          </div>
        )}

        {isGeneratingBriefing && (
          <div className="p-6 bg-purple-50/50 rounded-xl border border-purple-200 text-center space-y-3">
            <div className="flex items-center justify-center gap-2 text-purple-700 font-bold text-xs">
              <Loader2 className="w-5 h-5 animate-spin text-purple-600" />
              <span>✦ ANALYZING CIVIC ACTIVITY...</span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Evaluating live database telemetry, active spatial hotspots, and priority action scores...
            </p>
          </div>
        )}

        {briefingError && !isGeneratingBriefing && (
          <div className="p-4 bg-red-50 rounded-xl border border-red-200 text-red-700 text-xs flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{briefingError}</span>
            </div>
            <button
              onClick={handleGenerateBriefing}
              className="px-3 py-1 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        )}

        {briefingData && !isGeneratingBriefing && (
          <AnimatePresence mode="wait">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="space-y-2">
                <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest block">
                  GOOD MORNING, ADMINISTRATOR.
                </span>
                <p className="text-xs sm:text-sm text-slate-800 font-semibold leading-relaxed">
                  "{briefingData.summary || 'CivicNova AI analyzed the latest civic activity across the city.'}"
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center space-y-0.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">TOTAL REPORTS</span>
                  <span className="text-lg font-mono font-black text-slate-900">{briefingData.metrics?.total_reports || summary?.total_complaints || 0}</span>
                </div>
                <div className="p-3 bg-red-50/70 rounded-xl border border-red-200 text-center space-y-0.5">
                  <span className="text-[10px] font-bold text-red-600 uppercase block">CRITICAL</span>
                  <span className="text-lg font-mono font-black text-red-700">{briefingData.metrics?.critical ?? summary?.critical ?? 0}</span>
                </div>
                <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200 text-center space-y-0.5">
                  <span className="text-[10px] font-bold text-amber-700 uppercase block">HIGH PRIORITY</span>
                  <span className="text-lg font-mono font-black text-amber-800">{briefingData.metrics?.high ?? summary?.high ?? 0}</span>
                </div>
                <div className="p-3 bg-purple-50/70 rounded-xl border border-purple-200 text-center space-y-0.5">
                  <span className="text-[10px] font-bold text-purple-700 uppercase block">ACTIVE HOTSPOTS</span>
                  <span className="text-lg font-mono font-black text-purple-900">{briefingData.metrics?.active_hotspots ?? summary?.active_hotspots ?? 0}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 pt-2">
                <div className="md:col-span-7 p-5 rounded-2xl bg-amber-50/60 border border-amber-200 space-y-3">
                  <div className="flex items-center justify-between border-b border-amber-200/80 pb-2.5">
                    <div className="flex items-center gap-2 text-amber-800 font-bold text-xs">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>⚠ TODAY'S BIGGEST CONCERN</span>
                    </div>
                    <span className="text-[10px] font-mono font-bold bg-white text-purple-700 px-2 py-0.5 rounded border border-purple-200">
                      AI CONFIDENCE {Math.round((briefingData.biggest_concern?.confidence || 0.94) * 100)}%
                    </span>
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-sm font-black text-amber-950">{briefingData.biggest_concern?.category || 'Water & Drainage'}</h3>
                    <p className="text-xs text-slate-700 font-medium leading-relaxed">
                      "{briefingData.biggest_concern?.reason}"
                    </p>
                  </div>

                  <div className="space-y-1 pt-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">SUPPORTING EVIDENCE</span>
                    <div className="flex flex-wrap gap-1.5">
                      {briefingData.biggest_concern?.evidence?.map((ev, i) => (
                        <span key={i} className="text-[10px] font-mono font-semibold bg-white text-slate-800 px-2.5 py-1 rounded-lg border border-amber-200/80 shadow-2xs">
                          {ev}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="md:col-span-5 p-5 rounded-2xl bg-blue-50/60 border border-blue-200 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-blue-800 font-bold text-xs border-b border-blue-200/80 pb-2.5">
                      <Target className="w-4 h-4 text-blue-600 shrink-0" />
                      <span>RECOMMENDED ACTION</span>
                    </div>
                    <p className="text-xs text-slate-800 font-bold leading-relaxed">
                      "{briefingData.recommended_action?.text}"
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      if (briefingData.recommended_action?.category) {
                        setCategoryFilter(briefingData.recommended_action.category);
                        scrollToReports();
                      }
                    }}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-colors flex items-center justify-center gap-2 shadow-xs"
                  >
                    <span>REVIEW RELATED REPORTS</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {briefingData.priority_actions && briefingData.priority_actions.length > 0 && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-amber-500 fill-current" />
                      PRIORITY ACTIONS
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">Ranked by Action Score</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {briefingData.priority_actions.map((act) => (
                      <div
                        key={act.complaint_id}
                        className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200 space-y-2.5 flex flex-col justify-between hover:border-blue-300 transition-colors shadow-2xs"
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                              act.badge === 'ACT NOW' ? 'bg-red-100 text-red-800 border border-red-200' :
                              act.badge === 'INVESTIGATE' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                              'bg-blue-100 text-blue-800 border border-blue-200'
                            }`}>
                              0{act.rank} {act.badge}
                            </span>
                            <span className="text-[10px] font-mono text-purple-700 font-bold bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
                              Score {act.action_score}
                            </span>
                          </div>

                          <p className="text-xs font-bold text-slate-900 line-clamp-2 leading-snug">
                            {act.description}
                          </p>

                          <div className="flex items-center gap-2 text-[10px] text-slate-500 font-medium">
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">{act.location}</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between border-t border-slate-200/60 pt-2 text-[10px]">
                          <span className={`font-bold ${
                            act.priority === 'CRITICAL' ? 'text-red-700' : 'text-amber-700'
                          }`}>
                            {act.priority}
                          </span>
                          <button
                            onClick={() => setSelectedComplaintId(act.complaint_id)}
                            className="font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 bg-white px-2 py-1 rounded border border-slate-200 shadow-2xs"
                          >
                            <span>Review</span>
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {/* ── KPI HIERARCHY GRID (CONNECTED TO SINGLE SOURCE FILTER) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
        {loadingSummary ? (
          Array(7).fill(0).map((_, i) => <Skeleton key={i} variant="kpi" />)
        ) : summary ? (
          <>
            <div onClick={() => handleKpiClick('TOTAL')}>
              <KpiCard
                label="Total Reports"
                value={summary.total_complaints}
                icon={Target}
                color="#2563eb"
                isSelected={!priorityFilter && !statusFilter && !categoryFilter && !smartSearchResult}
              />
            </div>

            <div onClick={() => handleKpiClick('CRITICAL')}>
              <KpiCard
                label="Critical"
                value={summary.critical}
                icon={AlertTriangle}
                color="#dc2626"
                primary={true}
                isSelected={priorityFilter === 'CRITICAL'}
              />
            </div>

            <div onClick={() => handleKpiClick('HIGH')}>
              <KpiCard
                label="High Priority"
                value={summary.high}
                icon={AlertTriangle}
                color="#d97706"
                primary={true}
                isSelected={priorityFilter === 'HIGH'}
              />
            </div>

            <div onClick={() => handleKpiClick('OPEN')}>
              <KpiCard
                label="Open"
                value={summary.open}
                icon={Clock}
                color="#64748b"
                isSelected={statusFilter === 'OPEN'}
              />
            </div>

            <div onClick={() => handleKpiClick('RESOLVED')}>
              <KpiCard
                label="Resolved"
                value={summary.resolved}
                icon={CheckCircle2}
                color="#16a34a"
                isSelected={statusFilter === 'RESOLVED'}
              />
            </div>

            <div onClick={() => navigate('/hotspots')}>
              <KpiCard label="Hotspots" value={summary.active_hotspots} icon={Zap} color="#7c3aed" primary={true} />
            </div>

            <div onClick={() => navigate('/analytics')}>
              <KpiCard label="Avg Resolve" value={summary.avg_resolution_hours ? `${Math.round(summary.avg_resolution_hours)}h` : 'N/A'} icon={Clock} color="#0284c7" />
            </div>
          </>
        ) : null}
      </div>

      {/* Map & Urgent Action Queue */}
      <div className="flex flex-col lg:grid lg:grid-cols-3 gap-6 lg:h-[520px]">
        <Card className="lg:col-span-2 h-[300px] sm:h-[380px] lg:h-full flex flex-col p-0 overflow-hidden relative border-slate-200">
          <div className="absolute top-3 left-3 z-[400] pointer-events-none">
            <div className="bg-white/90 backdrop-blur-xs px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-xs font-bold text-slate-900">CivicNova Intelligence Map</span>
            </div>
          </div>

          <div className="flex-1 w-full bg-slate-100 relative z-0">
            {loadingComplaints ? (
              <div className="h-full flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
              </div>
            ) : (
              <MapContainer center={[24.87, 67.05]} zoom={11} style={{ height: '100%', width: '100%' }}>
                <TileLayer
                  attribution='&copy; <a href="https://www.esri.com/">Esri</a> &mdash; Street Map'
                  url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}"
                  maxZoom={19}
                />
                
                {hotspots.map((h, i) => (
                  <Circle
                    key={`hs-${i}`}
                    center={[h.latitude, h.longitude]}
                    radius={h.radius_meters || 500}
                    pathOptions={{
                      color: h.severity === 'SEVERE' ? '#dc2626' : '#d97706',
                      fillColor: h.severity === 'SEVERE' ? '#dc2626' : '#d97706',
                      fillOpacity: 0.2,
                      weight: 2,
                    }}
                  />
                ))}

                {filteredComplaints.map((c) => {
                  if (!c.latitude || !c.longitude) return null;
                  return (
                    <Marker
                      key={c.complaint_id}
                      position={[c.latitude, c.longitude]}
                      icon={createIcon(c.priority)}
                      eventHandlers={{
                        click: () => setSelectedComplaintId(c.complaint_id),
                      }}
                    >
                      <Popup>
                        <div className="text-xs space-y-1 p-1">
                          <p className="font-bold text-slate-900">{c.category}</p>
                          <p className="text-slate-600 line-clamp-2">{c.description}</p>
                          <button
                            onClick={() => setSelectedComplaintId(c.complaint_id)}
                            className="mt-1 text-blue-600 font-bold hover:underline"
                          >
                            Open Dossier →
                          </button>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}
              </MapContainer>
            )}
          </div>
        </Card>

        {/* Urgent Action Queue */}
        <Card className="lg:col-span-1 h-[360px] lg:h-full flex flex-col p-4 border-slate-200 space-y-3 overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">Urgent Action Queue</h2>
            </div>
            <span className="text-xs font-mono font-bold bg-red-50 text-red-700 px-2 py-0.5 rounded border border-red-200">
              {urgentQueue.length}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {urgentQueue.length === 0 ? (
              <p className="text-xs text-slate-400 py-8 text-center">No urgent incidents requiring action.</p>
            ) : (
              urgentQueue.map((c) => (
                <div
                  key={c.complaint_id}
                  onClick={() => setSelectedComplaintId(c.complaint_id)}
                  className="p-3 bg-slate-50 hover:bg-blue-50/60 rounded-xl border border-slate-200 hover:border-blue-300 transition-all cursor-pointer space-y-1.5 shadow-2xs group"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      c.priority === 'CRITICAL' ? 'bg-red-100 text-red-800 border border-red-200' : 'bg-amber-100 text-amber-800 border border-amber-200'
                    }`}>
                      {c.priority}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 font-semibold">{formatTime(c.created_at)}</span>
                  </div>

                  <p className="text-xs font-bold text-slate-900 group-hover:text-blue-700 line-clamp-2 leading-snug">
                    {c.description}
                  </p>

                  <div className="flex items-center justify-between text-[10px] text-slate-500 font-medium">
                    <span className="truncate">{c.location || 'Karachi'}</span>
                    <span className="text-blue-600 font-bold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                      Review <ChevronRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* ── REPORTS SECTION (SINGLE SOURCE FILTERED REPORT LIST WITH DYNAMIC HEADING & CHIPS) ── */}
      <Card id="reports-section" className="p-5 border-slate-200 space-y-4 scroll-mt-6">
        {/* Smart Search Bar */}
        <div className="p-4 bg-purple-50/60 border border-purple-200 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-purple-900 font-black text-xs uppercase tracking-wider">
              <Brain className="w-4 h-4 text-purple-600" />
              <span>🔎 AI SMART SEARCH & INVESTIGATION</span>
            </div>
            <span className="text-[10px] font-mono text-purple-700 font-bold hidden sm:inline">Natural Language Intent Parser</span>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSmartSearch();
            }}
            className="flex items-center gap-2"
          >
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-purple-500 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Try: Show critical electrical complaints in Gulshan..."
                value={smartSearchQuery}
                onChange={(e) => setSmartSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-purple-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-600 shadow-2xs"
              />
              {smartSearchQuery && (
                <button
                  type="button"
                  onClick={handleClearSmartSearch}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-700"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <button
              type="submit"
              disabled={isSmartSearching}
              className="bg-purple-600 hover:bg-purple-700 text-white font-bold px-5 py-2.5 rounded-xl text-xs transition-colors flex items-center gap-1.5 shrink-0 shadow-xs disabled:opacity-50"
            >
              {isSmartSearching ? (
                <Loader2 className="w-4 h-4 animate-spin text-white" />
              ) : (
                <Sparkles className="w-4 h-4 text-white" />
              )}
              <span>Search</span>
            </button>
          </form>

          {/* Quick Query Example Chips */}
          <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
            <span className="text-slate-500 font-bold text-[10px] uppercase mr-1">Quick Queries:</span>
            <button
              type="button"
              onClick={() => handleSmartSearch("Show critical electrical complaints in Gulshan")}
              className="px-2.5 py-1 bg-white hover:bg-purple-100 text-purple-800 rounded-lg border border-purple-200 font-semibold transition-colors shadow-2xs"
            >
              "Show critical electrical complaints in Gulshan"
            </button>
            <button
              type="button"
              onClick={() => handleSmartSearch("Show unresolved water problems")}
              className="px-2.5 py-1 bg-white hover:bg-purple-100 text-purple-800 rounded-lg border border-purple-200 font-semibold transition-colors shadow-2xs"
            >
              "Show unresolved water problems"
            </button>
            <button
              type="button"
              onClick={() => handleSmartSearch("Find high priority waste reports")}
              className="px-2.5 py-1 bg-white hover:bg-purple-100 text-purple-800 rounded-lg border border-purple-200 font-semibold transition-colors shadow-2xs"
            >
              "Find high priority waste reports"
            </button>
          </div>
        </div>

        {/* Dynamic Section Header & Filter Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <BarChart3 className="w-5 h-5 text-blue-600 shrink-0" />
            <h2 className="text-sm sm:text-base font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <span>{headingInfo.title}</span>
              <span className="text-xs font-mono font-bold bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-full border border-blue-200">
                {headingInfo.badge}
              </span>
            </h2>
          </div>

          {/* Standard Dropdown Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Filter table..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-blue-600 w-36 sm:w-48 font-medium"
              />
            </div>

            <select
              value={priorityFilter || ''}
              onChange={(e) => setPriorityFilter(e.target.value || null)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none"
            >
              <option value="">All Priorities</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>

            <select
              value={statusFilter || ''}
              onChange={(e) => setStatusFilter(e.target.value || null)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none"
            >
              <option value="">All Statuses</option>
              <option value="OPEN">Open (Unresolved)</option>
              <option value="ASSIGNED">Assigned</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="RESOLVED">Resolved</option>
            </select>
          </div>
        </div>

        {/* Active Filter Chips Strip */}
        {activeFilterCount > 0 && (
          <div className="flex flex-wrap items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
            <span className="text-slate-500 font-bold uppercase text-[10px] tracking-wider">ACTIVE FILTERS:</span>
            {priorityFilter && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-100 text-red-900 border border-red-200 font-bold">
                Priority: {priorityFilter}
                <X className="w-3.5 h-3.5 cursor-pointer hover:text-red-950" onClick={() => setPriorityFilter(null)} />
              </span>
            )}
            {statusFilter && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-100 text-blue-900 border border-blue-200 font-bold">
                Status: {statusFilter}
                <X className="w-3.5 h-3.5 cursor-pointer hover:text-blue-950" onClick={() => setStatusFilter(null)} />
              </span>
            )}
            {categoryFilter && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-100 text-purple-900 border border-purple-200 font-bold">
                Category: {categoryFilter}
                <X className="w-3.5 h-3.5 cursor-pointer hover:text-purple-950" onClick={() => setCategoryFilter(null)} />
              </span>
            )}
            {smartSearchResult && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-100 text-purple-900 border border-purple-200 font-bold">
                ✦ Smart Search: "{smartSearchQuery}"
                <X className="w-3.5 h-3.5 cursor-pointer hover:text-purple-950" onClick={handleClearSmartSearch} />
              </span>
            )}
            <button
              onClick={clearAllFilters}
              className="text-xs text-red-600 hover:text-red-800 font-bold underline ml-2"
            >
              Clear All Filters
            </button>
          </div>
        )}

        {/* Complaints Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-2.5 px-3">ID</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3">Description</th>
                <th className="py-2.5 px-3">Location</th>
                <th className="py-2.5 px-3">Priority</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Reported</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredComplaints.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500 text-xs font-medium space-y-2">
                    <p className="font-bold text-slate-700">NO MATCHING REPORTS FOUND</p>
                    <p className="text-slate-400">Try changing priority, category, status or click "Clear All Filters".</p>
                    <button
                      onClick={clearAllFilters}
                      className="px-4 py-2 bg-blue-600 text-white font-bold rounded-xl text-xs hover:bg-blue-700 inline-block mt-2 shadow-xs"
                    >
                      Clear All Filters
                    </button>
                  </td>
                </tr>
              ) : (
                filteredComplaints.map((c) => (
                  <tr key={c.complaint_id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-3 font-mono font-bold text-blue-600">{c.complaint_id?.slice(0, 8)}</td>
                    <td className="py-3 px-3 font-bold text-slate-800">{c.category}</td>
                    <td className="py-3 px-3 text-slate-700 max-w-xs truncate">{c.description}</td>
                    <td className="py-3 px-3 text-slate-500 truncate max-w-[140px]">{c.location || 'Karachi'}</td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        c.priority === 'CRITICAL' ? 'bg-red-100 text-red-800' :
                        c.priority === 'HIGH' ? 'bg-amber-100 text-amber-800' :
                        c.priority === 'MEDIUM' ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {c.priority}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        c.status === 'RESOLVED' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-400 font-mono text-[11px]">{formatTime(c.created_at)}</td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => setSelectedComplaintId(c.complaint_id)}
                        className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1 shadow-2xs"
                      >
                        <Eye className="w-3 h-3 text-slate-500" />
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Complaint Dossier Right Drawer */}
      <ComplaintDetailDrawer
        complaintId={selectedComplaintId}
        onClose={() => setSelectedComplaintId(null)}
      />
    </div>
  );
}
