import React from 'react';
import { COMMAND_LIST } from '../constants';

interface QuickCommandsProps {
    onSelect: (cmd: string) => void;
    visible: boolean;
}

export const QuickCommands: React.FC<QuickCommandsProps> = React.memo(({ onSelect, visible }) => {
    if (!visible) return null;

    return (
        <div className="absolute bottom-full left-0 right-0 mb-2 px-3 animate-slide-up">
            <div className="max-w-3xl mx-auto bg-zinc-900/95 backdrop-blur-xl border border-zinc-800/60 rounded-2xl p-1.5 shadow-2xl">
                <div className="flex gap-1 overflow-x-auto no-scrollbar">
                    {COMMAND_LIST.map((c) => (
                        <button
                            key={c.cmd}
                            onClick={() => onSelect(c.cmd + ' ')}
                            className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl bg-zinc-800/40 hover:bg-zinc-700/40 border border-zinc-700/30 transition-all duration-150 active:scale-90 whitespace-nowrap group"
                        >
                            <span className="text-sm group-hover:scale-110 transition-transform duration-150">{c.icon}</span>
                            <span className="text-[11px] font-bold text-zinc-400 font-mono">{c.cmd}</span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
});

QuickCommands.displayName = 'QuickCommands';
