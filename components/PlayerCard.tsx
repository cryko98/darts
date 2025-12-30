
import React from 'react';
import { Player } from '../types';

interface PlayerCardProps {
  player: Player;
  isActive: boolean;
  isWinner: boolean;
}

const PlayerCard: React.FC<PlayerCardProps> = ({ player, isActive, isWinner }) => {
  return (
    <div className={`relative p-6 rounded-2xl transition-all duration-300 border-2 ${
      isActive 
        ? 'bg-slate-800 border-emerald-500 scale-105 shadow-[0_0_20px_rgba(16,185,129,0.3)]' 
        : 'bg-slate-900/50 border-slate-700 opacity-80'
    } ${isWinner ? 'bg-amber-900/40 border-amber-500 shadow-[0_0_25px_rgba(245,158,11,0.4)]' : ''}`}>
      
      {isWinner && (
        <div className="absolute -top-4 -left-4 bg-amber-500 text-black font-bold px-3 py-1 rounded-lg text-sm shadow-lg rotate-[-10deg]">
          GYŐZTES! 🏆
        </div>
      )}

      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xl font-bold text-slate-100">{player.name}</h3>
          <p className="text-slate-400 text-xs">Átlag: {player.avg.toFixed(1)}</p>
        </div>
        <div className="text-right">
          <span className="text-4xl font-display font-bold text-white tracking-tighter">
            {player.score}
          </span>
          <p className="text-slate-500 text-[10px] uppercase tracking-widest font-bold">Pont</p>
        </div>
      </div>

      <div className="flex gap-2">
        {[0, 1, 2].map((i) => (
          <div 
            key={i} 
            className={`flex-1 h-10 flex items-center justify-center rounded-lg border text-sm font-bold ${
              isActive && player.lastTurnScores[i] !== undefined
                ? 'bg-slate-700 border-slate-500 text-emerald-400'
                : 'bg-slate-800/50 border-slate-700/50 text-slate-600'
            }`}
          >
            {player.lastTurnScores[i] !== undefined ? player.lastTurnScores[i] : '-'}
          </div>
        ))}
      </div>
    </div>
  );
};

export default PlayerCard;
