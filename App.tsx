import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { MemoryRouter, Routes, Route, Link } from 'react-router-dom';
import { 
  Calendar as CalendarIcon, 
  ShieldCheck, 
  User, 
  CheckCircle2, 
  ChevronRight, 
  Users, 
  Sparkles,
  Sun,
  Moon,
  Clock,
  Info,
  RefreshCw,
  Cloud,
  Loader2
} from 'lucide-react';
import Calendar from './components/Calendar';
import { storageService } from './services/storageService';
import { AvailabilityEntry, ShiftType } from './types';
import { format, startOfToday, addMonths, subMonths } from 'date-fns';
import { analyzeCoverage } from './services/geminiService';

// --- Global Sync Indicator Component ---
const SyncIndicator: React.FC<{ loading: boolean }> = ({ loading }) => (
  <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all ${loading ? 'bg-amber-50 text-amber-600 animate-pulse' : 'bg-emerald-50 text-emerald-600'}`}>
    <Cloud size={12} />
    {loading ? 'Syncing...' : 'Cloud Connected'}
  </div>
);

// --- Worker View Component ---
const WorkerView: React.FC = () => {
  const [name, setName] = useState('');
  const [currentDate, setCurrentDate] = useState(startOfToday());
  const [selections, setSelections] = useState<Record<string, ShiftType>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleDateClick = (date: Date) => {
    const key = format(date, 'yyyy-MM-dd');
    const current = selections[key] || 'none';
    const nextMap: Record<ShiftType, ShiftType> = {
      'none': 'all-day',
      'all-day': 'morning',
      'morning': 'evening',
      'evening': 'none'
    };
    setSelections(prev => ({ ...prev, [key]: nextMap[current] }));
  };

  const handleSubmit = async () => {
    if (!name) { alert("Please enter your name first!"); return; }
    const entriesToSubmit = (Object.entries(selections) as [string, ShiftType][])
      .filter(([_, type]) => type !== 'none')
      .map(([date, type]) => ({
        id: crypto.randomUUID(), 
        workerName: name, 
        date, 
        shiftType: type, 
        timestamp: Date.now()
      }));

    if (entriesToSubmit.length === 0) {
      alert("Please select at least one date on the calendar.");
      return;
    }

    setIsSubmitting(true);
    try {
      await storageService.batchAddEntries(entriesToSubmit);
      setIsSuccess(true);
      setSelections({}); // Clear selections after successful submit
      setTimeout(() => setIsSuccess(false), 3000);
    } catch (err) {
      alert("Submission failed. Please check your internet connection.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <User className="text-indigo-600" /> Worker Availability
          </h1>
          <p className="text-slate-500 text-sm">Tap dates to cycle: Morning → Evening → All Day</p>
        </div>
        <div className="flex flex-col gap-2 items-end">
          <SyncIndicator loading={isSubmitting} />
          <input 
            type="text"
            placeholder="Your Full Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all w-full sm:w-64"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-3">
          <Calendar 
            currentDate={currentDate}
            onDateClick={handleDateClick}
            getShiftForDate={(d) => selections[format(d, 'yyyy-MM-dd')] || 'none'}
            onPrevMonth={() => setCurrentDate(subMonths(currentDate, 1))}
            onNextMonth={() => setCurrentDate(addMonths(currentDate, 1))}
          />
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 h-fit sticky top-6">
          <h3 className="font-bold text-slate-800 mb-4 text-sm uppercase tracking-wider">Shift Legend</h3>
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-2 text-slate-600"><div className="w-4 h-4 rounded bg-emerald-100 border border-emerald-300"></div><span>All Day</span></div>
            <div className="flex items-center gap-2 text-slate-600"><div className="w-4 h-4 rounded bg-blue-100 border border-blue-300"></div><span>Morning (AM)</span></div>
            <div className="flex items-center gap-2 text-slate-600"><div className="w-4 h-4 rounded bg-amber-100 border border-amber-300"></div><span>Evening (PM)</span></div>
          </div>
          <div className="mt-8 pt-8 border-t border-slate-100">
            <button 
              onClick={handleSubmit} 
              disabled={isSubmitting || !name} 
              className={`w-full py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${isSubmitting || !name ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md transform active:scale-95'}`}
            >
              {isSubmitting ? <><Loader2 size={18} className="animate-spin" /> Submitting...</> : isSuccess ? <><CheckCircle2 size={18} /> Done!</> : 'Cloud Submit'}
            </button>
            <p className="mt-3 text-[10px] text-center text-slate-400">Submissions are saved to the cloud instantly.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Manager Dashboard Component ---
const ManagerDashboard: React.FC = () => {
  const [isAuthed, setIsAuthed] = useState(false);
  const [password, setPassword] = useState('');
  const [entries, setEntries] = useState<AvailabilityEntry[]>([]);
  const [aiInsights, setAiInsights] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingInsights, setIsLoadingInsights] = useState(false);
  const [currentDate, setCurrentDate] = useState(startOfToday());
  const [selectedDay, setSelectedDay] = useState<Date | null>(startOfToday());

  const fetchEntries = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await storageService.getEntries();
      setEntries(data);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthed) fetchEntries();
  }, [isAuthed, fetchEntries]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'admin') setIsAuthed(true);
    else alert("Invalid Manager Password");
  };

  const getInsights = async () => {
    setIsLoadingInsights(true);
    const result = await analyzeCoverage(entries);
    setAiInsights(result);
    setIsLoadingInsights(false);
  };

  const groupedEntries = useMemo(() => {
    const map: Record<string, AvailabilityEntry[]> = {};
    entries.forEach(entry => {
      if (!map[entry.date]) map[entry.date] = [];
      map[entry.date].push(entry);
    });
    return map;
  }, [entries]);

  const selectedDayKey = selectedDay ? format(selectedDay, 'yyyy-MM-dd') : '';
  const dayEntries = groupedEntries[selectedDayKey] || [];
  const morningWorkers = dayEntries.filter(e => e.shiftType === 'morning' || e.shiftType === 'all-day');
  const eveningWorkers = dayEntries.filter(e => e.shiftType === 'evening' || e.shiftType === 'all-day');

  const getShiftCountSummary = (date: Date) => {
    const key = format(date, 'yyyy-MM-dd');
    const dayData = groupedEntries[key] || [];
    if (dayData.length === 0) return null;

    const am = dayData.filter(e => e.shiftType === 'morning' || e.shiftType === 'all-day').length;
    const pm = dayData.filter(e => e.shiftType === 'evening' || e.shiftType === 'all-day').length;
    const all = dayData.filter(e => e.shiftType === 'all-day').length;

    return (
      <div className="flex flex-col gap-0.5 mt-auto w-full px-1">
        {am > 0 && <div className="text-[9px] bg-blue-50 text-blue-600 px-1 rounded flex items-center justify-between border border-blue-100"><Sun size={8}/> <span>{am}</span></div>}
        {pm > 0 && <div className="text-[9px] bg-amber-50 text-amber-600 px-1 rounded flex items-center justify-between border border-amber-100"><Moon size={8}/> <span>{pm}</span></div>}
        {all > 0 && <div className="text-[9px] bg-emerald-50 text-emerald-600 px-1 rounded flex items-center justify-between border border-emerald-100"><Clock size={8}/> <span>{all}</span></div>}
      </div>
    );
  };

  if (!isAuthed) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <form onSubmit={handleLogin} className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100 max-w-md w-full space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center p-3 bg-indigo-50 text-indigo-600 rounded-2xl mb-2"><ShieldCheck size={32} /></div>
            <h1 className="text-2xl font-bold text-slate-900">Manager Access</h1>
            <p className="text-slate-500 text-sm">Enter password to unlock cloud dashboard.</p>
          </div>
          <div className="space-y-4">
            <input 
              type="password" 
              placeholder="Password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all" 
              autoFocus
            />
            <button type="submit" className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-md">Unlock Dashboard</button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-8 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-extrabold text-slate-900 flex items-center gap-3">
              <CalendarIcon className="text-indigo-600" /> Manager View
            </h1>
            <SyncIndicator loading={isLoading} />
          </div>
          <p className="text-slate-500">Live coverage overview from cloud storage.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={fetchEntries} 
            className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 transition-all shadow-sm flex items-center gap-2 px-4"
            disabled={isLoading}
          >
            <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
            <span className="text-sm font-semibold">Refresh</span>
          </button>
          <button onClick={getInsights} disabled={isLoadingInsights} className="bg-white text-indigo-600 px-6 py-2.5 rounded-xl font-semibold flex items-center gap-2 border border-slate-200 hover:border-indigo-200 hover:bg-indigo-50 transition-all">
             {isLoadingInsights ? <><Loader2 size={18} className="animate-spin" /> Thinking...</> : <><Sparkles size={18} /> AI Analysis</>}
          </button>
          <button onClick={() => { if(confirm("This will clear the database for EVERYONE. Are you sure?")) { storageService.clearAll().then(fetchEntries); } }} className="bg-red-50 text-red-600 px-4 py-2.5 rounded-xl text-sm font-bold border border-red-100 hover:bg-red-100 transition-colors">Reset Cloud</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
            <Calendar 
              currentDate={currentDate}
              onPrevMonth={() => setCurrentDate(subMonths(currentDate, 1))}
              onNextMonth={() => setCurrentDate(addMonths(currentDate, 1))}
              onDateClick={(d) => setSelectedDay(d)}
              getShiftForDate={() => 'none'} 
              renderDayContent={getShiftCountSummary}
            />
          </div>
          <div className="mt-4 p-4 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center gap-3 text-indigo-700 text-sm">
            <Info size={18} />
            <p>Select a date to see worker names in the sidebar. Numbers show headcount.</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h2 className="font-bold text-slate-800 flex items-center gap-2 text-lg">
                {selectedDay ? format(selectedDay, 'MMM d, yyyy') : 'Select a date'}
              </h2>
              <div className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-xs font-bold">
                {dayEntries.length} Total
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-blue-600 font-bold text-sm"><Sun size={16} /> Morning Availability</div>
                <div className="flex flex-wrap gap-2">
                  {morningWorkers.length > 0 ? morningWorkers.map(w => (
                    <span key={w.id} className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium border border-blue-100">{w.workerName}</span>
                  )) : <span className="text-slate-300 text-xs italic">No morning coverage</span>}
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-amber-600 font-bold text-sm"><Moon size={16} /> Evening Availability</div>
                <div className="flex flex-wrap gap-2">
                  {eveningWorkers.length > 0 ? eveningWorkers.map(w => (
                    <span key={w.id} className="px-3 py-1.5 bg-amber-50 text-amber-700 rounded-lg text-xs font-medium border border-amber-100">{w.workerName}</span>
                  )) : <span className="text-slate-300 text-xs italic">No evening coverage</span>}
                </div>
              </div>
            </div>
          </div>

          <div className={`bg-indigo-900 text-white p-8 rounded-3xl shadow-xl space-y-4 transition-all ${!aiInsights && 'opacity-50'}`}>
            <div className="flex items-center gap-2 text-indigo-300"><Sparkles size={18} /><h3 className="font-bold uppercase text-xs tracking-widest">AI Scheduler</h3></div>
            <div className="text-indigo-50 text-sm leading-relaxed max-h-64 overflow-y-auto custom-scrollbar">
              {aiInsights ? <div dangerouslySetInnerHTML={{ __html: aiInsights.replace(/\n/g, '<br/>') }} /> : <p className="italic text-indigo-400">Run AI analysis to check coverage gaps.</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Landing Page ---
const LandingPage: React.FC = () => (
  <div className="min-h-[85vh] flex flex-col items-center justify-center p-4 max-w-4xl mx-auto space-y-12">
    <div className="text-center space-y-4">
      <h1 className="text-6xl sm:text-7xl font-black text-slate-900 tracking-tight">Rafsoda<span className="text-indigo-600">Sync</span></h1>
      <p className="text-xl text-slate-500 max-w-xl mx-auto">Brought to you with love and earplugs</p>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-3xl">
      <Link to="/worker" className="group bg-white p-10 rounded-3xl shadow-lg border border-slate-100 transition-all hover:-translate-y-1 hover:shadow-xl flex flex-col items-center text-center space-y-4">
        <div className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl group-hover:bg-indigo-600 group-hover:text-white transition-all"><User size={40} /></div>
        <h2 className="text-2xl font-bold text-slate-800">I am a Worker</h2>
        <p className="text-slate-500 text-sm">Submit your available dates.</p>
      </Link>
      <Link to="/manager" className="group bg-slate-900 p-10 rounded-3xl shadow-lg transition-all hover:-translate-y-1 hover:shadow-xl flex flex-col items-center text-center space-y-4">
        <div className="p-4 bg-white/10 text-white rounded-2xl group-hover:bg-indigo-600 transition-all"><ShieldCheck size={40} /></div>
        <h2 className="text-2xl font-bold text-white">I am a Manager</h2>
        <p className="text-slate-400 text-sm">View team coverage & insights.</p>
      </Link>
    </div>
  </div>
);

// --- App Root ---
const App: React.FC = () => (
  <MemoryRouter>
    <div className="min-h-screen bg-[#f8fafc]">
      <nav className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex justify-between items-center">
          <Link to="/" className="flex items-center gap-2 text-xl font-bold text-slate-900">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white"><CalendarIcon size={18} /></div>
            RafsodaSync
          </Link>
          <div className="flex items-center gap-6 text-sm font-medium">
            <Link to="/worker" className="text-slate-500 hover:text-indigo-600">Submit Dates</Link>
            <Link to="/manager" className="bg-slate-100 px-4 py-2 rounded-lg text-slate-900 hover:bg-slate-200">Manager Dashboard</Link>
          </div>
        </div>
      </nav>
      <main className="py-8"><Routes><Route path="/" element={<LandingPage />} /><Route path="/worker" element={<WorkerView />} /><Route path="/manager" element={<ManagerDashboard />} /></Routes></main>
    </div>
  </MemoryRouter>
);

export default App;
