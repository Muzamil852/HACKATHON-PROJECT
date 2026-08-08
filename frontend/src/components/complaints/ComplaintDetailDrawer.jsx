import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import { 
  X, Copy, Check, MapPin, Calendar, Building, AlertTriangle, 
  Brain, CheckCircle2, User, Phone, Layers, RefreshCw, ShieldCheck, Maximize2,
  Zap, Link as LinkIcon, TrendingUp, Send, AlertCircle, PhoneCall, ShieldAlert,
  Clock, FileText, CheckCircle
} from 'lucide-react';
import { getComplaint, updateComplaint, getSimilarComplaints, getComplaintExplainability } from '../../api/complaints';
import { getDepartmentContact, createDispatchAction, getDispatchLogs } from '../../api/departments';
import Badge from '../ui/Badge';
import { toast } from 'react-hot-toast';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Helper component to trigger Leaflet size recalculation after drawer mount
function MapResizer() {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => {
      if (map) {
        map.invalidateSize();
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
}

export default function ComplaintDetailDrawer({ complaintId, onClose }) {
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);
  const [showLightbox, setShowLightbox] = useState(false);

  // Modals state for Contact, Dispatch & Send Details
  const [showContactModal, setShowContactModal] = useState(false);
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [showSendDetailsModal, setShowSendDetailsModal] = useState(false);
  const [dispatchSuccess, setDispatchSuccess] = useState(null);
  const [includeReporterInfo, setIncludeReporterInfo] = useState(false);

  const { data: complaint, isLoading, isError } = useQuery({
    queryKey: ['complaint', complaintId],
    queryFn: () => getComplaint(complaintId),
    enabled: Boolean(complaintId),
  });

  const { data: similar = [] } = useQuery({
    queryKey: ['similarComplaints', complaintId],
    queryFn: () => getSimilarComplaints(complaintId),
    enabled: Boolean(complaintId),
  });

  const { data: explainability } = useQuery({
    queryKey: ['explainability', complaintId],
    queryFn: () => getComplaintExplainability(complaintId),
    enabled: Boolean(complaintId),
  });

  const [status, setStatus] = useState('OPEN');
  const [priority, setPriority] = useState('MEDIUM');
  const [dept, setDept] = useState('');

  useEffect(() => {
    if (complaint) {
      setStatus(complaint.status || 'OPEN');
      setPriority(complaint.priority || 'MEDIUM');
      setDept(complaint.assigned_department || complaint.recommended_department || 'General Administration');
    }
  }, [complaint]);

  // Fetch canonical department contact details from DB
  const { data: deptContact } = useQuery({
    queryKey: ['deptContact', dept],
    queryFn: () => getDepartmentContact(dept || 'General Administration'),
    enabled: Boolean(dept),
  });

  // Fetch recorded dispatch & contact logs for timeline
  const { data: dispatchLogs = [], refetch: refetchLogs } = useQuery({
    queryKey: ['dispatchLogs', complaintId],
    queryFn: () => getDispatchLogs(complaintId),
    enabled: Boolean(complaintId),
  });

  // Lock body scroll & handle Escape key
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const updateMutation = useMutation({
    mutationFn: (updatedFields) => updateComplaint(complaintId, updatedFields),
    onSuccess: () => {
      toast.success('Complaint updated successfully');
      queryClient.invalidateQueries(['complaint', complaintId]);
      queryClient.invalidateQueries(['complaints']);
      queryClient.invalidateQueries(['dashboardSummary']);
    },
    onError: () => {
      toast.error('Failed to update complaint');
    },
  });

  const dispatchMutation = useMutation({
    mutationFn: (payload) => createDispatchAction(complaintId, payload),
    onSuccess: (res) => {
      setDispatchSuccess(res);
      refetchLogs();
      queryClient.invalidateQueries(['complaint', complaintId]);
      queryClient.invalidateQueries(['complaints']);
      toast.success(res.message || 'Dispatch action recorded');
    },
    onError: () => {
      toast.error('Failed to record dispatch request');
    },
  });

  const handleCopyId = () => {
    if (complaintId) {
      navigator.clipboard.writeText(complaintId);
      setCopied(true);
      toast.success('Complaint ID copied');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleStatusChange = (newStatus) => {
    setStatus(newStatus);
    updateMutation.mutate({ status: newStatus });
  };

  const handlePriorityChange = (newPriority) => {
    setPriority(newPriority);
    updateMutation.mutate({ priority: newPriority });
  };

  const handleDeptChange = (newDept) => {
    setDept(newDept);
    updateMutation.mutate({ assigned_department: newDept });
  };

  const handleInitiateContact = () => {
    dispatchMutation.mutate({
      action_type: 'CONTACT_INITIATED',
      department_name: deptContact?.name || dept,
      notes: 'Contact initiated by Administrator',
    });
    setShowContactModal(true);
  };

  const handleConfirmDispatch = () => {
    dispatchMutation.mutate({
      action_type: 'DISPATCH_EMERGENCY',
      department_name: deptContact?.name || dept,
      include_reporter_contact: includeReporterInfo,
      notes: 'Emergency dispatch request created by Administrator',
    });
    setShowDispatchModal(false);
  };

  const handleSendDetails = () => {
    dispatchMutation.mutate({
      action_type: 'DETAILS_SENT',
      department_name: deptContact?.name || dept,
      notes: 'Structured incident summary transmitted to department control room',
    });
    setShowSendDetailsModal(true);
  };

  const formatStructuredSummary = () => {
    if (!complaint) return '';
    return `CIVIC RADAR — INCIDENT DISPATCH SUMMARY
----------------------------------------
Complaint ID: ${complaint.complaint_id}
Category: ${complaint.category || 'OTHER'}
Priority: ${complaint.priority || 'MEDIUM'}
Location: ${complaint.location || 'Karachi'}
Department: ${deptContact?.name || dept}
Control Room Phone: ${deptContact?.phone || '+92-21-9920-1111 (DEMO)'}

ISSUE DESCRIPTION:
${complaint.description}

AI ASSESSMENT & REASONING:
Summary: ${complaint.ai_summary || 'N/A'}
Reasoning: ${complaint.ai_reasoning || 'N/A'}
Confidence: ${Math.round((complaint.ai_confidence || 0.94) * 100)}%

RECOMMENDED ACTION:
${explainability?.recommended_action || 'Emergency municipal inspection'}

${includeReporterInfo ? `REPORTER INFORMATION:\nName: ${complaint.citizen_name || 'N/A'}\nContact: ${complaint.citizen_contact || 'N/A'}` : 'REPORTER INFORMATION: Kept Confidential by Administrator Option'}
----------------------------------------
Transmitted via Civic Radar Municipal Command Center`;
  };

  if (!complaintId) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[900] overflow-hidden flex justify-end">
        {/* Dimmed Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-[900]"
        />

        {/* Drawer Panel */}
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 220 }}
          className="relative w-full max-w-full sm:max-w-2xl sm:w-[720px] bg-white border-l border-slate-200 shadow-2xl h-full flex flex-col z-[1000] overflow-hidden text-slate-900"
          style={{ isolation: 'isolate' }}
        >
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0 z-10">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-blue-50 border border-blue-200 text-blue-600">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-slate-500 font-semibold">ID: {complaintId.slice(0, 12)}...</span>
                  <button
                    onClick={handleCopyId}
                    className="text-slate-400 hover:text-slate-700 transition-colors p-1"
                    title="Copy full ID"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <h2 className="text-base font-bold text-slate-900">Complaint Dossier</h2>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-900 hover:bg-slate-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Drawer Body - Scrollable */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 text-blue-600">
                <RefreshCw className="w-8 h-8 animate-spin mb-3" />
                <p className="text-xs font-semibold">Loading dossier details...</p>
              </div>
            ) : isError || !complaint ? (
              <div className="p-8 text-center text-red-600 text-xs">
                Failed to load complaint details.
              </div>
            ) : (
              <>
                {/* Status Ribbon */}
                <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge type={complaint.priority} />
                    <Badge type={complaint.category} variant="category" />
                    <Badge type={complaint.status} variant="status" />
                  </div>
                  <div className="text-xs text-slate-500 flex items-center gap-1.5 font-medium">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    {complaint.created_at ? new Date(complaint.created_at).toLocaleString() : 'N/A'}
                  </div>
                </div>

                {/* Description */}
                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Description</h3>
                  <p className="text-xs text-slate-900 bg-slate-50 p-4 rounded-xl border border-slate-200 leading-relaxed font-medium">
                    {complaint.description}
                  </p>
                </div>

                {/* ── FEATURE 1: AI EXPLAINABILITY ("WHY WAS THIS FLAGGED?") ── */}
                <div className="p-5 rounded-2xl bg-gradient-to-br from-purple-50/80 via-white to-blue-50/50 border border-purple-200 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-purple-100 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-purple-600 text-white shadow-2xs">
                        <Brain className="w-4 h-4" />
                      </div>
                      <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                        WHY THIS WAS FLAGGED
                      </h3>
                    </div>
                    {explainability && (
                      <span className="text-[10px] font-mono font-bold bg-purple-100 text-purple-800 px-2 py-0.5 rounded border border-purple-200">
                        {Math.round((explainability.ai_confidence || 0.94) * 100)}% CONFIDENCE
                      </span>
                    )}
                  </div>

                  {explainability ? (
                    <div className="space-y-3 text-xs">
                      {/* Reason Paragraphs */}
                      <div className="space-y-2">
                        <div className="p-3 bg-white/90 rounded-xl border border-purple-200/80 space-y-1">
                          <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider block">CATEGORY REASON</span>
                          <p className="text-xs text-slate-800 font-medium leading-relaxed">
                            {explainability.category_reason}
                          </p>
                        </div>

                        <div className="p-3 bg-white/90 rounded-xl border border-amber-200/80 space-y-1">
                          <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">PRIORITY REASON</span>
                          <p className="text-xs text-slate-800 font-medium leading-relaxed">
                            {explainability.priority_reason}
                          </p>
                        </div>
                      </div>

                      {/* Evidence Signals Grid */}
                      <div className="space-y-1.5 pt-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">DETECTED EVIDENCE SIGNALS</span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {explainability.evidence_items?.map((ev, i) => (
                            <div key={i} className="p-2.5 bg-white rounded-xl border border-slate-200 flex items-center gap-2.5 shadow-2xs">
                              {ev.tag === 'HAZARD' && <Zap className="w-4 h-4 text-red-600 shrink-0" />}
                              {ev.tag === 'SIGNALS' && <LinkIcon className="w-4 h-4 text-purple-600 shrink-0" />}
                              {ev.tag === 'HOTSPOT' && <MapPin className="w-4 h-4 text-amber-600 shrink-0" />}
                              {ev.tag === 'PRIORITY' && <TrendingUp className="w-4 h-4 text-blue-600 shrink-0" />}
                              <span className="text-[11px] font-medium text-slate-700 leading-tight">{ev.text}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Recommended Action Pill */}
                      <div className="p-3 bg-blue-50/80 rounded-xl border border-blue-200 flex items-center justify-between gap-2 mt-2">
                        <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wider">RECOMMENDED ACTION</span>
                        <span className="text-xs font-bold text-slate-900 bg-white px-3 py-1 rounded-lg border border-blue-200 shadow-2xs">
                          {explainability.recommended_action}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="py-4 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-purple-600" />
                      <span>Evaluating empirical explainability signals...</span>
                    </div>
                  )}
                </div>

                {/* ── FEATURE 2: RESPONSIBLE DEPARTMENT & OPERATIONAL CONTACT / DISPATCH ── */}
                <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <Building className="w-4 h-4 text-blue-600 shrink-0" />
                      <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                        RESPONSIBLE DEPARTMENT & DISPATCH
                      </h3>
                    </div>
                    {/* Configured Availability Status Badge */}
                    <span className={`text-[10px] font-mono font-bold px-2.5 py-1 rounded-full border flex items-center gap-1.5 ${
                      deptContact?.availability_status === 'AVAILABLE' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                      deptContact?.availability_status === 'BUSY' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                      'bg-slate-100 text-slate-600 border-slate-200'
                    }`}>
                      <span className={`w-2 h-2 rounded-full ${
                        deptContact?.availability_status === 'AVAILABLE' ? 'bg-emerald-500 animate-pulse' :
                        deptContact?.availability_status === 'BUSY' ? 'bg-amber-500' : 'bg-slate-400'
                      }`}></span>
                      ● {deptContact?.availability_status || 'AVAILABLE'} (Configured)
                    </span>
                  </div>

                  {/* Department Information Box */}
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-black text-slate-900">{deptContact?.name || dept}</h4>
                      <span className="text-[10px] font-mono font-bold text-slate-400">{deptContact?.code || 'DEPT'}</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600 pt-1">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Control Room</span>
                        <span className="font-semibold text-slate-800">{deptContact?.control_room || 'Control Room'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Configured Phone</span>
                        <span className="font-mono font-bold text-blue-700">{deptContact?.phone || '+92-21-9920-1111 (DEMO)'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Dispatch Success Alert Banner */}
                  {dispatchSuccess && (
                    <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1">
                      <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>✓ {dispatchSuccess.status || 'DISPATCH REQUEST CREATED'}</span>
                      </div>
                      <p className="text-xs text-emerald-700 font-medium">
                        {dispatchSuccess.message} — Logged at {dispatchSuccess.timestamp}
                      </p>
                    </div>
                  )}

                  {/* 3 Operational Action Buttons */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                    <button
                      onClick={handleInitiateContact}
                      className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-2 border border-slate-200 shadow-2xs"
                    >
                      <PhoneCall className="w-3.5 h-3.5 text-blue-600" />
                      <span>📞 Contact Dept</span>
                    </button>

                    <button
                      onClick={() => setShowDispatchModal(true)}
                      className="py-2.5 px-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-2 shadow-xs"
                    >
                      <ShieldAlert className="w-3.5 h-3.5 text-white" />
                      <span>🚨 Dispatch Team</span>
                    </button>

                    <button
                      onClick={handleSendDetails}
                      className="py-2.5 px-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-2 shadow-xs"
                    >
                      <Send className="w-3.5 h-3.5 text-white" />
                      <span>✉ Send Details</span>
                    </button>
                  </div>
                </div>

                {/* Location & Map Boundary */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-blue-600" /> Location Marker
                  </span>
                  <p className="text-xs text-slate-900 font-bold">{complaint.location || 'Karachi'}</p>

                  <div className="dossier-map-wrapper relative w-full h-[260px] sm:h-[320px] rounded-xl overflow-hidden z-0 border border-slate-200" style={{ isolation: 'isolate' }}>
                    <div className="dossier-map w-full h-full relative overflow-hidden">
                      <MapContainer
                        center={[complaint.latitude || 24.87, complaint.longitude || 67.05]}
                        zoom={14}
                        style={{ height: '100%', width: '100%', position: 'relative' }}
                        zoomControl={false}
                      >
                        <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
                        <Marker position={[complaint.latitude || 24.87, complaint.longitude || 67.05]} />
                        <MapResizer />
                      </MapContainer>
                    </div>

                    <div className="absolute bottom-3 left-3 z-[400] bg-white/90 backdrop-blur-xs px-2.5 py-1.5 rounded-lg border border-slate-200 text-[10px] space-y-1 font-semibold shadow-xs">
                      <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-blue-600"></div> Complaint Pin</div>
                    </div>
                  </div>
                </div>

                {/* Authorized Reporter Verification */}
                <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-200 space-y-1.5">
                  <span className="text-xs font-bold text-blue-800 uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-600" /> Authorized Reporter Verification
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">Full Name</span>
                      <p className="text-xs text-slate-900 font-bold flex items-center gap-1.5 mt-0.5">
                        <User className="w-3.5 h-3.5 text-blue-600" /> {complaint.citizen_name || 'Anonymous Citizen'}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">Phone Contact</span>
                      <p className="text-xs text-slate-900 font-bold flex items-center gap-1.5 mt-0.5">
                        <Phone className="w-3.5 h-3.5 text-blue-600" /> {complaint.citizen_contact || 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Photo Evidence */}
                {complaint.image_path && (
                  <div className="space-y-2">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Photo Evidence</h3>
                    <div className="w-full max-h-[280px] overflow-hidden rounded-xl bg-slate-50 border border-slate-200 relative group">
                      <img
                        src={`http://localhost:8000${complaint.image_path}`}
                        alt="Evidence"
                        className="w-full h-full max-h-[280px] object-contain"
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                      <button
                        onClick={() => setShowLightbox(true)}
                        className="absolute bottom-2 right-2 bg-slate-900/80 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Maximize2 className="w-3.5 h-3.5" /> Expand Evidence
                      </button>
                    </div>
                  </div>
                )}

                {/* Related Complaints */}
                {similar.length > 0 && (
                  <div>
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                      Related Incidents ({similar.length})
                    </h3>
                    <div className="space-y-2">
                      {similar.map((sim) => (
                        <div key={sim.complaint_id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-center justify-between">
                          <p className="text-slate-700 truncate pr-2 font-medium">{sim.description_snippet}</p>
                          <span className="font-mono font-bold text-blue-600 shrink-0">
                            {Math.round(sim.combined_score * 100)}% match
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── ACTION TIMELINE & AUDIT LOG ── */}
                <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-200 pb-2">
                    <Clock className="w-4 h-4 text-blue-600" /> Complaint Timeline & Action Log
                  </h3>

                  <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 text-xs">
                    {/* Stage 1: Submitted */}
                    <div className="relative flex items-start justify-between gap-2">
                      <div className="absolute -left-[23px] top-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white ring-2 ring-emerald-100"></div>
                      <div>
                        <span className="font-bold text-slate-900 block">SUBMITTED</span>
                        <span className="text-[11px] text-slate-500 font-medium">Report submitted by citizen</span>
                      </div>
                      <span className="font-mono text-[10px] text-slate-400">
                        {complaint.created_at ? new Date(complaint.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>
                    </div>

                    {/* Stage 2: AI Analyzed */}
                    <div className="relative flex items-start justify-between gap-2">
                      <div className="absolute -left-[23px] top-0.5 w-3 h-3 rounded-full bg-purple-500 border-2 border-white ring-2 ring-purple-100"></div>
                      <div>
                        <span className="font-bold text-slate-900 block">AI ANALYZED</span>
                        <span className="text-[11px] text-purple-700 font-medium">Classified as {complaint.category} ({complaint.priority})</span>
                      </div>
                      <span className="font-mono text-[10px] text-purple-600 font-bold">
                        {Math.round((complaint.ai_confidence || 0.94) * 100)}% Confidence
                      </span>
                    </div>

                    {/* Recorded Dispatch Actions */}
                    {dispatchLogs.map((log) => (
                      <div key={log.dispatch_id} className="relative flex items-start justify-between gap-2">
                        <div className="absolute -left-[23px] top-0.5 w-3 h-3 rounded-full bg-blue-600 border-2 border-white ring-2 ring-blue-100"></div>
                        <div>
                          <span className="font-bold text-blue-900 block">{log.status}</span>
                          <span className="text-[11px] text-slate-700 font-medium">{log.notes || log.department_name}</span>
                        </div>
                        <span className="font-mono text-[10px] text-slate-400">
                          {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    ))}

                    {/* Stage 3: Current Status */}
                    <div className="relative flex items-start justify-between gap-2">
                      <div className={`absolute -left-[23px] top-0.5 w-3 h-3 rounded-full border-2 border-white ${
                        status === 'RESOLVED' ? 'bg-emerald-500 ring-2 ring-emerald-100' : 'bg-amber-500 ring-2 ring-amber-100 animate-pulse'
                      }`}></div>
                      <div>
                        <span className="font-bold text-slate-900 block">CURRENT STATUS: {status}</span>
                        <span className="text-[11px] text-slate-500 font-medium">Assigned to {dept}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Status & Assignment Selectors */}
                <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm space-y-4">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Operational Controls
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 mb-1">Status</label>
                      <select
                        value={status}
                        onChange={(e) => handleStatusChange(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-2 text-xs text-slate-900 font-semibold focus:outline-none focus:border-blue-600"
                      >
                        <option value="OPEN">OPEN</option>
                        <option value="ASSIGNED">ASSIGNED</option>
                        <option value="IN_PROGRESS">IN_PROGRESS</option>
                        <option value="RESOLVED">RESOLVED</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 mb-1">Priority</label>
                      <select
                        value={priority}
                        onChange={(e) => handlePriorityChange(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-2 text-xs text-slate-900 font-semibold focus:outline-none focus:border-blue-600"
                      >
                        <option value="CRITICAL">CRITICAL</option>
                        <option value="HIGH">HIGH</option>
                        <option value="MEDIUM">MEDIUM</option>
                        <option value="LOW">LOW</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 mb-1">Assigned Dept</label>
                      <select
                        value={dept}
                        onChange={(e) => handleDeptChange(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-2 text-xs text-slate-900 font-semibold focus:outline-none focus:border-blue-600"
                      >
                        <option value="Water & Drainage">Water & Drainage</option>
                        <option value="Roads & Infrastructure">Roads & Infrastructure</option>
                        <option value="Waste Management">Waste Management</option>
                        <option value="Electrical Services">Electrical Services</option>
                        <option value="Public Safety">Public Safety</option>
                        <option value="Municipal Services">Municipal Services</option>
                        <option value="General Administration">General Administration</option>
                      </select>
                    </div>
                  </div>

                  {status !== 'RESOLVED' && (
                    <button
                      onClick={() => handleStatusChange('RESOLVED')}
                      className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-xs"
                    >
                      <CheckCircle2 className="w-4 h-4" /> Mark Complaint Resolved
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </motion.div>

        {/* ── MODAL 1: CONTACT DEPARTMENT ── */}
        {showContactModal && (
          <div className="fixed inset-0 z-[1100] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4 text-slate-900">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-black text-slate-900 uppercase">CONTACT {deptContact?.name?.toUpperCase() || dept.toUpperCase()}</h3>
                <button onClick={() => setShowContactModal(false)} className="text-slate-400 hover:text-slate-700"><X className="w-4 h-4" /></button>
              </div>

              <div className="space-y-2 text-xs">
                <p><strong>Complaint ID:</strong> <span className="font-mono">{complaintId}</span></p>
                <p><strong>Issue:</strong> {complaint?.description}</p>
                <p><strong>Location:</strong> {complaint?.location || 'Karachi'}</p>
                <p><strong>Priority:</strong> <span className="font-bold text-red-600">{complaint?.priority}</span></p>
                <p><strong>Control Room Contact:</strong> <span className="font-mono font-bold text-blue-700">{deptContact?.phone}</span></p>
              </div>

              <div className="pt-2 grid grid-cols-3 gap-2">
                <a
                  href={`tel:${deptContact?.phone?.split(' ')[0] || ''}`}
                  className="py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl text-center flex items-center justify-center gap-1 shadow-2xs"
                >
                  <PhoneCall className="w-3.5 h-3.5" /> Call
                </a>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(deptContact?.phone || '');
                    toast.success('Phone number copied to clipboard');
                  }}
                  className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl text-center border border-slate-200"
                >
                  Copy Number
                </button>
                <button
                  onClick={() => setShowContactModal(false)}
                  className="py-2 px-3 bg-slate-100 text-slate-600 font-bold text-xs rounded-xl text-center"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── MODAL 2: DISPATCH EMERGENCY TEAM CONFIRMATION ── */}
        {showDispatchModal && (
          <div className="fixed inset-0 z-[1100] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4 text-slate-900">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3 text-red-600 font-black text-sm uppercase">
                <ShieldAlert className="w-5 h-5" />
                <span>🚨 DISPATCH EMERGENCY TEAM</span>
              </div>

              <div className="p-4 bg-red-50/60 border border-red-200 rounded-xl space-y-2 text-xs">
                <p><strong>DISPATCH TO:</strong> {deptContact?.name || dept}</p>
                <p><strong>INCIDENT:</strong> {complaint?.description}</p>
                <p><strong>LOCATION:</strong> {complaint?.location || 'Karachi'}</p>
                <p><strong>PRIORITY:</strong> <span className="font-bold text-red-700">{complaint?.priority}</span></p>
                <p><strong>AI RECOMMENDATION:</strong> {explainability?.recommended_action || 'Emergency inspection & cordon'}</p>
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-600">
                <input
                  type="checkbox"
                  id="incReporter"
                  checked={includeReporterInfo}
                  onChange={(e) => setIncludeReporterInfo(e.target.checked)}
                  className="rounded text-blue-600"
                />
                <label htmlFor="incReporter">Include citizen reporter phone in dispatch record</label>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  onClick={() => setShowDispatchModal(false)}
                  className="py-2.5 px-4 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl"
                >
                  CANCEL
                </button>
                <button
                  onClick={handleConfirmDispatch}
                  className="py-2.5 px-5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-xs"
                >
                  CONFIRM DISPATCH
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── MODAL 3: SEND INCIDENT DETAILS ── */}
        {showSendDetailsModal && (
          <div className="fixed inset-0 z-[1100] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-4 text-slate-900">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-black text-slate-900 uppercase flex items-center gap-2">
                  <Send className="w-4 h-4 text-blue-600" />
                  <span>STRUCTURED INCIDENT SUMMARY</span>
                </h3>
                <button onClick={() => setShowSendDetailsModal(false)} className="text-slate-400 hover:text-slate-700"><X className="w-4 h-4" /></button>
              </div>

              <textarea
                readOnly
                rows={10}
                value={formatStructuredSummary()}
                className="w-full font-mono text-[11px] bg-slate-50 border border-slate-200 rounded-xl p-3 focus:outline-none leading-relaxed text-slate-800"
              />

              <div className="flex items-center justify-between pt-1">
                <span className="text-[10px] text-slate-400 font-medium">Ready to copy or mail to department</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(formatStructuredSummary());
                      toast.success('Incident summary copied');
                    }}
                    className="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-2xs"
                  >
                    Copy Incident Summary
                  </button>
                  <a
                    href={`mailto:${deptContact?.email || 'control@civicradar.gov'}?subject=Incident%20Dispatch%20${complaintId}&body=${encodeURIComponent(formatStructuredSummary())}`}
                    className="py-2 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl inline-flex items-center gap-1"
                  >
                    Email Control Room
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Lightbox Modal */}
        {showLightbox && complaint?.image_path && (
          <div
            onClick={() => setShowLightbox(false)}
            className="fixed inset-0 z-[1100] bg-slate-950/90 flex items-center justify-center p-4 cursor-pointer"
          >
            <div className="relative max-w-4xl max-h-[90vh] rounded-2xl overflow-hidden border border-slate-700">
              <img
                src={`http://localhost:8000${complaint.image_path}`}
                alt="Full Evidence"
                className="w-full h-full object-contain"
              />
              <button
                onClick={() => setShowLightbox(false)}
                className="absolute top-3 right-3 bg-slate-900/80 text-white p-2 rounded-full hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </AnimatePresence>
  );
}
