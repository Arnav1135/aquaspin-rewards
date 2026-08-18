import React, { useState } from 'react';
import { MapPin, Star, Lock, Sparkles, Play, X, Compass, Bot, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { LevelConfig } from '../types';
import { getLevelConfig } from '../data/levels';

interface WorldMapModalProps {
  currentLevel: number;
  levelStarsMap: Record<number, number>;
  onSelectLevel: (levelNum: number) => void;
  onGenerateAILevel: () => void;
  onClose: () => void;
}

// Procedurally generate episodes up to 1000+
const EPISODE_THEMES = [
  { name: 'Stitch Sweet Bay', badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-400/30' },
  { name: 'Sugar Reef Cove', badge: 'bg-amber-500/20 text-amber-300 border-amber-400/30' },
  { name: 'Gummy Lagoon', badge: 'bg-purple-500/20 text-purple-300 border-purple-400/30' },
  { name: 'Caramel Canyon', badge: 'bg-orange-500/20 text-orange-300 border-orange-400/30' },
  { name: 'Galactic Sugar Way', badge: 'bg-indigo-500/20 text-indigo-300 border-indigo-400/30' },
  { name: 'Grand Sugar Citadel', badge: 'bg-rose-500/20 text-rose-300 border-rose-400/30' },
  { name: 'Marshmallow Meadows', badge: 'bg-pink-500/20 text-pink-300 border-pink-400/30' },
];

const EPISODE_LIST = Array.from({ length: 100 }, (_, i) => {
  const theme = EPISODE_THEMES[i % EPISODE_THEMES.length];
  const isApex = i > 0 && i % 10 === 0;
  return {
    id: i + 1,
    title: `Episode ${i + 1}: ${isApex ? 'The Grand Apex' : theme.name}`,
    range: [i * 10 + 1, (i + 1) * 10],
    badgeColor: isApex ? 'bg-red-600/20 text-red-300 border-red-500/40' : theme.badge,
  };
});

export const WorldMapModal: React.FC<WorldMapModalProps> = ({
  currentLevel,
  levelStarsMap,
  onSelectLevel,
  onGenerateAILevel,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'episodes' | 'ai'>('episodes');
  const [selectedPreviewLvl, setSelectedPreviewLvl] = useState<number>(currentLevel);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Find current episode index based on selected preview level
  const currentEpIndex = EPISODE_LIST.findIndex(
    (ep) => selectedPreviewLvl >= ep.range[0] && selectedPreviewLvl <= ep.range[1]
  );
  const [selectedEpId, setSelectedEpId] = useState<number>(currentEpIndex !== -1 ? currentEpIndex + 1 : 1);

  const currentEp = EPISODE_LIST.find((ep) => ep.id === selectedEpId) || EPISODE_LIST[0];

  const levelsInEpisode = Array.from(
    { length: currentEp.range[1] - currentEp.range[0] + 1 },
    (_, i) => currentEp.range[0] + i
  );

  const getEpisodeTheme = (lvl: number) => {
    const ep = EPISODE_LIST.find((e) => lvl >= e.range[0] && lvl <= e.range[1]);
    return ep || EPISODE_LIST[0];
  };

  const selectedConfig = getLevelConfig(selectedPreviewLvl);
  const selectedEpisode = getEpisodeTheme(selectedPreviewLvl);
  const isPreviewUnlocked = selectedPreviewLvl === 1 || levelStarsMap[selectedPreviewLvl - 1] !== undefined;

  // Jump to searched level
  const handleJumpToLevel = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseInt(searchQuery, 10);
    if (!isNaN(num) && num >= 1 && num <= 300) {
      setSelectedPreviewLvl(num);
      const ep = EPISODE_LIST.find((e) => num >= e.range[0] && num <= e.range[1]);
      if (ep) setSelectedEpId(ep.id);
      setSearchQuery('');
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div className="bg-slate-900 border-2 border-amber-400/40 rounded-3xl p-6 max-w-xl w-full max-h-[90vh] shadow-2xl text-white flex flex-col gap-4 relative overflow-hidden">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title & Quick Jump */}
        <div className="flex items-center justify-between gap-3 pr-10">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-amber-500/20 border border-amber-400/40 text-amber-400">
              <Compass className="w-6 h-6 animate-spin-slow" />
            </div>
            <div>
              <h3 className="text-xl font-black text-amber-300">Stitch World Map</h3>
              <p className="text-xs text-slate-300">1000+ Levels across 100 Epic Sugar Realms</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-2xl border border-slate-800">
          <button
            onClick={() => setActiveTab('episodes')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'episodes'
                ? 'bg-amber-500 text-slate-950 shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            1000+ Procedural Levels
          </button>
          <button
            onClick={() => setActiveTab('ai')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'ai'
                ? 'bg-purple-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Bot className="w-3.5 h-3.5" />
            <span>AI Level Builder</span>
          </button>
        </div>

        {/* Content */}
        {activeTab === 'episodes' ? (
          <div className="flex flex-col gap-4 overflow-y-auto pr-1 max-h-[60vh]">
            {/* Episode Selector Controls & Search */}
            <div className="flex items-center justify-between gap-2 bg-slate-950/80 p-2 rounded-2xl border border-slate-800">
              <button
                disabled={selectedEpId === 1}
                onClick={() => setSelectedEpId((prev) => Math.max(1, prev - 1))}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <select
                value={selectedEpId}
                onChange={(e) => setSelectedEpId(Number(e.target.value))}
                className="bg-slate-900 text-xs font-bold text-amber-300 px-3 py-1.5 rounded-xl border border-amber-400/30 focus:outline-none focus:ring-2 focus:ring-amber-400 cursor-pointer flex-1 text-center"
              >
                {EPISODE_LIST.map((ep) => (
                  <option key={ep.id} value={ep.id}>
                    {ep.title} (Lvl {ep.range[0]}-{ep.range[1]})
                  </option>
                ))}
              </select>

              <button
                disabled={selectedEpId === EPISODE_LIST.length}
                onClick={() => setSelectedEpId((prev) => Math.min(EPISODE_LIST.length, prev + 1))}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              <form onSubmit={handleJumpToLevel} className="flex items-center gap-1 shrink-0">
                <input
                  type="number"
                  placeholder="Lvl 1-1000"
                  min={1}
                  max={1000}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-20 bg-slate-900 border border-slate-700 text-xs p-1.5 rounded-xl text-center focus:outline-none focus:ring-1 focus:ring-amber-400"
                />
                <button type="submit" className="p-1.5 rounded-xl bg-amber-500 text-slate-950 hover:bg-amber-400 font-bold">
                  <Search className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>

            {/* Level Grid for active episode */}
            <div className="grid grid-cols-5 gap-2.5">
              {levelsInEpisode.map((lvl) => {
                const stars = levelStarsMap[lvl] || 0;
                const isUnlocked = lvl === 1 || levelStarsMap[lvl - 1] !== undefined;
                const isCurrent = lvl === currentLevel;
                const isSelected = lvl === selectedPreviewLvl;

                return (
                  <button
                    key={lvl}
                    disabled={!isUnlocked}
                    onClick={() => setSelectedPreviewLvl(lvl)}
                    className={`relative p-3 rounded-2xl border flex flex-col items-center justify-center transition-all ${
                      isSelected
                        ? 'bg-amber-400 text-slate-950 border-amber-200 ring-2 ring-amber-300 scale-105 font-black shadow-lg'
                        : isCurrent
                        ? 'bg-amber-500/30 text-amber-300 border-amber-400'
                        : isUnlocked
                        ? 'bg-slate-800/90 hover:bg-slate-700/90 text-white border-slate-700 hover:scale-105'
                        : 'bg-slate-950/60 text-slate-600 border-slate-900 cursor-not-allowed opacity-50'
                    }`}
                  >
                    <span className="text-sm font-black">{lvl}</span>

                    {/* Star ratings */}
                    <div className="flex items-center gap-0.5 mt-1">
                      {[1, 2, 3].map((s) => (
                        <Star
                          key={s}
                          className={`w-2.5 h-2.5 ${
                            stars >= s
                              ? isSelected
                                ? 'text-slate-950 fill-slate-950'
                                : 'text-amber-400 fill-amber-400'
                              : 'text-slate-700'
                          }`}
                        />
                      ))}
                    </div>

                    {!isUnlocked && (
                      <Lock className="w-3 h-3 text-slate-500 absolute top-1 right-1" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Level Detail Preview Card */}
            {selectedConfig && (
              <div className="bg-slate-950/80 border border-amber-400/30 rounded-2xl p-4 flex flex-col gap-3 relative">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${selectedEpisode.badgeColor}`}>
                      {selectedEpisode.title}
                    </span>
                    <h4 className="text-base font-black text-amber-300 mt-1">
                      Level {selectedConfig.levelNumber}: {selectedConfig.title}
                    </h4>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Moves</p>
                      <p className="text-sm font-black text-amber-400">{selectedConfig.moves}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Target</p>
                      <p className="text-sm font-black text-cyan-400">{selectedConfig.targetScore.toLocaleString()} PTS</p>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  {selectedConfig.description}
                </p>

                {selectedConfig.aiTips && (
                  <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 flex items-start gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <p className="text-[11px] text-slate-300 italic">
                      <span className="font-bold text-amber-400 not-italic">AI Strategy Tip: </span>
                      {selectedConfig.aiTips}
                    </p>
                  </div>
                )}

                <button
                  disabled={!isPreviewUnlocked}
                  onClick={() => {
                    onSelectLevel(selectedConfig.levelNumber);
                    onClose();
                  }}
                  className={`w-full py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all ${
                    isPreviewUnlocked
                      ? 'bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-slate-950 shadow-lg hover:scale-[1.02] active:scale-[0.98]'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>{isPreviewUnlocked ? `Play Level ${selectedConfig.levelNumber}` : 'Locked Level'}</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="py-6 flex flex-col items-center text-center gap-4 bg-slate-950/60 rounded-2xl p-4 border border-purple-500/30">
            <Sparkles className="w-10 h-10 text-purple-400 animate-bounce" />
            <h4 className="text-base font-bold text-amber-300">Generate Infinite AI Levels</h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              Let the Gemini AI Engine generate a unique, procedurally handcrafted Stitch Candy level with custom blockers, targets, and strategic mechanics!
            </p>
            <button
              onClick={() => {
                onGenerateAILevel();
                onClose();
              }}
              className="mt-2 py-3 px-6 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-sm shadow-xl flex items-center gap-2 hover:scale-105 active:scale-95"
            >
              <Bot className="w-5 h-5" />
              <span>Generate New AI Level</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

