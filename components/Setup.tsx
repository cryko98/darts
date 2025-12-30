
import React, { useState } from 'react';

interface SetupProps {
  onStart: (players: string[], score: number) => void;
}

const Setup: React.FC<SetupProps> = ({ onStart }) => {
  const [playerNames, setPlayerNames] = useState(['Játékos 1', 'Játékos 2']);
  const [score, setScore] = useState(501);

  const addPlayer = () => {
    if (playerNames.length < 8) {
      setPlayerNames([...playerNames, `Játékos ${playerNames.length + 1}`]);
    }
  };

  const removePlayer = (index: number) => {
    if (playerNames.length > 1) {
      const newNames = playerNames.filter((_, i) => i !== index);
      setPlayerNames(newNames);
    }
  };

  const handleNameChange = (index: number, name: string) => {
    const newNames = [...playerNames];
    newNames[index] = name;
    setPlayerNames(newNames);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl">
        <h1 className="text-4xl font-display text-white text-center mb-2 tracking-widest">DARTS PRO</h1>
        <p className="text-slate-400 text-center mb-8">Állítsd be a mérkőzést!</p>

        <div className="space-y-6">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Kezdőpontszám</label>
            <div className="flex gap-2">
              {[301, 501, 701].map(s => (
                <button
                  key={s}
                  onClick={() => setScore(s)}
                  className={`flex-1 py-3 rounded-xl font-bold transition-all ${
                    score === s 
                    ? 'bg-emerald-600 text-white border-2 border-emerald-400' 
                    : 'bg-slate-800 text-slate-400 border-2 border-transparent hover:bg-slate-700'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Játékosok</label>
            <div className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
              {playerNames.map((name, idx) => (
                <div key={idx} className="flex gap-2">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => handleNameChange(idx, e.target.value)}
                    className="flex-1 bg-slate-800 border-2 border-slate-700 text-white px-4 py-2 rounded-xl focus:border-emerald-500 outline-none"
                    placeholder={`Játékos ${idx + 1}`}
                  />
                  <button 
                    onClick={() => removePlayer(idx)}
                    className="p-2 text-slate-500 hover:text-red-400"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                  </button>
                </div>
              ))}
            </div>
            
            <button 
              onClick={addPlayer}
              className="w-full mt-4 py-3 border-2 border-dashed border-slate-700 text-slate-500 rounded-xl hover:border-slate-500 hover:text-slate-300 transition-all font-semibold"
            >
              + Játékos hozzáadása
            </button>
          </div>

          <button 
            onClick={() => onStart(playerNames, score)}
            className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xl shadow-xl shadow-emerald-900/20 transition-all active:scale-95"
          >
            Játék indítása
          </button>
        </div>
      </div>
    </div>
  );
};

export default Setup;
