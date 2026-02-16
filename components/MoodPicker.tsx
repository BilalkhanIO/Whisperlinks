import React from 'react';
import { ChatMood } from '../types';
import { MOODS } from '../constants';

interface MoodPickerProps {
    selected: ChatMood;
    onSelect: (mood: ChatMood) => void;
    compact?: boolean;
}

export const MoodPicker: React.FC<MoodPickerProps> = React.memo(({ selected, onSelect, compact = false }) => {
    if (compact) {
        return (
            <div className="flex gap-1 overflow-x-auto no-scrollbar py-0.5">
                {MOODS.map((m) => {
                    const isActive = selected === m.key;
                    return (
                        <button
                            key={m.key}
                            onClick={() => onSelect(m.key)}
                            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap transition-all duration-200 active:scale-90 border
                ${isActive ? 'text-white' : 'bg-zinc-900/50 border-zinc-800/50 text-zinc-500 hover:border-zinc-600 hover:text-zinc-400'}`}
                            style={isActive ? {
                                borderColor: `${m.accentHex}60`,
                                backgroundColor: `${m.accentHex}18`,
                                boxShadow: `0 0 16px ${m.accentHex}12`,
                                color: m.accentHex
                            } : undefined}
                        >
                            <span className="text-sm">{m.icon}</span>
                            <span>{m.persona}</span>
                        </button>
                    );
                })}
            </div>
        );
    }

    return (
        <div className="grid grid-cols-5 gap-1.5 w-full max-w-md">
            {MOODS.map((m) => {
                const isActive = selected === m.key;
                return (
                    <button
                        key={m.key}
                        onClick={() => onSelect(m.key)}
                        className={`flex flex-col items-center justify-center p-2.5 rounded-xl transition-all duration-200 active:scale-90 border relative overflow-hidden group
              ${isActive ? 'scale-[1.03]' : 'bg-zinc-900/40 border-zinc-800/40 text-zinc-500 hover:border-zinc-600 hover:text-zinc-400'}`}
                        style={isActive ? {
                            borderColor: `${m.accentHex}50`,
                            backgroundColor: `${m.accentHex}12`,
                            boxShadow: `0 0 24px ${m.accentHex}15, inset 0 0 20px ${m.accentHex}06`,
                            color: m.accentHex
                        } : undefined}
                    >
                        {isActive && (
                            <div className="absolute inset-0 opacity-8" style={{ background: `radial-gradient(circle at center, ${m.accentHex}, transparent 65%)` }} />
                        )}
                        <span className="text-lg mb-0.5 relative z-10 group-hover:scale-110 transition-transform duration-150">{m.icon}</span>
                        <span className="text-[9px] font-bold relative z-10 tracking-wide">{m.name}</span>
                    </button>
                );
            })}
        </div>
    );
});

MoodPicker.displayName = 'MoodPicker';
