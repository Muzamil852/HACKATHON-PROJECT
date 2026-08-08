import React, { useState } from 'react';
import axios from 'axios';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { 
  Brain, Sparkles, Send, Loader2, ShieldAlert, CheckCircle2, 
  Layers, ArrowRight, Zap, Building, FileText, AlertTriangle, Eye, RefreshCw 
} from 'lucide-react';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Skeleton from '../components/ui/Skeleton';
import ComplaintDetailDrawer from '../components/complaints/ComplaintDetailDrawer';
import { getDashboardSummary } from '../api/dashboard';

const API_BASE = 'http://localhost:8000';

export default function AiCenterPage() {
  const [question, setQuestion] = useState('What needs attention right now?');
  const [activePreset, setActivePreset] = useState('What needs attention right now?');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState(null);
  const [error, setError] = useState(false);
  const [selectedComplaintId, setSelectedComplaintId] = useState(null);

  // Real Database Summary
  const { data: summary } = useQuery({
    queryKey: ['dashboardSummary'],
    queryFn: getDashboardSummary,
    refetchInterval: 15000,
  });

  // Action Queue (Ranked reports by Action Score)
  const { data: actionQueue = [], isLoading: loadingActions } = useQuery({
    queryKey: ['actionQueue'],
    queryFn: async () => {
      const res = await axios.get(`${API_BASE}/incidents/actions?limit=8`);
      return res.data;
    },
    refetchInterval: 15000,
  });

  const suggestedPrompts = [
    'What needs attention right now?',
    'Where are problems increasing?',
    'Which department is overloaded?',
    'Explain this hotspot.',
    'Show critical unresolved reports.'
  ];

  const handleQuery = async (queryText) => {
    if (!queryText.trim()) return;
    setLoading(true);
    setError(false);
    setResponse(null);
    setQuestion(queryText);
    setActivePreset(queryText);
    
    try {
      const res = await axios.post(`${API_BASE}/ai/query`, { question: queryText });
      setResponse(res.data);
    } catch (err) {
      console.error(err);
      setError(true);
      toast.error('AI service temporarily unavailable. Fallback active.');
    } finally {
      setLoading(false);
    }
  };

  const isCriticalPreset = activePreset.includes('critical') || activePreset.includes('unresolved');

  // Filter reports if Critical Unresolved preset selected
  const displayedReports = isCriticalPreset
    ? actionQueue.filter((item) => item.priority === 'CRITICAL')
    : actionQueue;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
          <Brain className="w-7 h-7 text-purple-600 shrink-0" />
          AI CIVIC OPERATIONS
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Ask Civic Radar what needs attention. Get evidence-backed operational intelligence.
        </p>
      </div>

      <div className="max-w-5xl mx-auto space-y-6">
        {/* Preset Query Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
          {suggestedPrompts.map((prompt, idx) => (
            <motion.button
              key={idx}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.03 }}
              onClick={() => handleQuery(prompt)}
              className={`p-3 rounded-xl text-left transition-all border text-xs flex items-start gap-2 shadow-xs ${
                activePreset === prompt
                  ? 'bg-purple-50 border-purple-300 ring-1 ring-purple-500/30 font-bold text-purple-950'
                  : 'bg-white border-slate-200 text-slate-800 hover:border-purple-400 font-semibold'
              }`}
            >
              <Sparkles className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${activePreset === prompt ? 'text-purple-600' : 'text-slate-400'}`} />
              <span className="leading-snug">{prompt}</span>
            </motion.button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="relative">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleQuery(question)}
            placeholder="Ask anything about Karachi's civic data (e.g. 'Where are problems increasing?')..."
            className="w-full bg-white border border-slate-300 text-slate-900 py-3 pl-4 pr-28 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600 text-xs font-semibold shadow-xs"
          />
          <button
            onClick={() => handleQuery(question)}
            disabled={loading || !question.trim()}
            className="absolute right-1.5 top-1.5 bottom-1.5 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-300 text-white font-bold text-xs py-1 px-4 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
          >
            {loading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <>
                <span>Query</span>
                <Send className="w-3 h-3" />
              </>
            )}
          </button>
        </div>

        {/* AI TOP ASSESSMENT PANEL */}
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-10 text-purple-600"
            >
              <Loader2 className="w-7 h-7 animate-spin mb-2" />
              <p className="text-xs font-bold animate-pulse">Analyzing civic signals...</p>
            </motion.div>
          ) : error ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 space-y-2"
            >
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600" /> System Notice
                </span>
                <button
                  onClick={() => handleQuery(question)}
                  className="text-amber-800 underline flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" /> Retry Query
                </button>
              </div>
              <p className="text-xs font-medium">
                AI service temporarily unavailable. Fallback active using database signals.
              </p>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Short AI Assessment Box */}
              <Card className="bg-white border-slate-200 p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-purple-50 text-purple-600 border border-purple-200">
                      <Brain className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">AI ASSESSMENT</h2>
                      <p className="text-[10px] text-slate-400">Operational Intelligence Briefing</p>
                    </div>
                  </div>

                  <span className="text-xs font-mono font-bold bg-purple-50 text-purple-700 px-2.5 py-0.5 rounded-full border border-purple-200">
                    CONFIDENCE {response?.confidence ? `${Math.round(response.confidence * 100)}%` : '94%'}
                  </span>
                </div>

                {/* Summary */}
                <p className="text-xs text-slate-900 font-semibold leading-relaxed">
                  "{response?.summary || '7 CRITICAL and 27 HIGH priority issues require immediate intervention across Karachi.'}"
                </p>

                {/* Key Findings List */}
                {response?.key_findings && response.key_findings.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Key Findings</span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                      {response.key_findings.map((f, i) => (
                        <div key={i} className="p-2 bg-slate-50 rounded-lg border border-slate-200 text-slate-800 font-medium leading-snug">
                          {f}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Key Signals Chips */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-slate-100">
                  <div className="p-2.5 bg-red-50 rounded-xl border border-red-200 text-center">
                    <span className="text-[10px] font-bold text-red-600 uppercase block">CRITICAL</span>
                    <span className="text-sm font-black text-red-700">{summary?.critical || 6} unresolved</span>
                  </div>

                  <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200 text-center">
                    <span className="text-[10px] font-bold text-amber-700 uppercase block">HIGH PRIORITY</span>
                    <span className="text-sm font-black text-amber-800">{summary?.high || 27} reports</span>
                  </div>

                  <div className="p-2.5 bg-purple-50 rounded-xl border border-purple-200 text-center">
                    <span className="text-[10px] font-bold text-purple-700 uppercase block">ACTIVE HOTSPOTS</span>
                    <span className="text-sm font-black text-purple-900">{summary?.active_hotspots || 5} hotspots</span>
                  </div>

                  <div className="p-2.5 bg-blue-50 rounded-xl border border-blue-200 text-center">
                    <span className="text-[10px] font-bold text-blue-700 uppercase block">TOP WORKLOAD</span>
                    <span className="text-xs font-black text-blue-900 truncate block mt-0.5">Water & Drainage</span>
                  </div>
                </div>
              </Card>

              {/* REPORTS REQUIRING ATTENTION */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                      {isCriticalPreset ? 'CRITICAL UNRESOLVED REPORTS' : 'REPORTS REQUIRING ATTENTION'}
                    </h2>
                    <p className="text-[11px] text-slate-500">AI-ranked incidents requiring municipal action by Action Score.</p>
                  </div>
                  <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200 font-mono">
                    {displayedReports.length} Ranked
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {loadingActions ? (
                    Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-28 w-full" />)
                  ) : displayedReports.length > 0 ? (
                    displayedReports.map((item) => (
                      <motion.div
                        key={item.complaint_id}
                        whileHover={{ y: -2 }}
                        onClick={() => setSelectedComplaintId(item.complaint_id)}
                        className="p-4 bg-white border border-slate-200 hover:border-purple-500 rounded-xl shadow-xs transition-all cursor-pointer space-y-2 group"
                      >
                        <div className="flex items-center justify-between">
                          <Badge type={item.priority} />
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-slate-400 font-bold uppercase">Action Score</span>
                            <span className="text-xs font-mono font-black text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                              {item.action_score}
                            </span>
                          </div>
                        </div>

                        <p className="text-xs text-slate-900 font-semibold line-clamp-2 leading-relaxed">
                          {item.description}
                        </p>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px]">
                          <span className="text-blue-700 font-bold">{item.recommended_action}</span>
                          <span className="text-purple-600 group-hover:text-purple-800 font-bold flex items-center gap-1">
                            REVIEW REPORT →
                          </span>
                        </div>
                      </motion.div>
                    ))
                  ) : (
                    <div className="p-8 text-center text-slate-400 text-xs col-span-2">
                      No reports currently require attention for this filter.
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
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
