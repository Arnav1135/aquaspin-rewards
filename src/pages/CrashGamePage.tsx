import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CrashGame } from '@/components/games/CrashGame';
import { GameShell } from '@/components/games/GameShell';

export const CrashGamePage: React.FC = () => {
    const navigate = useNavigate();
    return (
        <GameShell onClose={() => navigate('/')}>
            <CrashGame onClose={() => navigate('/')} />
        </GameShell>
    );
};
