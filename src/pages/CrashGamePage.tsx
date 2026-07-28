import React from 'react';
import { CrashGame } from '@/components/games/CrashGame';

export const CrashGamePage: React.FC = () => {
    return (
        <div style={{ width: '100%', height: '100vh', overflow: 'hidden' }}>
            <CrashGame onClose={() => {}} />
        </div>
    );
};
