import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Trophy, Medal, Orbit } from 'lucide-react';
import { motion } from 'motion/react';

interface LeaderboardEntry {
  userId: string;
  researcherName: string;
  count: number;
}

export function Leaderboard() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Only successful discoveries
    const q = query(
      collection(db, 'queries'),
      where('status', '==', 'New Discovery!')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const counts: Record<string, LeaderboardEntry> = {};
      
      snapshot.forEach(doc => {
        const data = doc.data();
        if (!counts[data.userId]) {
          counts[data.userId] = {
            userId: data.userId,
            researcherName: data.researcherName || 'Unknown Researcher',
            count: 0
          };
        }
        counts[data.userId].count += 1;
      });

      const sortedLeaderboard = Object.values(counts).sort((a, b) => b.count - a.count);
      setLeaderboard(sortedLeaderboard);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <span className="w-8 h-8 border-4 border-slate-200 border-t-amber-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (leaderboard.length === 0) {
    return (
      <motion.section
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
      >
        <div className="bg-slate-900/50 border-2 border-slate-800 border-dashed rounded-[2rem] p-16 flex flex-col items-center justify-center text-center">
          <div className="bg-amber-900/20 shadow-inner p-4 rounded-full mb-4">
            <Trophy className="w-8 h-8 text-amber-500" />
          </div>
          <h4 className="text-xl font-bold text-slate-300 mb-2">No Rankings Yet</h4>
          <p className="text-slate-500 font-medium max-w-md mx-auto">
            The leaderboard is empty because no uncataloged exoplanets have been verified yet.
          </p>
        </div>
      </motion.section>
    );
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.2 }}
      className="max-w-4xl mx-auto"
    >
      <div className="flex items-center gap-3 mb-8">
        <div className="bg-amber-500/10 p-3 rounded-2xl border border-amber-500/20 shadow-inner">
          <Trophy className="w-6 h-6 text-amber-500 relative z-10" />
        </div>
        <div>
          <h2 className="text-2xl font-display font-extrabold text-slate-100">Global Leaderboard</h2>
          <p className="text-sm font-medium text-slate-400 mt-1">Official rankings of vetted exoplanet discoveries.</p>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-[2rem] overflow-hidden shadow-[0_20px_50px_-12px_rgba(0,0,0,0.4)] relative">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500" />
        
        <div className="divide-y divide-slate-800/80">
          {leaderboard.map((entry, index) => (
            <motion.div 
              key={entry.userId}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              className="flex items-center justify-between p-6 px-8 hover:bg-slate-800/80 transition-colors group"
            >
              <div className="flex items-center gap-6">
                <div className="flex items-center justify-center w-10 h-10 shrink-0">
                  {index === 0 ? (
                    <Trophy className="w-8 h-8 text-amber-400 drop-shadow-md" />
                  ) : index === 1 ? (
                    <Medal className="w-7 h-7 text-slate-300 drop-shadow-sm" />
                  ) : index === 2 ? (
                    <Medal className="w-7 h-7 text-orange-400 drop-shadow-sm" />
                  ) : (
                    <span className="text-xl font-display font-bold text-slate-600">#{index + 1}</span>
                  )}
                </div>
                
                <div>
                  <div className="text-lg font-bold text-slate-200 group-hover:text-amber-500 transition-colors">
                    {entry.researcherName}
                  </div>
                  <div className="text-sm font-medium text-slate-500 flex items-center gap-1.5">
                    <Orbit className="w-3.5 h-3.5" /> Researcher ID: {entry.userId.substring(0, 8).toUpperCase()}
                  </div>
                </div>
              </div>
              
              <div className="text-right">
                <div className="text-3xl font-display font-black text-slate-200">
                  {entry.count}
                </div>
                <div className="text-[11px] font-bold text-slate-500 tracking-widest uppercase">
                  Discoveries
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.section>
  );
}
