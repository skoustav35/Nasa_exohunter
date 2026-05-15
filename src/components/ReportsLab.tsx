import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { motion, AnimatePresence } from 'motion/react';
import { FileText, ChevronRight, X, FileCode, Download, BookOpen } from 'lucide-react';

export function ReportsLab() {
  const [files, setFiles] = useState<{ id: string; filename: string; ticId: string }[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'reports'));
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(d => ({
        id: d.id,
        filename: d.data().filename || d.id,
        ticId: d.data().ticId || 'unknown',
      })).sort((a, b) => a.ticId.localeCompare(b.ticId));
      setFiles(data);
      setLoading(false);
    }, (err) => {
      console.error('Reports listener error:', err);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const viewReport = async (filename: string) => {
    setSelectedFile(filename);
    setContent(null);
    try {
      const docRef = doc(db, 'reports', filename);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setContent(docSnap.data().content || 'No content available.');
      } else {
        setContent('Report not found in cloud database.');
      }
    } catch (err) {
      console.error('Failed to load report:', err);
      setContent('Error loading report.');
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="h-px w-12 bg-sky-500/50" />
            <span className="text-sky-400 font-black uppercase tracking-[0.3em] text-xs">Cloud-Synced Reports</span>
          </div>
          <h2 className="text-4xl font-display font-extrabold text-slate-100 mb-3 tracking-tight">
            Methodology <span className="text-sky-400">Reports</span>
          </h2>
          <p className="text-slate-400 font-medium text-lg max-w-2xl">
            Live LaTeX whitepapers streamed from Firebase, documenting the complete scientific vetting chain for all candidates.
          </p>
        </div>
        <div className="flex items-center gap-2 text-emerald-400 bg-emerald-500/5 px-4 py-2 rounded-xl border border-emerald-500/10 shrink-0">
          <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
          <span className="text-xs font-black uppercase tracking-tighter">Real-Time Sync</span>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-12 h-12 border-4 border-sky-500/20 border-t-sky-500 rounded-full animate-spin" />
        </div>
      ) : files.length === 0 ? (
        <div className="bg-slate-900/50 border-2 border-dashed border-slate-800 rounded-[2.5rem] p-20 text-center">
          <div className="bg-slate-800 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <FileCode className="w-10 h-10 text-slate-500" />
          </div>
          <h3 className="text-xl font-bold text-slate-300 mb-2">No Reports Found</h3>
          <p className="text-slate-500">Run the discovery pipeline to generate methodology whitepapers.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {files.map((file, idx) => (
            <motion.div
              key={file.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.04 }}
              onClick={() => viewReport(file.filename)}
              className="group cursor-pointer bg-slate-900 border border-slate-800 hover:border-sky-500/50 p-6 rounded-3xl flex items-center justify-between transition-all hover:shadow-2xl hover:shadow-sky-500/10"
            >
              <div className="flex items-center gap-4">
                <div className="bg-sky-500/10 p-3 rounded-2xl group-hover:scale-110 transition-transform">
                  <FileText className="w-6 h-6 text-sky-400" />
                </div>
                <div>
                  <h4 className="text-slate-100 font-bold text-lg">{file.filename.replace('_methodology.tex', '')}</h4>
                  <p className="text-slate-500 text-sm font-medium">LaTeX Methodology • Firebase Cloud</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-sky-400 group-hover:translate-x-1 transition-all" />
            </motion.div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {selectedFile && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSelectedFile(null)}
              className="absolute inset-0 bg-slate-950/90 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative z-10 w-full max-w-5xl h-[85vh] bg-slate-900 border border-slate-800 rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden"
            >
              <div className="p-6 md:p-8 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
                <div className="flex items-center gap-4">
                  <div className="bg-sky-500/10 p-2.5 rounded-xl">
                    <BookOpen className="w-6 h-6 text-sky-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-100">{selectedFile}</h3>
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Firebase Cloud • Source Methodology</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      const blob = new Blob([content || ''], { type: 'text/plain' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = selectedFile;
                      a.click();
                    }}
                    className="p-3 bg-slate-800 hover:bg-slate-700 rounded-2xl text-slate-300 transition-all"
                    title="Download Source"
                  >
                    <Download className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setSelectedFile(null)}
                    className="p-3 bg-slate-800 hover:bg-rose-500/20 hover:text-rose-400 rounded-2xl text-slate-400 transition-all"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-auto p-6 md:p-12 font-mono text-sm leading-relaxed text-slate-300 selection:bg-sky-500/30">
                {!content ? (
                  <div className="flex flex-col items-center justify-center h-full gap-4 text-slate-500">
                    <div className="w-8 h-8 border-2 border-slate-700 border-t-sky-500 rounded-full animate-spin" />
                    <p className="font-sans font-bold">Loading from Firebase...</p>
                  </div>
                ) : (
                  <pre className="whitespace-pre-wrap">{content}</pre>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
