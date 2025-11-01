import { useEffect } from 'react';

export type EmotionalState = 'idle' | 'thinking' | 'responding';

interface AiDeveloperPanelProps {
  onEmotionalStateChange?: (state: EmotionalState) => void;
}

export default function AiDeveloperPanel({
  onEmotionalStateChange,
}: AiDeveloperPanelProps) {
  useEffect(() => {
    onEmotionalStateChange?.('idle');
  }, [onEmotionalStateChange]);

  return <div>AI Developer Panel Ready</div>;
}
