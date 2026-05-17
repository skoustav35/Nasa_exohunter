import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Telescope, BrainCircuit, Database, Sparkles, ArrowRight, Orbit } from 'lucide-react';
import { collection, query, where, getCountFromServer, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';

export default function LandingPage({ onEnter }: { onEnter: () => void }) {
  const [stats, setStats] = useState({ discoveries: 0, scans: 0 });

  useEffect(() => {
    async function fetchStats() {
      try {
        // Total discoveries
        const discQuery = query(
          collection(db, 'queries'),
          where('status', '==', 'New Discovery!')
        );
        const discSnap = await getDocs(discQuery);
        
        // Total scans
        const allSnap = await getDocs(collection(db, 'queries'));
        
        setStats({
          discoveries: discSnap.size,
          scans: allSnap.size,
        });
      } catch (e) {
        // Silently fail — stats are non-critical
      }
    }
    fetchStats();
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-white overflow-hidden relative font-sans flex flex-col">
      {/* Astronomical Background Elements */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[10%] left-[10%] w-[500px] h-[500px] bg-indigo-600/30 rounded-full blur-[120px] mix-blend-screen animate-float-slow" />
        <div className="absolute top-[40%] right-[10%] w-[400px] h-[400px] bg-fuchsia-600/20 rounded-full blur-[100px] mix-blend-screen animate-float-medium" />
        <div className="absolute bottom-[-10%] left-[30%] w-[600px] h-[600px] bg-blue-600/30 rounded-full blur-[150px] mix-blend-screen animate-float-slow" />
        {/* Soft stardust overlay */}
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-40 mix-blend-screen" />
      </div>

      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 sm:px-10 lg:px-16 max-w-7xl mx-auto w-full pt-20 pb-16">
        
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-center"
        >
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md mb-8 shadow-lg shadow-indigo-500/10"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span className="text-sm font-bold tracking-wider uppercase text-indigo-100">NASA MAST Archive Integration</span>
          </motion.div>
          
          <h1 className="text-6xl md:text-8xl font-display font-extrabold tracking-tighter mb-8 leading-[1.1]">
            Automated <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 via-fuchsia-300 to-amber-200 drop-shadow-sm">
              Exoplanet Discovery
            </span>
          </h1>
          
          <p className="max-w-3xl mx-auto text-xl md:text-2xl text-slate-300 mb-12 leading-relaxed font-medium">
            Sarkar ExoHunter is a thesis-grade, multi-agent AI pipeline. 
            We ingest <strong className="text-indigo-300">real TESS satellite light curves</strong> from the NASA MAST archive and deploy deep-reasoning neural networks 
            to autonomously vet and discover uncataloged worlds in deep space.
          </p>

          {/* Live Stats */}
          {(stats.discoveries > 0 || stats.scans > 0) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.5 }}
              className="flex items-center justify-center gap-8 mb-12"
            >
              <div className="text-center">
                <div className="text-3xl font-display font-black text-indigo-300">{stats.scans.toLocaleString()}</div>
                <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Total Scans</div>
              </div>
              <div className="w-px h-10 bg-slate-700" />
              <div className="text-center">
                <div className="text-3xl font-display font-black text-emerald-400">{stats.discoveries.toLocaleString()}</div>
                <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Discoveries</div>
              </div>
            </motion.div>
          )}

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onEnter}
            className="group relative inline-flex items-center justify-center gap-4 bg-white text-indigo-950 px-10 py-5 rounded-full font-extrabold text-xl transition-all shadow-[0_0_40px_rgba(255,255,255,0.3)] hover:shadow-[0_0_60px_rgba(255,255,255,0.5)]"
          >
            Enter the Observatory
            <ArrowRight className="w-6 h-6 group-hover:translate-x-1.5 transition-transform" />
          </motion.button>
        </motion.div>

        {/* Quality metric cards */}
        <motion.div 
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 mt-24 w-full"
        >
          {[
            { icon: Database, title: "Real Data Ingestion", desc: "Fetches authentic phase-folded light curves directly from the NASA MAST Archive (Exo.MAST API) for any TESS TIC target." },
            { icon: BrainCircuit, title: "Multi-Agent Verifier", desc: "Dual Gemini models — Flash for rapid statistical filtering, Pro with Google Search grounding for deep archive verification." },
            { icon: Telescope, title: "Thesis-Grade Output", desc: "Generates structured discovery theses with transit modeling, planetary radius estimates, false-positive assessment, and habitability analysis." }
          ].map((feature, i) => (
            <motion.div 
              key={i} 
              whileHover={{ y: -5 }}
              className="bg-white/5 border border-white/10 p-8 rounded-3xl backdrop-blur-md shadow-2xl transition-all hover:bg-white/10 hover:border-white/20"
            >
              <div className="w-14 h-14 bg-indigo-500/20 rounded-2xl flex items-center justify-center mb-6 border border-indigo-500/30">
                <feature.icon className="w-7 h-7 text-indigo-300" />
              </div>
              <h3 className="text-2xl font-display font-bold mb-3 tracking-tight">{feature.title}</h3>
              <p className="text-slate-300 text-base leading-relaxed font-medium">{feature.desc}</p>
            </motion.div>
          ))}
        </motion.div>

      </div>
    </div>
  );
}
