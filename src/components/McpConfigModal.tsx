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
  { name: 'Google Antigravity', path: 'Preferred IDE for ExoHunter', icon: '🚀', preferred: true },
  { name: 'Cursor', path: '~/.cursor/mcp.json', icon: '⚡' },
  { name: 'Windsurf', path: '~/.codeium/windsurf/mcp_config.json', icon: '🏄' },
  { name: 'Claude Desktop', path: '~/Library/Application Support/Claude/claude_desktop_config.json', icon: '🤖' },
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

                  {/* New Prerequisites / Antigravity Guide */}
                  <div className="mt-5 space-y-4">
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-indigo-500/10 border border-indigo-500/30 rounded-2xl p-5"
                    >
                      <h4 className="flex items-center gap-2 text-sm font-bold text-indigo-300 uppercase tracking-widest mb-4">
                        <Sparkles className="w-4 h-4" /> Preferred IDE: Google Antigravity
                      </h4>
                      <div className="space-y-4 text-sm text-slate-300 font-medium">
                        <div className="flex items-start gap-3">
                          <div className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xs font-bold shrink-0">1</div>
                          <p>Navigate to the <span className="text-indigo-300 font-bold">Agent Bar</span> in the Google Antigravity interface.</p>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xs font-bold shrink-0">2</div>
                          <p>Open <span className="text-indigo-300 font-bold">Additional Options</span> &gt; <span className="text-indigo-300 font-bold">MCP Servers</span> &gt; <span className="text-indigo-300 font-bold">Manage MCP Servers</span>.</p>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xs font-bold shrink-0">3</div>
                          <p>Click <span className="text-indigo-300 font-bold">View raw config</span> and paste the <code className="text-indigo-300 bg-indigo-950/50 px-1 rounded">mcp_config.json</code> provided above.</p>
                        </div>
                      </div>
                    </motion.div>

                    <motion.div 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 }}
                      className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-5"
                    >
                      <h4 className="text-sm font-bold text-emerald-400 uppercase tracking-widest mb-3">Target Objective</h4>
                      <p className="text-slate-300 text-sm leading-relaxed mb-3 font-medium">
                        Once connected, provide the following command to your AI agent to initiate a bulk scientific audit:
                      </p>
                      <div className="bg-slate-950/50 border border-slate-800 p-4 rounded-xl font-mono text-sm text-emerald-300 leading-relaxed shadow-inner italic">
                        "use my sarkar-exohunter mcp and as a total make (10) thesis cards (combinely both in false_positive and in discovery lab)."
                      </div>
                    </motion.div>
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
                    Configure your AI environment for Sarkar ExoHunter:
                  </p>
                  <div className="space-y-3">
                    {IDE_LIST.map((ide, i) => (
                      <motion.div
                        key={ide.name}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.06, duration: 0.3 }}
                        className={`bg-slate-800/50 border rounded-[1.5rem] p-5 transition-all ${
                          ide.preferred 
                          ? 'border-indigo-500/40 bg-indigo-500/5 shadow-[0_0_20px_rgba(99,102,241,0.1)]' 
                          : 'border-slate-700/50 hover:bg-slate-800/80 hover:border-slate-600'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <span className="text-3xl filter drop-shadow-lg">{ide.icon}</span>
                            <div>
                              <div className="flex items-center gap-2">
                                <div className="text-lg font-display font-bold text-slate-100">{ide.name}</div>
                                {ide.preferred && (
                                  <span className="bg-indigo-500/20 text-indigo-400 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter border border-indigo-500/30">
                                    Recommended
                                  </span>
                                )}
                              </div>
                              <code className="text-xs font-mono text-slate-500">{ide.path}</code>
                            </div>
                          </div>
                          <ChevronRight className={`w-5 h-5 ${ide.preferred ? 'text-indigo-400' : 'text-slate-700'}`} />
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  <div className="mt-6 p-6 bg-gradient-to-br from-indigo-500/10 via-violet-500/10 to-transparent border border-indigo-500/20 rounded-3xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl -mr-16 -mt-16" />
                    <h4 className="text-base font-bold text-indigo-300 mb-3 flex items-center gap-2">
                      <Sparkles className="w-5 h-5" /> Quick Start Guideline
                    </h4>
                    <ol className="text-sm text-slate-400 font-semibold space-y-3 list-decimal list-inside">
                      <li>Copy the <span className="text-slate-200">Config JSON</span> from the first tab.</li>
                      <li>Open <span className="text-indigo-400">Google Antigravity</span> and manage your MCP servers.</li>
                      <li>Paste the config and <span className="text-indigo-400">Restart the Agent</span>.</li>
                      <li>Input the prompt: <span className="text-emerald-400 italic">"use my sarkar-exohunter mcp..."</span></li>
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
