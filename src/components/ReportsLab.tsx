import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FileText, ChevronRight, X, FileCode, Download, BookOpen } from 'lucide-react';

interface ReportFile {
  name: string;
  content?: string;
}

export function ReportsLab() {
  const [files, setFiles] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/reports')
      .then(res => res.json())
      .then(data => {
        setFiles(data.files);
        setLoading(false);
      })
      .catch(err => console.error(err));
  }, []);

  const viewReport = (filename: string) => {
    setSelectedFile(filename);
    setContent(null);
    fetch(`/api/reports/${filename}`)
      .then(res => res.json())
      .then(data => setContent(data.content))
      .catch(err => console.error(err));
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-4xl font-display font-extrabold text-slate-100 mb-3 tracking-tight">
            Methodology <span className="text-indigo-400">Reports</span>
          </h2>
          <p className="text-slate-400 font-medium text-lg max-w-2xl">
            Live LaTeX whitepapers documenting the complete scientific vetting chain for candidates.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
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
              key={file}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              onClick={() => viewReport(file)}
              className="group cursor-pointer bg-slate-900 border border-slate-800 hover:border-indigo-500/50 p-6 rounded-3xl flex items-center justify-between transition-all hover:shadow-2xl hover:shadow-indigo-500/10"
            >
              <div className="flex items-center gap-4">
                <div className="bg-indigo-500/10 p-3 rounded-2xl group-hover:scale-110 transition-transform">
                  <FileText className="w-6 h-6 text-indigo-400" />
                </div>
                <div>
                  <h4 className="text-slate-100 font-bold text-lg">{file.replace('_methodology.tex', '')}</h4>
                  <p className="text-slate-500 text-sm font-medium">LaTeX Methodology Whitepaper</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" />
            </motion.div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {selectedFile && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
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
                  <div className="bg-indigo-500/10 p-2.5 rounded-xl">
                    <BookOpen className="w-6 h-6 text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-100">{selectedFile}</h3>
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Source Methodology</p>
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
              <div className="flex-1 overflow-auto p-6 md:p-12 font-mono text-sm leading-relaxed text-slate-300 selection:bg-indigo-500/30">
                {!content ? (
                  <div className="flex flex-col items-center justify-center h-full gap-4 text-slate-500">
                    <div className="w-8 h-8 border-2 border-slate-700 border-t-indigo-500 rounded-full animate-spin" />
                    <p className="font-sans font-bold">Decrypting Whitepaper...</p>
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
