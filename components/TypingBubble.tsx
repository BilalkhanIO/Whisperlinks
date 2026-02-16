import React from 'react';

interface TypingBubbleProps {
    persona: string;
    accentHex: string;
}

export const TypingBubble: React.FC<TypingBubbleProps> = React.memo(({ persona, accentHex }) => {
    return (
        <div className="flex w-full mb-2.5 justify-start animate-fade-in">
            <div className="flex flex-row gap-2 items-center">
                <div className="w-7 h-7 rounded-full bg-neon-purple/15 flex items-center justify-center shrink-0 border border-neon-purple/20">
                    <div className="flex gap-[3px]">
                        <span className="w-[3px] h-[3px] rounded-full bg-neon-purple animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-[3px] h-[3px] rounded-full bg-neon-purple animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-[3px] h-[3px] rounded-full bg-neon-purple animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                </div>
                <div className="bg-void-dark/80 border border-void-gray/40 rounded-2xl rounded-tl-md px-3.5 py-2 backdrop-blur-sm">
                    <div className="flex gap-1 items-center">
                        <div className="flex gap-[3px]">
                            <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ backgroundColor: accentHex, animationDelay: '0ms' }} />
                            <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ backgroundColor: accentHex, animationDelay: '150ms' }} />
                            <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ backgroundColor: accentHex, animationDelay: '300ms' }} />
                        </div>
                        <span className="text-[10px] text-zinc-600 font-mono ml-1.5">{persona}</span>
                    </div>
                </div>
            </div>
        </div>
    );
});

TypingBubble.displayName = 'TypingBubble';
