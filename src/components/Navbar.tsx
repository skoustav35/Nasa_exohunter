import React, { useState } from 'react';
import { useFirebase } from './FirebaseProvider';
import { Telescope, LogIn, LogOut, Cpu, Github, BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { McpConfigModal } from './McpConfigModal';
import { InstructionsModal } from './InstructionsModal';

export function Navbar() {
  const { user, researcherName, signIn, signOut, loading } = useFirebase();
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const [showMcpModal, setShowMcpModal] = useState(false);
  const [showInstructionsModal, setShowInstructionsModal] = useState(false);

  return (
    <motion.nav 
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.1 }}
      className="fixed top-4 left-4 right-4 md:left-8 md:right-8 h-20 bg-slate-900/80 backdrop-blur-xl border-2 border-slate-700/60 z-50 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.4)]"
    >
      <div className="h-full px-6 flex items-center justify-between">
        <div className="flex items-center gap-4 text-indigo-400">
          <div className="bg-indigo-500/10 p-2.5 rounded-2xl border border-indigo-500/20 shadow-inner">
            <Telescope className="w-6 h-6" />
          </div>
          <span className="font-display font-extrabold text-2xl tracking-tight text-slate-100">Sarkar<span className="text-indigo-400">ExoHunter</span></span>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Discovery Guide Button */}
          <button
            onClick={() => setShowInstructionsModal(true)}
            className="flex items-center gap-2 text-sm font-bold text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/15 border border-emerald-500/25 hover:border-emerald-500/40 px-4 py-2 rounded-2xl transition-all hover:-translate-y-0.5 shadow-sm hover:shadow-lg hover:shadow-emerald-500/10 cursor-pointer"
          >
            <BookOpen className="w-4 h-4" />
            <span className="hidden sm:inline">Discovery Guide</span>
          </button>

          {/* GitHub Button */}
          <a
            href="https://github.com/skoustav35/Nasa_exohunter.git"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm font-bold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 px-4 py-2 rounded-2xl transition-all hover:-translate-y-0.5 shadow-sm"
          >
            <Github className="w-4 h-4" />
            <span className="hidden sm:inline">GitHub</span>
          </a>

          {/* MCP Connect Button */}
          <button
            onClick={() => setShowMcpModal(true)}
            className="flex items-center gap-2 text-sm font-bold text-violet-400 hover:text-violet-300 bg-violet-500/10 hover:bg-violet-500/15 border border-violet-500/25 hover:border-violet-500/40 px-4 py-2 rounded-2xl transition-all hover:-translate-y-0.5 shadow-sm hover:shadow-lg hover:shadow-violet-500/10"
          >
            <Cpu className="w-4 h-4" />
            <span className="hidden sm:inline">MCP</span>
          </button>

          {!loading && (
            user ? (
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-slate-300 bg-slate-800 border border-slate-700 px-4 py-2 rounded-2xl hidden sm:inline-block shadow-inner">
                  <span className="text-slate-500 font-medium">Researcher:</span> {researcherName}
                </span>
                <button 
                  onClick={() => setShowSignOutConfirm(true)}
                  className="flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/20 border border-transparent px-4 py-2 rounded-2xl transition-all"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Sign Out</span>
                </button>

                <AnimatePresence>
                  {showSignOutConfirm && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                      <motion.div 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={() => setShowSignOutConfirm(false)}
                      />
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        className="bg-slate-900 rounded-3xl p-6 md:p-8 shadow-2xl relative z-10 max-w-sm w-full border border-slate-700"
                      >
                        <h3 className="text-xl font-display font-bold text-slate-100 mb-2">Sign Out</h3>
                        <p className="text-slate-400 font-medium mb-6 text-sm">Are you sure you want to log out of Sarkar ExoHunter?</p>
                        <div className="flex items-center gap-3 justify-end">
                          <button 
                            onClick={() => setShowSignOutConfirm(false)}
                            className="px-5 py-2.5 rounded-xl font-bold text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors text-sm"
                          >
                            Cancel
                          </button>
                          <button 
                            onClick={() => { setShowSignOutConfirm(false); signOut(); }}
                            className="px-5 py-2.5 rounded-xl font-bold bg-red-600 text-white hover:bg-red-500 transition-colors shadow-lg shadow-red-600/20 text-sm"
                          >
                            Yes, Sign Out
                          </button>
                        </div>
                      </motion.div>
                    </div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <button 
                onClick={signIn}
                className="flex items-center gap-2 text-sm bg-indigo-600 border border-indigo-500 hover:bg-indigo-500 text-slate-100 px-6 py-2.5 rounded-2xl transition-all font-bold shadow-lg shadow-indigo-600/20 hover:shadow-xl hover:shadow-indigo-500/30 hover:-translate-y-0.5"
              >
                <LogIn className="w-4 h-4" />
                Sign In to Discover
              </button>
            )
          )}
        </div>
      </div>

      {/* MCP Config Modal */}
      <McpConfigModal isOpen={showMcpModal} onClose={() => setShowMcpModal(false)} />

      {/* Discovery Guide Modal */}
      <InstructionsModal isOpen={showInstructionsModal} onClose={() => setShowInstructionsModal(false)} />
    </motion.nav>
  );
}
