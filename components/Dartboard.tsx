
import React from 'react';
import { BOARD_SEGMENTS, COLORS } from '../constants';
import { DartHit } from '../types';

interface DartboardProps {
  onHit: (hit: DartHit) => void;
}

const Dartboard: React.FC<DartboardProps> = ({ onHit }) => {
  // Ultra-large size for professional feel and easy clicking
  const size = 700;
  const center = size / 2;
  const radius = size * 0.42;

  const getCoordinates = (angle: number, r: number) => {
    const rad = (angle - 90) * (Math.PI / 180);
    return {
      x: center + r * Math.cos(rad),
      y: center + r * Math.sin(rad)
    };
  };

  const renderSegment = (value: number, index: number) => {
    const angleWidth = 18;
    const startAngle = index * angleWidth - angleWidth / 2;
    const endAngle = startAngle + angleWidth;
    
    const colors = index % 2 === 0 
      ? { main: COLORS.black, special: COLORS.red } 
      : { main: COLORS.white, special: COLORS.green };

    const createPath = (rStart: number, rEnd: number) => {
      const p1 = getCoordinates(startAngle, rStart);
      const p2 = getCoordinates(endAngle, rStart);
      const p3 = getCoordinates(endAngle, rEnd);
      const p4 = getCoordinates(startAngle, rEnd);
      return `M ${p1.x} ${p1.y} A ${rStart} ${rStart} 0 0 1 ${p2.x} ${p2.y} L ${p3.x} ${p3.y} A ${rEnd} ${rEnd} 0 0 0 ${p4.x} ${p4.y} Z`;
    };

    return (
      <g key={value} className="segment-group cursor-pointer transition-all duration-200 hover:brightness-125">
        {/* Outer Double Ring */}
        <path 
          d={createPath(radius * 0.92, radius * 1)} 
          fill={colors.special} 
          className="hover:stroke-white stroke-1"
          onClick={() => onHit({ value, multiplier: 2, label: `D${value}` })}
        />
        {/* Single Outer */}
        <path 
          d={createPath(radius * 0.58, radius * 0.92)} 
          fill={colors.main} 
          className="hover:stroke-white/30 stroke-1"
          onClick={() => onHit({ value, multiplier: 1, label: `${value}` })}
        />
        {/* Triple Ring */}
        <path 
          d={createPath(radius * 0.50, radius * 0.58)} 
          fill={colors.special} 
          className="hover:stroke-white stroke-1"
          onClick={() => onHit({ value, multiplier: 3, label: `T${value}` })}
        />
        {/* Single Inner */}
        <path 
          d={createPath(radius * 0.08, radius * 0.50)} 
          fill={colors.main} 
          className="hover:stroke-white/30 stroke-1"
          onClick={() => onHit({ value, multiplier: 1, label: `${value}` })}
        />
        {/* Larger Text Labels */}
        <text
          x={getCoordinates(index * angleWidth, radius * 1.1).x}
          y={getCoordinates(index * angleWidth, radius * 1.1).y}
          fill="#cbd5e1"
          fontSize="32"
          fontWeight="bold"
          textAnchor="middle"
          alignmentBaseline="middle"
          className="pointer-events-none font-display tracking-tighter"
        >
          {value}
        </text>
      </g>
    );
  };

  return (
    <div className="relative flex flex-col items-center gap-6 select-none w-full max-w-full">
      <div className="w-full flex justify-center overflow-visible py-4">
        <svg 
          width="100%" 
          height="100%" 
          viewBox={`0 0 ${size} ${size}`} 
          className="drop-shadow-[0_25px_50px_rgba(0,0,0,0.8)] max-w-[700px] aspect-square"
          style={{ filter: 'drop-shadow(0 0 10px rgba(0,0,0,0.5))' }}
        >
          {/* Background circle */}
          <circle cx={center} cy={center} r={radius * 1.25} fill="#0f172a" stroke="#1e293b" strokeWidth="2" />
          <circle cx={center} cy={center} r={radius * 1.18} fill="#111" />
          
          <g>
            {BOARD_SEGMENTS.map((val, i) => renderSegment(val, i))}
            
            {/* Outer Bull */}
            <circle 
              cx={center} cy={center} r={radius * 0.08} 
              fill={COLORS.green} 
              className="cursor-pointer hover:brightness-125 stroke-white/20 stroke-1"
              onClick={() => onHit({ value: 25, multiplier: 1, label: 'BULL' })}
            />
            {/* Inner Bull (Double) */}
            <circle 
              cx={center} cy={center} r={radius * 0.04} 
              fill={COLORS.red} 
              className="cursor-pointer hover:brightness-150 stroke-white/40 stroke-1"
              onClick={() => onHit({ value: 25, multiplier: 2, label: 'D-BULL' })}
            />
          </g>
        </svg>
      </div>
      
      <button 
        onClick={() => onHit({ value: 0, multiplier: 1, label: 'MISS' })}
        className="w-full max-w-md py-6 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl font-bold text-2xl border-2 border-slate-600 transition-all active:scale-95 shadow-xl hover:shadow-slate-900/50"
      >
        Mellédobás (0)
      </button>
    </div>
  );
};

export default Dartboard;
