import React, { useEffect, useState } from 'react';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { CheckCircle2, ChevronRight, X, Sparkles, Search as SearchIcon } from 'lucide-react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';

export function DiscoveryLab() {
  const [discoveries, setDiscoveries] = useState<any[]>([]);
  const [selectedThesis, setSelectedThesis] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    // Only successful discoveries
    const q = query(
      collection(db, 'queries'),
      where('status', '==', 'New Discovery!'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: any[] = [];
      snapshot.forEach(doc => data.push({ id: doc.id, ...doc.data() }));
      setDiscoveries(data);
    });

    return () => unsubscribe();
  }, []);

  const filteredDiscoveries = discoveries.filter(d => 
    d.ticId.includes(searchQuery) || 
    d.researcherName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (discoveries.length === 0) {
    return (
      <motion.section
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 px-2">
          <h3 className="text-sm font-bold tracking-widest text-slate-400 uppercase flex items-center gap-2 m-0">
            <Sparkles className="w-4 h-4 text-emerald-500" />
            The Discovery Lab
          </h3>
        </div>
        
        <div className="bg-slate-900/50 border-2 border-slate-800 border-dashed rounded-[2rem] p-16 flex flex-col items-center justify-center text-center">
          <div className="bg-emerald-900/20 shadow-inner p-4 rounded-full mb-4">
            <Sparkles className="w-8 h-8 text-emerald-500" />
          </div>
          <h4 className="text-xl font-bold text-slate-300 mb-2">No Discoveries Yet</h4>
          <p className="text-slate-500 font-medium max-w-md mx-auto">
            The AI agents haven't found any uncataloged exoplanets yet. Keep submitting unique TIC IDs to the observatory!
          </p>
        </div>
      </motion.section>
    );
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.4 }}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 px-2">
        <h3 className="text-sm font-bold tracking-widest text-slate-400 uppercase flex items-center gap-2 m-0">
          <Sparkles className="w-4 h-4 text-emerald-500" />
          The Discovery Lab
        </h3>
        
        <div className="relative">
          <SearchIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input 
            type="text" 
            placeholder="Search TIC ID or Researcher..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-4 py-2 text-sm font-bold text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 w-full sm:w-64 transition-colors shadow-inner"
          />
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredDiscoveries.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-500 font-medium">
             No discoveries match your search criteria.
          </div>
        ) : (
          filteredDiscoveries.map((d, i) => (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              key={d.id}
              onClick={() => setSelectedThesis(d)}
              className="group cursor-pointer bg-slate-800 border border-slate-700/80 hover:border-emerald-500/50 transition-all rounded-[2rem] p-8 relative overflow-hidden shadow-[0_20px_50px_-12px_rgba(0,0,0,0.4)] hover:shadow-2xl hover:shadow-emerald-500/10 hover:-translate-y-1.5"
            >
            <div className="absolute -right-16 -top-16 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl group-hover:bg-emerald-500/20 transition-all" />
            
            <div className="text-sm font-bold text-emerald-400 tracking-wide uppercase mb-3">Unvetted Candidate</div>
            <div className="text-3xl font-display font-extrabold text-slate-100 mb-4">TIC {d.ticId}</div>
            
            <div className="text-[15px] font-medium text-slate-400 mb-8 line-clamp-3 leading-relaxed">
              {d.thesis ? d.thesis.substring(0, 150) + "..." : "Extracting thesis parameters..."}
            </div>
            
            <div className="flex items-center justify-between mt-auto pt-5 border-t border-slate-700/50">
              <span className="text-sm font-bold text-slate-400 flex items-center gap-2">
                <span className="w-5 h-5 bg-slate-700 rounded-full flex items-center justify-center text-[10px] text-slate-300">
                  {d.researcherName.charAt(0).toUpperCase()}
                </span>
                {d.researcherName}
              </span>
              <div className="text-indigo-400 flex items-center text-sm font-bold gap-1.5 group-hover:translate-x-1.5 transition-transform bg-indigo-500/10 px-3 py-1.5 rounded-xl border border-indigo-500/20">
                Read Thesis <ChevronRight className="w-4 h-4" />
              </div>
            </div>
          </motion.div>
          ))
        )}
      </div>

      <AnimatePresence>
        {selectedThesis && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 pb-20 pt-20">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-md" 
              onClick={() => setSelectedThesis(null)} 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative w-full max-w-4xl max-h-full bg-slate-900 border border-slate-700 rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden"
            >
              <div className="flex items-center justify-between p-8 border-b border-slate-800 bg-slate-900/95 sticky top-0 z-10 backdrop-blur-xl">
                <div>
                  <div className="text-sm font-bold tracking-widest uppercase text-emerald-400 mb-2">Official Discovery Thesis</div>
                  <h2 className="text-4xl font-display font-extrabold text-slate-100">TIC {selectedThesis.ticId}</h2>
                </div>
                <button 
                  onClick={() => setSelectedThesis(null)}
                  className="text-slate-400 hover:text-slate-200 transition p-3 bg-slate-800 border border-slate-700 rounded-2xl hover:bg-slate-700 hover:-rotate-90 duration-300 shadow-inner"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="p-8 md:p-12 overflow-y-auto bg-slate-900">
                <div className="flex flex-wrap gap-4 mb-12 pb-8 border-b border-slate-800">
                  <div className="bg-slate-800 border border-slate-700 px-6 py-4 rounded-2xl shadow-inner">
                    <div className="text-xs font-bold text-slate-500 tracking-wider uppercase mb-1.5">Lead Researcher</div>
                    <div className="text-base text-slate-200 font-bold">{selectedThesis.researcherName}</div>
                  </div>
                  <div className="bg-slate-800 border border-slate-700 px-6 py-4 rounded-2xl shadow-inner">
                    <div className="text-xs font-bold text-slate-500 tracking-wider uppercase mb-1.5">Catalog ID</div>
                    <div className="text-base font-mono font-bold text-slate-200">{selectedThesis.ticId}</div>
                  </div>
                  <div className="bg-slate-800 border border-slate-700 px-6 py-4 rounded-2xl shadow-inner">
                    <div className="text-xs font-bold text-slate-500 tracking-wider uppercase mb-1.5">Date Logged</div>
                    <div className="text-base text-slate-200 font-bold">
                      {selectedThesis.createdAt?.seconds 
                        ? format(selectedThesis.createdAt.seconds * 1000, 'MMM do, yyyy') 
                        : 'Unknown'}
                    </div>
                  </div>
                </div>

                <div className="markdown-body text-lg">
                  <Markdown 
                    remarkPlugins={[remarkGfm, remarkMath]} 
                    rehypePlugins={[rehypeKatex]}
                  >
                    {selectedThesis.thesis || "No thesis provided."}
                  </Markdown>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}
