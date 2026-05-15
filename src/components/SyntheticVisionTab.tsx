import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { motion, AnimatePresence } from 'motion/react';
import { Eye, Orbit, Globe2, Flame, ChevronRight, X, Sparkles, Thermometer, Ruler, Sun, Wind, Loader2, AlertTriangle, Image as ImageIcon, ZoomIn, Layers } from 'lucide-react';

interface VisionImage {
  id: string;
  ticId: string;
  imageSlot: string;
  imageData: string;
  prompt: string;
  title: string;
  thesisType: string;
  researcherName: string;
}

interface VisualGuidance {
  ticId: string;
  thesisType?: string;
  parameters: { Teq: number | null; Rp: number | null; Teff: number | null; semiMajor: number | null; period: number | null; classification: string };
  system_overview: { title: string; prompt: string };
  planet_profile: { title: string; prompt: string };
  macro_surface: { title: string; prompt: string };
  visual_metadata: {
    atmosphere: string; surfaceColor: string; cloudBanding: string; limbDarkening: string;
    tidalLocking: boolean; hotspot: boolean; ringSystem: boolean; starColor: string; starType: string; sizeClass: string;
  };
}

interface ThesisEntry {
  id: string;
  ticId: string;
  researcherName: string;
  thesis?: string;
  thesisType: 'discovery' | 'rejection';
}

type FilterTab = 'all' | 'discoveries' | 'rejections';

export function SyntheticVisionTab() {
  const [entries, setEntries] = useState<ThesisEntry[]>([]);
  const [filter, setFilter] = useState<FilterTab>('all');
  const [selectedTicId, setSelectedTicId] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string>('discovery');
  const [guidance, setGuidance] = useState<VisualGuidance | null>(null);
  const [guidanceLoading, setGuidanceLoading] = useState(false);
  const [visionImages, setVisionImages] = useState<VisionImage[]>([]);
  const [imagesLoading, setImagesLoading] = useState(false);
  const [expandedPanel, setExpandedPanel] = useState<string | null>(null);
  const [lightboxImage, setLightboxImage] = useState<VisionImage | null>(null);
  const [loading, setLoading] = useState(true);

  // Load both discoveries and rejections
  useEffect(() => {
    const q1 = query(collection(db, 'queries'), where('status', '==', 'New Discovery!'));
    const q2 = query(collection(db, 'queries'), where('status', '==', 'Rejected Thesis'));

    const seen = new Set<string>();
    let discData: ThesisEntry[] = [];
    let rejData: ThesisEntry[] = [];

    const unsub1 = onSnapshot(q1, (snap) => {
      discData = [];
      const s = new Set<string>();
      snap.forEach(d => {
        const rec = d.data();
        if (!s.has(rec.ticId)) {
          s.add(rec.ticId);
          discData.push({ id: d.id, ticId: rec.ticId, researcherName: rec.researcherName, thesis: rec.thesis, thesisType: 'discovery' });
        }
      });
      mergeEntries();
    });

    const unsub2 = onSnapshot(q2, (snap) => {
      rejData = [];
      const s = new Set<string>();
      snap.forEach(d => {
        const rec = d.data();
        if (!s.has(rec.ticId)) {
          s.add(rec.ticId);
          rejData.push({ id: d.id, ticId: rec.ticId, researcherName: rec.researcherName, thesis: rec.thesis, thesisType: 'rejection' });
        }
      });
      mergeEntries();
    });

    function mergeEntries() {
      setEntries([...discData, ...rejData]);
      setLoading(false);
    }

    return () => { unsub1(); unsub2(); };
  }, []);

  const loadGuidance = async (ticId: string, type: string) => {
    setSelectedTicId(ticId);
    setSelectedType(type);
    setGuidance(null);
    setGuidanceLoading(true);
    setExpandedPanel(null);
    setVisionImages([]);
    setImagesLoading(true);
    try {
      const [guidRes, imgRes] = await Promise.all([
        fetch(`/api/visual-guidance/${encodeURIComponent(ticId)}`),
        fetch(`/api/vision-images/${encodeURIComponent(ticId)}`),
      ]);
      if (guidRes.ok) setGuidance(await guidRes.json());
      if (imgRes.ok) {
        const imgData = await imgRes.json();
        setVisionImages(imgData.images || []);
      }
    } catch (err) {
      console.error('SVSE error:', err);
    } finally {
      setGuidanceLoading(false);
      setImagesLoading(false);
    }
  };

  const filtered = entries.filter(e => {
    if (filter === 'discoveries') return e.thesisType === 'discovery';
    if (filter === 'rejections') return e.thesisType === 'rejection';
    return true;
  });

  const discCount = entries.filter(e => e.thesisType === 'discovery').length;
  const rejCount = entries.filter(e => e.thesisType === 'rejection').length;

  const getImageForSlot = (slot: string) => visionImages.find(img => img.imageSlot === slot);

  const panels = guidance ? [
    { key: 'system_overview', icon: Orbit, title: guidance.system_overview.title, prompt: guidance.system_overview.prompt, gradient: 'from-indigo-600 to-blue-600', border: 'border-indigo-500/30', accent: 'text-indigo-400', bgAccent: 'bg-indigo-500' },
    { key: 'planet_profile', icon: Globe2, title: guidance.planet_profile.title, prompt: guidance.planet_profile.prompt, gradient: 'from-emerald-600 to-teal-600', border: 'border-emerald-500/30', accent: 'text-emerald-400', bgAccent: 'bg-emerald-500' },
    { key: 'macro_surface', icon: Flame, title: guidance.macro_surface.title, prompt: guidance.macro_surface.prompt, gradient: 'from-amber-600 to-orange-600', border: 'border-amber-500/30', accent: 'text-amber-400', bgAccent: 'bg-amber-500' },
  ] : [];

  const filterTabs: { key: FilterTab; label: string; count: number }[] = [
    { key: 'all', label: 'All Targets', count: entries.length },
    { key: 'discoveries', label: 'Discoveries', count: discCount },
    { key: 'rejections', label: 'False Positives', count: rejCount },
  ];

  return (
    <div className="space-y-10">
      {/* Header */}
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="h-px w-12 bg-fuchsia-500/50" />
          <span className="text-fuchsia-400 font-black uppercase tracking-[0.3em] text-xs">Sarkar Vision Synthetic Engine</span>
        </div>
        <h2 className="text-5xl font-display font-extrabold text-slate-100 mb-4 tracking-tight">
          Synthetic <span className="text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 to-violet-400">Vision Lab</span>
        </h2>
        <p className="text-slate-400 font-medium text-lg max-w-3xl leading-relaxed">
          Physics-grounded visual specifications and AI-generated imagery for every analyzed exoplanet — discoveries <em>and</em> false positives. 99.88% grounded in physical parameters.
        </p>
      </motion.div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {filterTabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-5 py-2.5 rounded-2xl text-sm font-bold transition-all border ${
              filter === tab.key
                ? 'bg-fuchsia-500/15 border-fuchsia-500/40 text-fuchsia-300 shadow-lg shadow-fuchsia-500/10'
                : 'bg-slate-900/60 border-slate-800 text-slate-500 hover:text-slate-300 hover:border-slate-700'
            }`}
          >
            {tab.label}
            <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${filter === tab.key ? 'bg-fuchsia-500/20 text-fuchsia-300' : 'bg-slate-800 text-slate-600'}`}>
              {tab.count}
            </span>
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
          <p className="text-slate-500 max-w-sm mx-auto">Confirm exoplanet discoveries or log rejections to unlock visual specifications.</p>
        </motion.div>
      ) : (
        <div className="space-y-8">
          {/* Thesis Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((d, i) => {
              const isDiscovery = d.thesisType === 'discovery';
              const isSelected = selectedTicId === d.ticId;
              return (
                <motion.div
                  key={d.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  onClick={() => loadGuidance(d.ticId, d.thesisType)}
                  className={`group cursor-pointer rounded-[2rem] p-7 transition-all border backdrop-blur-sm relative overflow-hidden
                    ${isSelected
                      ? isDiscovery
                        ? 'bg-emerald-950/30 border-emerald-500/50 shadow-[0_0_40px_-10px_rgba(52,211,153,0.25)]'
                        : 'bg-rose-950/30 border-rose-500/50 shadow-[0_0_40px_-10px_rgba(244,63,94,0.25)]'
                      : 'bg-slate-900/60 border-slate-800 hover:border-fuchsia-500/30 hover:shadow-[0_20px_50px_-12px_rgba(232,121,249,0.1)]'
                    }`}
                >
                  <div className={`absolute -right-12 -top-12 w-32 h-32 rounded-full blur-3xl transition-all ${
                    isDiscovery ? 'bg-emerald-500/5 group-hover:bg-emerald-500/10' : 'bg-rose-500/5 group-hover:bg-rose-500/10'
                  }`} />
                  <div className="flex items-center justify-between relative z-10">
                    <div>
                      <div className={`text-xs font-bold tracking-wide uppercase mb-1 flex items-center gap-1.5 ${
                        isDiscovery ? 'text-emerald-400' : 'text-rose-400'
                      }`}>
                        {isDiscovery ? <Sparkles className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                        {isDiscovery ? 'Confirmed Discovery' : 'False Positive'}
                      </div>
                      <h4 className="text-2xl font-display font-extrabold text-slate-100">TIC {d.ticId}</h4>
                      <p className="text-slate-500 text-sm font-medium mt-1">{d.researcherName}</p>
                    </div>
                    <div className={`p-3 rounded-2xl transition-all ${
                      isSelected
                        ? isDiscovery ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                        : 'bg-slate-800 text-slate-500 group-hover:text-fuchsia-400'
                    }`}>
                      <Eye className="w-6 h-6" />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* SVSE Panel */}
          <AnimatePresence mode="wait">
            {selectedTicId && (
              <motion.div
                key={selectedTicId}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="bg-slate-900/50 border border-slate-800 rounded-[3rem] p-8 md:p-10 backdrop-blur-xl"
              >
                {guidanceLoading ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-6">
                    <div className="relative">
                      <div className="w-16 h-16 border-4 border-fuchsia-500/10 border-t-fuchsia-500 rounded-full animate-spin" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Sparkles className="w-6 h-6 text-fuchsia-400 animate-pulse" />
                      </div>
                    </div>
                    <div className="text-center">
                      <p className="text-slate-300 font-bold">Invoking SVSE Physics Engine...</p>
                      <p className="text-slate-500 text-sm mt-1">Translating physical parameters to visual specifications</p>
                    </div>
                  </div>
                ) : guidance ? (
                  <div className="space-y-8">
                    {/* Thesis Type Badge + Params */}
                    <div className="flex items-center gap-4 flex-wrap">
                      <div className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider border ${
                        selectedType === 'discovery'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                      }`}>
                        {selectedType === 'discovery' ? '✦ Discovery' : '✕ False Positive'}
                      </div>
                      {[
                        { icon: Thermometer, label: 'T_eq', value: guidance.parameters.Teq ? `${guidance.parameters.Teq} K` : 'N/A', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
                        { icon: Ruler, label: 'R_p', value: guidance.parameters.Rp ? `${guidance.parameters.Rp} R⊕` : 'N/A', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
                        { icon: Sun, label: 'T_eff', value: guidance.parameters.Teff ? `${guidance.parameters.Teff} K` : 'N/A', color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20' },
                        { icon: Wind, label: 'Class', value: guidance.visual_metadata.sizeClass, color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20' },
                      ].map(p => (
                        <div key={p.label} className={`flex items-center gap-2 px-4 py-2 rounded-2xl border ${p.color}`}>
                          <p.icon className="w-4 h-4" />
                          <span className="text-xs font-black uppercase tracking-wider">{p.label}:</span>
                          <span className="text-sm font-bold text-slate-200">{p.value}</span>
                        </div>
                      ))}
                    </div>

                    {/* Color Preview */}
                    <div className="flex items-center gap-4 p-4 bg-slate-950/50 rounded-2xl border border-slate-800">
                      <div className="w-12 h-12 rounded-full shadow-lg border-2 border-white/10" style={{ backgroundColor: guidance.visual_metadata.surfaceColor }} />
                      <div className="w-8 h-8 rounded-full shadow-lg border-2 border-white/10" style={{ backgroundColor: guidance.visual_metadata.starColor }} />
                      <div className="text-sm text-slate-400">
                        <span className="font-bold text-slate-200">{guidance.visual_metadata.starType}</span> • {guidance.parameters.classification}
                      </div>
                      {guidance.visual_metadata.tidalLocking && (
                        <div className="ml-auto flex items-center gap-2 px-3 py-1.5 rounded-xl border text-rose-400 bg-rose-500/10 border-rose-500/20 text-xs font-bold">
                          <Flame className="w-3.5 h-3.5" /> Tidally Locked
                        </div>
                      )}
                    </div>

                    {/* === IMAGE GALLERY === */}
                    <div>
                      <div className="flex items-center gap-3 mb-5">
                        <Layers className="w-5 h-5 text-fuchsia-400" />
                        <h3 className="text-sm font-black uppercase tracking-[0.2em] text-fuchsia-400">AI-Generated Vision Gallery</h3>
                        <span className="text-xs font-bold px-3 py-1 rounded-full bg-fuchsia-500/10 text-fuchsia-300 border border-fuchsia-500/20">
                          {visionImages.length}/3 images
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        {panels.map((panel, i) => {
                          const img = getImageForSlot(panel.key);
                          return (
                            <motion.div
                              key={panel.key}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: i * 0.1 }}
                              className={`rounded-[2rem] border overflow-hidden transition-all group ${panel.border} bg-slate-900/40 hover:bg-slate-800/30`}
                            >
                              {/* Image Area */}
                              {img && img.imageData ? (
                                <div
                                  className="relative cursor-pointer overflow-hidden"
                                  onClick={() => setLightboxImage(img)}
                                >
                                  <img
                                    src={img.imageData}
                                    alt={img.title || panel.title}
                                    className="w-full h-48 object-cover transition-transform duration-500 group-hover:scale-110"
                                  />
                                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-4">
                                    <div className="flex items-center gap-1.5 text-white/90 text-xs font-bold bg-black/40 backdrop-blur-sm px-3 py-1.5 rounded-xl">
                                      <ZoomIn className="w-3.5 h-3.5" /> View Full
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className="h-48 flex flex-col items-center justify-center bg-slate-950/40 border-b border-slate-800/50">
                                  <div className={`p-3 rounded-2xl bg-slate-800/50 ${panel.accent} mb-3`}>
                                    <ImageIcon className="w-8 h-8 opacity-30" />
                                  </div>
                                  <p className="text-slate-600 text-xs font-bold uppercase tracking-wider">No image uploaded</p>
                                  <p className="text-slate-700 text-[10px] mt-1">Use MCP upload_vision_image</p>
                                </div>
                              )}

                              {/* Prompt Card */}
                              <div className={`h-1 bg-gradient-to-r ${panel.gradient}`} />
                              <div className="p-5">
                                <div className="flex items-center gap-2 mb-3">
                                  <div className={`p-1.5 rounded-lg bg-slate-800/80 ${panel.accent}`}>
                                    <panel.icon className="w-4 h-4" />
                                  </div>
                                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-300 truncate">{panel.title}</h4>
                                </div>
                                <p
                                  onClick={() => setExpandedPanel(expandedPanel === panel.key ? null : panel.key)}
                                  className={`text-sm leading-relaxed cursor-pointer transition-all ${expandedPanel === panel.key ? 'text-slate-300' : 'text-slate-500 line-clamp-2'}`}
                                >
                                  {panel.prompt}
                                </p>
                                <button
                                  onClick={() => setExpandedPanel(expandedPanel === panel.key ? null : panel.key)}
                                  className="mt-3 flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-fuchsia-400 transition-colors"
                                >
                                  {expandedPanel === panel.key ? 'Collapse' : 'Expand'}
                                  <ChevronRight className={`w-3 h-3 transition-transform ${expandedPanel === panel.key ? 'rotate-90' : ''}`} />
                                </button>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Atmosphere */}
                    <div className="p-6 bg-slate-950/50 rounded-2xl border border-slate-800">
                      <h4 className="text-xs font-black uppercase tracking-widest text-fuchsia-400 mb-3">Atmospheric Composition (Physics-Grounded)</h4>
                      <p className="text-slate-300 text-sm leading-relaxed">{guidance.visual_metadata.atmosphere}</p>
                      {guidance.visual_metadata.cloudBanding !== 'None' && (
                        <p className="text-slate-400 text-sm mt-2"><span className="text-slate-500 font-bold">Cloud Features:</span> {guidance.visual_metadata.cloudBanding}</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-16 text-slate-500">
                    <p className="font-bold">No guidance data available for this TIC ID.</p>
                    <p className="text-sm mt-1">Ensure a thesis exists with physical parameters.</p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Lightbox Modal */}
      <AnimatePresence>
        {lightboxImage && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/90 backdrop-blur-xl"
              onClick={() => setLightboxImage(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative max-w-5xl w-full max-h-[90vh] flex flex-col"
            >
              <div className="flex items-center justify-between p-4">
                <div>
                  <h3 className="text-lg font-bold text-white">{lightboxImage.title || lightboxImage.imageSlot}</h3>
                  <p className="text-slate-400 text-sm">TIC {lightboxImage.ticId} • {lightboxImage.researcherName}</p>
                </div>
                <button
                  onClick={() => setLightboxImage(null)}
                  className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-auto rounded-2xl">
                <img
                  src={lightboxImage.imageData}
                  alt={lightboxImage.title}
                  className="w-full h-auto rounded-2xl border border-white/10 shadow-2xl"
                />
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
