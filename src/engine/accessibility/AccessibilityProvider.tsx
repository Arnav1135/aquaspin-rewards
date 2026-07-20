// src/engine/accessibility/AccessibilityProvider.tsx
import { createContext, useContext, useState, ReactNode } from 'react';

export type ColorblindMode = 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia';

export interface AccessibilityConfig {
  colorblindMode: ColorblindMode;
  textScale: number; // 0.8 to 1.5
  subtitlesEnabled: boolean;
  highContrastUI: boolean;
}

interface AccessibilityContextType extends AccessibilityConfig {
  setColorblindMode: (mode: ColorblindMode) => void;
  setTextScale: (scale: number) => void;
  setSubtitlesEnabled: (enabled: boolean) => void;
  setHighContrastUI: (enabled: boolean) => void;
}

const AccessibilityContext = createContext<AccessibilityContextType | null>(null);

export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const [colorblindMode, setColorblindMode] = useState<ColorblindMode>('none');
  const [textScale, setTextScale] = useState<number>(1.0);
  const [subtitlesEnabled, setSubtitlesEnabled] = useState<boolean>(true);
  const [highContrastUI, setHighContrastUI] = useState<boolean>(false);

  const filterStyle = () => {
    switch (colorblindMode) {
      case 'protanopia':
        return 'url(#protanopia-filter)';
      case 'deuteranopia':
        return 'url(#deuteranopia-filter)';
      case 'tritanopia':
        return 'url(#tritanopia-filter)';
      default:
        return 'none';
    }
  };

  return (
    <AccessibilityContext.Provider
      value={{
        colorblindMode,
        textScale,
        subtitlesEnabled,
        highContrastUI,
        setColorblindMode,
        setTextScale,
        setSubtitlesEnabled,
        setHighContrastUI,
      }}
    >
      <div
        style={{
          filter: filterStyle(),
          fontSize: `${textScale * 100}%`,
        }}
        className={highContrastUI ? 'contrast-125 saturate-150' : ''}
      >
        {children}
      </div>

      {/* SVG Filters for Colorblindness */}
      <svg className="hidden">
        <defs>
          <filter id="protanopia-filter">
            <feColorMatrix
              type="matrix"
              values="0.567, 0.433, 0, 0, 0  0.558, 0.442, 0, 0, 0  0, 0.242, 0.758, 0, 0  0, 0, 0, 1, 0"
            />
          </filter>
          <filter id="deuteranopia-filter">
            <feColorMatrix
              type="matrix"
              values="0.625, 0.375, 0, 0, 0  0.7, 0.3, 0, 0, 0  0, 0.3, 0.7, 0, 0  0, 0, 0, 1, 0"
            />
          </filter>
          <filter id="tritanopia-filter">
            <feColorMatrix
              type="matrix"
              values="0.95, 0.05, 0, 0, 0  0, 0.433, 0.567, 0, 0  0, 0.475, 0.525, 0, 0  0, 0, 0, 1, 0"
            />
          </filter>
        </defs>
      </svg>
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility() {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibility must be used within AccessibilityProvider');
  }
  return context;
}
