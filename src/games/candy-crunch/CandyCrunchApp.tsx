import React, { useEffect } from 'react';
import { HeaderHUD } from './components/HeaderHUD';
import { BoosterBar } from './components/BoosterBar';
import { AdvancedCandyRenderer as ThreeCandyRenderer } from './rendering/components/AdvancedCandyRenderer';
import { AIAdvisorModal } from './components/AIAdvisorModal';
import { WorldMapModal } from './components/WorldMapModal';
import { VictoryModal } from './components/VictoryModal';
import { DefeatModal } from './components/DefeatModal';
import { SettingsModal } from './components/SettingsModal';
import { useGameStore } from './engine/GameStore';
import { soundEngine } from './audio/soundEngine';

export default function CandyCrunchApp() {
  const store = useGameStore();

  useEffect(() => {
    store.loadLevel(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGenerateAILevel = async () => {
    // This function can be kept simple or moved to store later if needed.
    // For now, let's keep it here as it touches the network.
    useGameStore.setState({ isProcessing: true });
    try {
      const res = await fetch('/api/ai/level-generator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          levelNumber: store.levelNumber + 1,
          difficulty: 'hard',
          theme: 'Stitch AI Galaxy',
        }),
      });
      const data = await res.json();
      if (data.success && data.level) {
        store.loadLevel(data.level.levelNumber || store.levelNumber + 1, data.level);
      }
    } catch (e) {
      console.error(e);
    } finally {
      useGameStore.setState({ isProcessing: false });
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 text-white flex flex-col items-center justify-between p-3 sm:p-5 relative overflow-hidden font-sans select-none">
      <div className="absolute inset-0 bg-gradient-to-tr from-sky-950 via-indigo-950 to-purple-950 opacity-90 -z-10" />

      <HeaderHUD
        levelNumber={store.levelNumber}
        levelTitle={store.levelConfig.title}
        score={store.score}
        targetScore={store.levelConfig.targetScore}
        movesLeft={store.movesLeft}
        stars={store.stars}
        objectiveType={store.levelConfig.objectiveType}
        jellyCount={store.jellyCount}
        ingredientCount={store.ingredientCount}
        isMuted={store.isMuted}
        onToggleSound={() => store.setMuted(soundEngine.toggleMute())}
        onOpenMap={() => store.setShowWorldMap(true)}
        onOpenAIAdvisor={() => store.setShowAIAdvisor(true)}
        onPause={() => store.setShowSettings(true)}
      />

      {store.announcerText && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40 pointer-events-none animate-bounce">
          <span className="text-4xl sm:text-6xl font-black italic text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-amber-400 to-rose-400 drop-shadow-[0_10px_10px_rgba(0,0,0,0.8)] tracking-wider uppercase">
            {store.announcerText}
          </span>
        </div>
      )}

      <div className="w-full flex justify-center my-2">
        <ThreeCandyRenderer
          board={store.board}
          selectedCell={store.selectedCell}
          aiSuggestedSwap={store.aiSuggestedSwap}
          onTileClick={store.handleTileClick}
          onTileDragSwap={store.handleTileDragSwap}
          isProcessing={store.isProcessing}
        />
      </div>

      <BoosterBar
        activeBooster={store.activeBooster}
        boosterCounts={store.boosterCounts}
        onSelectBooster={(b) => store.setActiveBooster(store.activeBooster === b ? null : b)}
        isProcessing={store.isProcessing}
      />

      {store.showAIAdvisor && (
        <AIAdvisorModal
          board={store.board}
          movesLeft={store.movesLeft}
          score={store.score}
          targetScore={store.levelConfig.targetScore}
          onApplyAdvice={(advice) => store.setAiSuggestedSwap(advice.recommendedSwap)}
          onClose={() => store.setShowAIAdvisor(false)}
        />
      )}

      {store.showWorldMap && (
        <WorldMapModal
          currentLevel={store.levelNumber}
          levelStarsMap={store.levelStarsMap}
          onSelectLevel={(lvl) => store.loadLevel(lvl)}
          onGenerateAILevel={handleGenerateAILevel}
          onClose={() => store.setShowWorldMap(false)}
        />
      )}

      {store.showVictory && (
        <VictoryModal
          levelNumber={store.levelNumber}
          score={store.score}
          stars={store.stars}
          onNextLevel={() => store.loadLevel(store.levelNumber + 1)}
          onReplay={() => store.loadLevel(store.levelNumber)}
        />
      )}

      {store.showDefeat && (
        <DefeatModal
          levelNumber={store.levelNumber}
          score={store.score}
          targetScore={store.levelConfig.targetScore}
          onReplay={() => store.loadLevel(store.levelNumber)}
          onAddExtraMoves={() => {
            store.setMovesLeft(store.movesLeft + 5);
            store.setShowDefeat(false);
          }}
          onClose={() => store.setShowDefeat(false)}
        />
      )}

      {store.showSettings && (
        <SettingsModal
          isMuted={store.isMuted}
          onToggleSound={() => store.setMuted(soundEngine.toggleMute())}
          onResetLevel={() => store.loadLevel(store.levelNumber)}
          onClose={() => store.setShowSettings(false)}
        />
      )}
    </div>
  );
}

