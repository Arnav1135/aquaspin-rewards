import React from 'react';
import { CrashGame } from '@/games/crash/CrashGame';

export const CrashGamePage: React.FC = () => {
    return (
        <div style={{ width: '100%', height: '100vh', overflow: 'hidden' }}>
            <CrashGame />
        </div>
    );
};
