import React, { useState } from 'react';
import { FirebaseProvider } from './components/FirebaseProvider';
import { Navbar } from './components/Navbar';
import { Observatory } from './components/Observatory';
import { QueryStream } from './components/QueryStream';
import { DiscoveryLab } from './components/DiscoveryLab';
import { RejectionLab } from './components/RejectionLab';
import { Leaderboard } from './components/Leaderboard';
import LandingPage from './components/LandingPage';
import { motion, AnimatePresence } from 'motion/react';
import { Activity, Sparkles, ChevronLeft, Play, AlertTriangle, Satellite, Trophy } from 'lucide-react';
import { doc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './lib/firebase';
import { useFirebase } from './components/FirebaseProvider';

type Section = 'hub' | 'observatory' | 'stream' | 'lab' | 'rejection' | 'leaderboard';

interface TransitMetadata {
  source: 'mast' | 'simulated';
  hasTCE: boolean;
  tceCount: number;
  orbitalPeriod: number | null;
  transitDepth: number | null;
  estimatedRadius: number | null;
}

const generateId = () => Math.random().toString(36).substring(2, 15);

function Dashboard() {
  const { user, researcherName } = useFirebase();
  const [activeTicId, setActiveTicId] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<Section>('hub');
  
  const [isHunting, setIsHunting] = useState(false);
  const isHuntingRef = React.useRef(false);
  const abortControllerRef = React.useRef<AbortController | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fluxData, setFluxData] = useState<{ time: number[], flux: number[] } | null>(null);
  const [transitMetadata, setTransitMetadata] = useState<TransitMetadata | null>(null);

  const stopHunt = () => {
    setIsHunting(false);
    isHuntingRef.current = false;
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setLoading(false);
  };

  const startHuntLoop = async () => {
    if (!user || !researcherName) return;
    
    setError(null);
    setIsHunting(true);
    isHuntingRef.current = true;
    setActiveSection('observatory');

    while (isHuntingRef.current) {
      setLoading(true);
      setError(null);
      setFluxData(null);
      setTransitMetadata(null);
      
      let queryRef;
      try {
        const randomRes = await fetch('/api/random-tic');
        if (!randomRes.ok) throw new Error("Failed to fetch target from NASA database.");
        const { ticId } = await randomRes.json();
        
        setActiveTicId(ticId);

        const queryId = generateId();
        queryRef = doc(db, 'queries', queryId);
        await setDoc(queryRef, {
          ticId: ticId,
          status: 'Connecting to MAST Archive...',
          userId: user.uid,
          researcherName,
          createdAt: serverTimestamp()
        });

        abortControllerRef.current = new AbortController();
        const response = await fetch(`/api/discover?ticId=${encodeURIComponent(ticId)}`, {
          signal: abortControllerRef.current.signal
        });
        if (!response.ok || !response.body) throw new Error("Failed to start pipeline");

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        
        let buffer = '';
        while (isHuntingRef.current) {
          const { done, value } = await reader.read();
          if (done) break;
          
          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split('\n\n');
          buffer = parts.pop() || '';
          
          for (const part of parts) {
            const lines = part.split('\n');
            let event = 'message';
            let data = '';
            
            for (const line of lines) {
              if (line.startsWith('event: ')) event = line.substring(7);
              if (line.startsWith('data: ')) data = line.substring(6);
            }
            
            if (data) {
              const parsed = JSON.parse(data);
              if (event === 'status') {
                await updateDoc(queryRef, { status: parsed.state });
              } else if (event === 'lightcurve') {
                setFluxData(parsed);
                await updateDoc(queryRef, { status: 'Scanning (Agent 1: Flash)...' });
              } else if (event === 'metadata') {
                setTransitMetadata(parsed);
              } else if (event === 'agent1') {
                // Agent 1 results received — could display if needed
              } else if (event === 'complete') {
                if (parsed.success) {
                  await updateDoc(queryRef, { status: 'New Discovery!', thesis: parsed.thesis });
                } else {
                  await updateDoc(queryRef, { status: parsed.reason || 'Rejected' });
                }
                setLoading(false);
              } else if (event === 'error') {
                 setError(parsed.message);
                 await updateDoc(queryRef, { status: 'Error: ' + parsed.message });
                 setLoading(false);
                 setIsHunting(false);
                 isHuntingRef.current = false;
                 break;
              }
            }
          }
        }
        
        // Brief pause before pulling the next TIC ID
        if (isHuntingRef.current) {
          await new Promise(r => setTimeout(r, 2000));
        }
      } catch (err: any) {
        if (err.name === 'AbortError') {
          console.log("Hunt stopped by user.");
          break;
        }
        setError(err.message);
        setLoading(false);
        setIsHunting(false);
        isHuntingRef.current = false;
        if (queryRef) {
          await updateDoc(queryRef, { status: 'Failed: ' + err.message }).catch(() => {});
        }
        break;
      }
    }
    
    setIsHunting(false);
    setLoading(false);
  };

  const modules = [
    { 
      id: 'observatory' as Section, 
      title: 'The Raw Observatory', 
      icon: Satellite, 
      color: 'text-indigo-500', 
      bg: 'bg-indigo-50',
      border: 'hover:border-indigo-300',
      shadow: 'hover:shadow-indigo-500/20',
      desc: 'Ingest real light curves from the NASA MAST archive for any TIC target.' 
    },
    { 
      id: 'stream' as Section, 
      title: 'Live Query Stream', 
      icon: Activity, 
      color: 'text-amber-500', 
      bg: 'bg-amber-50',
      border: 'hover:border-amber-300',
      shadow: 'hover:shadow-amber-500/20',
      desc: 'Monitor the multi-agent pipeline vetting targets in real-time.' 
    },
    { 
      id: 'lab' as Section, 
      title: 'The Discovery Lab', 
      icon: Sparkles, 
      color: 'text-emerald-500', 
      bg: 'bg-emerald-50',
      border: 'hover:border-emerald-300',
      shadow: 'hover:shadow-emerald-500/20',
      desc: 'Explore generated thesis-grade reports of confirmed new worlds.' 
    },
    { 
      id: 'rejection' as Section, 
      title: 'False Positive Archive', 
      icon: AlertTriangle, 
      color: 'text-rose-500', 
      bg: 'bg-rose-50',
      border: 'hover:border-rose-300',
      shadow: 'hover:shadow-rose-500/20',
      desc: 'Detailed rejection reports documenting rigorous false positive analysis.' 
    },
    { 
      id: 'leaderboard' as Section, 
      title: 'Leaderboard', 
      icon: Trophy, 
      color: 'text-purple-500', 
      bg: 'bg-purple-50',
      border: 'hover:border-purple-300',
      shadow: 'hover:shadow-purple-500/20',
      desc: 'Global rankings of successful discoveries by researchers.' 
    }
  ];

  const renderSection = () => {
    switch (activeSection) {
      case 'observatory':
        return <Observatory activeTicId={activeTicId} fluxData={fluxData} metadata={transitMetadata} loading={loading} />;
      case 'stream':
        return <QueryStream />;
      case 'lab':
        return <DiscoveryLab />;
      case 'rejection':
        return <RejectionLab />;
      case 'leaderboard':
        return <Leaderboard />;
      default:
        return null;
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="min-h-screen flex flex-col pt-32 pb-16"
    >
      <Navbar />
      
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12 relative z-20"
        >
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] max-w-4xl h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-center gap-6 max-w-lg mx-auto text-center md:text-left">
            <div className="relative group w-full">
              {isHunting ? (
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={stopHunt}
                  className="bg-slate-800 hover:bg-slate-700 text-rose-400 font-extrabold px-8 py-5 rounded-2xl transition-all shadow-xl w-full border border-rose-500/30 hover:border-rose-500/50 flex items-center justify-center gap-3 uppercase tracking-wider text-xl"
                >
                  <span className="w-4 h-4 bg-rose-500 rounded-sm animate-pulse" />
                  Stop Discovery Loop
                </motion.button>
              ) : (
                <motion.button
                  whileHover={{ scale: (!user) ? 1 : 1.02 }}
                  whileTap={{ scale: (!user) ? 1 : 0.95 }}
                  onClick={startHuntLoop}
                  disabled={!user || loading}
                  className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-600 shadow-xl shadow-indigo-600/30 disabled:shadow-none text-white px-8 py-5 rounded-2xl transition-all flex items-center justify-center gap-3 w-full border border-indigo-500/50 disabled:border-slate-700 font-extrabold uppercase tracking-wider text-xl"
                >
                  {loading ? (
                    <span className="w-6 h-6 border-[3px] border-indigo-200/30 border-t-indigo-200 rounded-full animate-spin" />
                  ) : (
                    <Play className="w-6 h-6 fill-current" />
                  )}
                  Start Automated Hunt
                </motion.button>
              )}
            </div>
          </div>

          {!user && (
            <div className="mt-6 flex justify-center relative z-10">
              <div className="bg-amber-900/20 border border-amber-700/50 py-2.5 px-6 rounded-full flex items-center gap-3 text-amber-500 text-sm font-bold shadow-sm">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                You must be signed in to submit a TIC ID
              </div>
            </div>
          )}
          {error && (
            <div className="mt-6 flex justify-center relative z-10">
              <div className="bg-red-900/20 border border-red-800/50 py-2.5 px-6 rounded-full flex items-center gap-3 text-red-400 text-sm font-bold shadow-sm max-w-2xl">
                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                <span className="truncate">{error}</span>
              </div>
            </div>
          )}
        </motion.div>

        <AnimatePresence mode="wait">
          {activeSection === 'hub' ? (
            <motion.div 
              key="hub"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.4 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-12"
            >
              {modules.map((m) => (
                <motion.div
                  key={m.id}
                  whileHover={{ y: -8 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setActiveSection(m.id)}
                  className={`cursor-pointer bg-slate-900 border border-slate-800 rounded-[2.5rem] p-10 flex flex-col items-center text-center transition-all shadow-[0_10px_40px_-10px_rgba(0,0,0,0.4)] hover:shadow-2xl ${m.border} ${m.shadow}`}
                >
                  <div className={`${m.bg.replace('50', '900/30')} ${m.color} p-6 rounded-3xl mb-8 border border-white/5`}>
                    <m.icon className="w-12 h-12" />
                  </div>
                  <h2 className="text-2xl font-display font-extrabold text-slate-100 mb-4">{m.title}</h2>
                  <p className="text-slate-400 font-medium leading-relaxed">
                    {m.desc}
                  </p>
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="section"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.4 }}
              className="space-y-6"
            >
              <button 
                onClick={() => setActiveSection('hub')}
                className="flex items-center gap-2 text-slate-400 hover:text-indigo-400 transition-colors font-bold text-sm bg-slate-800 border border-slate-700 px-5 py-2.5 rounded-xl shadow-inner hover:shadow-md"
              >
                <ChevronLeft className="w-5 h-5" /> Back to Hub
              </button>
              
              <div className="mt-4">
                {renderSection()}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </motion.div>
  );
}

export default function App() {
  const [showLanding, setShowLanding] = useState(true);

  return (
    <FirebaseProvider>
      <AnimatePresence mode="wait">
        {showLanding ? (
          <motion.div 
            key="landing" 
            exit={{ opacity: 0, y: -40, scale: 0.98 }} 
            transition={{ duration: 0.5, ease: "easeInOut" }}
          >
            <LandingPage onEnter={() => setShowLanding(false)} />
          </motion.div>
        ) : (
          <motion.div 
            key="dashboard"
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            transition={{ duration: 0.5 }}
          >
            <Dashboard />
          </motion.div>
        )}
      </AnimatePresence>
    </FirebaseProvider>
  );
}
