'use client';

import { useEffect, useState } from 'react';
import { Brain, Loader2 } from 'lucide-react';

interface ProcessingViewProps {
  totalRows: number;
}

export default function ProcessingView({ totalRows }: ProcessingViewProps) {
  const [dots, setDots] = useState('');
  const [elapsed, setElapsed] = useState(0);

  // Animate dots
  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? '' : prev + '.'));
    }, 500);
    return () => clearInterval(interval);
  }, []);

  // Elapsed timer so the user knows the request is live
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const batchCount = Math.ceil(totalRows / 10);

  return (
    <div className="w-full max-w-2xl mx-auto text-center space-y-8">
      {/* Animated brain icon */}
      <div className="flex justify-center">
        <div className="relative">
          {/* Outer pulse rings */}
          <div className="absolute inset-0 rounded-full bg-violet-500/20 animate-ping" />
          <div
            className="absolute inset-[-8px] rounded-full bg-violet-500/10 animate-ping"
            style={{ animationDelay: '0.3s' }}
          />
          <div className="relative w-24 h-24 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-full flex items-center justify-center shadow-xl shadow-violet-500/40">
            <Brain className="w-12 h-12 text-white" />
          </div>
        </div>
      </div>

      {/* Title */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">
          AI Processing{dots}
        </h2>
        <p className="text-slate-400">
          Llama 3.3 is intelligently mapping{' '}
          <span className="text-violet-400 font-semibold">{totalRows} rows</span> to CRM fields
        </p>
      </div>

      {/* Live status card */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-5">
        {/* Current action */}
        <div className="flex items-center gap-3 text-sm">
          <Loader2 className="w-4 h-4 text-violet-400 animate-spin flex-shrink-0" />
          <span className="text-slate-300 text-left">
            Extracting CRM fields from your data using AI{dots}
          </span>
        </div>

        {/* Indeterminate progress bar */}
        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full animate-progress-indeterminate" />
        </div>

        {/* Elapsed time */}
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>Time elapsed: {elapsed}s</span>
          <span>Please wait — do not close this tab</span>
        </div>
      </div>

      {/* Batch info */}
      <p className="text-slate-500 text-sm">
        Processing <span className="text-violet-400">{totalRows} rows</span> in{' '}
        <span className="text-violet-400">{batchCount} batch{batchCount !== 1 ? 'es' : ''}</span> of 10 ·{' '}
        Retries enabled · Using <span className="text-violet-400">Llama 3.3 70B</span> via Groq
      </p>
    </div>
  );
}
