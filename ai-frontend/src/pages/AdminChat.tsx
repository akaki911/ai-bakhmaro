// SOL-947 — Emotional Gurulo Chat UI
import { useMemo, useState, type CSSProperties } from 'react';
import { motion } from 'framer-motion';
import {
  Terminal,
  FolderTree,
  Sparkles,
  ScrollText,
  Github,
  SlidersHorizontal,
} from 'lucide-react';

import ReplitAssistantPanel, {
  type EmotionalState,
} from '../components/ReplitAssistantPanel';

const animationKeyframes = `
@keyframes gradient-wave {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

@keyframes pulse-breath {
  0%, 100% { transform: scale(1); opacity: 0.88; }
  50% { transform: scale(1.03); opacity: 1; }
}

@keyframes aurora-drift {
  0% { transform: translate3d(-6%, -4%, 0) rotate(-1deg); }
  50% { transform: translate3d(8%, 6%, 0) rotate(2deg); }
  100% { transform: translate3d(-6%, -4%, 0) rotate(-1deg); }
}

@keyframes aurora-pulse {
  0%, 100% { opacity: 0.55; filter: blur(120px); }
  50% { opacity: 0.85; filter: blur(140px); }
}`;

const NAV_ITEMS = [
  { label: 'Console', icon: Terminal },
  { label: 'Files', icon: FolderTree },
  { label: 'Auto-Improve', icon: Sparkles },
  { label: 'Logs', icon: ScrollText },
  { label: 'GitHub', icon: Github },
  { label: 'Parameters', icon: SlidersHorizontal },
];

const gradientStyles: Record<EmotionalState, CSSProperties> = {
  // Calm idle = deep purple to navy gradient, Thinking = teal/pink waves, Responding = blue/violet pulse.
  idle: {
    background: 'linear-gradient(135deg, rgba(56, 26, 111, 0.92) 0%, rgba(9, 20, 53, 0.94) 100%)',
    backgroundSize: '140% 140%',
  },
  thinking: {
    background:
      'linear-gradient(120deg, rgba(13, 148, 136, 0.72) 0%, rgba(244, 114, 182, 0.58) 48%, rgba(39, 20, 75, 0.88) 100%)',
    backgroundSize: '180% 180%',
  },
  responding: {
    background:
      'linear-gradient(120deg, rgba(59, 130, 246, 0.9) 0%, rgba(109, 40, 217, 0.85) 55%, rgba(147, 51, 234, 0.72) 100%)',
    backgroundSize: '160% 160%',
  },
};

const gradientAnimationClass: Record<EmotionalState, string> = {
  idle: 'animate-[pulse-breath_14s_ease-in-out_infinite]',
  thinking: 'animate-[gradient-wave_12s_ease-in-out_infinite]',
  responding: 'animate-[pulse-breath_9s_ease-in-out_infinite]',
};

const auroraGradient =
  'radial-gradient(circle at 20% 20%, rgba(56, 189, 248, 0.18), transparent 55%), radial-gradient(circle at 80% 25%, rgba(244, 114, 182, 0.16), transparent 60%), radial-gradient(circle at 45% 80%, rgba(129, 140, 248, 0.18), transparent 58%)';

const AdminChat = () => {
  const [emotionalState, setEmotionalState] = useState<EmotionalState>('idle');

  const sidebarTone = useMemo(
    () =>
      emotionalState === 'idle'
        ? 'bg-white/5'
        : 'bg-gradient-to-br from-white/20 via-white/10 to-transparent',
    [emotionalState],
  );

  const handleStateChange = (state: EmotionalState) => {
    setEmotionalState(state);
  };

  return (
    <div className="relative flex min-h-screen w-full font-['Inter',_sans-serif] text-slate-100">
      <style>{animationKeyframes}</style>

      <motion.div
        key={emotionalState}
        className={`absolute inset-0 -z-20 transition-all duration-[600ms] ease-in-out ${gradientAnimationClass[emotionalState]}`}
        style={gradientStyles[emotionalState]}
        initial={{ opacity: 0.85 }}
        animate={{ opacity: 1 }}
      />

      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
        style={{ mixBlendMode: 'screen' }}
        animate={{ opacity: emotionalState === 'thinking' ? 0.85 : 0.65 }}
        transition={{ duration: 0.6, ease: 'easeInOut' }}
      >
        <motion.div
          className="absolute inset-x-0 top-1/2 h-[110%] w-[110%] -translate-y-1/2 animate-[aurora-drift_28s_ease-in-out_infinite]"
          style={{ backgroundImage: auroraGradient }}
        />
        <motion.div
          className="absolute left-1/4 top-1/3 h-[68%] w-[60%] rounded-full blur-[120px] animate-[aurora-pulse_22s_ease-in-out_infinite]"
          style={{ background: 'radial-gradient(circle, rgba(56,189,248,0.22), transparent 60%)' }}
        />
      </motion.div>

      <aside
        className={`relative z-10 flex w-56 flex-col gap-4 border-r border-white/10 px-6 py-10 backdrop-blur-xl transition-[background,box-shadow] duration-[600ms] ease-in-out ${
          emotionalState === 'idle'
            ? 'bg-slate-950/35 shadow-[0_10px_60px_rgba(8,11,30,0.35)]'
            : 'bg-slate-950/55 shadow-[0_22px_65px_rgba(40,24,94,0.45)]'
        }`}
      >
        <div className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-300/70">
            Gurulo Ops
          </span>
          <p className="text-lg font-semibold text-slate-100/90">Control Surface</p>
          <p className="text-sm text-slate-300/70">
            Emotional tone synced with Gurulo&apos;s current focus.
          </p>
        </div>

        <nav className="mt-6 flex flex-col gap-3">
          {NAV_ITEMS.map(({ label, icon: Icon }) => (
            <button
              key={label}
              type="button"
              className={`group flex items-center justify-between rounded-2xl border border-white/10 px-4 py-3 text-sm font-medium text-slate-200/80 shadow-[0_12px_30px_rgba(6,11,26,0.35)] transition-all duration-[600ms] ease-in-out hover:-translate-y-[2px] hover:border-white/30 hover:text-white hover:shadow-[0_22px_48px_rgba(88,63,233,0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 ${sidebarTone} ${
                emotionalState !== 'idle' ? 'text-left' : ''
              }`}
            >
              <span className="flex items-center gap-3">
                <Icon className="h-4 w-4 text-slate-200/70 transition-colors group-hover:text-white" />
                {label}
              </span>
              <span className="text-[10px] uppercase tracking-[0.32em] text-slate-300/60 group-hover:text-white/80">
                LIVE
              </span>
            </button>
          ))}
        </nav>
      </aside>

      <main className="relative z-10 flex flex-1 flex-col overflow-hidden px-6 py-8">
        <div className="relative flex h-full w-full flex-col overflow-hidden rounded-[28px] border border-white/10 bg-slate-900/30 shadow-[0_35px_120px_rgba(6,12,30,0.65)] backdrop-blur-[36px]">
          <div className="pointer-events-none absolute inset-0 rounded-[28px] border border-white/5" />
          <div className="relative z-10 flex h-full flex-col">
            <ReplitAssistantPanel onEmotionalStateChange={handleStateChange} />
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminChat;
