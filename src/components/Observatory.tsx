import React from 'react';
import { Satellite, Database, Orbit, Ruler, Waves, BarChart3 } from 'lucide-react';
import Plot from 'react-plotly.js';
import { motion } from 'motion/react';

interface TransitMetadata {
  source: 'mast' | 'simulated';
  hasTCE: boolean;
  tceCount: number;
  orbitalPeriod: number | null;
  transitDepth: number | null;
  estimatedRadius: number | null;
}

interface ObservatoryProps {
  activeTicId: string | null;
  fluxData: { time: number[], flux: number[] } | null;
  metadata: TransitMetadata | null;
  loading: boolean;
}

/**
 * Bin the light curve data for a smooth overlay trace.
 * Groups data points into phase bins and computes the median flux per bin.
 */
function binLightCurve(time: number[], flux: number[], numBins: number = 60): { time: number[], flux: number[] } {
  if (time.length === 0) return { time: [], flux: [] };
  
  const minPhase = Math.min(...time);
  const maxPhase = Math.max(...time);
  const binWidth = (maxPhase - minPhase) / numBins;
  
  const binnedTime: number[] = [];
  const binnedFlux: number[] = [];
  
  for (let i = 0; i < numBins; i++) {
    const binStart = minPhase + i * binWidth;
    const binEnd = binStart + binWidth;
    const binCenter = (binStart + binEnd) / 2;
    
    const pointsInBin = flux.filter((_, j) => time[j] >= binStart && time[j] < binEnd);
    
    if (pointsInBin.length > 0) {
      // Median flux for robustness against outliers
      const sorted = [...pointsInBin].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      const median = sorted.length % 2 === 0 
        ? (sorted[mid - 1] + sorted[mid]) / 2 
        : sorted[mid];
      
      binnedTime.push(binCenter);
      binnedFlux.push(median);
    }
  }
  
  return { time: binnedTime, flux: binnedFlux };
}

export function Observatory({ activeTicId, fluxData, metadata, loading }: ObservatoryProps) {
  const binned = fluxData ? binLightCurve(fluxData.time, fluxData.flux) : null;

  const metaCards = metadata ? [
    { 
      icon: Database, 
      label: 'Data Source', 
      value: metadata.source === 'mast' ? 'NASA MAST' : 'Simulated',
      color: metadata.source === 'mast' ? 'text-emerald-400' : 'text-amber-400',
      bg: metadata.source === 'mast' ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-amber-500/10 border-amber-500/20'
    },
    { 
      icon: BarChart3, 
      label: 'TCE Count', 
      value: metadata.tceCount.toString(),
      color: 'text-blue-400',
      bg: 'bg-blue-500/10 border-blue-500/20'
    },
    { 
      icon: Waves, 
      label: 'Transit Depth', 
      value: metadata.transitDepth ? `${(metadata.transitDepth * 100).toFixed(3)}%` : 'N/A',
      color: 'text-fuchsia-400',
      bg: 'bg-fuchsia-500/10 border-fuchsia-500/20'
    },
    { 
      icon: Ruler, 
      label: 'Est. Radius', 
      value: metadata.estimatedRadius ? `${metadata.estimatedRadius.toFixed(1)} R⊕` : 'N/A',
      color: 'text-indigo-400',
      bg: 'bg-indigo-500/10 border-indigo-500/20'
    },
    { 
      icon: Orbit, 
      label: 'Orbital Period', 
      value: metadata.orbitalPeriod ? `${metadata.orbitalPeriod.toFixed(2)} d` : 'N/A',
      color: 'text-cyan-400',
      bg: 'bg-cyan-500/10 border-cyan-500/20'
    },
  ] : [];

  return (
    <motion.section 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="bg-slate-900 border-2 border-slate-700/60 rounded-[2rem] overflow-hidden shadow-[0_20px_50px_-12px_rgba(0,0,0,0.4)] relative"
    >
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-amber-500" />
      
      <div className="p-8 pb-6 border-b border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <h2 className="text-2xl font-display font-bold flex items-center gap-3 text-slate-100">
          <div className="bg-indigo-500/10 p-2 rounded-xl text-indigo-400 border border-indigo-500/20 shadow-inner">
            <Satellite className="w-6 h-6" />
          </div>
          The Raw Observatory
        </h2>
        <div className="flex items-center gap-3">
          {metadata?.source === 'mast' && (
            <div className="bg-emerald-500/10 text-emerald-400 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border border-emerald-500/20 shadow-inner">
              <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
              LIVE DATA
            </div>
          )}
          {activeTicId && (
            <div className="bg-slate-800 text-slate-400 flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-bold border border-slate-700 shrink-0 shadow-inner">
               Target ID: <span className="text-slate-200 font-mono">TIC {activeTicId}</span>
            </div>
          )}
        </div>
      </div>

      {/* Transit Metadata Cards */}
      {metadata && fluxData && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 p-6 pb-0"
        >
          {metaCards.map((card, i) => (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 * i }}
              className={`${card.bg} border rounded-2xl p-4 text-center`}
            >
              <card.icon className={`w-4 h-4 ${card.color} mx-auto mb-2`} />
              <div className={`text-lg font-bold ${card.color} font-mono`}>{card.value}</div>
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mt-1">{card.label}</div>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Chart Area */}
      <div className="h-96 w-full bg-[#0b0f19] relative flex items-center justify-center">
        {!fluxData && !loading && (
           <div className="text-slate-500 font-mono font-medium flex flex-col items-center gap-4">
             <div className="w-16 h-16 rounded-full border-4 border-dashed border-slate-700 flex items-center justify-center">
                <Satellite className="w-6 h-6 text-slate-600" />
             </div>
             No light curve data fetched yet.
           </div>
        )}
        {loading && !fluxData && (
           <motion.div 
             initial={{ opacity: 0 }} animate={{ opacity: 1 }}
             className="text-indigo-400 font-mono font-bold text-lg flex items-center gap-4 bg-indigo-500/10 px-6 py-3 rounded-full border border-indigo-500/20 shadow-inner scanning-pulse"
           >
              <span className="w-5 h-5 border-[3px] border-indigo-500/20 border-t-indigo-400 rounded-full animate-spin" />
              Establishing uplink to MAST Archive...
           </motion.div>
        )}
        {fluxData && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full h-full p-4">
            <Plot
              data={[
                // Raw scatter points
                {
                  x: fluxData.time,
                  y: fluxData.flux,
                  type: 'scatter',
                  mode: 'markers',
                  marker: { color: '#818cf8', size: 3.5, opacity: 0.45 },
                  name: 'Raw Flux',
                  hovertemplate: 'Phase: %{x:.4f}<br>Flux: %{y:.6f}<extra></extra>',
                },
                // Binned median overlay
                ...(binned && binned.time.length > 0 ? [{
                  x: binned.time,
                  y: binned.flux,
                  type: 'scatter' as const,
                  mode: 'lines+markers' as const,
                  line: { color: '#f472b6', width: 3, shape: 'spline' as const },
                  marker: { color: '#f472b6', size: 5 },
                  name: 'Binned Median',
                  hovertemplate: 'Phase: %{x:.4f}<br>Flux: %{y:.6f}<extra></extra>',
                }] : []),
              ]}
              layout={{
                autosize: true,
                paper_bgcolor: 'transparent',
                plot_bgcolor: 'transparent',
                margin: { t: 20, r: 20, b: 50, l: 70 },
                legend: { 
                  font: { color: '#94a3b8', size: 12 }, 
                  bgcolor: 'rgba(0,0,0,0)',
                  x: 0.01, y: 0.99
                },
                xaxis: { 
                  title: 'Phase', 
                  color: '#94a3b8', 
                  gridcolor: '#1e293b',
                  zerolinecolor: '#475569',
                  tickfont: { family: 'JetBrains Mono', size: 11 }
                },
                yaxis: { 
                  title: 'Detrended Flux', 
                  color: '#94a3b8', 
                  gridcolor: '#1e293b',
                  zerolinecolor: '#475569',
                  tickfont: { family: 'JetBrains Mono', size: 11 }
                },
                font: { family: 'Nunito, sans-serif', color: '#94a3b8', size: 13 }
              }}
              useResizeHandler={true}
              style={{ width: '100%', height: '100%' }}
              config={{ displayModeBar: false }}
            />
          </motion.div>
        )}
      </div>
    </motion.section>
  );
}
