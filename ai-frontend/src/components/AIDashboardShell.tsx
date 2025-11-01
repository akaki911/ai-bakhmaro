// @ts-nocheck
import React, { Suspense, lazy } from 'react';

import { AIModeProvider } from '../contexts/AIModeContext';
import { AssistantModeProvider } from '../contexts/AssistantModeContext';
import { PermissionsProvider } from '../contexts/PermissionsContext';
import { FilePreviewProvider } from '../contexts/FilePreviewProvider';

const AiDeveloperPanel = lazy(() => import('./AiDeveloperPanel'));
const FilePreview = lazy(() => import('./FilePreview'));

const PanelFallback: React.FC<{ label?: string; detail?: string }> = ({
  label = 'AI პანელი იტვირთება…',
  detail = 'ტულინგის და ფაილების მოდულები მზადდება.'
}) => {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#050914] text-slate-200">
      <div
        aria-hidden="true"
        className="mb-6 h-12 w-12 animate-spin rounded-full border-4 border-cyan-400/40 border-t-transparent"
      />
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-200/80">{label}</p>
      <p className="mt-3 max-w-xs text-center text-sm text-slate-400">{detail}</p>
    </div>
  );
};

const AIDashboardShell: React.FC = () => {
  return (
    <AIModeProvider>
      <AssistantModeProvider>
        <PermissionsProvider>
          <FilePreviewProvider>
            <Suspense
              fallback={
                <PanelFallback label="AI Developer პანელი" detail="კონტექსტი და ფაილების პრევიუ ინიციალიზდება." />
              }
            >
              <AiDeveloperPanel />
            </Suspense>
            <Suspense fallback={null}>
              <FilePreview />
            </Suspense>
          </FilePreviewProvider>
        </PermissionsProvider>
      </AssistantModeProvider>
    </AIModeProvider>
  );
};

export default AIDashboardShell;
