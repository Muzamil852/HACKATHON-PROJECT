import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { useSearchParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { Radar, Search, MapPin, Building, Calendar, Brain, CheckCircle2, RefreshCw } from 'lucide-react';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Skeleton from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';



export default function TrackingPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialId = searchParams.get('id') || '';
  const [searchId, setSearchId] = useState(initialId);
  const [complaint, setComplaint] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const fetchComplaint = async (id) => {
    if (!id) return;
    setLoading(true);
    setError(false);
    try {
      const response = await api.get(`/complaints/${id}`);
      setComplaint(response.data);
      setSearchParams({ id });
    } catch (err) {
      console.error(err);
      setComplaint(null);
      setError(true);
      if (err.response && err.response.status === 404) {
        toast.error('Complaint not found.');
      } else {
        toast.error('Failed to fetch complaint details.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialId) {
      fetchComplaint(initialId);
    }
  }, [initialId]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchId.trim()) {
      fetchComplaint(searchId.trim());
    }
  };

  const getTimelineSteps = (data) => {
    const s = data.status;
    return [
      { name: 'SUBMITTED', done: true, current: s === 'OPEN' && !data.ai_summary },
      { name: 'AI ANALYZED', done: Boolean(data.ai_summary), current: s === 'OPEN' && Boolean(data.ai_summary) },
      { name: 'ASSIGNED', done: ['ASSIGNED', 'IN_PROGRESS', 'RESOLVED'].includes(s), current: s === 'ASSIGNED' },
      { name: 'IN PROGRESS', done: ['IN_PROGRESS', 'RESOLVED'].includes(s), current: s === 'IN_PROGRESS' },
      { name: 'RESOLVED', done: s === 'RESOLVED', current: s === 'RESOLVED' },
    ];
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Radar className="w-7 h-7 text-emerald-600" />
            <span className="text-xl font-bold tracking-tight text-slate-900">CivicNova AI</span>
          </Link>
          <div className="flex items-center gap-4 text-xs font-semibold">
            <Link to="/report" className="text-blue-600 hover:underline">Report Problem</Link>
            <Link to="/login" className="bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors">Admin Login</Link>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-10 space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Track Complaint Status</h1>
          <p className="text-sm text-slate-500">Enter your tracking ID to view live dispatch timeline and AI classification.</p>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="flex justify-center">
          <div className="relative w-full max-w-xl">
            <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
              placeholder="Paste Tracking ID (e.g. 5914fc82...)..."
              className="w-full bg-white border border-slate-300 text-slate-900 py-3.5 pl-12 pr-32 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 shadow-sm text-sm"
            />
            <button
              type="submit"
              className="absolute right-2 top-2 bottom-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 rounded-lg transition-colors text-xs flex items-center gap-1.5"
            >
              Search
            </button>
          </div>
        </form>

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-64 w-full rounded-2xl bg-white" />
          </div>
        ) : error ? (
          <EmptyState
            title="Complaint Not Found"
            description="We couldn't locate a report matching that tracking ID. Please verify the ID and try again."
          />
        ) : complaint ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Timeline Sidebar */}
            <div className="md:col-span-1 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-6">Dispatch Timeline</h3>
              <div className="space-y-6">
                {getTimelineSteps(complaint).map((step, idx) => (
                  <div key={step.name} className="flex items-start">
                    <div className="flex flex-col items-center mr-3">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs z-10 
                        ${step.done ? 'bg-emerald-600 text-white' : step.current ? 'bg-blue-600 text-white animate-pulse' : 'bg-slate-100 text-slate-400 border border-slate-200'}`}
                      >
                        {step.done ? '✓' : idx + 1}
                      </div>
                      {idx < 4 && (
                        <div className={`w-0.5 h-10 mt-1 ${step.done ? 'bg-emerald-600' : 'bg-slate-200'}`}></div>
                      )}
                    </div>
                    <div className="pt-0.5">
                      <p className={`text-xs font-bold ${step.done || step.current ? 'text-slate-900' : 'text-slate-400'}`}>
                        {step.name}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Dossier Card */}
            <div className="md:col-span-2 space-y-6">
              <Card className="p-6 bg-white border-slate-200 shadow-sm space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tracking ID</span>
                    <p className="font-mono text-sm font-bold text-blue-600">{complaint.complaint_id}</p>
                  </div>
                  <Badge type={complaint.status} variant="status" />
                </div>

                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Description</h4>
                  <p className="text-sm text-slate-800 leading-relaxed font-medium">{complaint.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-slate-400 block text-[10px]">Location</span>
                    <span className="font-semibold text-slate-800 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 text-blue-600 shrink-0" /> {complaint.location || 'Karachi'}
                    </span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-slate-400 block text-[10px]">Assigned Department</span>
                    <span className="font-semibold text-slate-800 flex items-center gap-1 mt-0.5">
                      <Building className="w-3 h-3 text-blue-600 shrink-0" /> {complaint.recommended_department || 'General Administration'}
                    </span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-slate-400 block text-[10px]">Category</span>
                    <Badge type={complaint.category} variant="category" className="mt-1" />
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-slate-400 block text-[10px]">Priority</span>
                    <Badge type={complaint.priority} className="mt-1" />
                  </div>
                </div>
              </Card>

              {/* AI Classification Details */}
              {complaint.ai_summary && (
                <Card className="p-6 bg-blue-50/50 border-blue-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Brain className="w-4 h-4 text-blue-600" /> AI Classification Assessment
                    </span>
                    {complaint.ai_confidence && (
                      <span className="text-xs font-mono font-bold text-blue-700">
                        {Math.round(complaint.ai_confidence * 100)}% Confidence
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-700 font-medium leading-relaxed">
                    "{complaint.ai_summary}"
                  </p>

                  {complaint.ai_reasoning && (
                    <p className="text-[11px] text-slate-500 leading-relaxed border-t border-blue-200/60 pt-2">
                      <strong>Reasoning:</strong> {complaint.ai_reasoning}
                    </p>
                  )}
                </Card>
              )}
            </div>
          </div>
        ) : (
          !initialId && (
            <div className="text-center text-slate-400 text-xs mt-8">
              Paste a Tracking ID above to inspect status & live dispatch.
            </div>
          )
        )}
      </main>
    </div>
  );
}
