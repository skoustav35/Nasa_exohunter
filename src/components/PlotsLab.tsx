import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Image as ImageIcon, X, Maximize2, Download, Satellite, ChevronLeft, ChevronRight, Hash } from 'lucide-react';

interface TicGroup {
  ticId: string;
  phaseFolded?: string;
  ttvOc?: string;
}

export function PlotsLab() {
  const [groups, setGroups] = useState<TicGroup[]>([]);
  const [selectedImage, setSelectedImage] = useState<{ url: string; title: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/plots')
      .then(res => res.json())
      .then(data => {
        const files: string[] = data.files;
        const grouped: Record<string, TicGroup> = {};

        files.forEach(file => {
          const match = file.match(/TIC_(\d+)/);
          if (match) {
            const ticId = match[1];
            if (!grouped[ticId]) grouped[ticId] = { ticId };
            
            if (file.includes('phase_folded')) {
              grouped[ticId].phaseFolded = file;
            } else if (file.includes('ttv_oc')) {
              grouped[ticId].ttvOc = file;
            }
          }
        });

        setGroups(Object.values(grouped));
        setLoading(false);
      })
      .catch(err => console.error(err));
  }, []);

  return (
    <div className="space-y-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="h-px w-12 bg-violet-500/50" />
            <span className="text-violet-400 font-black uppercase tracking-[0.3em] text-xs">Analytical Visuals</span>
          </div>
          <h2 className="text-5xl font-display font-extrabold text-slate-100 mb-4 tracking-tight">
            Scientific <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-indigo-400">Visualization</span>
          </h2>
          <p className="text-slate-400 font-medium text-lg max-w-2xl leading-relaxed">
            High-fidelity diagnostic plots grouped by target. Observe transit morphology and timing variations with precision.
          </p>
        </motion.div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 gap-6">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-violet-500/10 border-t-violet-500 rounded-full animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-2 h-2 bg-violet-400 rounded-full animate-ping" />
            </div>
          </div>
          <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Compiling Visual Data...</p>
        </div>
      ) : groups.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-900/50 border-2 border-dashed border-slate-800 rounded-[3rem] p-24 text-center"
        >
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 w-24 h-24 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-2xl border border-white/5">
            <ImageIcon className="w-12 h-12 text-slate-600" />
          </div>
          <h3 className="text-2xl font-bold text-slate-200 mb-3">No Visualizations In Archive</h3>
          <p className="text-slate-500 max-w-sm mx-auto">Analyze a TIC target in the Observatory to generate phase-folded and TTV diagrams.</p>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {groups.map((group, idx) => (
            <motion.div
              key={group.ticId}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="group bg-slate-900/40 border border-slate-800 hover:border-violet-500/30 rounded-[2.5rem] p-8 transition-all hover:shadow-[0_20px_50px_-12px_rgba(139,92,246,0.15)] backdrop-blur-sm"
            >
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="bg-violet-500/10 p-3 rounded-2xl border border-violet-500/20">
                    <Hash className="w-6 h-6 text-violet-400" />
                  </div>
                  <div>
                    <h4 className="text-2xl font-display font-extrabold text-slate-100 tracking-tight">TIC {group.ticId}</h4>
                    <p className="text-slate-500 text-sm font-bold uppercase tracking-wider">Target ID System</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-violet-400 bg-violet-500/5 px-4 py-2 rounded-xl border border-violet-500/10">
                  <Satellite className="w-4 h-4" />
                  <span className="text-xs font-black uppercase tracking-tighter">Diagnostic Data</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Phase Folded Plot */}
                {group.phaseFolded && (
                  <div className="relative group/img aspect-[4/3] rounded-3xl overflow-hidden bg-slate-950 border border-slate-800 shadow-inner">
                    <img 
                      src={`/plots/${group.phaseFolded}`} 
                      alt="Phase Folded" 
                      className="w-full h-full object-cover transition-all duration-700 group-hover/img:scale-110 group-hover/img:brightness-50"
                    />
                    <div className="absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover/img:opacity-100 transition-all duration-300 transform translate-y-4 group-hover/img:translate-y-0">
                      <button 
                        onClick={() => setSelectedImage({ url: `/plots/${group.phaseFolded!}`, title: `TIC ${group.ticId} - Phase Folded` })}
                        className="bg-white text-slate-950 p-4 rounded-full shadow-2xl hover:scale-110 active:scale-95 transition-all mb-3"
                      >
                        <Maximize2 className="w-5 h-5" />
                      </button>
                      <span className="text-white text-[10px] font-black uppercase tracking-widest">Phase Folded</span>
                    </div>
                  </div>
                )}

                {/* TTV O-C Plot */}
                {group.ttvOc && (
                  <div className="relative group/img aspect-[4/3] rounded-3xl overflow-hidden bg-slate-950 border border-slate-800 shadow-inner">
                    <img 
                      src={`/plots/${group.ttvOc}`} 
                      alt="TTV O-C" 
                      className="w-full h-full object-cover transition-all duration-700 group-hover/img:scale-110 group-hover/img:brightness-50"
                    />
                    <div className="absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover/img:opacity-100 transition-all duration-300 transform translate-y-4 group-hover/img:translate-y-0">
                      <button 
                        onClick={() => setSelectedImage({ url: `/plots/${group.ttvOc!}`, title: `TIC ${group.ticId} - TTV/O-C` })}
                        className="bg-white text-slate-950 p-4 rounded-full shadow-2xl hover:scale-110 active:scale-95 transition-all mb-3"
                      >
                        <Maximize2 className="w-5 h-5" />
                      </button>
                      <span className="text-white text-[10px] font-black uppercase tracking-widest">TTV / O-C Analysis</span>
                    </div>
                  </div>
                )}

                {/* Placeholder if only one image exists */}
                {(!group.phaseFolded || !group.ttvOc) && (
                  <div className="aspect-[4/3] rounded-3xl bg-slate-950/50 border border-slate-800 border-dashed flex flex-col items-center justify-center text-slate-600 gap-3">
                    <div className="w-10 h-10 rounded-full border border-slate-800 flex items-center justify-center">
                      <X className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-widest">Secondary Data Pending</span>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Improved Lightbox Modal */}
      <AnimatePresence>
        {selectedImage && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-12 overflow-hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedImage(null)}
              className="absolute inset-0 bg-slate-950/98 backdrop-blur-2xl"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative z-10 w-full max-w-7xl h-full flex flex-col pointer-events-none"
            >
              {/* Top Controls Bar - Always Visible and Polished */}
              <div className="flex items-center justify-between mb-6 pointer-events-auto">
                <div className="bg-slate-900/80 border border-slate-700/50 px-8 py-4 rounded-[2rem] backdrop-blur-md shadow-2xl">
                  <h3 className="text-2xl font-display font-extrabold text-slate-100 tracking-tight">{selectedImage.title}</h3>
                  <p className="text-violet-400 font-black uppercase tracking-widest text-[10px] mt-1">Sarkar ExoHunter Diagnostic Insight</p>
                </div>
                
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => {
                      const a = document.createElement('a');
                      a.href = selectedImage.url;
                      a.download = selectedImage.title.replace(/\s+/g, '_') + '.png';
                      a.click();
                    }}
                    className="flex items-center gap-3 px-8 py-4 bg-violet-600 hover:bg-violet-500 text-white rounded-[1.5rem] font-bold transition-all shadow-2xl shadow-violet-600/30 active:scale-95 group pointer-events-auto"
                  >
                    <Download className="w-5 h-5 group-hover:translate-y-0.5 transition-transform" />
                    Export Analysis
                  </button>
                  <button
                    onClick={() => setSelectedImage(null)}
                    className="p-4 bg-slate-800 hover:bg-rose-500/20 hover:text-rose-400 rounded-[1.5rem] text-slate-400 transition-all border border-slate-700 shadow-2xl hover:border-rose-500/30 pointer-events-auto"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              {/* Main Image View - Centered and Contained */}
              <div className="flex-1 relative bg-slate-900/50 border border-slate-800 rounded-[3rem] overflow-hidden shadow-2xl pointer-events-auto">
                <img 
                  src={selectedImage.url} 
                  alt={selectedImage.title}
                  className="w-full h-full object-contain p-4"
                />
              </div>

              {/* Footer Info */}
              <div className="mt-8 flex items-center justify-center gap-12 text-slate-500 font-bold uppercase tracking-[0.2em] text-[10px] pointer-events-none">
                <div className="flex items-center gap-2">
                   <div className="w-1 h-1 bg-violet-500 rounded-full" />
                   NASA TESS DATA
                </div>
                <div className="flex items-center gap-2">
                   <div className="w-1 h-1 bg-violet-500 rounded-full" />
                   PHASE-FOLDED ANALYSIS
                </div>
                <div className="flex items-center gap-2">
                   <div className="w-1 h-1 bg-violet-500 rounded-full" />
                   SARKAR APIE V1.2
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
