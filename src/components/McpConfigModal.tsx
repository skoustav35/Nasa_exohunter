import React, { useState } from 'react';
import { X, Copy, Check, Terminal, Cpu, Sparkles, ChevronRight, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface McpConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const MCP_CONFIG = `{
  "mcpServers": {
    "sarkar-exohunter": {
      "command": "node",
      "args": ["./mcp-server/dist/index.js"],
      "env": {
        "EXOHUNTER_API_URL": "http://localhost:3000"
      }
    }
  }
}`;

const TOOLS_LIST = [
  { name: 'get_random_tic_id', desc: 'Fetch a random planet candidate from NASA ExoFOP', category: 'Data' },
  { name: 'get_light_curve', desc: 'Retrieve phase-folded light curve from MAST Archive', category: 'Data' },
  { name: 'compute_transit_statistics', desc: 'Calculate SNR, transit depth, baseline flux', category: 'Analysis' },
  { name: 'analyze_transit', desc: 'Run full 2-agent AI discovery pipeline', category: 'Analysis' },
  { name: 'run_discovery_loop', desc: 'Automated bulk scanning of multiple targets', category: 'Analysis' },
  { name: 'classify_planet', desc: 'Classify planet type by radius and orbit', category: 'Analysis' },
  { name: 'check_known_exoplanet', desc: 'Cross-reference TIC ID against known databases', category: 'Analysis' },
  { name: 'get_query_stream', desc: 'Read live analysis attempts from all researchers', category: 'Stream' },
  { name: 'create_query_card', desc: 'Log a new analysis attempt to the stream', category: 'Stream' },
  { name: 'get_discoveries', desc: 'List all confirmed new exoplanet discoveries', category: 'Discovery' },
  { name: 'create_discovery_thesis', desc: 'Record a formal discovery thesis', category: 'Discovery' },
  { name: 'get_leaderboard', desc: 'Fetch global researcher rankings', category: 'Discovery' },
  { name: 'get_discovery_guide', desc: 'Get workflow instructions and science context', category: 'Guide' },
  { name: 'get_server_health', desc: 'Check backend connectivity and status', category: 'System' },
];

const IDE_LIST = [
  { name: 'Cursor', path: '~/.cursor/mcp.json', icon: '⚡' },
  { name: 'Windsurf', path: '~/.codeium/windsurf/mcp_config.json', icon: '🏄' },
  { name: 'Claude Desktop', path: '~/Library/Application Support/Claude/claude_desktop_config.json', icon: '🤖' },
  { name: 'VS Code + Continue', path: '~/.continue/config.json', icon: '💻' },
  { name: 'Gemini CLI', path: '~/.gemini/settings.json', icon: '💎' },
];

const CATEGORY_COLORS: Record<string, string> = {
  Data: 'bg-blue-500/15 text-blue-400 border-blue-500/25',
  Analysis: 'bg-violet-500/15 text-violet-400 border-violet-500/25',
  Stream: 'bg-amber-500/15 text-amber-400 border-amber-500/25',
  Discovery: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
  Guide: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/25',
  System: 'bg-slate-500/15 text-slate-400 border-slate-500/25',
};

type Tab = 'config' | 'tools' | 'setup';

export function McpConfigModal({ isOpen, onClose }: McpConfigModalProps) {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('config');

  const copyToClipboard = () => {
    navigator.clipboard.writeText(MCP_CONFIG);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'config', label: 'Config JSON', icon: <Terminal className="w-4 h-4" /> },
    { id: 'tools', label: 'Tools (14)', icon: <Cpu className="w-4 h-4" /> },
    { id: 'setup', label: 'IDE Setup', icon: <Sparkles className="w-4 h-4" /> },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/75 backdrop-blur-lg"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 24 }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            className="relative w-full max-w-3xl max-h-[85vh] bg-slate-900/95 backdrop-blur-2xl border border-slate-700/80 rounded-[2rem] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.6)] flex flex-col overflow-hidden"
          >
            {/* Gradient top bar */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500" />

            {/* Header */}
            <div className="flex items-center justify-between p-6 pb-0">
              <div className="flex items-center gap-3">
                <div className="bg-gradient-to-br from-indigo-500/20 to-violet-500/20 p-3 rounded-2xl border border-indigo-500/30">
                  <Cpu className="w-6 h-6 text-indigo-400" />
                </div>
                <div>
                  <h2 className="text-xl font-display font-extrabold text-slate-100">MCP Connect</h2>
                  <p className="text-xs font-medium text-slate-500 mt-0.5">Model Context Protocol · AI IDE Integration</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-slate-200 transition p-2.5 bg-slate-800/80 border border-slate-700 rounded-xl hover:bg-slate-700 hover:-rotate-90 duration-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1.5 px-6 pt-5 pb-0">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                    activeTab === tab.id
                      ? 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 shadow-inner'
                      : 'text-slate-400 hover:text-slate-300 hover:bg-slate-800/80 border border-transparent'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {activeTab === 'config' && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
                  <p className="text-sm font-medium text-slate-400 mb-4 leading-relaxed">
                    Copy this JSON into your AI IDE's MCP configuration file. The ExoHunter MCP server connects your IDE's AI to the full exoplanet discovery pipeline.
                  </p>

                  {/* Code block */}
                  <div className="relative group rounded-2xl overflow-hidden border border-slate-700/80 bg-[#0d1117]">
                    <div className="flex items-center justify-between px-4 py-2.5 bg-slate-800/60 border-b border-slate-700/50">
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1.5">
                          <div className="w-3 h-3 rounded-full bg-red-500/60" />
                          <div className="w-3 h-3 rounded-full bg-amber-500/60" />
                          <div className="w-3 h-3 rounded-full bg-green-500/60" />
                        </div>
                        <span className="text-[11px] font-mono font-bold text-slate-500 ml-2">mcp_config.json</span>
                      </div>
                      <button
                        onClick={copyToClipboard}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                          copied
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-slate-700/50 text-slate-400 hover:text-slate-200 hover:bg-slate-700 border border-slate-600'
                        }`}
                      >
                        {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        {copied ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                    <pre className="p-5 text-sm font-mono leading-relaxed overflow-x-auto">
                      <code>
                        {MCP_CONFIG.split('\n').map((line, i) => (
                          <div key={i} className="flex">
                            <span className="text-slate-600 select-none w-8 text-right mr-4 text-xs leading-relaxed">{i + 1}</span>
                            <span className="text-slate-300">
                              {line.replace(/"([^"]+)":/g, (_, key) => `"${key}":`).split(/(["'][^"']*["']|true|false|null|\d+)/g).map((part, j) => {
                                if (/^["']/.test(part) && line.includes(`${part}:`)) return <span key={j} className="text-indigo-400">{part}</span>;
                                if (/^["']/.test(part)) return <span key={j} className="text-emerald-400">{part}</span>;
                                if (/^(true|false|null)$/.test(part)) return <span key={j} className="text-amber-400">{part}</span>;
                                if (/^\d+$/.test(part)) return <span key={j} className="text-fuchsia-400">{part}</span>;
                                return <span key={j}>{part}</span>;
                              })}
                            </span>
                          </div>
                        ))}
                      </code>
                    </pre>
                  </div>

                  {/* Prereqs */}
                  <div className="mt-5 bg-slate-800/50 border border-slate-700/60 rounded-xl p-4">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Prerequisites</h4>
                    <div className="space-y-2 text-sm text-slate-400 font-medium">
                      <div className="flex items-start gap-2">
                        <ChevronRight className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                        <span>Run <code className="bg-slate-800 px-1.5 py-0.5 rounded text-indigo-300 text-xs font-mono">cd mcp-server && npm install && npm run build</code> once</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <ChevronRight className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                        <span>Keep the ExoHunter server running: <code className="bg-slate-800 px-1.5 py-0.5 rounded text-indigo-300 text-xs font-mono">npm run dev</code></span>
                      </div>
                      <div className="flex items-start gap-2">
                        <ChevronRight className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                        <span>Update <code className="bg-slate-800 px-1.5 py-0.5 rounded text-indigo-300 text-xs font-mono">args</code> path to absolute path on your system</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'tools' && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
                  <p className="text-sm font-medium text-slate-400 mb-4">
                    14 tools expose every ExoHunter capability to your AI IDE. The AI can autonomously discover exoplanets.
                  </p>
                  <div className="space-y-2">
                    {TOOLS_LIST.map((tool, i) => (
                      <motion.div
                        key={tool.name}
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.03, duration: 0.25 }}
                        className="flex items-center gap-3 bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-3 hover:bg-slate-800/80 transition-colors"
                      >
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${CATEGORY_COLORS[tool.category]}`}>
                          {tool.category}
                        </span>
                        <code className="text-sm font-mono font-bold text-indigo-400 shrink-0">{tool.name}</code>
                        <span className="text-sm text-slate-500 font-medium truncate">{tool.desc}</span>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}

              {activeTab === 'setup' && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
                  <p className="text-sm font-medium text-slate-400 mb-4">
                    Paste the config JSON into the appropriate file for your AI IDE:
                  </p>
                  <div className="space-y-3">
                    {IDE_LIST.map((ide, i) => (
                      <motion.div
                        key={ide.name}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.06, duration: 0.3 }}
                        className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 hover:bg-slate-800/80 hover:border-slate-600 transition-all"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{ide.icon}</span>
                            <div>
                              <div className="text-base font-bold text-slate-200">{ide.name}</div>
                              <code className="text-xs font-mono text-slate-500">{ide.path}</code>
                            </div>
                          </div>
                          <ExternalLink className="w-4 h-4 text-slate-600" />
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  <div className="mt-5 bg-gradient-to-br from-indigo-500/10 to-violet-500/10 border border-indigo-500/20 rounded-xl p-4">
                    <h4 className="text-sm font-bold text-indigo-400 mb-2">💡 Quick Start</h4>
                    <ol className="text-sm text-slate-400 font-medium space-y-1.5 list-decimal list-inside">
                      <li>Copy the config JSON from the first tab</li>
                      <li>Paste it into your IDE's MCP config file</li>
                      <li>Update the <code className="text-indigo-300 text-xs bg-slate-800 px-1 rounded">args</code> path to the absolute path</li>
                      <li>Restart your IDE — the ExoHunter tools will appear</li>
                      <li>Ask your AI: <em className="text-indigo-300">"Discover a new exoplanet using ExoHunter"</em></li>
                    </ol>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-slate-800 px-6 py-4 flex items-center justify-between bg-slate-900/80">
              <span className="text-xs font-bold text-slate-600">
                sarkar-exohunter · v1.0.0 · stdio transport
              </span>
              <button
                onClick={onClose}
                className="px-5 py-2 rounded-xl text-sm font-bold text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors border border-slate-700"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
