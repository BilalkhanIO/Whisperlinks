import React from 'react';
import { ChatLanguage } from '../types';
import { LANGUAGES } from '../constants';

interface LanguagePickerProps {
    selected: ChatLanguage;
    onSelect: (lang: ChatLanguage) => void;
    compact?: boolean;
}

export const LanguagePicker: React.FC<LanguagePickerProps> = React.memo(({ selected, onSelect, compact = false }) => {
    if (compact) {
        return (
            <div className="flex gap-0.5 overflow-x-auto no-scrollbar">
                {LANGUAGES.map((l) => (
                    <button
                        key={l.key}
                        onClick={() => onSelect(l.key)}
                        className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-all duration-150 active:scale-90
              ${selected === l.key
                                ? 'bg-white/10 text-white font-bold ring-1 ring-white/10'
                                : 'text-zinc-600 hover:text-zinc-400 hover:bg-white/5'}`}
                    >
                        <span className="text-sm leading-none">{l.flag}</span>
                    </button>
                ))}
            </div>
        );
    }

    return (
        <div className="flex gap-1.5 flex-wrap justify-center">
            {LANGUAGES.map((l) => (
                <button
                    key={l.key}
                    onClick={() => onSelect(l.key)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all duration-150 active:scale-90 border
            ${selected === l.key
                            ? 'bg-white/10 border-white/20 text-white shadow-lg ring-1 ring-white/5'
                            : 'bg-zinc-900/40 border-zinc-800/40 text-zinc-500 hover:border-zinc-600 hover:text-zinc-400'}`}
                >
                    <span className="text-base leading-none">{l.flag}</span>
                    <span className="text-[11px] font-bold">{l.label}</span>
                </button>
            ))}
        </div>
    );
});

LanguagePicker.displayName = 'LanguagePicker';
