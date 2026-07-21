import React from 'react';
import { KnifeGame } from '@/games/knifethrower/KnifeGame';

export const KnifeHitGamePage: React.FC = () => {
    return (
        <div className="w-full h-screen bg-black overflow-hidden relative">
            <KnifeGame />
        </div>
    );
};
