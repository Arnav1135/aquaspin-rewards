import React from 'react';
import { Environment } from '@react-three/drei';
import { useCarromStore } from '../state/CarromState';

export type CarromEnvironmentProfile = {
  name: string;
  preset: "apartment" | "city" | "dawn" | "forest" | "lobby" | "night" | "park" | "studio" | "sunset" | "warehouse";
  backgroundIntensity: number;
  envMapIntensity: number;
  lightIntensity: number;
  groundColor: string;
  skyColor: string;
  ambientIntensity: number;
};

export const ENVIRONMENT_PROFILES: Record<string, CarromEnvironmentProfile> = {
  LUXURY_ROOM: {
    name: 'LUXURY_ROOM',
    preset: 'apartment',
    backgroundIntensity: 0.5,
    envMapIntensity: 1.2,
    lightIntensity: 1.5,
    groundColor: '#444444',
    skyColor: '#ffffff',
    ambientIntensity: 0.4,
  },
  DARK_STUDIO: {
    name: 'DARK_STUDIO',
    preset: 'studio',
    backgroundIntensity: 0.1,
    envMapIntensity: 0.8,
    lightIntensity: 1.0,
    groundColor: '#111111',
    skyColor: '#333333',
    ambientIntensity: 0.2,
  },
  ROYAL_ROOM: {
    name: 'ROYAL_ROOM',
    preset: 'lobby',
    backgroundIntensity: 0.6,
    envMapIntensity: 1.5,
    lightIntensity: 1.8,
    groundColor: '#553322',
    skyColor: '#ffddaa',
    ambientIntensity: 0.5,
  },
  MODERN_HOME: {
    name: 'MODERN_HOME',
    preset: 'city',
    backgroundIntensity: 0.8,
    envMapIntensity: 1.0,
    lightIntensity: 1.2,
    groundColor: '#cccccc',
    skyColor: '#eeeeee',
    ambientIntensity: 0.6,
  },
  TOURNAMENT_HALL: {
    name: 'TOURNAMENT_HALL',
    preset: 'warehouse',
    backgroundIntensity: 0.4,
    envMapIntensity: 1.1,
    lightIntensity: 2.0,
    groundColor: '#222222',
    skyColor: '#ddddff',
    ambientIntensity: 0.7,
  }
};

export function useEnvironmentProfile() {
  const profileName = useCarromStore(state => state.environmentProfile);
  return ENVIRONMENT_PROFILES[profileName] || ENVIRONMENT_PROFILES.LUXURY_ROOM;
}

export function CarromEnvironmentSystem() {
  const profile = useEnvironmentProfile();
  
  return (
    <Environment 
      preset={profile.preset} 
      environmentIntensity={profile.envMapIntensity}
      background={false}
    />
  );
}
