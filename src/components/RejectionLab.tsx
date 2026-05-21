import React, { useEffect, useState } from 'react';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { CheckCircle2, ChevronRight, X, AlertTriangle, Search as SearchIcon } from 'lucide-react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';

export function RejectionLab() {
  const [rejections, setRejections] = useState<any[]>([]);
  const [selectedThesis, setSelectedThesis] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    // Only rejected theses
    const q = query(
      collection(db, 'queries'),
      where('status', '==', 'Rejected Thesis')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: any[] = [];
      snapshot.forEach(doc => data.push({ id: doc.id, ...doc.data() }));
      data.sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : (a.createdAt ? new Date(a.createdAt) : new Date(0));
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : (b.createdAt ? new Date(b.createdAt) : new Date(0));
        return dateB.getTime() - dateA.getTime();
      });
      setRejections(data);
    });

    return () => unsubscribe();
  }, []);

  const filteredRejections = rejections.filter(d => 
    d.ticId.includes(searchQuery) || 
    d.researcherName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (rejections.length === 0) {
    return (
      <motion.section
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 px-2">
          <h3 className="text-sm font-bold tracking-widest text-slate-400 uppercase flex items-center gap-2 m-0">
            <AlertTriangle className="w-4 h-4 text-rose-500" />
            False Positive Archive
          </h3>
        </div>
        
        <div className="bg-slate-900/50 border-2 border-slate-800 border-dashed rounded-[2rem] p-16 flex flex-col items-center justify-center text-center">
          <div className="bg-rose-900/20 shadow-inner p-4 rounded-full mb-4">
            <AlertTriangle className="w-8 h-8 text-rose-500" />
          </div>
          <h4 className="text-xl font-bold text-slate-300 mb-2">No Rejections Documented Yet</h4>
          <p className="text-slate-500 font-medium max-w-md mx-auto">
            The AI agents haven't documented any detailed false positive rejection theses yet.
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
      className="relative"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 px-2">
        <h3 className="text-sm font-bold tracking-widest text-slate-400 uppercase flex items-center gap-2 m-0">
          <AlertTriangle className="w-4 h-4 text-rose-500" />
          False Positive Archive
        </h3>
        
        <div className="relative">
          <SearchIcon className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search TIC ID or Researcher..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-slate-900 border border-slate-800 text-slate-300 rounded-full pl-9 pr-4 py-1.5 text-sm focus:outline-none focus:border-rose-500/50 focus:ring-1 focus:ring-rose-500/50 w-full sm:w-64 transition-all"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <AnimatePresence>
          {filteredRejections.map((thesis, i) => (
            <motion.div
              key={thesis.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => setSelectedThesis(thesis)}
              className="group bg-slate-900/50 border border-slate-800 rounded-3xl p-5 hover:bg-slate-800/80 hover:border-rose-500/30 transition-all cursor-pointer shadow-lg hover:shadow-rose-500/10"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="bg-rose-500/10 text-rose-400 px-3 py-1.5 rounded-full text-xs font-bold tracking-wide flex items-center gap-2">
                  <X className="w-3 h-3" />
                  REJECTED
                </div>
                <div className="text-xs text-slate-500 font-medium">
                  {thesis.createdAt ? format(thesis.createdAt?.toDate ? thesis.createdAt.toDate() : new Date(thesis.createdAt), 'MMM d, yyyy') : 'Recent'}
                </div>
              </div>
              
              <h4 className="text-2xl font-bold text-white mb-2 font-mono flex items-center gap-2">
                TIC {thesis.ticId}
              </h4>
              
              <div className="flex items-center gap-2 text-sm text-slate-400 mb-4">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                Vetted by {thesis.researcherName}
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-800 group-hover:border-rose-500/20 transition-colors">
                <span className="text-xs font-medium text-slate-500 group-hover:text-rose-400 transition-colors">
                  Read Rejection Thesis
                </span>
                <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-rose-400 transition-colors" />
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Modal overlay */}
      <AnimatePresence>
        {selectedThesis && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedThesis(null)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-4xl bg-[#0B1120] border border-slate-800 rounded-[2rem] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
            >
              <div className="flex items-center justify-between p-6 border-b border-slate-800/50 bg-slate-900/50">
                <div className="flex items-center gap-4">
                  <div className="bg-rose-500/10 text-rose-400 p-2 rounded-2xl">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white font-mono leading-none">TIC {selectedThesis.ticId}</h3>
                    <p className="text-slate-400 text-sm mt-1">Rejection Thesis by {selectedThesis.researcherName}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedThesis(null)}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="p-8 overflow-y-auto custom-scrollbar flex-1 bg-slate-900/20">
                <div className="prose prose-invert prose-emerald max-w-none prose-headings:font-bold prose-h3:text-rose-400 prose-a:text-rose-400">
                  <Markdown 
                    remarkPlugins={[remarkGfm, remarkMath]}
                    rehypePlugins={[rehypeKatex]}
                  >
                    {selectedThesis.thesis}
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
