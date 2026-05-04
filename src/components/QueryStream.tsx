import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Activity, CheckCircle2, AlertCircle, Search, HelpCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';

interface PipelineQuery {
  id: string;
  ticId: string;
  status: string;
  researcherName: string;
  createdAt: any;
}

export function QueryStream() {
  const [queries, setQueries] = useState<PipelineQuery[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const q = query(
      collection(db, 'queries'),
      orderBy('createdAt', 'desc'),
      limit(10)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const active: PipelineQuery[] = [];
      snapshot.forEach(doc => {
        active.push({ id: doc.id, ...doc.data() } as PipelineQuery);
      });
      setQueries(active);
    });

    return () => unsubscribe();
  }, []);

  const getStatusConfig = (status: string) => {
    if (status.includes('Fetching')) return { text: 'text-slate-300', bg: 'bg-slate-800/80 border-slate-700 shadow-[0_8px_30px_rgb(0,0,0,0.4)]', badge: 'bg-slate-700 text-slate-300', icon: Activity };
    if (status.includes('Scanning')) return { text: 'text-yellow-400', bg: 'bg-yellow-900/20 border-yellow-700/50 shadow-[0_8px_30px_rgba(234,179,8,0.15)]', badge: 'bg-yellow-500/20 text-yellow-400', icon: Search };
    if (status.includes('Rejected')) return { text: 'text-red-400', bg: 'bg-red-900/20 border-red-800/50 shadow-[0_8px_30px_rgba(248,113,113,0.15)]', badge: 'bg-red-500/20 text-red-400', icon: AlertCircle };
    if (status.includes('APIE') || status.includes('Resonance') || status.includes('Python')) return { text: 'text-purple-400', bg: 'bg-purple-900/20 border-purple-800/50 shadow-[0_8px_30px_rgba(168,85,247,0.15)]', badge: 'bg-purple-500/20 text-purple-400', icon: Activity };
    if (status.includes('Verifying')) return { text: 'text-blue-400', bg: 'bg-blue-900/20 border-blue-800/50 shadow-[0_8px_30px_rgba(59,130,246,0.15)]', badge: 'bg-blue-500/20 text-blue-400', icon: Search };
    if (status.includes('Known')) return { text: 'text-gray-400', bg: 'bg-gray-800/50 border-gray-700 shadow-[0_8px_30px_rgba(156,163,175,0.15)]', badge: 'bg-gray-700 text-gray-300', icon: HelpCircle };
    if (status.includes('New Discovery')) return { text: 'text-green-400', bg: 'bg-green-900/20 border-green-700/50 shadow-[0_8px_30px_rgba(34,197,94,0.2)]', badge: 'bg-green-500 text-white', icon: CheckCircle2 };
    return { text: 'text-slate-300', bg: 'bg-slate-800 border-slate-700 shadow-sm', badge: 'bg-slate-700 text-slate-300', icon: Activity };
  };

  if (queries.length === 0) {
    return (
      <motion.section 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <h3 className="text-sm font-bold tracking-widest text-slate-400 uppercase mb-5 px-2 flex items-center gap-2">
          <Activity className="w-4 h-4" />
          Live Query Stream
        </h3>
        <div className="bg-slate-900/50 border-2 border-slate-800 border-dashed rounded-3xl p-10 flex flex-col items-center justify-center text-center">
          <div className="bg-slate-800 p-4 rounded-full mb-4 shadow-inner">
            <Activity className="w-8 h-8 text-slate-500" />
          </div>
          <h4 className="text-lg font-bold text-slate-300 mb-1">No Active Queries</h4>
          <p className="text-slate-500 font-medium text-sm">Initiate a deep scan above to start the multi-agent pipeline.</p>
        </div>
      </motion.section>
    );
  }

  return (
    <motion.section 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
    >
      <h3 className="text-sm font-bold tracking-widest text-slate-400 uppercase mb-5 px-2 flex items-center gap-2">
        <Activity className="w-4 h-4" />
        Live Query Stream
      </h3>
      <div className="flex overflow-x-auto pb-6 gap-5 snap-x hide-scrollbar px-2">
        <AnimatePresence>
          {queries.map((q, i) => {
            const config = getStatusConfig(q.status);
            const Icon = config.icon;
            
            return (
              <motion.div 
                key={q.id}
                initial={{ opacity: 0, scale: 0.8, x: -20 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                className={`flex-none w-80 snap-start border rounded-3xl p-5 transition-all ${config.bg}`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="text-xs font-bold text-slate-500 tracking-wide">
                    {q.createdAt?.seconds 
                      ? formatDistanceToNow(q.createdAt.seconds * 1000, { addSuffix: true }) 
                      : 'just now'}
                  </div>
                  <div className={`p-1.5 rounded-xl ${config.badge}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                </div>
                
                <div className={`text-2xl font-display font-bold mb-2 ${config.text}`}>
                  TIC {q.ticId}
                </div>
                
                <div className={`text-sm font-bold mb-4 ${config.text} opacity-90`}>
                  {q.status}
                </div>
                
                {['Fetching', 'Scanning', 'Verifying'].some(s => q.status.includes(s)) && (
                  <div className="w-full bg-slate-800 rounded-full h-1.5 mb-4 overflow-hidden relative shadow-inner">
                    <motion.div 
                      className={`absolute top-0 left-0 h-full ${config.badge}`}
                      initial={{ width: "10%" }}
                      animate={{ 
                        width: q.status.includes('Fetching') ? "30%" : 
                               q.status.includes('Scanning') ? "60%" : 
                               q.status.includes('Verifying') ? "85%" : "100%" 
                      }}
                      transition={{ duration: 1, ease: "easeOut" }}
                    />
                  </div>
                )}

                <div className="flex items-center gap-2 mt-auto cursor-pointer group" onClick={() => setExpandedId(expandedId === q.id ? null : q.id)}>
                  <div className="w-6 h-6 rounded-full bg-slate-700/50 flex items-center justify-center text-[10px] font-bold text-slate-400 shrink-0 group-hover:bg-slate-700 transition-colors">
                    {q.researcherName.charAt(0).toUpperCase()}
                  </div>
                  <div className="text-xs font-bold text-slate-400 truncate flex-1 group-hover:text-slate-300 transition-colors">
                    {q.researcherName}
                  </div>
                  <div className="text-[10px] font-bold text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-wider shrink-0">
                    {expandedId === q.id ? 'Hide' : 'Details'}
                  </div>
                </div>

                <AnimatePresence>
                  {expandedId === q.id && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0, marginTop: 0 }}
                      animate={{ opacity: 1, height: 'auto', marginTop: 16 }}
                      exit={{ opacity: 0, height: 0, marginTop: 0 }}
                      className="overflow-hidden text-[13px] leading-relaxed font-medium text-slate-400 border-t border-slate-700/50 pt-4"
                    >
                      {q.status.includes('Rejected') && "Pipeline terminated: False Positive Death Test flagged this candidate. Rejection thesis auto-generated."}
                      {q.status.includes('Known') && "Target cross-referenced with ExoFOP archive — already cataloged. Rejection thesis auto-saved."}
                      {q.status.includes('New Discovery') && "Transit confirmed! APIE engine derived stellar density → Kepler's 3rd Law → planet radius. Discovery thesis auto-saved."}
                      {q.status.includes('APIE') && "Inverting light curve to derive stellar density... Applying Kepler's 3rd Law for orbital distance..."}
                      {q.status.includes('Resonance') && "Python VF checking for 13.7-day TESS downlink resonance artifacts..."}
                      {q.status.includes('Harmonic') && "Performing Phase-Folding at multiple harmonics and Odd-Even Depth Consistency Check..."}
                      {['Fetching', 'Scanning', 'Verifying'].some(s => q.status.includes(s)) && "AI agents analyzing folded light curves with Python Verification Functions and APIE engine."}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </motion.section>
  );
}
