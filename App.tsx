
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Player, GameState, DartHit } from './types';
import Setup from './components/Setup';
import Dartboard from './components/Dartboard';
import PlayerCard from './components/PlayerCard';
import { getCheckoutAdvice } from './services/geminiService';
import { GoogleGenAI, Modality, Type, FunctionDeclaration, LiveServerMessage } from "@google/genai";

// Audio utility functions
function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

function createBlob(data: Float32Array): { data: string, mimeType: string } {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>({
    players: [],
    currentPlayerIndex: 0,
    currentTurnThrows: [],
    status: 'setup',
    winner: null,
    startingScore: 501
  });

  const [coachAdvice, setCoachAdvice] = useState<string>('');
  const [loadingAdvice, setLoadingAdvice] = useState(false);
  const [isListening, setIsListening] = useState(false);
  
  const activePlayer = gameState.players[gameState.currentPlayerIndex];
  const activePlayerNameRef = useRef(activePlayer?.name || '');
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const sessionRef = useRef<any>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const isPendingRef = useRef(false);

  useEffect(() => {
    activePlayerNameRef.current = activePlayer?.name || '';
  }, [activePlayer?.name]);

  const handleHit = useCallback((hit: DartHit | { value: number, multiplier: number }) => {
    setGameState(prev => {
      if (prev.status !== 'playing') return prev;
      
      const activeIdx = prev.currentPlayerIndex;
      const player = prev.players[activeIdx];
      const points = hit.value * (hit.multiplier || 1);
      const newScore = player.score - points;
      
      let bust = false;
      if (newScore < 0 || newScore === 1) bust = true;

      const updatedPlayers = [...prev.players];
      const playerToUpdate = { ...player };

      if (newScore === 0) {
        playerToUpdate.score = 0;
        playerToUpdate.lastTurnScores = [...prev.currentTurnThrows, points];
        playerToUpdate.dartsThrown += playerToUpdate.lastTurnScores.length;
        playerToUpdate.history.push(...playerToUpdate.lastTurnScores);
        playerToUpdate.avg = (prev.startingScore / playerToUpdate.dartsThrown) * 3;
        updatedPlayers[activeIdx] = playerToUpdate;
        return { ...prev, players: updatedPlayers, status: 'finished', winner: playerToUpdate };
      }

      if (bust) {
        playerToUpdate.lastTurnScores = [...prev.currentTurnThrows, 0];
        playerToUpdate.dartsThrown += 3;
        playerToUpdate.history.push(0);
        updatedPlayers[activeIdx] = playerToUpdate;
        return {
          ...prev,
          players: updatedPlayers,
          currentPlayerIndex: (activeIdx + 1) % prev.players.length,
          currentTurnThrows: []
        };
      }

      const newThrows = [...prev.currentTurnThrows, points];
      playerToUpdate.score = newScore;
      
      if (newThrows.length === 3) {
        playerToUpdate.lastTurnScores = newThrows;
        playerToUpdate.dartsThrown += 3;
        playerToUpdate.history.push(...newThrows);
        const totalPoints = prev.startingScore - newScore;
        playerToUpdate.avg = (totalPoints / playerToUpdate.dartsThrown) * 3;
        updatedPlayers[activeIdx] = playerToUpdate;
        return {
          ...prev,
          players: updatedPlayers,
          currentPlayerIndex: (activeIdx + 1) % prev.players.length,
          currentTurnThrows: []
        };
      } else {
        playerToUpdate.lastTurnScores = newThrows;
        updatedPlayers[activeIdx] = playerToUpdate;
        return { ...prev, players: updatedPlayers, currentTurnThrows: newThrows };
      }
    });
  }, []);

  useEffect(() => {
    if (gameState.status === 'playing' && activePlayer) {
      const fetchAdvice = async () => {
        setLoadingAdvice(true);
        const advice = await getCheckoutAdvice(activePlayer.score);
        setCoachAdvice(advice);
        setLoadingAdvice(false);
      };
      fetchAdvice();
    }
  }, [gameState.currentPlayerIndex, gameState.status, activePlayer?.score]);

  const startListening = async () => {
    if (isListening || isPendingRef.current) return;
    isPendingRef.current = true;
    setIsListening(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      audioContextRef.current = inputCtx;

      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      outputAudioContextRef.current = outputCtx;

      const submitScoreTool: FunctionDeclaration = {
        name: 'submitScore',
        parameters: {
          type: Type.OBJECT,
          description: 'Rögzíti a dobott pontszámot.',
          properties: {
            points: { type: Type.NUMBER, description: 'A dobott pont (0-180).' },
            playerName: { type: Type.STRING, description: 'Az elhangzott játékos neve.' }
          },
          required: ['points', 'playerName']
        }
      };

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          tools: [{ functionDeclarations: [submitScoreTool] }],
          systemInstruction: `Te egy szigorú magyar darts bíró vagy. 
A mikrofon csak akkor aktív, amikor a gombot nyomják.
FIGYELJ: Jelenleg ${activePlayerNameRef.current} dob.
CSAK akkor rögzíts pontot (submitScore), ha hallod a nevet: "${activePlayerNameRef.current}" ÉS egy számot.
Példa: "${activePlayerNameRef.current} hatvan" -> submitScore(60, "${activePlayerNameRef.current}")
Minden más esetben ne csinálj semmit.`,
        },
        callbacks: {
          onopen: () => {
            const source = inputCtx.createMediaStreamSource(stream);
            const processor = inputCtx.createScriptProcessor(4096, 1, 1);
            processorRef.current = processor;
            
            processor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              sessionPromise.then(session => {
                session.sendRealtimeInput({ media: createBlob(inputData) });
              });
            };
            source.connect(processor);
            processor.connect(inputCtx.destination);
            isPendingRef.current = false;
          },
          onmessage: async (msg: LiveServerMessage) => {
            const base64Audio = msg.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio && outputCtx) {
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
              const audioBuffer = await decodeAudioData(decode(base64Audio), outputCtx, 24000, 1);
              const source = outputCtx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(outputCtx.destination);
              source.addEventListener('ended', () => sourcesRef.current.delete(source));
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              sourcesRef.current.add(source);
            }

            if (msg.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => s.stop());
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }

            if (msg.toolCall) {
              for (const fc of msg.toolCall.functionCalls) {
                if (fc.name === 'submitScore') {
                  const p = Number(fc.args.points);
                  const n = String(fc.args.playerName).toLowerCase().trim();
                  const currentActive = activePlayerNameRef.current.toLowerCase().trim();

                  if (!isNaN(p) && n === currentActive) {
                    handleHit({ value: p, multiplier: 1 });
                  }
                  
                  sessionPromise.then(s => s.sendToolResponse({
                    functionResponses: { id: fc.id, name: fc.name, response: { result: "ok" } }
                  }));
                }
              }
            }
          },
          onclose: () => {
            setIsListening(false);
            isPendingRef.current = false;
          },
          onerror: () => {
            setIsListening(false);
            isPendingRef.current = false;
          }
        }
      });
      sessionRef.current = await sessionPromise;
    } catch (err) {
      console.error("Mic error:", err);
      setIsListening(false);
      isPendingRef.current = false;
    }
  };

  const stopListening = () => {
    setIsListening(false);
    isPendingRef.current = false;
    
    if (sessionRef.current) {
      sessionRef.current.close();
      sessionRef.current = null;
    }
    
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    if (outputAudioContextRef.current) {
      outputAudioContextRef.current.close();
      outputAudioContextRef.current = null;
    }
    
    nextStartTimeRef.current = 0;
    sourcesRef.current.forEach(s => {
      try { s.stop(); } catch(e) {}
    });
    sourcesRef.current.clear();
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    startListening();
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    stopListening();
  };

  const startGame = (playerNames: string[], score: number) => {
    const initialPlayers: Player[] = playerNames.map((name, idx) => ({
      id: `p-${idx}`,
      name,
      score: score,
      history: [],
      avg: 0,
      dartsThrown: 0,
      lastTurnScores: []
    }));

    setGameState({
      players: initialPlayers,
      currentPlayerIndex: 0,
      currentTurnThrows: [],
      status: 'playing',
      winner: null,
      startingScore: score
    });
  };

  const resetGame = () => {
    stopListening();
    setGameState(prev => ({ ...prev, status: 'setup', players: [], winner: null }));
  };

  if (gameState.status === 'setup') {
    return <Setup onStart={startGame} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 p-4 md:p-8">
      <div className="max-w-[1600px] mx-auto flex flex-col lg:flex-row gap-8">
        
        <div className="w-full lg:w-1/3 flex flex-col gap-6">
          <div className="flex justify-between items-end">
            <div>
              <h1 className="text-3xl font-display text-white tracking-widest">DARTS PRO</h1>
              <p className="text-slate-400 text-sm">Magyar Pontszámláló</p>
            </div>
            <button 
              onClick={resetGame}
              className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-sm hover:bg-slate-700 border border-slate-700 transition-colors"
            >
              Új játék
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {gameState.players.map((p, idx) => (
              <PlayerCard 
                key={p.id} 
                player={p} 
                isActive={gameState.currentPlayerIndex === idx && gameState.status === 'playing'} 
                isWinner={gameState.winner?.id === p.id}
              />
            ))}
          </div>

          {/* Improved Push-to-Talk Mic Button */}
          <div className="flex flex-col items-center gap-4 bg-slate-900/50 p-8 rounded-[2rem] border border-slate-800 select-none">
            <button
              onPointerDown={handlePointerDown}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              onContextMenu={(e) => e.preventDefault()}
              className={`relative w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 transform active:scale-95 touch-none select-none ${
                isListening 
                  ? 'bg-red-600 shadow-[0_0_40px_rgba(220,38,38,0.6)]' 
                  : 'bg-slate-800 hover:bg-slate-700 shadow-xl border-4 border-slate-700'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-white pointer-events-none">
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                <line x1="12" y1="19" x2="12" y2="22"/>
              </svg>
              {isListening && (
                <div className="absolute -inset-4 border-4 border-red-500/30 rounded-full animate-ping pointer-events-none"></div>
              )}
            </button>
            <div className="text-center">
              <p className={`font-bold tracking-wider uppercase text-sm ${isListening ? 'text-red-400' : 'text-slate-500'}`}>
                {isListening ? 'HALLGATÓZOM...' : 'TARTSD NYOMVA A BESZÉDHEZ'}
              </p>
              <p className="text-[11px] text-slate-500 mt-2 italic max-w-[200px]">
                "Mondd pl: <span className="text-slate-300">{activePlayerNameRef.current} hatvan</span>"
              </p>
            </div>
          </div>

          <div className="bg-emerald-950/20 border border-emerald-900/30 p-6 rounded-3xl">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 bg-emerald-500/20 rounded-full flex items-center justify-center text-emerald-500">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              </div>
              <h4 className="font-bold text-emerald-500/80 uppercase text-xs tracking-widest">AI Edző</h4>
            </div>
            <p className={`text-slate-300 text-sm leading-relaxed transition-opacity ${loadingAdvice ? 'opacity-50' : 'opacity-100'}`}>
              {coachAdvice || 'Várakozás...'}
            </p>
          </div>
        </div>

        <div className="w-full lg:w-2/3 flex flex-col items-center justify-center bg-slate-900/40 rounded-[2.5rem] p-4 md:p-12 border border-slate-800/60 shadow-inner overflow-hidden min-h-[800px]">
          {gameState.status === 'playing' ? (
            <div className="w-full flex flex-col items-center max-w-[800px]">
              <div className="mb-12 text-center">
                <p className="text-slate-500 uppercase text-xs tracking-[0.4em] font-bold mb-3 opacity-60">Aktuális Játékos</p>
                <h2 className="text-6xl font-bold text-white tracking-tight drop-shadow-lg">{activePlayer?.name}</h2>
              </div>
              <Dartboard onHit={handleHit} />
            </div>
          ) : (
            <div className="text-center space-y-8 py-12">
              <div className="text-9xl mb-6 drop-shadow-2xl">🏆</div>
              <h2 className="text-7xl font-bold text-white tracking-tight">NYERTES: {gameState.winner?.name}!</h2>
              <p className="text-slate-400 text-2xl max-w-md mx-auto">Micsoda mérkőzés! Gratulálunk!</p>
              <button 
                onClick={resetGame}
                className="px-16 py-6 bg-emerald-600 hover:bg-emerald-500 text-white rounded-3xl font-bold text-3xl shadow-2xl shadow-emerald-900/40 transition-all active:scale-95 transform hover:-translate-y-1"
              >
                Új mérkőzés
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default App;
