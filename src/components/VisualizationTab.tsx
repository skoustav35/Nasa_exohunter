import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { motion, AnimatePresence } from 'motion/react';
import {
  Eye, Orbit, Globe2, Flame, ChevronLeft, X, Sparkles,
  Thermometer, Ruler, Sun, Wind, Loader2, AlertTriangle,
  Image as ImageIcon, ZoomIn, Layers, Shield, Activity
} from 'lucide-react';

interface VisionImage {
  id: string; ticId: string; imageSlot: string; imageData: string;
  prompt: string; title: string; thesisType: string; researcherName: string;
}

interface VisualGuidance {
  ticId: string; thesisType?: string; sovereignIntegrityScore?: number;
  parameters: { Teq: number|null; Rp: number|null; Teff: number|null; semiMajor: number|null; period: number|null; classification: string };
  system_overview: { title: string; prompt: string };
  planet_profile: { title: string; prompt: string };
  macro_surface: { title: string; prompt: string };
  visual_metadata: { atmosphere: string; surfaceColor: string; cloudBanding: string; limbDarkening: string; tidalLocking: boolean; hotspot: boolean; ringSystem: boolean; starColor: string; starType: string; sizeClass: string };
}

interface ThesisEntry {
  id: string; ticId: string; researcherName: string; thesis?: string; thesisType: 'discovery'|'rejection';
}

interface PlotData {
  id: string; ticId: string; type: string; base64: string; mimeType: string;
}

type FilterTab = 'all' | 'discoveries' | 'rejections';

export function VisualizationTab() {
  const [entries, setEntries] = useState<ThesisEntry[]>([]);
  const [filter, setFilter] = useState<FilterTab>('all');
  const [selectedTicId, setSelectedTicId] = useState<string|null>(null);
  const [selectedType, setSelectedType] = useState<string>('discovery');
  const [guidance, setGuidance] = useState<VisualGuidance|null>(null);
  const [guidanceLoading, setGuidanceLoading] = useState(false);
  const [visionImages, setVisionImages] = useState<VisionImage[]>([]);
  const [plotImages, setPlotImages] = useState<PlotData[]>([]);
  const [lightboxImage, setLightboxImage] = useState<{src:string;title:string;prompt?:string;meta?:string}|null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q1 = query(collection(db, 'queries'), where('status', '==', 'New Discovery!'));
    const q2 = query(collection(db, 'queries'), where('status', '==', 'Rejected Thesis'));
    let discData: ThesisEntry[] = [];
    let rejData: ThesisEntry[] = [];

    const unsub1 = onSnapshot(q1, (snap) => {
      discData = []; const s = new Set<string>();
      snap.forEach(d => { const rec = d.data(); if (!s.has(rec.ticId)) { s.add(rec.ticId); discData.push({ id: d.id, ticId: rec.ticId, researcherName: rec.researcherName, thesis: rec.thesis, thesisType: 'discovery' }); } });
      merge();
    });
    const unsub2 = onSnapshot(q2, (snap) => {
      rejData = []; const s = new Set<string>();
      snap.forEach(d => { const rec = d.data(); if (!s.has(rec.ticId)) { s.add(rec.ticId); rejData.push({ id: d.id, ticId: rec.ticId, researcherName: rec.researcherName, thesis: rec.thesis, thesisType: 'rejection' }); } });
      merge();
    });
    function merge() { setEntries([...discData, ...rejData]); setLoading(false); }
    return () => { unsub1(); unsub2(); };
  }, []);

  const openObservatory = async (ticId: string, type: string) => {
    setSelectedTicId(ticId); setSelectedType(type);
    setGuidance(null); setGuidanceLoading(true);
    setVisionImages([]); setPlotImages([]);
    try {
      const [guidRes, imgRes, plotRes] = await Promise.all([
        fetch(`/api/visual-guidance/${encodeURIComponent(ticId)}`),
        fetch(`/api/vision-images/${encodeURIComponent(ticId)}`),
        fetch('/api/plots-data'),
      ]);
      if (guidRes.ok) setGuidance(await guidRes.json());
      if (imgRes.ok) { const d = await imgRes.json(); setVisionImages(d.images || []); }
      if (plotRes.ok) {
        const d = await plotRes.json();
        const relevant = (d.plots || []).filter((p: any) => p.ticId === ticId);
        setPlotImages(relevant);
      }
    } catch (err) { console.error('Observatory load error:', err); }
    finally { setGuidanceLoading(false); }
  };

  const filtered = entries.filter(e => {
    if (filter === 'discoveries') return e.thesisType === 'discovery';
    if (filter === 'rejections') return e.thesisType === 'rejection';
    return true;
  });
  const discCount = entries.filter(e => e.thesisType === 'discovery').length;
  const rejCount = entries.filter(e => e.thesisType === 'rejection').length;
  const getImg = (slot: string) => visionImages.find(i => i.imageSlot === slot);

  const panels = guidance ? [
    { key: 'system_overview', icon: Orbit, data: guidance.system_overview, grad: 'from-indigo-600 to-blue-600', border: 'border-indigo-500/30', accent: 'text-indigo-400' },
    { key: 'planet_profile', icon: Globe2, data: guidance.planet_profile, grad: 'from-emerald-600 to-teal-600', border: 'border-emerald-500/30', accent: 'text-emerald-400' },
    { key: 'macro_surface', icon: Flame, data: guidance.macro_surface, grad: 'from-amber-600 to-orange-600', border: 'border-amber-500/30', accent: 'text-amber-400' },
  ] : [];

  const filterTabs: { key: FilterTab; label: string; count: number }[] = [
    { key: 'all', label: 'All Targets', count: entries.length },
    { key: 'discoveries', label: 'Discoveries', count: discCount },
    { key: 'rejections', label: 'False Positives', count: rejCount },
  ];

  // ── Observatory View ─────────────────────────────────────
  if (selectedTicId) {
    const phasePlot = plotImages.find(p => p.type === 'phase_folded');
    const ttvPlot = plotImages.find(p => p.type === 'ttv_oc');
    const isDisc = selectedType === 'discovery';
    const intScore = guidance?.sovereignIntegrityScore;

    return (
      <div className="space-y-8">
        {/* Back button */}
        <motion.button initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
          onClick={() => { setSelectedTicId(null); setGuidance(null); }}
          className="flex items-center gap-2 text-slate-400 hover:text-fuchsia-400 transition-colors font-bold text-sm bg-slate-800 border border-slate-700 px-5 py-2.5 rounded-xl"
        >
          <ChevronLeft className="w-5 h-5" /> Back to Gallery
        </motion.button>

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-5 flex-wrap">
          <div className={`px-5 py-2 rounded-2xl text-sm font-black uppercase tracking-wider border ${isDisc ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-rose-500/10 text-rose-400 border-rose-500/30'}`}>
            {isDisc ? '✦ Confirmed Discovery' : '✕ False Positive'}
          </div>
          <h2 className="text-4xl font-display font-extrabold text-slate-100">TIC {selectedTicId}</h2>
          {intScore !== null && intScore !== undefined && (
            <div className={`flex items-center gap-2 px-4 py-2 rounded-2xl border text-sm font-bold ${intScore >= 70 ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-rose-400 bg-rose-500/10 border-rose-500/20'}`}>
              <Shield className="w-4 h-4" /> Integrity: {intScore}%
            </div>
          )}
        </motion.div>

        {guidanceLoading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-6">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-fuchsia-500/10 border-t-fuchsia-500 rounded-full animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center"><Sparkles className="w-6 h-6 text-fuchsia-400 animate-pulse" /></div>
            </div>
            <p className="text-slate-300 font-bold">Loading Observatory View...</p>
          </div>
        ) : guidance ? (
          <div className="space-y-8">
            {/* 3-column Observatory layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

              {/* Left: Phase-Folded Curve + TTV Plot */}
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}
                className="lg:col-span-3 space-y-4">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2">
                  <Activity className="w-4 h-4" /> Light Curve Data
                </h3>
                {phasePlot ? (
                  <div className="rounded-2xl overflow-hidden border border-slate-800 bg-slate-900/60 cursor-pointer group"
                    onClick={() => setLightboxImage({ src: `data:${phasePlot.mimeType};base64,${phasePlot.base64}`, title: 'Phase-Folded Light Curve', meta: `TIC ${selectedTicId}` })}>
                    <img src={`data:${phasePlot.mimeType};base64,${phasePlot.base64}`} alt="Phase-Folded" className="w-full h-auto transition-transform duration-500 group-hover:scale-105" />
                    <div className="p-3 border-t border-slate-800"><p className="text-xs font-bold text-slate-400">Phase-Folded Curve</p></div>
                  </div>
                ) : (
                  <div className="h-40 rounded-2xl border border-dashed border-slate-800 bg-slate-950/40 flex items-center justify-center">
                    <p className="text-slate-600 text-xs font-bold">No phase-folded plot</p>
                  </div>
                )}
                {ttvPlot ? (
                  <div className="rounded-2xl overflow-hidden border border-slate-800 bg-slate-900/60 cursor-pointer group"
                    onClick={() => setLightboxImage({ src: `data:${ttvPlot.mimeType};base64,${ttvPlot.base64}`, title: 'TTV O-C Plot', meta: `TIC ${selectedTicId}` })}>
                    <img src={`data:${ttvPlot.mimeType};base64,${ttvPlot.base64}`} alt="TTV" className="w-full h-auto transition-transform duration-500 group-hover:scale-105" />
                    <div className="p-3 border-t border-slate-800"><p className="text-xs font-bold text-slate-400">TTV O-C Diagram</p></div>
                  </div>
                ) : (
                  <div className="h-32 rounded-2xl border border-dashed border-slate-800 bg-slate-950/40 flex items-center justify-center">
                    <p className="text-slate-600 text-xs font-bold">No TTV plot</p>
                  </div>
                )}
              </motion.div>

              {/* Center: 3 SVSE Synthetic Images */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                className="lg:col-span-6 space-y-4">
                <div className="flex items-center gap-3">
                  <Layers className="w-4 h-4 text-fuchsia-400" />
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] text-fuchsia-400">SVSE Vision Gallery</h3>
                  <span className="text-xs font-bold px-3 py-1 rounded-full bg-fuchsia-500/10 text-fuchsia-300 border border-fuchsia-500/20">
                    {visionImages.length}/3
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {panels.map((panel, i) => {
                    const img = getImg(panel.key);
                    return (
                      <motion.div key={panel.key} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + i * 0.1 }}
                        className={`rounded-2xl border overflow-hidden group ${panel.border} bg-slate-900/40 hover:bg-slate-800/30 transition-all`}>
                        {img?.imageData ? (
                          <div className="relative cursor-pointer overflow-hidden"
                            onClick={() => setLightboxImage({ src: img.imageData, title: img.title || panel.data.title, prompt: img.prompt || panel.data.prompt, meta: `TIC ${selectedTicId} · ${img.researcherName}` })}>
                            <img src={img.imageData} alt={panel.data.title} className="w-full h-44 object-cover transition-transform duration-500 group-hover:scale-110" />
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-3">
                              <div className="flex items-center gap-1.5 text-white/90 text-xs font-bold bg-black/40 backdrop-blur-sm px-3 py-1.5 rounded-xl"><ZoomIn className="w-3.5 h-3.5" /> View</div>
                            </div>
                          </div>
                        ) : (
                          <div className="h-44 flex flex-col items-center justify-center bg-slate-950/40">
                            <ImageIcon className={`w-8 h-8 opacity-20 ${panel.accent} mb-2`} />
                            <p className="text-slate-600 text-[10px] font-bold uppercase tracking-wider">No image</p>
                          </div>
                        )}
                        <div className={`h-0.5 bg-gradient-to-r ${panel.grad}`} />
                        <div className="p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <panel.icon className={`w-3.5 h-3.5 ${panel.accent}`} />
                            <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-300 truncate">{panel.data.title}</h4>
                          </div>
                          <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{panel.data.prompt}</p>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>

              {/* Right: Physical Parameters */}
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}
                className="lg:col-span-3 space-y-4">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2">
                  <Sun className="w-4 h-4" /> Physical Parameters
                </h3>
                <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4">
                  {[
                    { icon: Thermometer, label: 'T_eq', value: guidance.parameters.Teq ? `${guidance.parameters.Teq} K` : 'N/A', color: 'text-amber-400' },
                    { icon: Ruler, label: 'R_p', value: guidance.parameters.Rp ? `${guidance.parameters.Rp} R⊕` : 'N/A', color: 'text-blue-400' },
                    { icon: Sun, label: 'T_eff', value: guidance.parameters.Teff ? `${guidance.parameters.Teff} K` : 'N/A', color: 'text-yellow-400' },
                    { icon: Orbit, label: 'Period', value: guidance.parameters.period ? `${guidance.parameters.period} d` : 'N/A', color: 'text-indigo-400' },
                    { icon: Wind, label: 'Class', value: guidance.parameters.classification || 'N/A', color: 'text-cyan-400' },
                  ].map(p => (
                    <div key={p.label} className="flex items-center gap-3">
                      <p.icon className={`w-4 h-4 ${p.color} shrink-0`} />
                      <span className="text-xs font-bold text-slate-500 uppercase w-12">{p.label}</span>
                      <span className="text-sm font-bold text-slate-200 truncate">{p.value}</span>
                    </div>
                  ))}
                </div>

                {/* v3.0 Grounding Badge Panel */}
                {guidance && (guidance as any).grounding_badge && (() => {
                  const gd = guidance as any;
                  const badge = gd.grounding_badge || 'yellow';
                  const badgeConfig = badge === 'green'
                    ? { icon: '✓', label: 'GROUNDED', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400' }
                    : badge === 'red'
                    ? { icon: '✕', label: 'CONFLICT', bg: 'bg-rose-500/10', border: 'border-rose-500/30', text: 'text-rose-400' }
                    : { icon: '⚠', label: 'UNVERIFIED', bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-400' };
                  return (
                    <div className={`${badgeConfig.bg} border ${badgeConfig.border} rounded-2xl p-5 space-y-3`}>
                      <div className="flex items-center gap-2">
                        <Shield className={`w-4 h-4 ${badgeConfig.text}`} />
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-300">Grounding Badge</h4>
                      </div>
                      <div className={`flex items-center gap-2 px-3 py-2 rounded-xl ${badgeConfig.bg} border ${badgeConfig.border} text-sm font-black ${badgeConfig.text}`}>
                        <span className="text-base">{badgeConfig.icon}</span>
                        {badgeConfig.label}
                      </div>
                      {gd.official_radius != null && (
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-500 font-bold">Official R_p</span>
                            <span className="text-slate-200 font-bold">{gd.official_radius} R⊕</span>
                          </div>
                          {gd.discovery_delta != null && (
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-500 font-bold">Delta</span>
                              <span className={`font-bold ${gd.discovery_delta <= 10 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {gd.discovery_delta}%
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                      {gd.stellar_lockdown_source && (
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-500 font-bold">Source</span>
                          <span className="text-slate-300 font-bold capitalize">
                            {gd.stellar_lockdown_source === 'gaia_dr3' ? '🥇 Gaia DR3'
                             : gd.stellar_lockdown_source === 'tic_v8' ? '✅ TIC v8.2'
                             : '⚙️ Ab-Initio'}
                          </span>
                        </div>
                      )}
                      {gd.depth_sanity_report && (
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-500 font-bold">Depth Gate</span>
                          <span className={`font-bold ${gd.depth_sanity_report.alert ? 'text-rose-400' : 'text-emerald-400'}`}>
                            {gd.depth_sanity_report.alert ? '✕ ALERT' : '✓ PASS'}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Color Preview */}
                <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full border-2 border-white/10 shadow-lg" style={{ backgroundColor: guidance.visual_metadata.surfaceColor }} />
                    <div className="w-7 h-7 rounded-full border-2 border-white/10 shadow-lg" style={{ backgroundColor: guidance.visual_metadata.starColor }} />
                    <div className="text-xs text-slate-400 font-bold">{guidance.visual_metadata.starType}</div>
                  </div>
                  {guidance.visual_metadata.tidalLocking && (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border text-rose-400 bg-rose-500/10 border-rose-500/20 text-xs font-bold">
                      <Flame className="w-3.5 h-3.5" /> Tidally Locked
                    </div>
                  )}
                </div>

                {/* Atmosphere */}
                <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-fuchsia-400 mb-2">Atmosphere</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">{guidance.visual_metadata.atmosphere}</p>
                  {guidance.visual_metadata.cloudBanding !== 'None' && (
                    <p className="text-xs text-slate-500 mt-2"><span className="font-bold">Clouds:</span> {guidance.visual_metadata.cloudBanding}</p>
                  )}
                </div>
              </motion.div>
            </div>
          </div>
        ) : (
          <div className="text-center py-16 text-slate-500"><p className="font-bold">No guidance data available.</p></div>
        )}

        {/* Lightbox */}
        <AnimatePresence>
          {lightboxImage && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/90 backdrop-blur-xl" onClick={() => setLightboxImage(null)} />
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }} className="relative max-w-5xl w-full max-h-[90vh] flex flex-col">
                <div className="flex items-center justify-between p-4">
                  <div>
                    <h3 className="text-lg font-bold text-white">{lightboxImage.title}</h3>
                    {lightboxImage.meta && <p className="text-slate-400 text-sm">{lightboxImage.meta}</p>}
                  </div>
                  <button onClick={() => setLightboxImage(null)} className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"><X className="w-5 h-5" /></button>
                </div>
                <div className="flex-1 overflow-auto rounded-2xl">
                  <img src={lightboxImage.src} alt={lightboxImage.title} className="w-full h-auto rounded-2xl border border-white/10 shadow-2xl" />
                </div>
                {lightboxImage.prompt && (
                  <div className="p-4 mt-2 bg-slate-900/80 rounded-xl border border-slate-800 max-h-24 overflow-y-auto">
                    <p className="text-xs text-slate-400 leading-relaxed">{lightboxImage.prompt}</p>
                  </div>
                )}
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // ── Card Gallery View ────────────────────────────────────
  return (
    <div className="space-y-10">
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="h-px w-12 bg-fuchsia-500/50" />
          <span className="text-fuchsia-400 font-black uppercase tracking-[0.3em] text-xs">Sarkar Vision Synthetic Engine</span>
        </div>
        <h2 className="text-5xl font-display font-extrabold text-slate-100 mb-4 tracking-tight">
          Visualization <span className="text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 to-violet-400">Lab</span>
        </h2>
        <p className="text-slate-400 font-medium text-lg max-w-3xl leading-relaxed">
          Observatory-grade visual specifications and AI-generated imagery. Click any card to open the Observatory View.
        </p>
      </motion.div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {filterTabs.map(tab => (
          <button key={tab.key} onClick={() => setFilter(tab.key)}
            className={`px-5 py-2.5 rounded-2xl text-sm font-bold transition-all border ${filter === tab.key
              ? 'bg-fuchsia-500/15 border-fuchsia-500/40 text-fuchsia-300 shadow-lg shadow-fuchsia-500/10'
              : 'bg-slate-900/60 border-slate-800 text-slate-500 hover:text-slate-300 hover:border-slate-700'}`}>
            {tab.label}
            <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${filter === tab.key ? 'bg-fuchsia-500/20 text-fuchsia-300' : 'bg-slate-800 text-slate-600'}`}>{tab.count}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 gap-6">
          <div className="w-16 h-16 border-4 border-fuchsia-500/10 border-t-fuchsia-500 rounded-full animate-spin" />
          <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Loading Targets...</p>
        </div>
      ) : filtered.length === 0 ? (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="bg-slate-900/50 border-2 border-dashed border-slate-800 rounded-[3rem] p-24 text-center">
          <div className="bg-gradient-to-br from-fuchsia-900/30 to-slate-900 w-24 h-24 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-2xl border border-white/5">
            <Eye className="w-12 h-12 text-fuchsia-500/50" />
          </div>
          <h3 className="text-2xl font-bold text-slate-200 mb-3">No Targets to Visualize</h3>
          <p className="text-slate-500 max-w-sm mx-auto">Confirm discoveries or log rejections to unlock visual specifications.</p>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((d, i) => {
            const isDisc = d.thesisType === 'discovery';
            return (
              <motion.div key={d.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                whileHover={{ y: -6 }} whileTap={{ scale: 0.98 }}
                onClick={() => openObservatory(d.ticId, d.thesisType)}
                className={`group cursor-pointer rounded-[2rem] p-7 transition-all border backdrop-blur-sm relative overflow-hidden
                  bg-slate-900/60 border-slate-800 hover:border-fuchsia-500/30 hover:shadow-[0_20px_50px_-12px_rgba(232,121,249,0.1)]`}>
                <div className={`absolute -right-12 -top-12 w-32 h-32 rounded-full blur-3xl transition-all ${isDisc ? 'bg-emerald-500/5 group-hover:bg-emerald-500/10' : 'bg-rose-500/5 group-hover:bg-rose-500/10'}`} />
                <div className="flex items-center justify-between relative z-10">
                  <div>
                    <div className={`text-xs font-bold tracking-wide uppercase mb-1 flex items-center gap-1.5 ${isDisc ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {isDisc ? <Sparkles className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                      {isDisc ? 'Confirmed' : 'False Positive'}
                    </div>
                    <h4 className="text-2xl font-display font-extrabold text-slate-100">TIC {d.ticId}</h4>
                    <p className="text-slate-500 text-sm font-medium mt-1">{d.researcherName}</p>
                  </div>
                  <div className="p-3 rounded-2xl bg-slate-800 text-slate-500 group-hover:text-fuchsia-400 transition-all">
                    <Eye className="w-6 h-6" />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
