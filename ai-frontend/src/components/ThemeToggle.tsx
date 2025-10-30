
import React, { useCallback, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Sun, Moon } from 'lucide-react';
import { useDarkMode } from '../hooks/useDarkMode';

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
  onVisualChange?: (signal: ThemeToggleVisualSignal) => void;
}

export interface ThemeToggleVisualSignal {
  mode: 'dark' | 'light';
  eyeColor: 'blue' | 'gold';
}

export default function ThemeToggle({
  className = '',
  showLabel = true,
  onVisualChange,
}: ThemeToggleProps) {
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const lastVisualMode = useRef<'dark' | 'light' | null>(null);

  const emitVisualChange = useCallback(
    (mode: 'dark' | 'light') => {
      if (lastVisualMode.current === mode) {
        return;
      }

      lastVisualMode.current = mode;
      const payload: ThemeToggleVisualSignal = {
        mode,
        eyeColor: mode === 'dark' ? 'gold' : 'blue',
      };

      onVisualChange?.(payload);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent<ThemeToggleVisualSignal>('gurulo:theme-visual-toggle', {
            detail: payload,
          }),
        );
      }
    },
    [onVisualChange],
  );

  useEffect(() => {
    emitVisualChange(isDarkMode ? 'dark' : 'light');
  }, [emitVisualChange, isDarkMode]);

  const handleHaloPulse = useCallback((active: boolean) => {
    if (typeof window === 'undefined') {
      return;
    }

    window.dispatchEvent(
      new CustomEvent<{ active: boolean }>('gurulo:avatar-halo-hover', {
        detail: { active },
      }),
    );
  }, []);

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => {
        const nextMode = isDarkMode ? 'light' : 'dark';
        toggleDarkMode();
        emitVisualChange(nextMode);
      }}
      className={`admin-theme-toggle ${className}`.trim()}
      data-mode={isDarkMode ? 'dark' : 'light'}
      title={isDarkMode ? 'ნათელი რეჟიმზე გადასვლა' : 'მუქ რეჟიმზე გადასვლა'}
      aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
      onPointerEnter={() => handleHaloPulse(true)}
      onPointerLeave={() => handleHaloPulse(false)}
      onFocus={() => handleHaloPulse(true)}
      onBlur={() => handleHaloPulse(false)}
    >
      <motion.div
        className="admin-theme-toggle__icon"
        animate={{ rotate: isDarkMode ? 180 : 0 }}
        transition={{ duration: 0.3 }}
      >
        {isDarkMode ? (
          <Sun className="w-5 h-5" />
        ) : (
          <Moon className="w-5 h-5" />
        )}
      </motion.div>

      {showLabel && (
        <span className="admin-theme-toggle__label">
          {isDarkMode ? '☀️ ნათელი რეჟიმი' : '🌙 მუქი რეჟიმი'}
        </span>
      )}
    </motion.button>
  );
}
