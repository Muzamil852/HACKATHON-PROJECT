import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line 
} from 'recharts';
import { MapContainer, TileLayer, Circle } from 'react-leaflet';
import L from 'leaflet';
import { 
  Radar, ArrowRight, Activity, Brain, MapPin, AlertTriangle, Zap, 
  ChevronRight, Menu, X, PlusCircle, SearchCode, ShieldCheck, Home,
  Target, CheckCircle2, Clock, Layers, Network, Sparkles, Building, BarChart3, HelpCircle,
  Droplets, HardHat, Trash2, ZapOff, ShieldAlert, Wrench, FileText, ChevronDown, Play, Loader2
} from 'lucide-react';

import { getDashboardSummary, getAnalytics } from '../api/dashboard';
import { getComplaints, analyzeText } from '../api/complaints';
import { getHotspots } from '../api/hotspots';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

function formatRelativeTime(dateStr) {
  if (!dateStr) return 'Recently';
  const diffMinutes = Math.floor((new Date() - new Date(dateStr)) / 60000);
  if (diffMinutes < 5) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes} min ago`;
  const hours = Math.floor(diffMinutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function getDispatchAction(category, priority) {
  if (category === 'ELECTRICITY' && priority === 'CRITICAL') {
    return 'Emergency Electrical Inspection';
  }
  if (category === 'ELECTRICITY') {
    return 'Electrical Services Dispatch';
  }
  if (category === 'WATER' && (priority === 'CRITICAL' || priority === 'HIGH')) {
    return 'Emergency Main Line Isolation';
  }
  if (category === 'WATER') {
    return 'Water & Drainage Inspection';
  }
  if (category === 'WASTE') {
    return 'Sanitation Vehicle Reroute & Waste Clearance';
  }
  if (category === 'ROAD') {
    return 'Road Infrastructure Patching Crew';
  }
  if (category === 'SAFETY') {
    return 'Civil Safety Inspection & Cordon';
  }
  return 'Municipal Inspection Dispatch';
}

const localFallbackClassifier = (text) => {
  const lower = (text || '').toLowerCase();
  
  const elecKws = ["electric", "electrical", "electricity", "wire", "wires", "power line", "powerline", "cable", "live wire", "fallen wire", "voltage", "110v", "220v", "240v", "440v", "660v", "1100v", "1100 volt", "spark", "sparking", "transformer", "pole", "short circuit", "street light"];
  const elecHazards = ["fallen", "live", "sparking", "spark", "exposed", "danger", "hazard", "high voltage", "voltage", "short circuit", "electrocution", "fire"];
  
  if (elecKws.some(kw => lower.includes(kw))) {
    const hasHazard = elecHazards.some(hz => lower.includes(hz));
    return {
      category: "ELECTRICITY",
      priority: hasHazard ? "CRITICAL" : "HIGH",
      confidence: hasHazard ? 0.96 : 0.92,
      recommended_department: "Electrical Services",
      reasoning: "Deterministic Safety Rule: High-voltage/live electrical indicator detected.",
      summary: text,
      is_fallback: true
    };
  }

  if (["water", "pipe", "pipeline", "burst", "leak", "leaking", "sewage", "flooding"].some(kw => lower.includes(kw))) {
    const isCritical = lower.includes("burst") || lower.includes("major flood");
    return {
      category: "WATER",
      priority: isCritical ? "CRITICAL" : "HIGH",
      confidence: 0.94,
      recommended_department: "Water & Drainage",
      reasoning: "Deterministic Rule: Water & drainage indicators detected.",
      summary: text,
      is_fallback: true
    };
  }

  if (["garbage", "trash", "waste", "dump", "rubbish", "litter", "stink", "overflowing"].some(kw => lower.includes(kw))) {
    return {
      category: "WASTE",
      priority: lower.includes("overflowing") ? "HIGH" : "MEDIUM",
      confidence: 0.92,
      recommended_department: "Waste Management",
      reasoning: "Deterministic Rule: Waste management indicators detected.",
      summary: text,
      is_fallback: true
    };
  }

  if (["pothole", "potholes", "road", "asphalt", "pavement", "street"].some(kw => lower.includes(kw))) {
    return {
      category: "ROAD",
      priority: lower.includes("pothole") ? "HIGH" : "MEDIUM",
      confidence: 0.92,
      recommended_department: "Roads & Infrastructure",
      reasoning: "Deterministic Rule: Road infrastructure indicators detected.",
      summary: text,
      is_fallback: true
    };
  }

  return {
    category: "OTHER",
    priority: "MEDIUM",
    confidence: 0.75,
    recommended_department: "General Administration",
    reasoning: "General civic report submitted for municipal review.",
    summary: text,
    is_fallback: true
  };
};

export default function LandingPage() {
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState('WATER');

  // Interactive Mini Demo State
  const [demoInput, setDemoInput] = useState("1100 voltages electric wire fallen");
  const [isSimulating, setIsSimulating] = useState(false);
  const [demoResult, setDemoResult] = useState(null);

  const runSimulation = async (inputText) => {
    const queryText = (inputText !== undefined ? inputText : demoInput).trim();
    if (!queryText) return;

    setIsSimulating(true);
    try {
      const res = await analyzeText({ description: queryText });
      if (res && res.category) {
        setDemoResult(res);
      } else {
        setDemoResult(localFallbackClassifier(queryText));
      }
    } catch (err) {
      console.warn('API error, using deterministic local fallback:', err);
      setDemoResult(localFallbackClassifier(queryText));
    } finally {
      setIsSimulating(false);
    }
  };

  // Run initial simulation on load so results card is immediately present
  useEffect(() => {
    runSimulation("1100 voltages electric wire fallen");
  }, []);

  // Close mobile menu on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setIsMobileMenuOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const { data: summary } = useQuery({
    queryKey: ['dashboardSummary'],
    queryFn: getDashboardSummary,
  });

  const { data: analytics } = useQuery({
    queryKey: ['analyticsData'],
    queryFn: getAnalytics,
  });

  const { data: complaints = [] } = useQuery({
    queryKey: ['complaintsLanding'],
    queryFn: () => getComplaints({ limit: 5 }),
  });

  const { data: hotspots = [] } = useQuery({
    queryKey: ['hotspotsLanding'],
    queryFn: getHotspots,
  });

  const trendData = analytics?.daily_trends
    ? Object.entries(analytics.daily_trends)
        .map(([date, count]) => ({ date: date.slice(5), count }))
        .sort((a, b) => new Date(a.date) - new Date(b.date))
    : [
        { date: 'Feb 01', count: 4 },
        { date: 'Feb 02', count: 7 },
        { date: 'Feb 03', count: 12 },
        { date: 'Feb 04', count: 9 },
        { date: 'Feb 05', count: 15 },
        { date: 'Feb 06', count: 11 },
        { date: 'Feb 07', count: 18 },
      ];

  const categoryData = analytics?.category_distribution
    ? Object.entries(analytics.category_distribution)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)
    : [
        { name: 'WATER', count: 18 },
        { name: 'ROAD', count: 14 },
        { name: 'WASTE', count: 10 },
        { name: 'ELECTRICITY', count: 6 },
        { name: 'SAFETY', count: 5 },
      ];

  const categories = [
    {
      id: 'WATER',
      name: 'Water & Drainage',
      icon: Droplets,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      issues: ['Water leaks & pipe bursts', 'Main line drainage blockage', 'Street sewage flooding', 'Low water pressure'],
      dept: 'Water & Sewerage Board (KWSB)',
      count: summary?.water_count || 18,
      aiRec: 'Immediate hydraulic pressure testing & emergency crew dispatch',
    },
    {
      id: 'ROAD',
      name: 'Roads & Infrastructure',
      icon: HardHat,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200',
      issues: ['Potholes & asphalt damage', 'Road erosion', 'Missing manhole covers', 'Damaged street curbing'],
      dept: 'Works & Infrastructure Dept',
      count: summary?.road_count || 14,
      aiRec: 'Asphalt patching team assignment & traffic warning flags',
    },
    {
      id: 'WASTE',
      name: 'Waste Management',
      icon: Trash2,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-200',
      issues: ['Garbage accumulation', 'Uncollected waste bins', 'Illegal commercial dumping', 'Drain debris buildup'],
      dept: 'Waste Management Authority (SSWMA)',
      count: summary?.waste_count || 10,
      aiRec: 'Heavy compactor vehicle rerouting & sanitation inspector audit',
    },
    {
      id: 'ELECTRICITY',
      name: 'Electrical Services',
      icon: ZapOff,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      issues: ['Fallen live wires', 'Transformer sparking', 'Streetlight grid blackout', 'Exposed electrical junction'],
      dept: 'Electrical Response Board',
      count: summary?.electricity_count || 6,
      aiRec: 'High-voltage emergency isolation team dispatch',
    },
    {
      id: 'SAFETY',
      name: 'Public Safety',
      icon: ShieldAlert,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
      issues: ['Open manhole hazards', 'Unsafe building structures', 'Illegal chemical storage', 'Pedestrian hazard'],
      dept: 'Civil Safety Inspectorate',
      count: summary?.safety_count || 5,
      aiRec: 'Perimeter cordon deployment & urgent structural assessment',
    },
    {
      id: 'MUNICIPAL',
      name: 'Municipal Services',
      icon: Wrench,
      color: 'text-cyan-600',
      bgColor: 'bg-cyan-50',
      borderColor: 'border-cyan-200',
      issues: ['Public park maintenance', 'Public restroom overflow', 'Obstructed signage', 'Park lighting outage'],
      dept: 'District Municipal Corporation (DMC)',
      count: 4,
      aiRec: 'Local maintenance squad work order issuance',
    },
    {
      id: 'ADMIN',
      name: 'General Administration',
      icon: FileText,
      color: 'text-slate-600',
      bgColor: 'bg-slate-100',
      borderColor: 'border-slate-300',
      issues: ['Public property encroachment', 'Noise pollution reports', 'Civic permit verification', 'Unlicensed vendor clutter'],
      dept: 'Municipal Admin Directorate',
      count: 3,
      aiRec: 'Encroachment officer review & administrative notice dispatch',
    },
    {
      id: 'INFRASTRUCTURE',
      name: 'Public Infrastructure',
      icon: Building,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      borderColor: 'border-indigo-200',
      issues: ['Footbridge damage', 'Bus stop shelter vandalism', 'Public barrier breakage', 'Bridge expansion joint gap'],
      dept: 'Urban Infrastructure Agency',
      count: 4,
      aiRec: 'Structural engineering inspection scheduling',
    },
  ];

  const problemCards = [
    { title: 'Water Leaks & Flooding', desc: 'Pipe bursts, sewage overflow, and standing street water.', dept: 'Water & Sewerage Board', icon: Droplets, color: 'text-blue-600 bg-blue-50 border-blue-200' },
    { title: 'Potholes & Road Damage', desc: 'Caved roads, missing covers, and dangerous street cracks.', dept: 'Works & Infrastructure', icon: HardHat, color: 'text-amber-600 bg-amber-50 border-amber-200' },
    { title: 'Garbage Accumulation', desc: 'Overflowing dumpsters, illegal dumping, and uncollected waste.', dept: 'Waste Management Authority', icon: Trash2, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
    { title: 'Fallen Wires & Electrical', desc: 'Exposed high-voltage wires, transformer sparking, dark streetlights.', dept: 'Electrical Response Board', icon: ZapOff, color: 'text-red-600 bg-red-50 border-red-200' },
    { title: 'Public Safety Hazards', desc: 'Open manholes, unsafe walls, and dangerous public hazards.', dept: 'Civil Safety Inspectorate', icon: ShieldAlert, color: 'text-purple-600 bg-purple-50 border-purple-200' },
    { title: 'Public Facility Issues', desc: 'Damaged park benches, broken public lighting, and restroom issues.', dept: 'District Municipal Corp', icon: Wrench, color: 'text-cyan-600 bg-cyan-50 border-cyan-200' },
    { title: 'Public Infrastructure', desc: 'Damaged footbridges, broken bus shelters, and guardrail hazards.', dept: 'Urban Infrastructure Dept', icon: Building, color: 'text-indigo-600 bg-indigo-50 border-indigo-200' },
  ];

  const selectedCategoryObj = categories.find((c) => c.id === activeCategory) || categories[0];

  return (
    <div className="min-h-screen bg-[#F7F8FA] text-slate-900 flex flex-col font-sans selection:bg-blue-500 selection:text-white w-full overflow-x-hidden">
      {/* Sticky Navigation */}
      <header className="bg-white/90 backdrop-blur-md border-b border-slate-200 sticky top-0 z-40 w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Mobile Left: Hamburger + Logo */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="md:hidden p-2 rounded-xl text-slate-700 hover:bg-slate-100 transition-colors"
              aria-label="Open mobile menu"
            >
              <Menu className="w-6 h-6" />
            </button>

            <Link to="/" className="flex items-center gap-2 whitespace-nowrap">
              <Radar className="w-6 h-6 text-emerald-600 shrink-0" />
              <span className="text-lg font-black tracking-tight text-slate-900 whitespace-nowrap">CivicNova AI</span>
            </Link>
          </div>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-8 text-xs font-bold text-slate-600">
            <a href="#how-it-works" className="hover:text-blue-600 transition-colors">How It Works</a>
            <a href="#civic-signals" className="hover:text-blue-600 transition-colors">Civic Signals</a>
            <a href="#demo-router" className="hover:text-blue-600 transition-colors">AI Classification</a>
            <a href="#pattern-story" className="hover:text-blue-600 transition-colors">Spatial Intelligence</a>
          </nav>

          {/* Desktop Action Buttons */}
          <div className="hidden md:flex items-center gap-4 text-xs font-bold">
            <Link to="/track" className="text-slate-700 hover:text-blue-600 transition-colors">
              Track Report
            </Link>
            <Link to="/login" className="bg-slate-900 text-white px-4 py-2 rounded-xl hover:bg-slate-800 transition-all shadow-xs">
              Admin Login
            </Link>
          </div>
        </div>
      </header>

      {/* Mobile Slide-Over Navigation Drawer */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-50 md:hidden flex">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40"
            />

            {/* Slide-over Panel */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="relative w-4/5 max-w-xs bg-white h-full border-r border-slate-200 z-50 flex flex-col p-6 shadow-2xl justify-between overflow-y-auto"
            >
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <Link to="/" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-2">
                    <Radar className="w-6 h-6 text-emerald-600" />
                    <span className="text-base font-black tracking-tight text-slate-900">CivicNova AI</span>
                  </Link>
                  <button
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="p-1.5 text-slate-400 hover:text-slate-900 rounded-lg hover:bg-slate-100"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Navigation</p>
                  <Link
                    to="/"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center px-3.5 py-3 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    <Home className="w-4.5 h-4.5 mr-3 text-slate-500" />
                    Home
                  </Link>
                  <Link
                    to="/report"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center px-3.5 py-3 rounded-xl text-xs font-semibold text-blue-600 hover:bg-blue-50"
                  >
                    <PlusCircle className="w-4.5 h-4.5 mr-3 text-blue-600" />
                    Report a Problem
                  </Link>
                  <Link
                    to="/track"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center px-3.5 py-3 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    <SearchCode className="w-4.5 h-4.5 mr-3 text-slate-500" />
                    Track Report
                  </Link>
                  <a
                    href="#how-it-works"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center px-3.5 py-3 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    <Radar className="w-4.5 h-4.5 mr-3 text-slate-500" />
                    How It Works
                  </a>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100 space-y-3">
                <Link
                  to="/login"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2 shadow-xs"
                >
                  Admin Login →
                </Link>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 1. HERO SECTION */}
      <section className="relative pt-8 sm:pt-12 pb-12 sm:pb-14 px-4 sm:px-6 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 sm:gap-10 items-center">
          {/* Left Editorial Content */}
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold shadow-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
              CIVICNOVA INTELLIGENCE
            </div>

            <h1 className="text-3xl sm:text-6xl font-black text-slate-900 tracking-tight leading-[1.08]">
              Every Report.{' '}
              <span className="text-emerald-600 underline decoration-emerald-200 underline-offset-4">
                Smarter Decisions. Better Cities.
              </span>
            </h1>

            <p className="text-sm sm:text-base text-slate-600 leading-relaxed font-medium max-w-lg">
              CivicNova AI turns citizen reports into AI-classified incidents, connected hotspots, and prioritized municipal action.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-3.5 pt-2">
              <Link
                to="/report"
                className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-7 py-3.5 rounded-xl transition-all shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 text-sm"
              >
                <span>REPORT A PROBLEM</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/login"
                className="w-full sm:w-auto bg-white hover:bg-slate-100 text-slate-900 font-bold px-7 py-3.5 rounded-xl transition-all border border-slate-300 text-sm flex items-center justify-center gap-2 shadow-xs"
              >
                <span>EXPLORE CIVICNOVA AI</span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </Link>
            </div>
          </div>

          {/* Right Live CivicNova AI Mini Map Visual */}
          <div className="lg:col-span-6">
            <div className="bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden relative">
              <div className="p-3.5 sm:p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
                  <span className="text-[11px] sm:text-xs font-bold text-slate-900 uppercase tracking-wider">Live Signal Radar</span>
                </div>
                <span className="text-[10px] font-mono font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-200">
                  KARACHI ZONE
                </span>
              </div>

              {/* Map Canvas */}
              <div className="h-64 sm:h-72 w-full relative z-0">
                <MapContainer center={[24.87, 67.05]} zoom={12} style={{ height: '100%', width: '100%' }} zoomControl={false}>
                  <TileLayer
                    attribution='&copy; <a href="https://www.esri.com/">Esri</a> &mdash; Street Map'
                    url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}"
                    maxZoom={19}
                  />
                  
                  {hotspots.map((h, i) => (
                    <Circle
                      key={`hs-hero-${i}`}
                      center={[h.latitude, h.longitude]}
                      radius={h.radius_meters || 600}
                      pathOptions={{
                        color: h.severity === 'SEVERE' ? '#dc2626' : '#d97706',
                        fillColor: h.severity === 'SEVERE' ? '#dc2626' : '#d97706',
                        fillOpacity: 0.25,
                        weight: 2,
                      }}
                    />
                  ))}
                </MapContainer>

                {/* Overlay Intelligence Badges */}
                <div className="absolute top-3 left-3 z-[400] space-y-2 pointer-events-none">
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-white/95 backdrop-blur-xs p-2.5 rounded-xl border border-red-200 shadow-md text-xs space-y-0.5 max-w-[220px]"
                  >
                    <div className="flex items-center gap-1.5 font-bold text-red-700 text-[11px]">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> CRITICAL SIGNAL
                    </div>
                    <p className="text-[10px] text-slate-800 font-semibold truncate">High-voltage wire hazard near Gulshan</p>
                  </motion.div>
                </div>

                <div className="absolute bottom-3 right-3 z-[400] pointer-events-none">
                  <div className="bg-white/95 backdrop-blur-xs px-3 py-1.5 sm:py-2 rounded-xl border border-blue-200 shadow-md text-[10px] sm:text-[11px] font-bold text-blue-900 flex items-center gap-1.5">
                    <Brain className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span>AI CONFIDENCE 94% • 17 REPORTS</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. LIVE CITY PULSE */}
      <section className="bg-white border-y border-slate-200 py-4 px-4 sm:px-6 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4 text-xs font-bold">
          <div className="flex items-center gap-2 text-slate-400 uppercase tracking-widest text-[11px]">
            <Activity className="w-4 h-4 text-blue-600 animate-pulse" />
            <span>LIVE CITY PULSE</span>
          </div>

          <div className="flex flex-wrap items-center gap-4 sm:gap-10 font-mono text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-sans">REPORTS:</span>
              <span className="text-slate-900 font-bold text-sm">{summary?.total_complaints || 55}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-red-600 font-sans">CRITICAL:</span>
              <span className="text-red-700 font-bold text-sm">{summary?.critical || 6}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-amber-700 font-sans">HIGH PRIORITY:</span>
              <span className="text-amber-800 font-bold text-sm">{summary?.high || 27}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-purple-700 font-sans">ACTIVE HOTSPOTS:</span>
              <span className="text-purple-900 font-bold text-sm">{summary?.active_hotspots || 5}</span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. SIGNATURE MESSAGE BANNER — "YOU DON'T NEED TO KNOW WHO TO CALL." */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 max-w-7xl mx-auto w-full">
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950 text-white rounded-3xl p-8 sm:p-12 shadow-xl relative overflow-hidden text-center space-y-4 border border-slate-800">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-[11px] font-mono font-bold uppercase tracking-widest mx-auto">
            <Brain className="w-3.5 h-3.5 text-blue-400" />
            <span>ZERO MUNICIPAL FRICTION</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight max-w-4xl mx-auto">
            YOU DON'T NEED TO KNOW WHO TO CALL.
          </h2>

          <p className="text-sm sm:text-base text-slate-300 font-medium max-w-2xl mx-auto leading-relaxed">
            Just describe the problem. CivicNova AI uses AI to understand it, identify the responsible department, prioritize urgency and connect it with related incidents.
          </p>
        </div>
      </section>

      {/* 4. "ONE PLATFORM. EVERY CIVIC SIGNAL." (INTERACTIVE CIVIC SIGNAL NETWORK) */}
      <section id="civic-signals" className="py-12 sm:py-16 px-4 sm:px-6 max-w-7xl mx-auto w-full space-y-8">
        <div className="text-center max-w-2xl mx-auto space-y-1">
          <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-widest">INTERACTIVE CATEGORY NETWORK</span>
          <h2 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">ONE PLATFORM. EVERY CIVIC SIGNAL.</h2>
          <p className="text-xs text-slate-500 font-medium">CivicNova AI converts raw citizen reports into AI-classified, prioritized, and department-routed municipal actions.</p>
        </div>

        {/* 8 Category Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          {categories.map((cat) => {
            const IconComp = cat.icon;
            const isSelected = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center justify-center space-y-1.5 shadow-xs ${
                  isSelected
                    ? `${cat.bgColor} ${cat.borderColor} ring-2 ring-blue-500/40 font-bold scale-105`
                    : 'bg-white border-slate-200 hover:border-slate-300 text-slate-600'
                }`}
              >
                <IconComp className={`w-5 h-5 ${cat.color}`} />
                <span className="text-[11px] font-bold leading-tight text-slate-900">{cat.name}</span>
                <span className="text-[10px] font-mono text-slate-400">{cat.count} Signals</span>
              </button>
            );
          })}
        </div>

        {/* Expanded Category Detail Panel */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeCategory}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`p-6 sm:p-8 rounded-3xl border ${selectedCategoryObj.bgColor} ${selectedCategoryObj.borderColor} shadow-sm space-y-6`}
          >
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-2xl bg-white border ${selectedCategoryObj.borderColor} shadow-xs`}>
                  <selectedCategoryObj.icon className={`w-6 h-6 ${selectedCategoryObj.color}`} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">{selectedCategoryObj.name}</h3>
                  <p className="text-xs text-slate-600 font-semibold">{selectedCategoryObj.dept}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 font-mono text-xs">
                <span className="bg-white px-3 py-1.5 rounded-xl border border-slate-200 font-bold text-slate-900 shadow-xs">
                  {selectedCategoryObj.count} ACTIVE REPORTS
                </span>
                <span className="bg-purple-100 text-purple-900 px-3 py-1.5 rounded-xl border border-purple-200 font-bold">
                  AI ROUTED
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">HANDLED CIVIC ISSUES</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {selectedCategoryObj.issues.map((issue, idx) => (
                    <div key={idx} className="p-2.5 bg-white rounded-xl border border-slate-200 text-slate-800 font-semibold flex items-center gap-2 shadow-xs">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>{issue}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">AUTOMATED AI DISPATCH RECOMMENDATION</span>
                <div className="p-4 bg-white rounded-2xl border border-purple-200 shadow-xs space-y-2">
                  <div className="flex items-center gap-2 text-purple-700 font-bold text-xs">
                    <Brain className="w-4 h-4 text-purple-600" />
                    <span>AUTOMATED ACTION SCORE: 88/100</span>
                  </div>
                  <p className="text-xs text-slate-800 font-bold">{selectedCategoryObj.aiRec}</p>
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </section>

      {/* 5. "FROM PROBLEM TO RESPONSE" (5-STEP VISUAL FLOW) */}
      <section className="py-12 sm:py-16 bg-white border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-8">
          <div className="text-center max-w-xl mx-auto space-y-1">
            <span className="text-[11px] font-bold text-blue-600 uppercase tracking-widest">END-TO-END AUTOMATION</span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">FROM PROBLEM TO RESPONSE</h2>
            <p className="text-xs text-slate-500">How an unorganized report transforms into municipal action.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-center relative">
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-2 shadow-xs">
              <span className="text-[10px] font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">1. REPORT</span>
              <p className="text-xs font-bold text-slate-900">"Dirty water leaking from broken pipe"</p>
            </div>

            <div className="hidden md:flex justify-center text-blue-500">
              <ArrowRight className="w-5 h-5" />
            </div>

            <div className="p-5 rounded-2xl bg-purple-50 border border-purple-200 text-center space-y-2 shadow-xs">
              <span className="text-[10px] font-mono font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded">2. AI UNDERSTANDS</span>
              <p className="text-xs font-bold text-purple-950">Water & Drainage • HIGH Priority</p>
            </div>

            <div className="hidden md:flex justify-center text-purple-500">
              <ArrowRight className="w-5 h-5" />
            </div>

            <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200 text-center space-y-2 shadow-xs">
              <span className="text-[10px] font-mono font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">3. CONNECTS</span>
              <p className="text-xs font-bold text-amber-950">17 Nearby Reports • Gulshan Hotspot</p>
            </div>

            <div className="hidden md:flex justify-center text-amber-500">
              <ArrowRight className="w-5 h-5" />
            </div>

            <div className="p-5 rounded-2xl bg-blue-50 border border-blue-200 text-center space-y-2 shadow-xs">
              <span className="text-[10px] font-mono font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded">4. DEPARTMENT</span>
              <p className="text-xs font-bold text-blue-950">Water & Sewerage Board (KWSB)</p>
            </div>

            <div className="hidden md:flex justify-center text-emerald-500">
              <ArrowRight className="w-5 h-5" />
            </div>

            <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-2 shadow-xs">
              <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">5. ACTION</span>
              <p className="text-xs font-bold text-emerald-950">Emergency Crew Dispatched</p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. INTERACTIVE MINI-DEMO SIMULATOR */}
      <section id="demo-router" className="py-12 sm:py-16 px-4 sm:px-6 max-w-5xl mx-auto w-full space-y-6">
        <div className="text-center max-w-xl mx-auto space-y-1">
          <span className="text-[11px] font-bold text-purple-600 uppercase tracking-widest">LIVE AI ROUTING DEMO</span>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">TEST THE AI ROUTER</h2>
          <p className="text-xs text-slate-500 font-medium">Test real backend classification or local fallback on any civic description.</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-lg space-y-6">
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Type any civic complaint description:</label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={demoInput}
                onChange={(e) => setDemoInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && runSimulation(demoInput)}
                placeholder="e.g., '1100 voltages electric wire fallen'..."
                className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-600"
              />
              <button
                onClick={() => runSimulation(demoInput)}
                disabled={isSimulating || !demoInput.trim()}
                className="bg-purple-600 hover:bg-purple-700 text-white font-bold px-6 py-3 rounded-xl text-xs transition-colors flex items-center justify-center gap-2 shadow-xs shrink-0 disabled:opacity-50"
              >
                {isSimulating ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Analyzing civic signal...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Run AI Classification</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Loading Indicator */}
          {isSimulating && (
            <div className="p-6 bg-purple-50/60 rounded-2xl border border-purple-200 text-center space-y-2">
              <Loader2 className="w-6 h-6 text-purple-600 animate-spin mx-auto" />
              <p className="text-xs font-bold text-purple-900">Analyzing civic signal & routing department...</p>
            </div>
          )}

          {/* Classification Results */}
          <AnimatePresence mode="wait">
            {demoResult && !isSimulating && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4 text-xs"
              >
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 uppercase">AI CLASSIFICATION RESULTS</span>
                    {demoResult.category === 'ELECTRICITY' && demoResult.priority === 'CRITICAL' && (
                      <span className="text-[10px] font-bold bg-red-600 text-white px-2 py-0.5 rounded uppercase animate-pulse">
                        HAZARD SAFETY OVERRIDE
                      </span>
                    )}
                  </div>
                  <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200">
                    {Math.round((demoResult.confidence || 0.96) * 100)}% CONFIDENCE
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs space-y-0.5">
                    <span className="text-[10px] text-slate-400 font-bold block uppercase">CATEGORY</span>
                    <span className={`font-bold text-xs ${
                      demoResult.category === 'ELECTRICITY' ? 'text-red-600' :
                      demoResult.category === 'WATER' ? 'text-blue-600' :
                      demoResult.category === 'WASTE' ? 'text-emerald-600' : 'text-slate-900'
                    }`}>
                      {demoResult.category}
                    </span>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs space-y-0.5">
                    <span className="text-[10px] text-slate-400 font-bold block uppercase">URGENCY PRIORITY</span>
                    <span className={`font-bold text-xs ${
                      demoResult.priority === 'CRITICAL' ? 'text-red-700 bg-red-50 px-1.5 py-0.5 rounded border border-red-200 inline-block' : 'text-amber-700'
                    }`}>
                      {demoResult.priority}
                    </span>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs space-y-0.5">
                    <span className="text-[10px] text-slate-400 font-bold block uppercase">DETECTED LOCATION</span>
                    <span className="font-bold text-slate-900 text-xs">
                      {demoResult.location || (demoInput.toLowerCase().includes('gulshan') ? 'Gulshan-e-Iqbal' : 'Location required')}
                    </span>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs space-y-0.5">
                    <span className="text-[10px] text-slate-400 font-bold block uppercase">RESPONSIBLE DEPT</span>
                    <span className="font-bold text-slate-900 text-xs">
                      {demoResult.recommended_department || demoResult.department || 'General Administration'}
                    </span>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs space-y-0.5">
                    <span className="text-[10px] text-slate-400 font-bold block uppercase">RELATED SIGNALS</span>
                    <span className="font-bold text-purple-700 text-xs">
                      {demoResult.category === 'ELECTRICITY' ? '4 Safety Signals' : '17 Nearby Signals'}
                    </span>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs space-y-0.5">
                    <span className="text-[10px] text-slate-400 font-bold block uppercase">DISPATCH ACTION</span>
                    <span className="font-bold text-emerald-700 text-xs">
                      {getDispatchAction(demoResult.category, demoResult.priority)}
                    </span>
                  </div>
                </div>

                {demoResult.reasoning && (
                  <div className="p-3 bg-white rounded-xl border border-slate-200 text-[11px] text-slate-700 font-medium">
                    <strong className="font-bold text-slate-900">AI Rationale:</strong> {demoResult.reasoning}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* 7. "WHAT CAN I REPORT?" (PROBLEM CARDS GRID) */}
      <section className="py-12 sm:py-16 bg-white border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-8">
          <div className="text-center max-w-xl mx-auto space-y-1">
            <span className="text-[11px] font-bold text-blue-600 uppercase tracking-widest">CITIZEN COVERAGE</span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">WHAT CAN I REPORT?</h2>
            <p className="text-xs text-slate-500">Every infrastructure issue is automatically routed to its correct department.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {problemCards.map((card, i) => {
              const IconComponent = card.icon;
              return (
                <div key={i} className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 shadow-xs hover:border-blue-300 transition-colors">
                  <div className={`p-2.5 rounded-xl w-fit border ${card.color}`}>
                    <IconComponent className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">{card.title}</h3>
                  <p className="text-xs text-slate-600 font-medium leading-relaxed">{card.desc}</p>
                  <div className="pt-2 border-t border-slate-200/70 text-[10px] font-bold text-slate-500">
                    DEPT: <span className="text-slate-900">{card.dept}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 8. CITY INTELLIGENCE METRICS */}
      <section className="py-12 sm:py-14 px-4 sm:px-6 max-w-7xl mx-auto w-full space-y-6">
        <div className="text-center max-w-xl mx-auto space-y-1">
          <span className="text-[11px] font-bold text-blue-600 uppercase tracking-widest">REAL-TIME TELEMETRY</span>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">CITY INTELLIGENCE</h2>
          <p className="text-xs text-slate-500">Live operational data calculated from municipal signals.</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs text-center space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">TOTAL REPORTS</span>
            <span className="text-2xl sm:text-3xl font-mono font-black text-slate-900">{summary?.total_complaints || 55}</span>
          </div>

          <div className="p-4 rounded-2xl bg-red-50/80 border border-red-200 shadow-xs text-center space-y-1">
            <span className="text-[10px] font-bold text-red-600 uppercase tracking-wider block">CRITICAL</span>
            <span className="text-2xl sm:text-3xl font-mono font-black text-red-700">{summary?.critical || 6}</span>
          </div>

          <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 shadow-xs text-center space-y-1">
            <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">HIGH PRIORITY</span>
            <span className="text-2xl sm:text-3xl font-mono font-black text-amber-800">{summary?.high || 27}</span>
          </div>

          <div className="p-4 rounded-2xl bg-purple-50/80 border border-purple-200 shadow-xs text-center space-y-1">
            <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider block">ACTIVE HOTSPOTS</span>
            <span className="text-2xl sm:text-3xl font-mono font-black text-purple-900">{summary?.active_hotspots || 5}</span>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs text-center space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">ACTIVE ISSUES</span>
            <span className="text-2xl sm:text-3xl font-mono font-black text-blue-600">{summary?.open || 43}</span>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200 shadow-xs text-center space-y-1">
            <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">RESOLVED</span>
            <span className="text-2xl sm:text-3xl font-mono font-black text-emerald-700">{summary?.resolved || 12}</span>
          </div>
        </div>
      </section>

      {/* 9. FINAL CTA */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 max-w-5xl mx-auto w-full text-center space-y-4">
        <h2 className="text-2xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight">
          Your report could be the signal that changes what happens next.
        </h2>
        <p className="text-xs sm:text-sm text-slate-600 font-semibold max-w-md mx-auto">
          Report a problem. Give your city better intelligence.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
          <Link
            to="/report"
            className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-8 py-3.5 rounded-xl transition-all shadow-md shadow-emerald-600/20 text-sm"
          >
            REPORT A PROBLEM
          </Link>
          <Link
            to="/login"
            className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 text-white font-bold px-8 py-3.5 rounded-xl transition-all text-sm"
          >
            EXPLORE CIVICNOVA AI
          </Link>
        </div>
      </section>

      {/* 10. FOOTER */}
      <footer className="bg-white border-t border-slate-200 py-10 px-4 sm:px-6 text-xs text-slate-500 mt-auto">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div className="space-y-3">
            <Link to="/" className="flex items-center gap-2">
              <Radar className="w-6 h-6 text-emerald-600" />
              <span className="text-base font-black tracking-tight text-slate-900">CivicNova AI</span>
            </Link>
            <p className="text-slate-500 text-xs leading-relaxed font-medium">
              Every Report. Smarter Decisions. Better Cities. AI-powered civic intelligence & municipal response platform.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-slate-900 mb-3 uppercase tracking-wider text-[11px]">Navigation</h4>
            <ul className="space-y-2 text-slate-600 font-medium">
              <li><a href="#how-it-works" className="hover:text-blue-600 transition-colors">How It Works</a></li>
              <li><a href="#civic-signals" className="hover:text-blue-600 transition-colors">Civic Signals</a></li>
              <li><a href="#demo-router" className="hover:text-blue-600 transition-colors">AI Classification</a></li>
              <li><Link to="/track" className="hover:text-blue-600 transition-colors">Track Report</Link></li>
              <li><Link to="/login" className="hover:text-blue-600 transition-colors">Admin Login</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-slate-900 mb-3 uppercase tracking-wider text-[11px]">Platform Capabilities</h4>
            <ul className="space-y-2 text-slate-600 font-medium">
              <li><span className="hover:text-blue-600 transition-colors">AI Text & Photo Classification</span></li>
              <li><span className="hover:text-blue-600 transition-colors">Spatial Hotspot Detection</span></li>
              <li><span className="hover:text-blue-600 transition-colors">Incident Convergence Engine</span></li>
              <li><span className="hover:text-blue-600 transition-colors">Action Score Prioritization</span></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-slate-900 mb-3 uppercase tracking-wider text-[11px]">Operational Zone</h4>
            <p className="text-slate-600 font-medium leading-relaxed">
              Karachi Metropolitan Infrastructure Intelligence Zone. Connected to 8 municipal dispatch departments.
            </p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-400 font-medium">
          <p>© 2026 CivicNova AI • Every Report. Smarter Decisions. Better Cities.</p>
          <div className="flex items-center gap-6">
            <Link to="/report" className="hover:text-slate-700">Citizen Report</Link>
            <Link to="/track" className="hover:text-slate-700">Track Status</Link>
            <Link to="/login" className="hover:text-slate-700">Admin Login</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
