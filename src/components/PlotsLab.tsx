import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Image as ImageIcon, X, Maximize2, Download, ExternalLink, Satellite } from 'lucide-react';

export function PlotsLab() {
  const [files, setFiles] = useState<string[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/plots')
      .then(res => res.json())
      .then(data => {
        setFiles(data.files);
        setLoading(false);
      })
      .catch(err => console.error(err));
  }, []);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-4xl font-display font-extrabold text-slate-100 mb-3 tracking-tight">
            Scientific <span className="text-violet-400">Visualization</span>
          </h2>
          <p className="text-slate-400 font-medium text-lg max-w-2xl">
            High-resolution phase-folded light curves and TTV/O-C analysis diagrams.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-12 h-12 border-4 border-violet-500/20 border-t-violet-500 rounded-full animate-spin" />
        </div>
      ) : files.length === 0 ? (
        <div className="bg-slate-900/50 border-2 border-dashed border-slate-800 rounded-[2.5rem] p-20 text-center">
          <div className="bg-slate-800 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <ImageIcon className="w-10 h-10 text-slate-500" />
          </div>
          <h3 className="text-xl font-bold text-slate-300 mb-2">No Visualizations Found</h3>
          <p className="text-slate-500">Run the physical profile engine to generate analytic plots.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {files.map((file, idx) => (
            <motion.div
              key={file}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.05 }}
              className="group relative bg-slate-900 border border-slate-800 rounded-[2rem] overflow-hidden transition-all hover:shadow-2xl hover:shadow-violet-500/10 hover:-translate-y-1"
            >
              <div className="aspect-video relative overflow-hidden bg-slate-950">
                <img 
                  src={`/plots/${file}`} 
                  alt={file}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                  <button 
                    onClick={() => setSelectedImage(file)}
                    className="p-3 bg-white text-slate-900 rounded-full shadow-xl hover:scale-110 transition-transform"
                  >
                    <Maximize2 className="w-5 h-5" />
                  </button>
                  <a 
                    href={`/plots/${file}`} 
                    download
                    className="p-3 bg-violet-600 text-white rounded-full shadow-xl hover:scale-110 transition-transform"
                  >
                    <Download className="w-5 h-5" />
                  </a>
                </div>
              </div>
              <div className="p-5 border-t border-slate-800/50">
                <div className="flex items-center gap-2 mb-1">
                  <Satellite className="w-3 h-3 text-violet-400" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-violet-500">TESS Target Data</span>
                </div>
                <h4 className="text-slate-200 font-bold text-sm truncate">{file}</h4>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {selectedImage && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedImage(null)}
              className="absolute inset-0 bg-slate-950/95 backdrop-blur-xl"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative z-10 w-full max-w-6xl max-h-[90vh] flex flex-col"
            >
              <div className="absolute -top-16 right-0 flex items-center gap-4">
                 <button
                    onClick={() => {
                      const a = document.createElement('a');
                      a.href = `/plots/${selectedImage}`;
                      a.download = selectedImage;
                      a.click();
                    }}
                    className="flex items-center gap-2 px-6 py-3 bg-violet-600 hover:bg-violet-500 text-white rounded-2xl font-bold transition-all shadow-xl shadow-violet-600/20"
                  >
                    <Download className="w-5 h-5" />
                    Download Plot
                  </button>
                <button
                  onClick={() => setSelectedImage(null)}
                  className="p-3 bg-slate-800 hover:bg-rose-500/20 hover:text-rose-400 rounded-2xl text-slate-400 transition-all border border-slate-700"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] overflow-hidden shadow-2xl p-2">
                <img 
                  src={`/plots/${selectedImage}`} 
                  alt={selectedImage}
                  className="w-full h-auto max-h-[80vh] object-contain rounded-2xl"
                />
              </div>
              <div className="mt-6 flex items-center justify-between px-4">
                <div>
                  <h3 className="text-2xl font-bold text-slate-100">{selectedImage}</h3>
                  <p className="text-slate-400 font-medium">Analytical Result • Sarkar ExoHunter Physical Engine</p>
                </div>
                <div className="flex items-center gap-2 text-violet-400 font-bold bg-violet-500/10 px-4 py-2 rounded-xl border border-violet-500/20">
                  <Satellite className="w-5 h-5" />
                  Verified Photometry
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
