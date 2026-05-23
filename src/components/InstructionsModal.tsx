import React, { useState } from 'react';
import { X, Copy, Check, BookOpen, AlertTriangle, Terminal, Cpu, Sparkles, ChevronRight, ExternalLink, Code, Server, Play, Compass, ArrowRight, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface InstructionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabId = 'overview' | 'setup' | 'mcp' | 'prompting';

export function InstructionsModal({ isOpen, onClose }: InstructionsModalProps) {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: '1. Vetting Sandbox Notice', icon: <Info className="w-4 h-4" /> },
    { id: 'setup', label: '2. Local Setup & Hosting', icon: <Terminal className="w-4 h-4" /> },
    { id: 'mcp', label: '3. MCP IDE Configuration', icon: <Cpu className="w-4 h-4" /> },
    { id: 'prompting', label: '4. AI Discovery Prompts', icon: <Compass className="w-4 h-4" /> },
  ];

  const mcpConfigExample = `{
  "mcpServers": {
    "sarkar-exohunter": {
      "command": "node",
      "args": ["YOUR_ABSOLUTE_PATH_TO/Nasa_exohunter/mcp-server/dist/index.js"],
      "env": {
        "EXOHUNTER_API_URL": "http://localhost:3000"
      }
    }
  }
}`;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
            onClick={onClose}
          />

          {/* Modal Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.93, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.93, y: 20 }}
            transition={{ type: "spring", damping: 30, stiffness: 350 }}
            className="relative w-full max-w-4xl max-h-[85vh] bg-slate-900/95 backdrop-blur-2xl border-2 border-slate-700/80 rounded-3xl shadow-[0_0_60px_rgba(0,0,0,0.85)] flex flex-col overflow-hidden"
          >
            {/* Top decorative gradient bar */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-indigo-500 to-violet-600" />

            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-950/40">
              <div className="flex items-center gap-3.5">
                <div className="bg-emerald-500/10 p-2.5 rounded-2xl border border-emerald-500/35 shadow-[0_0_15px_rgba(16,185,129,0.15)]">
                  <BookOpen className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <h2 className="text-xl font-display font-extrabold text-slate-100 tracking-tight flex items-center gap-2">
                    Sarkar ExoHunter <span className="text-emerald-400 font-mono text-sm px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full">Guide</span>
                  </h2>
                  <p className="text-xs font-semibold text-slate-400 mt-0.5">Sovereign Physical Intelligence Vetting Manual</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-slate-200 transition p-2 bg-slate-800/80 hover:bg-slate-700 border border-slate-700 rounded-xl hover:-rotate-90 duration-300 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tabs Navigation */}
            <div className="flex flex-wrap gap-1 px-6 pt-4 border-b border-slate-800/40 bg-slate-950/20">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 rounded-t-xl text-xs font-bold transition-all relative cursor-pointer ${
                    activeTab === tab.id
                      ? 'text-emerald-400 bg-slate-900 border-t-2 border-x border-slate-800 border-t-emerald-500'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/45'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                  {activeTab === tab.id && (
                    <motion.div
                      layoutId="activeTabIndicator"
                      className="absolute -bottom-[1px] left-0 right-0 h-[1px] bg-slate-900 z-10"
                    />
                  )}
                </button>
              ))}
            </div>

            {/* Scrollable Content Area */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 bg-slate-900/40">
              
              {/* TAB 1: OVERVIEW & SANDBOX WARNING */}
              {activeTab === 'overview' && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  {/* Developmental Phase Banner */}
                  <div className="p-6 bg-amber-500/10 border-2 border-amber-500/30 rounded-2xl relative overflow-hidden shadow-inner">
                    <div className="absolute -right-8 -top-8 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl" />
                    <div className="flex gap-4">
                      <div className="bg-amber-500/20 p-2.5 rounded-xl border border-amber-500/35 h-fit shrink-0">
                        <AlertTriangle className="w-6 h-6 text-amber-400" />
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-base font-display font-extrabold text-amber-350 uppercase tracking-wider">
                          Automated Vetting Loop Development Phase Notice
                        </h3>
                        <p className="text-sm font-semibold text-slate-300 leading-relaxed">
                          The <span className="text-amber-400 font-bold">Start Automated Hunt</span> button on the main dashboard is currently in a sandboxed development phase when deployed in a cloud-hosted environment.
                        </p>
                        <p className="text-xs text-slate-400 leading-relaxed font-medium">
                          Because physical exoplanet signal verification requires high-performance matrix detrending (Gaussian Processes via Python's Celerite2/Lightkurve) and long-running asynchronous processes, the cloud-based server enforces safety limits. To utilize the automated pipeline at scale, you <span className="text-slate-200 font-bold underline">must host and run the application locally on your machine</span>.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Scientific Philosophy */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                    <div className="bg-slate-950/40 border border-slate-800 rounded-2xl p-5 hover:border-slate-700/60 transition-colors space-y-2">
                      <h4 className="font-display font-bold text-slate-200 flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                        Astrometric Pipeline Core
                      </h4>
                      <p className="text-xs text-slate-400 leading-relaxed font-medium">
                        Sarkar ExoHunter connects directly to the NASA MAST Archive to download raw photometric flux arrays. The system de-trends signals, filters out eclipsing binaries via standard shape fitting, and checks stellar limits.
                      </p>
                    </div>

                    <div className="bg-slate-950/40 border border-slate-800 rounded-2xl p-5 hover:border-slate-700/60 transition-colors space-y-2">
                      <h4 className="font-display font-bold text-slate-200 flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-violet-400" />
                        Local Model Context Protocol (MCP)
                      </h4>
                      <p className="text-xs text-slate-400 leading-relaxed font-medium">
                        Running the app locally fires up a dedicated local MCP server. This allows AI tools (like Google Antigravity, Cursor, or Claude Desktop) to invoke python scripts, parse TESS files, and write findings back to your database.
                      </p>
                    </div>
                  </div>

                  {/* Flow chart summary */}
                  <div className="bg-slate-950/50 border border-slate-800 p-5 rounded-2xl">
                    <h4 className="font-display font-bold text-slate-300 text-sm mb-4 uppercase tracking-widest text-center">
                      The ExoHunter Local Operational Loop
                    </h4>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-xs font-bold text-center">
                      <div className="bg-slate-800 border border-slate-700 px-4 py-3 rounded-xl w-full sm:w-1/4">
                        <div className="text-emerald-400 mb-1">1. Git Clone</div>
                        <span className="text-[10px] text-slate-500 font-semibold">Pull Code & Python Scripts</span>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-600 hidden sm:block rotate-90 sm:rotate-0" />
                      <div className="bg-slate-800 border border-slate-700 px-4 py-3 rounded-xl w-full sm:w-1/4">
                        <div className="text-indigo-400 mb-1">2. Local Host</div>
                        <span className="text-[10px] text-slate-500 font-semibold">npm run dev (Port 3000)</span>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-600 hidden sm:block rotate-90 sm:rotate-0" />
                      <div className="bg-slate-800 border border-slate-700 px-4 py-3 rounded-xl w-full sm:w-1/4">
                        <div className="text-violet-400 mb-1">3. MCP Config</div>
                        <span className="text-[10px] text-slate-500 font-semibold">Link AI IDE to Server</span>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-600 hidden sm:block rotate-90 sm:rotate-0" />
                      <div className="bg-slate-800 border border-slate-700 px-4 py-3 rounded-xl w-full sm:w-1/4">
                        <div className="text-emerald-400 mb-1">4. AI Discovery</div>
                        <span className="text-[10px] text-slate-500 font-semibold">Instruct AI to Hunt</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* TAB 2: LOCAL SETUP & HOSTING */}
              {activeTab === 'setup' && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  <div className="p-4 bg-slate-950/40 border border-slate-850 rounded-2xl">
                    <p className="text-xs text-slate-350 leading-relaxed font-semibold">
                      To run the full pipeline locally, you must host two servers: the **Express/Vite web server** (port 3000) and the **Python FastAPI microservice** (port 8000), coupled with a **Celery physics worker** backed by a **Redis broker** for non-blocking operations. Follow this step-by-step command sequence.
                    </p>
                  </div>

                  <div className="space-y-6">
                    {/* Step 1 */}
                    <div className="bg-slate-950/30 border border-slate-800/80 rounded-2xl p-5 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center text-xs font-bold font-mono">01</span>
                          <h4 className="font-display font-extrabold text-sm text-slate-200 uppercase tracking-wider">Download & Clone the Repository</h4>
                        </div>
                      </div>
                      <p className="text-xs text-slate-400 font-medium leading-relaxed">
                        Clone the project repository to your local machine to obtain the web app, the backend API files, the local MCP server, and the python vetting module.
                      </p>
                      <div className="flex items-center justify-between bg-slate-950 border border-slate-850 rounded-xl px-4 py-2.5 font-mono text-xs text-slate-300">
                        <span className="select-all">git clone https://github.com/skoustav35/Nasa_exohunter.git</span>
                        <button
                          onClick={() => handleCopy("git clone https://github.com/skoustav35/Nasa_exohunter.git", "clone")}
                          className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-slate-350 transition-colors cursor-pointer"
                        >
                          {copiedText === 'clone' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Step 2 */}
                    <div className="bg-slate-950/30 border border-slate-800/80 rounded-2xl p-5 space-y-4">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center text-xs font-bold font-mono">02</span>
                        <h4 className="font-display font-extrabold text-sm text-slate-200 uppercase tracking-wider">Install Main Node & Python Dependencies</h4>
                      </div>
                      <p className="text-xs text-slate-400 font-medium leading-relaxed">
                        Install Node.js packages for running the Express API and Vite client, followed by the Python scientific libraries required for GP de-trending and Gaussian Process regressions.
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Node.js Web App Stack</span>
                          <div className="flex items-center justify-between bg-slate-950 border border-slate-850 rounded-xl px-4 py-2.5 font-mono text-xs text-slate-300">
                            <span className="select-all">npm install</span>
                            <button
                              onClick={() => handleCopy("npm install", "npminstall")}
                              className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-slate-350 transition-colors cursor-pointer"
                            >
                              {copiedText === 'npminstall' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Python Vetting Stack</span>
                          <div className="flex items-center justify-between bg-slate-950 border border-slate-850 rounded-xl px-4 py-2.5 font-mono text-xs text-slate-300">
                            <span className="select-all">pip install -r requirements.txt</span>
                            <button
                              onClick={() => handleCopy("pip install -r requirements.txt", "pipinstall")}
                              className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-slate-350 transition-colors cursor-pointer"
                            >
                              {copiedText === 'pipinstall' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-relaxed font-semibold italic">
                        Tip: Create a virtual environment using <code className="bg-slate-950 px-1 py-0.5 rounded text-indigo-300 border border-slate-850 font-mono text-[10px]">python -m venv venv</code> and activate it before installing requirements.
                      </p>
                    </div>

                    {/* Step 3 */}
                    <div className="bg-slate-950/30 border border-slate-800/80 rounded-2xl p-5 space-y-4">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center text-xs font-bold font-mono">03</span>
                        <h4 className="font-display font-extrabold text-sm text-slate-200 uppercase tracking-wider">Start the Redis Broker & Celery Physics Worker</h4>
                      </div>
                      <p className="text-xs text-slate-400 font-medium leading-relaxed">
                        The heavy physical validation tasks are managed as an asynchronous task queue. This prevents your browser and API server from timing out. Start Redis, then start the Celery task runner.
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">A. Start Redis (Default Port 6379)</span>
                          <div className="flex items-center justify-between bg-slate-950 border border-slate-850 rounded-xl px-4 py-2.5 font-mono text-xs text-slate-300">
                            <span className="select-all">docker run -d -p 6379:6379 redis:alpine</span>
                            <button
                              onClick={() => handleCopy("docker run -d -p 6379:6379 redis:alpine", "redis")}
                              className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-slate-350 transition-colors cursor-pointer"
                            >
                              {copiedText === 'redis' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">B. Start Celery Physics Worker</span>
                          <div className="flex items-center justify-between bg-slate-950 border border-slate-850 rounded-xl px-4 py-2.5 font-mono text-xs text-slate-300">
                            <span className="select-all">celery -A exohunter.celery_app worker --loglevel=info</span>
                            <button
                              onClick={() => handleCopy("celery -A exohunter.celery_app worker --loglevel=info", "celery")}
                              className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-slate-350 transition-colors cursor-pointer"
                            >
                              {copiedText === 'celery' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Step 4 */}
                    <div className="bg-slate-950/30 border border-slate-800/80 rounded-2xl p-5 space-y-3">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center text-xs font-bold font-mono">04</span>
                        <h4 className="font-display font-extrabold text-sm text-slate-200 uppercase tracking-wider">Start the Python FastAPI Microservice</h4>
                      </div>
                      <p className="text-xs text-slate-400 font-medium leading-relaxed">
                        Run the scientific FastAPI server on port 8000. This is the API service that exposes physical parameter vetting, CNN evaluations, and ExoFOP cross-referencing:
                      </p>
                      <div className="flex items-center justify-between bg-slate-950 border border-slate-850 rounded-xl px-4 py-2.5 font-mono text-xs text-slate-300">
                        <span className="select-all">uvicorn api:app --host 127.0.0.1 --port 8000 --reload</span>
                        <button
                          onClick={() => handleCopy("uvicorn api:app --host 127.0.0.1 --port 8000 --reload", "fastapi")}
                          className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-slate-350 transition-colors cursor-pointer"
                        >
                          {copiedText === 'fastapi' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Step 5 */}
                    <div className="bg-slate-950/30 border border-slate-800/80 rounded-2xl p-5 space-y-3">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center text-xs font-bold font-mono">05</span>
                        <h4 className="font-display font-extrabold text-sm text-slate-200 uppercase tracking-wider">Build the Local MCP Server</h4>
                      </div>
                      <p className="text-xs text-slate-400 font-medium leading-relaxed">
                        Compile the Model Context Protocol (MCP) server code into JavaScript so that your AI editors can execute it directly:
                      </p>
                      <div className="flex items-center justify-between bg-slate-950 border border-slate-850 rounded-xl px-4 py-2.5 font-mono text-xs text-slate-300">
                        <span className="select-all">cd mcp-server && npm install && npm run build && cd ..</span>
                        <button
                          onClick={() => handleCopy("cd mcp-server && npm install && npm run build && cd ..", "mcpbuild")}
                          className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-slate-350 transition-colors cursor-pointer"
                        >
                          {copiedText === 'mcpbuild' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Step 6 */}
                    <div className="bg-slate-950/30 border border-slate-800/80 rounded-2xl p-5 space-y-3">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center text-xs font-bold font-mono">06</span>
                        <h4 className="font-display font-extrabold text-sm text-slate-200 uppercase tracking-wider">Set Up the API Authentication</h4>
                      </div>
                      <p className="text-xs text-slate-400 font-medium leading-relaxed">
                        Create a file named <code className="text-emerald-400 bg-slate-950 px-1 py-0.5 rounded border border-slate-850 text-[11px] font-mono">.env.local</code> in the root folder of the project. Get a key from the Google AI Studio console and paste it:
                      </p>
                      <div className="flex items-center justify-between bg-slate-950 border border-slate-850 rounded-xl px-4 py-2.5 font-mono text-xs text-slate-300">
                        <span className="select-all">GEMINI_API_KEY=your_gemini_api_key_here</span>
                        <button
                          onClick={() => handleCopy("GEMINI_API_KEY=your_gemini_api_key_here", "envkey")}
                          className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-slate-350 transition-colors cursor-pointer"
                        >
                          {copiedText === 'envkey' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Step 7 */}
                    <div className="bg-slate-950/30 border border-slate-800/80 rounded-2xl p-5 space-y-3">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center text-xs font-bold font-mono">07</span>
                        <h4 className="font-display font-extrabold text-sm text-slate-200 uppercase tracking-wider">Host the Application</h4>
                      </div>
                      <p className="text-xs text-slate-400 font-medium leading-relaxed">
                        Finally, boot the Express/Vite local hosting server in the project directory. This starts the web UI client and proxies requests:
                      </p>
                      <div className="flex items-center justify-between bg-slate-950 border border-slate-850 rounded-xl px-4 py-2.5 font-mono text-xs text-slate-300">
                        <span className="select-all">npm run dev</span>
                        <button
                          onClick={() => handleCopy("npm run dev", "runserver")}
                          className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-slate-350 transition-colors cursor-pointer"
                        >
                          {copiedText === 'runserver' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                      <p className="text-[11px] text-emerald-400/90 leading-relaxed font-semibold">
                        🎉 The server will start on <a href="http://localhost:3000" target="_blank" rel="noopener noreferrer" className="underline font-bold text-emerald-300 hover:text-emerald-250">http://localhost:3000</a>. Keep this server terminal and the FastAPI terminal running in the background as you use the application!
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* TAB 3: MCP CONFIGURATION */}
              {activeTab === 'mcp' && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  <p className="text-sm font-semibold text-slate-400 leading-relaxed">
                    Model Context Protocol (MCP) establishes a secure, real-time channel between your AI development environment and the local ExoHunter server. Paste the JSON below into your IDE's config:
                  </p>

                  {/* Config Block */}
                  <div className="relative rounded-2xl overflow-hidden border border-slate-700 bg-slate-950 shadow-lg">
                    <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-800">
                      <div className="flex items-center gap-2">
                        <Terminal className="w-4 h-4 text-indigo-400" />
                        <span className="text-[11px] font-mono font-bold text-slate-400">mcp_config.json</span>
                      </div>
                      <button
                        onClick={() => handleCopy(mcpConfigExample, "mcpconfig")}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          copiedText === 'mcpconfig'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700'
                        }`}
                      >
                        {copiedText === 'mcpconfig' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        {copiedText === 'mcpconfig' ? 'Copied!' : 'Copy Config'}
                      </button>
                    </div>
                    <pre className="p-5 text-[12px] font-mono leading-relaxed overflow-x-auto text-indigo-300">
                      <code>{mcpConfigExample}</code>
                    </pre>
                  </div>

                  <div className="p-4 bg-indigo-500/5 border border-indigo-500/20 rounded-xl flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5 animate-pulse" />
                    <div className="space-y-1">
                      <span className="text-xs font-extrabold uppercase text-indigo-300">Absolute Path Requirement</span>
                      <p className="text-xs font-semibold text-slate-400 leading-relaxed">
                        You MUST replace the placeholder <code className="bg-indigo-950/50 px-1 border border-indigo-500/20 rounded text-slate-100 font-bold">YOUR_ABSOLUTE_PATH_TO</code> in the JSON above with the true absolute directory path where you cloned the project on your machine (e.g. <code className="text-indigo-300">D:/Nasa_exohunter-main/Nasa_exohunter-main</code>). Use forward slashes <code className="text-indigo-300">/</code> in path configurations to prevent escape character errors.
                      </p>
                    </div>
                  </div>

                  {/* Setup by Editor */}
                  <div className="space-y-5">
                    <h4 className="font-display font-extrabold text-slate-200 text-sm uppercase tracking-wider">How to configure MCP in your specific IDE:</h4>

                    <div className="space-y-4">
                      {/* Antigravity */}
                      <div className="bg-slate-950/40 border border-slate-800 p-5 rounded-2xl space-y-3">
                        <div className="font-bold text-slate-100 flex items-center gap-2 text-sm">
                          <span className="text-lg">🚀</span> Google Antigravity (Preferred Agentic Environment)
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed font-semibold">
                          Google Antigravity is a native agentic IDE. Connecting the server gives the agent native access to retrieve curves, evaluate diagnostics, and log theses.
                        </p>
                        <ol className="list-decimal list-inside text-xs text-slate-400 space-y-1.5 font-semibold leading-relaxed pl-2">
                          <li>Click on the <span className="text-slate-200 font-bold">Agent Bar</span> located in the side menu or command panel.</li>
                          <li>Open <span className="text-indigo-400 font-bold">Additional Options</span> &gt; <span className="text-indigo-400 font-bold">MCP Servers</span> &gt; <span className="text-indigo-400 font-bold">Manage MCP Servers</span>.</li>
                          <li>Click <span className="text-slate-200 font-bold">View Raw Config</span> or configure a new server.</li>
                          <li>Paste the configuration block JSON into the list of servers and click save. The agent will reload with the new capabilities active!</li>
                        </ol>
                      </div>

                      {/* Cursor */}
                      <div className="bg-slate-950/40 border border-slate-800 p-5 rounded-2xl space-y-3">
                        <div className="font-bold text-slate-100 flex items-center gap-2 text-sm">
                          <span className="text-lg">⚡</span> Cursor IDE
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed font-semibold">
                          Cursor integrates command-line MCP servers directly. Configure the exohunter connection to let Cursor Composer write and reject candidate theses.
                        </p>
                        <ol className="list-decimal list-inside text-xs text-slate-400 space-y-1.5 font-semibold leading-relaxed pl-2">
                          <li>Open Cursor Settings by pressing <kbd className="bg-slate-800 px-1 py-0.5 rounded text-[10px] text-slate-300 font-mono">Cmd+,</kbd> on macOS or <kbd className="bg-slate-800 px-1 py-0.5 rounded text-[10px] text-slate-300 font-mono">Ctrl+Shift+J</kbd> on Windows.</li>
                          <li>Go to <span className="text-indigo-400 font-bold">Models</span> &gt; scroll down to <span className="text-indigo-400 font-bold">MCP</span> section.</li>
                          <li>Click <span className="text-slate-200 font-bold">+ Add New MCP Server</span>.</li>
                          <li>Fill out the configuration inputs:
                            <ul className="list-disc list-inside ml-6 mt-1 space-y-1 text-slate-550">
                              <li><span className="text-slate-300 font-bold">Name:</span> <code className="text-indigo-300 bg-slate-900 px-1 py-0.5 rounded">sarkar-exohunter</code></li>
                              <li><span className="text-slate-300 font-bold">Type:</span> Select <code className="text-indigo-300 bg-slate-900 px-1 py-0.5 rounded">command</code></li>
                              <li><span className="text-slate-300 font-bold">Command:</span> <code className="text-indigo-300 bg-slate-900 px-1 py-0.5 rounded">node</code></li>
                              <li><span className="text-slate-300 font-bold">Arguments:</span> Paste your absolute path to the JS index: <code className="text-indigo-300 bg-slate-900 px-1 py-0.5 rounded">D:/Nasa_exohunter-main/Nasa_exohunter-main/mcp-server/dist/index.js</code></li>
                              <li><span className="text-slate-300 font-bold">Environment Variables (Env):</span> Click to add variable: Key: <code className="text-indigo-300 bg-slate-900 px-1 py-0.5 rounded">EXOHUNTER_API_URL</code>, Value: <code className="text-indigo-300 bg-slate-900 px-1 py-0.5 rounded">http://localhost:3000</code></li>
                            </ul>
                          </li>
                          <li>Click <span className="text-slate-200 font-bold">Save</span>. Verify that the indicator turns green (Online) and indicates 14 tools are loaded.</li>
                        </ol>
                      </div>

                      {/* Claude Desktop */}
                      <div className="bg-slate-950/40 border border-slate-800 p-5 rounded-2xl space-y-3">
                        <div className="font-bold text-slate-100 flex items-center gap-2 text-sm">
                          <span className="text-lg">🤖</span> Claude Desktop App
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed font-semibold">
                          Configure the desktop app by adding the JSON configuration block inside your local configuration file.
                        </p>
                        <ol className="list-decimal list-inside text-xs text-slate-400 space-y-1.5 font-semibold leading-relaxed pl-2">
                          <li>Open the file path below on your file explorer depending on your operating system:
                            <ul className="list-disc list-inside ml-6 mt-1.5 space-y-1">
                              <li><span className="text-slate-300">macOS:</span> <code className="text-indigo-300 bg-slate-900 px-1 py-0.5 rounded select-all break-all text-[11px]">~/Library/Application Support/Claude/claude_desktop_config.json</code></li>
                              <li><span className="text-slate-300">Windows:</span> <code className="text-indigo-300 bg-slate-900 px-1 py-0.5 rounded select-all break-all text-[11px]">%APPDATA%\Claude\claude_desktop_config.json</code></li>
                            </ul>
                          </li>
                          <li>Open the file in a text editor (create a new file with that name if it does not exist).</li>
                          <li>Paste the configuration JSON inside the main bracket and save. Restart Claude Desktop. You will notice a plugin connector icon appear in the chat input bar.</li>
                        </ol>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* TAB 4: AI DISCOVERY PROMPTS */}
              {activeTab === 'prompting' && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  <p className="text-sm font-semibold text-slate-400 leading-relaxed">
                    Once the MCP server is configured and online, command your AI agent to hunt. The AI will call the exohunter tools behind the scenes, fetch curves, run computations, and register cards onto the local UI dashboard.
                  </p>

                  {/* Under the hood explanation */}
                  <div className="bg-slate-950/40 border border-slate-800 rounded-2xl p-5 space-y-3">
                    <h4 className="font-display font-extrabold text-sm text-slate-200 uppercase tracking-wider">How the AI Vetting Agent Operates</h4>
                    <p className="text-xs text-slate-400 leading-relaxed font-semibold">
                      When you submit a prompt, the AI translates your instruction into a pipeline of tool calls:
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-[11px] text-slate-450 font-bold mt-2">
                      <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl space-y-1">
                        <span className="text-indigo-400">1. Target Fetch</span>
                        <p className="text-[10px] text-slate-500 font-semibold leading-relaxed">AI calls <code className="text-emerald-400">get_random_tic_id</code> or receives a TIC ID from you.</p>
                      </div>
                      <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl space-y-1">
                        <span className="text-indigo-400">2. Light Curve Data</span>
                        <p className="text-[10px] text-slate-500 font-semibold leading-relaxed">Calls <code className="text-emerald-400">get_light_curve</code> to pull luminosity data from MAST.</p>
                      </div>
                      <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl space-y-1">
                        <span className="text-indigo-400">3. Physics Firewall</span>
                        <p className="text-[10px] text-slate-500 font-semibold leading-relaxed">Calls <code className="text-emerald-400">compute_transit_statistics</code> to check SNR & transit shapes.</p>
                      </div>
                      <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl space-y-1">
                        <span className="text-indigo-400">4. Thesis Submission</span>
                        <p className="text-[10px] text-slate-500 font-semibold leading-relaxed">Pushes findings to dashboard via <code className="text-emerald-400">create_discovery_thesis</code>.</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    {/* Prompt 1 */}
                    <div className="bg-slate-950/40 border border-slate-800 rounded-2xl p-5 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-mono rounded font-bold">Recipe A</span>
                          <h4 className="font-display font-extrabold text-sm text-slate-200">Bulk Target Automated Hunt Loop</h4>
                        </div>
                        <button
                          onClick={() => handleCopy("use my sarkar-exohunter mcp and as a total make (10) thesis cards (combinely both in false_positive and in discovery lab).", "promptex1")}
                          className="flex items-center gap-1 text-xs font-bold text-emerald-400 hover:text-emerald-350 transition-colors cursor-pointer"
                        >
                          {copiedText === 'promptex1' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          Copy Prompt
                        </button>
                      </div>
                      <p className="text-xs text-slate-400 font-semibold leading-relaxed">
                        This instruction tells the AI agent to run a bulk vetting loop. It will run 10 separate target analyses using the MCP server, and register them directly onto the dashboard feed:
                      </p>
                      <div className="bg-slate-950/70 border border-indigo-500/30 p-4 rounded-xl font-mono text-xs text-indigo-350 italic shadow-inner select-all">
                        "use my sarkar-exohunter mcp and as a total make (10) thesis cards (combinely both in false_positive and in discovery lab)."
                      </div>
                    </div>

                    {/* Prompt 2 */}
                    <div className="bg-slate-950/40 border border-slate-800 rounded-2xl p-5 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-violet-500/10 text-violet-400 border border-violet-500/20 text-[10px] font-mono rounded font-bold">Recipe B</span>
                          <h4 className="font-display font-extrabold text-sm text-slate-200">Deep Vetting of Specific NASA Target</h4>
                        </div>
                        <button
                          onClick={() => handleCopy("Analyze transit data for TIC 150428135 (TOI-700 d) using the sarkar-exohunter MCP tools. Run the physics firewall checks, retrieve the transit statistics, analyze the light curve shape, and generate a discovery thesis card.", "promptex2")}
                          className="flex items-center gap-1 text-xs font-bold text-emerald-400 hover:text-emerald-350 transition-colors cursor-pointer"
                        >
                          {copiedText === 'promptex2' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          Copy Prompt
                        </button>
                      </div>
                      <p className="text-xs text-slate-400 font-semibold leading-relaxed">
                        Use this recipe to trigger a rigorous vetting sequence for a specific target, checking it against planetary stability bounds:
                      </p>
                      <div className="bg-slate-950/70 border border-indigo-500/30 p-4 rounded-xl font-mono text-xs text-indigo-350 italic shadow-inner select-all">
                        "Analyze transit data for TIC 150428135 (TOI-700 d) using the sarkar-exohunter MCP tools. Run the physics firewall checks, retrieve the transit statistics, analyze the light curve shape, and generate a discovery thesis card."
                      </div>
                    </div>

                    {/* Prompt 3 */}
                    <div className="bg-slate-950/40 border border-slate-800 rounded-2xl p-5 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[10px] font-mono rounded font-bold">Recipe C</span>
                          <h4 className="font-display font-extrabold text-sm text-slate-200">Adversarial Rejection Vetting Vibe</h4>
                        </div>
                        <button
                          onClick={() => handleCopy("Fetch a random TIC candidate, load its MAST lightcurve, compute transit statistics. Use the check_known_exoplanet tool to cross-reference against exoplanet archives, search for stellar activity blending, and run the False Positive Death Test. If it's a false positive, call create_rejection_thesis. If it's a real exoplanet candidate, call create_discovery_thesis.", "promptex3")}
                          className="flex items-center gap-1 text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer"
                        >
                          {copiedText === 'promptex3' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          Copy Prompt
                        </button>
                      </div>
                      <p className="text-xs text-slate-400 font-semibold leading-relaxed">
                        Commands the AI to act as a scientific skeptic, searching for reasons to classify the signal as a stellar binary, secondary eclipse, or background blend:
                      </p>
                      <div className="bg-slate-950/70 border border-indigo-500/30 p-4 rounded-xl font-mono text-xs text-indigo-350 italic shadow-inner select-all">
                        "Fetch a random TIC candidate, load its MAST lightcurve, compute transit statistics. Use the check_known_exoplanet tool to cross-reference against exoplanet archives, search for stellar activity blending, and run the False Positive Death Test. If it's a false positive, call create_rejection_thesis. If it's a real exoplanet candidate, call create_discovery_thesis."
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-slate-800 px-6 py-4 flex items-center justify-between bg-slate-950/40">
              <span className="text-[11px] font-mono font-bold text-slate-600">
                Sarkar ExoHunter Vetting Core · v1.2.0 (Sovereign Edition)
              </span>
              <button
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-300 hover:text-white bg-slate-800 border border-slate-700 hover:bg-slate-750 transition-all cursor-pointer"
              >
                Got it, Let's Hunt!
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
