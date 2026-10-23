import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { motion, AnimatePresence } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import api from '../api/client';
import { toast } from 'react-hot-toast';
import { 
  Radar, MapPin, Upload, User, Phone, FileText, CheckCircle2, 
  ArrowRight, ShieldCheck, AlertCircle, Copy, Check, ChevronRight, Brain, Clock 
} from 'lucide-react';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

function LocationPicker({ position, setPosition, setLocationName }) {
  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;
      setPosition([lat, lng]);
      setLocationName(`Coords: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
    },
  });

  return position ? <Marker position={position} /> : null;
}

export default function ReportPage() {
  const navigate = useNavigate();

  const [description, setDescription] = useState('');
  const [position, setPosition] = useState([24.87, 67.05]);
  const [locationName, setLocationName] = useState('Gulshan-e-Iqbal, Karachi');
  const [citizenName, setCitizenName] = useState('');
  const [citizenContact, setCitizenContact] = useState('');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [aiStepIndex, setAiStepIndex] = useState(-1);
  const [submittedResult, setSubmittedResult] = useState(null);
  const [copied, setCopied] = useState(false);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'image/*': [] },
    maxFiles: 1,
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        const selected = acceptedFiles[0];
        setFile(selected);
        setPreview(URL.createObjectURL(selected));
      }
    },
  });

  const validate = () => {
    const errs = {};
    if (!description.trim() || description.trim().length < 10) {
      errs.description = 'Please describe the problem in at least 10 characters.';
    }
    if (!citizenName.trim() || citizenName.trim().length < 2) {
      errs.citizenName = 'Please enter your full name.';
    }
    if (!citizenContact.trim() || citizenContact.trim().length < 7) {
      errs.citizenContact = 'Please enter a valid phone number.';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) {
      toast.error('Please complete all required fields.');
      return;
    }

    setIsSubmitting(true);
    setAiStepIndex(0);

    const steps = ['Understanding Report', 'Identifying Problem', 'Assessing Severity', 'Matching Department', 'Checking Related Reports', 'Creating Civic Signal'];
    
    // Simulate AI step sequence
    for (let i = 0; i < steps.length; i++) {
      await new Promise((r) => setTimeout(r, 450));
      setAiStepIndex(i + 1);
    }

    try {
      const formData = new FormData();
      formData.append('description', description.trim());
      formData.append('citizen_name', citizenName.trim());
      formData.append('citizen_contact', citizenContact.trim());
      formData.append('location', locationName);
      if (position) {
        formData.append('latitude', position[0]);
        formData.append('longitude', position[1]);
      }
      if (file) {
        formData.append('file', file);
      }

      const res = await api.post('/complaints/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setSubmittedResult(res.data);
      toast.success('Civic Report Submitted & Analyzed!');
    } catch (err) {
      console.error(err);
      let detail = 'Failed to submit report. Please check input.';
      if (err.response?.data?.detail) {
        if (typeof err.response.data.detail === 'string') {
          detail = err.response.data.detail;
        } else if (Array.isArray(err.response.data.detail)) {
          detail = err.response.data.detail.map((d) => (typeof d === 'string' ? d : (d.msg || 'Invalid input'))).join(', ');
        }
      } else if (err.message) {
        detail = err.message;
      }
      toast.error(detail);
      setAiStepIndex(-1);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyId = () => {
    if (submittedResult?.complaint_id) {
      navigator.clipboard.writeText(submittedResult.complaint_id);
      setCopied(true);
      toast.success('Tracking ID copied');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Navbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Radar className="w-7 h-7 text-emerald-600" />
            <span className="text-xl font-bold tracking-tight text-slate-900">CivicNova AI</span>
          </Link>
          <div className="flex items-center gap-4 text-xs font-semibold">
            <Link to="/track" className="text-slate-600 hover:text-blue-600 transition-colors">Track Report</Link>
            <Link to="/login" className="bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors">Admin Login</Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-10">
        <AnimatePresence mode="wait">
          {!submittedResult ? (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-8"
            >
              {/* Header */}
              <div className="text-center space-y-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5" /> Citizen Incident Dispatch
                </div>
                <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Report a Civic Problem</h1>
                <p className="text-sm text-slate-500 max-w-xl mx-auto">
                  Submit infrastructure issues directly to municipal teams. Our AI classifies and dispatches reports automatically.
                </p>
              </div>

              {/* Step Form */}
              <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-8">
                {/* STEP 1 */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">1</span>
                    <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">What Happened? *</h2>
                  </div>

                  <div>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={4}
                      placeholder="Describe the issue in detail (e.g. Large water main leak causing road collapse near Gulshan Block 7)..."
                      className={`w-full bg-slate-50 border rounded-xl p-4 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all ${
                        errors.description ? 'border-red-500 focus:ring-red-500' : 'border-slate-300'
                      }`}
                    />
                    <div className="flex justify-between items-center mt-1.5 text-xs text-slate-400">
                      <span>Min 10 characters</span>
                      <span>{description.length}/2000</span>
                    </div>
                    {errors.description && <p className="text-xs text-red-600 font-medium mt-1">{errors.description}</p>}
                  </div>
                </div>

                {/* STEP 2 */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">2</span>
                    <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Where is the Incident?</h2>
                  </div>

                  <div className="space-y-3">
                    <div className="relative">
                      <MapPin className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={locationName}
                        onChange={(e) => setLocationName(e.target.value)}
                        placeholder="Location or area name..."
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                    </div>

                    <div className="h-64 rounded-xl overflow-hidden border border-slate-300 relative z-0">
                      <MapContainer center={[24.87, 67.05]} zoom={13} style={{ height: '100%', width: '100%' }}>
                        <TileLayer
                          attribution='&copy; <a href="https://www.esri.com/">Esri</a> &mdash; Street Map'
                          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}"
                          maxZoom={19}
                        />
                        <LocationPicker position={position} setPosition={setPosition} setLocationName={setLocationName} />
                      </MapContainer>
                    </div>
                    <p className="text-[11px] text-slate-500 text-center">Click map to adjust pin position</p>
                  </div>
                </div>

                {/* STEP 3 - MANDATORY REPORTER VERIFICATION */}
                <div className="space-y-3 p-5 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">3</span>
                    <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Reporter Verification (Mandatory) *</h2>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Full Name <span className="text-red-600">*</span>
                      </label>
                      <div className="relative">
                        <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          value={citizenName}
                          onChange={(e) => setCitizenName(e.target.value)}
                          placeholder="e.g. Tariq Mahmood"
                          className={`w-full bg-white border rounded-xl pl-10 pr-4 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 ${
                            errors.citizenName ? 'border-red-500' : 'border-slate-300'
                          }`}
                        />
                      </div>
                      {errors.citizenName && <p className="text-xs text-red-600 font-medium mt-1">{errors.citizenName}</p>}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Phone Number <span className="text-red-600">*</span>
                      </label>
                      <div className="relative">
                        <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          value={citizenContact}
                          onChange={(e) => setCitizenContact(e.target.value)}
                          placeholder="0300-1234567"
                          className={`w-full bg-white border rounded-xl pl-10 pr-4 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 ${
                            errors.citizenContact ? 'border-red-500' : 'border-slate-300'
                          }`}
                        />
                      </div>
                      {errors.citizenContact && <p className="text-xs text-red-600 font-medium mt-1">{errors.citizenContact}</p>}
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-500 flex items-center gap-1.5 pt-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span>Your contact info helps civic teams verify reports. It is strictly private and never shown on public maps.</span>
                  </div>
                </div>

                {/* STEP 4 - OPTIONAL PHOTO EVIDENCE */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-slate-300 text-slate-700 font-bold text-xs flex items-center justify-center">4</span>
                    <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Photo Evidence (Optional)</h2>
                  </div>

                  <div
                    {...getRootProps()}
                    className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                      isDragActive ? 'border-blue-500 bg-blue-50' : 'border-slate-300 bg-slate-50 hover:bg-slate-100'
                    }`}
                  >
                    <input {...getInputProps()} />
                    <Upload className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                    <p className="text-xs font-semibold text-slate-700">Drag & drop photo evidence, or click to upload</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">PNG, JPG, WEBP up to 10MB</p>
                  </div>

                  {preview && (
                    <div className="relative w-32 h-32 rounded-xl overflow-hidden border border-slate-300 mt-2">
                      <img src={preview} alt="Upload preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => { setFile(null); setPreview(null); }}
                        className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 text-[10px]"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>

                {/* Submit Action */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-6 rounded-xl transition-all shadow-md shadow-blue-600/20 flex items-center justify-center gap-2 text-sm disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>AI Analyzing Report...</span>
                    </div>
                  ) : (
                    <>
                      <span>Submit Civic Report</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          ) : (
            /* SUCCESS & AI SEQUENCE DISPLAY */
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white border border-slate-200 rounded-2xl p-8 shadow-lg space-y-6 text-center"
            >
              <div className="w-16 h-16 rounded-full bg-emerald-100 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-9 h-9" />
              </div>

              <div>
                <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                  Report Received & AI Classified
                </span>
                <h2 className="text-2xl font-black text-slate-900 mt-3">Civic Signal Dispatch Complete</h2>
              </div>

              {/* Tracking ID Box */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 inline-flex items-center gap-3">
                <span className="text-xs text-slate-500 font-medium">Tracking ID:</span>
                <span className="font-mono text-base font-bold text-blue-600">{submittedResult.complaint_id}</span>
                <button
                  onClick={handleCopyId}
                  className="p-1.5 text-slate-500 hover:text-slate-900 transition-colors"
                  title="Copy Tracking ID"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              {/* AI Intelligence Result Card */}
              <div className="p-6 rounded-xl bg-blue-50/50 border border-blue-200 text-left space-y-4 max-w-lg mx-auto">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Brain className="w-4 h-4 text-blue-600" /> AI Classification
                  </span>
                  {submittedResult.ai_confidence && (
                    <span className="text-xs font-mono font-bold text-blue-700">
                      {Math.round(submittedResult.ai_confidence * 100)}% Confidence
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-white rounded-lg border border-slate-200">
                    <span className="text-slate-400 block text-[10px]">Category</span>
                    <span className="font-bold text-slate-800">{submittedResult.category}</span>
                  </div>
                  <div className="p-3 bg-white rounded-lg border border-slate-200">
                    <span className="text-slate-400 block text-[10px]">Priority</span>
                    <span className="font-bold text-red-600">{submittedResult.priority}</span>
                  </div>
                </div>

                <div className="p-3 bg-white rounded-lg border border-slate-200 text-xs">
                  <span className="text-slate-400 block text-[10px]">Assigned Department</span>
                  <span className="font-bold text-blue-700">{submittedResult.recommended_department || 'Water & Drainage'}</span>
                </div>

                {submittedResult.ai_reasoning && (
                  <p className="text-xs text-slate-600 leading-relaxed pt-1">
                    "{submittedResult.ai_reasoning}"
                  </p>
                )}
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <Link
                  to={`/track?id=${submittedResult.complaint_id}`}
                  className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl text-xs transition-colors flex items-center justify-center gap-2"
                >
                  Track This Report <ArrowRight className="w-4 h-4" />
                </Link>
                <button
                  onClick={() => { setSubmittedResult(null); setDescription(''); setFile(null); setPreview(null); }}
                  className="w-full sm:w-auto bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-3 px-6 rounded-xl text-xs transition-colors"
                >
                  Report Another Incident
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
