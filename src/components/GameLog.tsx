
import React, { useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';

interface Message {
  role: 'ai' | 'user';
  text: string;
}

interface Props {
  messages: Message[];
  isLoading: boolean;
}

const GameLog: React.FC<Props> = ({ messages, isLoading }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 custom-scrollbar bg-slate-900/95 relative">
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none opacity-5 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-amber-900 via-slate-900 to-slate-900"></div>
      
      {messages.map((msg, idx) => (
        <div
          key={idx}
          className={`flex flex-col ${
            msg.role === 'user' ? 'items-end' : 'items-start'
          }`}
        >
          <div
            className={`max-w-[90%] md:max-w-[75%] rounded-lg p-4 shadow-lg text-lg leading-relaxed border ${
              msg.role === 'user'
                ? 'bg-slate-800 border-slate-600 text-slate-200'
                : 'bg-black/40 border-slate-700 text-amber-100/90 font-serif'
            }`}
          >
            {msg.role === 'user' ? (
              <p>{msg.text}</p>
            ) : (
              <ReactMarkdown 
                components={{
                    strong: ({node, ...props}) => <span className="text-amber-400 font-bold" {...props} />,
                    em: ({node, ...props}) => <span className="text-cyan-300 not-italic" {...props} />,
                    blockquote: ({node, ...props}) => (
                        <div className="border-l-4 border-amber-600 pl-4 my-2 italic bg-slate-900/50 p-2 rounded text-slate-300">
                            {props.children}
                        </div>
                    ),
                    code: ({node, ...props}) => (
                         <span className="bg-slate-800 text-amber-200 px-1 rounded text-sm font-mono border border-slate-700" {...props} />
                    )
                }}
              >
                {msg.text}
              </ReactMarkdown>
            )}
          </div>
          <span className="text-xs text-slate-500 mt-1 px-1 uppercase tracking-wider">
            {msg.role === 'user' ? '플레이어' : '게임 마스터'}
          </span>
        </div>
      ))}

      {isLoading && (
        <div className="flex items-center space-x-2 text-amber-500/50 animate-pulse p-4">
          <div className="w-2 h-2 bg-current rounded-full"></div>
          <div className="w-2 h-2 bg-current rounded-full delay-75"></div>
          <div className="w-2 h-2 bg-current rounded-full delay-150"></div>
          <span className="text-sm font-cinzel ml-2">운명을 자아내는 중...</span>
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
};

export default GameLog;
