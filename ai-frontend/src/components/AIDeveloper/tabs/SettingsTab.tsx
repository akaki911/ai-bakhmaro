
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Sun, Moon, Shield, RefreshCw, Trash2, ShieldCheck, AlertTriangle, Loader2, GitBranch, FileText, Plus, Save } from 'lucide-react';
import { formatTimestamp } from '../../../utils/ai-panel';
import { Switch } from '../../Switch';
import { useAssistantMode } from '../../../contexts/useAssistantMode';
import { useAuth } from '../../../contexts/useAuth';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';
import { setFeatureFlagOverride } from '@/lib/featureFlags';

interface AgentRule {
  id: string;
  title: string;
  content: string;
  isDefault: boolean;
  lastSavedAt: string | null;
  isDirty: boolean;
}

const AGENT_RULES_STORAGE_KEY = 'admin.agentsRules';
const AGENTS_GUIDELINES_STUB =
  '## Agent Guidelines\nNo default guidelines were found. Administrators can update them from the Admin UI.';

const parseAgentsMarkdown = (markdown: string): AgentRule[] => {
  if (!markdown) {
    return [];
  }

  const sectionMatches = markdown.split(/\n##\s+/g);
  const [, ...sections] = sectionMatches;

  return sections.map((section) => {
    const [headingLine, ...rest] = section.split('\n');
    const title = headingLine?.trim() ?? 'Rule';
    const content = rest.join('\n').trim();
    return {
      id: `default-${title.toLowerCase().replace(/[^a-z0-9]+/gi, '-')}`,
      title,
      content,
      isDefault: true,
      lastSavedAt: null,
      isDirty: false,
    } as AgentRule;
  });
};

const generateRuleId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `rule-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

interface SettingsTabProps {
  isDarkMode: boolean;
  setIsDarkMode: (dark: boolean) => void;
  cleanerEnabled: boolean;
  isCleaningNow: boolean;
  lastCleanup: string | null;
  onToggleCleaner: () => void;
  onManualCleanup: () => void;
  modelControls: any;
  setModelControls: (controls: any) => void;
  availableModels: any[];
  selectedModel: string | null;
  setSelectedModel: (model: string) => void;
  telemetryData: any;
}

const SettingsTab: React.FC<SettingsTabProps> = ({
  isDarkMode,
  setIsDarkMode,
  cleanerEnabled,
  isCleaningNow,
  lastCleanup,
  onToggleCleaner,
  onManualCleanup,
  modelControls,
  setModelControls,
  availableModels,
  selectedModel,
  setSelectedModel,
  telemetryData
}) => {
  const { user } = useAuth();
  const { isReadOnly, setMode, lastUpdatedAt, lastUpdatedBy, isSyncing, syncError } = useAssistantMode();
  const isPlanMode = isReadOnly;
  const planSwitchStyle = useMemo<React.CSSProperties | undefined>(() => {
    if (!isPlanMode) {
      return undefined;
    }

    return {
      '--toggle-track-background-off': 'linear-gradient(140deg, rgba(255, 214, 107, 0.2), rgba(250, 204, 21, 0.38))',
      '--toggle-track-border-off': 'rgba(251, 191, 36, 0.6)',
      '--toggle-track-shadow-off': '0 0 18px rgba(250, 204, 21, 0.32)',
      '--toggle-track-shadow-off-hover': '0 0 24px rgba(250, 204, 21, 0.45)',
      '--toggle-thumb-shadow-off': '0 4px 12px rgba(250, 204, 21, 0.35), 0 0 12px rgba(253, 224, 71, 0.45)',
      '--toggle-thumb-shadow-off-hover': '0 6px 18px rgba(250, 204, 21, 0.45), 0 0 16px rgba(253, 224, 71, 0.6)',
      '--toggle-halo-highlight': 'radial-gradient(circle at 22% 18%, rgba(255, 241, 179, 0.7), rgba(255, 197, 61, 0.12))',
    } as React.CSSProperties;
  }, [isPlanMode]);
  const isGitHubEnabled = useFeatureFlag('GITHUB');
  const gitHubSwitchStyle = useMemo<React.CSSProperties>(() => {
    if (isGitHubEnabled) {
      return {
        '--toggle-track-background-on': 'linear-gradient(140deg, rgba(124, 108, 255, 0.32), rgba(56, 189, 248, 0.28))',
        '--toggle-track-border-on': 'rgba(124, 108, 255, 0.65)',
        '--toggle-track-shadow-on': '0 0 24px rgba(124, 108, 255, 0.5), 0 0 38px rgba(99, 102, 241, 0.35)',
        '--toggle-track-shadow-on-hover': '0 0 30px rgba(124, 108, 255, 0.65), 0 0 44px rgba(99, 102, 241, 0.45)',
        '--toggle-thumb-shadow-on': '0 4px 16px rgba(129, 140, 248, 0.55), 0 0 14px rgba(196, 181, 253, 0.6)',
        '--toggle-thumb-shadow-on-hover': '0 6px 20px rgba(129, 140, 248, 0.65), 0 0 18px rgba(196, 181, 253, 0.7)',
        '--toggle-halo-highlight': 'radial-gradient(circle at 22% 18%, rgba(198, 180, 255, 0.65), rgba(124, 108, 255, 0.15))',
      } as React.CSSProperties;
    }

    return {
      '--toggle-track-border-off': 'rgba(124, 108, 255, 0.35)',
      '--toggle-track-shadow-off': '0 0 16px rgba(124, 108, 255, 0.25)',
      '--toggle-track-shadow-off-hover': '0 0 22px rgba(124, 108, 255, 0.35)',
      '--toggle-halo-highlight': 'radial-gradient(circle at 22% 18%, rgba(124, 108, 255, 0.25), rgba(124, 108, 255, 0.08))',
    } as React.CSSProperties;
  }, [isGitHubEnabled]);
  const [agentsGuidelines, setAgentsGuidelines] = useState<string>(AGENTS_GUIDELINES_STUB);
  const defaultAgentRules = useMemo(() => parseAgentsMarkdown(agentsGuidelines), [agentsGuidelines]);
  const [agentRules, setAgentRules] = useState<AgentRule[]>(defaultAgentRules);

  useEffect(() => {
    let isMounted = true;

    const loadGuidelines = async () => {
      try {
        const response = await fetch('/AGENTS.md', { credentials: 'include' });
        if (!response.ok) {
          throw new Error(`Failed to load AGENTS.md with status ${response.status}`);
        }
        const text = await response.text();
        if (isMounted) {
          setAgentsGuidelines(text);
        }
      } catch (error) {
        console.warn('Unable to load AGENTS.md guidelines, continuing with fallback copy.', error);
      }
    };

    loadGuidelines();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      const stored = window.localStorage.getItem(AGENT_RULES_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setAgentRules(
            parsed.map((rule: AgentRule) => ({
              ...rule,
              isDirty: Boolean(rule.isDirty),
            }))
          );
          return;
        }
      }
    } catch (error) {
      console.warn('Failed to load stored agent rules:', error);
    }

    setAgentRules(defaultAgentRules);
  }, [defaultAgentRules]);

  const persistAgentRules = useCallback((nextRules: AgentRule[]) => {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      window.localStorage.setItem(AGENT_RULES_STORAGE_KEY, JSON.stringify(nextRules));
    } catch (error) {
      console.warn('Failed to persist agent rules:', error);
    }
  }, []);

  const handleAgentRuleChange = useCallback(
    (id: string, field: 'title' | 'content', value: string) => {
      setAgentRules((prev) => {
        const next = prev.map((rule) =>
          rule.id === id
            ? {
                ...rule,
                [field]: value,
                isDirty: true,
              }
            : rule
        );
        persistAgentRules(next);
        return next;
      });
    },
    [persistAgentRules]
  );

  const handleSaveAgentRule = useCallback(
    (id: string) => {
      setAgentRules((prev) => {
        const next = prev.map((rule) =>
          rule.id === id
            ? {
                ...rule,
                isDirty: false,
                lastSavedAt: new Date().toISOString(),
              }
            : rule
        );
        persistAgentRules(next);
        return next;
      });
    },
    [persistAgentRules]
  );

  const handleDeleteAgentRule = useCallback(
    (id: string) => {
      setAgentRules((prev) => {
        const next = prev.filter((rule) => rule.id !== id);
        persistAgentRules(next);
        return next;
      });
    },
    [persistAgentRules]
  );

  const handleAddAgentRule = useCallback(() => {
    const newRule: AgentRule = {
      id: generateRuleId(),
      title: 'ახალი წესი',
      content: '',
      isDefault: false,
      lastSavedAt: null,
      isDirty: true,
    };

    setAgentRules((prev) => {
      const next = [...prev, newRule];
      persistAgentRules(next);
      return next;
    });
  }, [persistAgentRules]);

  const formatRuleTimestamp = useCallback((timestamp: string | null) => {
    if (!timestamp) {
      return null;
    }

    try {
      const date = new Date(timestamp);
      return date.toLocaleString();
    } catch (error) {
      console.warn('Unable to format timestamp:', error);
      return timestamp;
    }
  }, []);

  const handleGitHubToggle = useCallback(
    (checked: boolean) => {
      setFeatureFlagOverride('GITHUB', checked);
    },
    [],
  );

  const handlePlanModeChange = (checked: boolean) => {
    const nextMode = checked ? 'build' : 'plan';
    const actor = user?.email || user?.personalId || user?.id || user?.displayName || null;
    setMode(nextMode, { actor, source: 'settings' });
  };

  return (
    <div className="h-full overflow-y-auto bg-gradient-to-br from-[#0E1116]/90 via-[#1A1533]/90 to-[#351D6A]/90 px-6 py-6 text-[#E6E8EC] space-y-6">
      {/* Assistant Mode */}
      <div className="rounded-3xl border border-white/10 bg-[#0F1320]/80 p-6 backdrop-blur-2xl shadow-[0_32px_70px_rgba(5,10,30,0.6)]">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold mb-1 flex items-center gap-2">
                <ShieldCheck size={20} className={isPlanMode ? 'text-amber-300' : 'text-emerald-300'} />
                ასისტენტის რეჟიმი
              </h3>
              <p className="text-sm text-gray-400">
                მართეთ გურულოს პლან/ბილდ რეჟიმი. პარამეტრი ინახება და იცვლება მხოლოდ ამ გვერდიდან.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-xs font-semibold tracking-wide uppercase ${isPlanMode ? 'text-amber-300' : 'text-emerald-300'}`}>
                {isPlanMode ? 'Plan · Read-Only' : 'Build · Writes Enabled'}
              </span>
              <Switch
                checked={!isPlanMode}
                onCheckedChange={handlePlanModeChange}
                aria-label="Toggle assistant plan/build mode"
                style={planSwitchStyle}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs text-[#A0A4AD]">
            <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 ${
              isPlanMode
                ? 'border-amber-400/40 bg-amber-400/15 text-amber-200'
                : 'border-[#25D98E]/50 bg-[#25D98E]/10 text-[#8AF0C4]'
            }`}>
              {isPlanMode ? 'Plan რეჟიმი · ჩანაწერები დაცულია' : 'Build რეჟიმი · ავტომატური ცვლილებები დაშვებულია'}
            </div>

            {lastUpdatedAt && (
              <span>
                ბოლო ცვლილება: {formatTimestamp(lastUpdatedAt)}
                {lastUpdatedBy ? ` · ${lastUpdatedBy}` : ''}
              </span>
            )}

            {isSyncing && (
              <span className="inline-flex items-center gap-1 text-[#7C6CFF]">
                <Loader2 size={14} className="animate-spin" /> ცვლილება ინახება…
              </span>
            )}

            {syncError && (
              <span className="inline-flex items-center gap-1 text-[#E14B8E]">
                <AlertTriangle size={14} /> ვერ მოხერხდა სერვერზე შენახვა: {syncError}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Theme Settings */}
      <div className="rounded-3xl border border-white/10 bg-[#0F1320]/80 p-6 backdrop-blur-2xl shadow-[0_28px_60px_rgba(6,12,36,0.6)]">
        <h3 className="text-lg font-semibold mb-4 text-white">🎨 გარეგნობის პარამეტრები</h3>
        <div className="flex items-center justify-between text-sm">
          <span className="text-[#A0A4AD]">მუქი რეჟიმი</span>
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#151B2D]/80 px-4 py-2 font-semibold text-white transition-all duration-200 hover:border-[#7C6CFF]/60 hover:bg-[#1F2540]/80"
          >
            {isDarkMode ? <Moon size={16} /> : <Sun size={16} />}
            {isDarkMode ? 'მუქი' : 'ღია'}
          </button>
        </div>
      </div>

      {/* AGENTS.md Rules Management */}
      <div className="rounded-3xl border border-[#7C6CFF]/40 bg-[#121622]/85 p-6 backdrop-blur-2xl shadow-[0_32px_70px_rgba(8,12,40,0.55)]">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#7C6CFF]/60 bg-[#7C6CFF]/20 text-[#B4A9FF]">
              <FileText size={20} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">AGENTS.md წესები</h3>
              <p className="text-sm text-[#A0A4AD]">
                იხილეთ და განაახლეთ Gurulo/Codex-ის სამუშაო წესები პირდაპირ აქედან. ცვლილებები ადგილობრივად ინახება Admin პანელზე.
              </p>
            </div>
          </div>
          <button
            onClick={handleAddAgentRule}
            className="inline-flex items-center gap-2 rounded-xl border border-[#7C6CFF]/60 bg-[#7C6CFF]/20 px-4 py-2 text-sm font-semibold text-white transition-all duration-200 hover:border-[#7C6CFF] hover:bg-[#7C6CFF]/30"
          >
            <Plus size={16} /> ახალი წესის დამატება
          </button>
        </div>

        <div className="mt-6 space-y-4">
          {agentRules.length === 0 && (
            <div className="rounded-2xl border border-dashed border-[#7C6CFF]/50 bg-[#7C6CFF]/10 p-6 text-center text-sm text-[#C3BAFF]">
              ჯერ არც ერთი წესი არ არის შენახული. დააჭირეთ „ახალი წესის დამატება“-ს დასაწყებად.
            </div>
          )}

          {agentRules.length > 0 && (
            <div className="max-h-[60vh] overflow-y-auto pr-2">
              <div className="space-y-4">
                {agentRules.map((rule) => (
                  <div key={rule.id} className="space-y-3 rounded-2xl border border-white/10 bg-[#101628]/85 p-4 shadow-[0_20px_45px_rgba(6,12,36,0.45)]">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <input
                        value={rule.title}
                        onChange={(event) => handleAgentRuleChange(rule.id, 'title', event.target.value)}
                        className="w-full rounded-xl border border-white/10 bg-[#161D33]/80 px-3 py-2 text-sm font-semibold text-white outline-none transition focus:border-[#7C6CFF] focus:ring-0"
                        placeholder="წესის სათაური"
                      />
                      <div className="flex items-center gap-2 self-end md:self-start">
                        <button
                          onClick={() => handleSaveAgentRule(rule.id)}
                          disabled={!rule.isDirty}
                          className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition ${
                            rule.isDirty
                              ? 'border border-[#25D98E]/60 bg-[#25D98E]/20 text-[#BFF7DF] hover:border-[#25D98E] hover:bg-[#25D98E]/30'
                              : 'border border-white/10 bg-white/5 text-[#A0A4AD] opacity-70 cursor-not-allowed'
                          }`}
                        >
                          <Save size={14} /> შენახვა
                        </button>
                        <button
                          onClick={() => handleDeleteAgentRule(rule.id)}
                          className="inline-flex items-center gap-2 rounded-xl border border-[#E14B8E]/60 bg-[#E14B8E]/20 px-3 py-2 text-xs font-semibold text-white transition-all duration-200 hover:border-[#E14B8E] hover:bg-[#E14B8E]/30"
                        >
                          <Trash2 size={14} /> წაშლა
                        </button>
                      </div>
                    </div>

                    <textarea
                      value={rule.content}
                      onChange={(event) => handleAgentRuleChange(rule.id, 'content', event.target.value)}
                      className="min-h-[140px] w-full rounded-xl border border-white/10 bg-[#161D33]/70 px-3 py-2 text-sm text-[#D8DBE8] outline-none transition focus:border-[#7C6CFF] focus:ring-0"
                      placeholder="დაამატეთ წესის დეტალები"
                    />

                    <div className="flex flex-wrap items-center gap-3 text-xs text-[#A0A4AD]">
                      {rule.isDefault && (
                        <span className="rounded-full border border-[#7C6CFF]/50 bg-[#7C6CFF]/15 px-3 py-1 text-[#B4A9FF]">
                          ძირითადი დოკუმენტიდან
                        </span>
                      )}
                      {rule.isDirty && <span className="text-amber-300">რედაქტირება არ არის შენახული</span>}
                      {!rule.isDirty && formatRuleTimestamp(rule.lastSavedAt) && (
                        <span>ბოლოს შენახული: {formatRuleTimestamp(rule.lastSavedAt)}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* GitHub Integration Toggle */}
      <div className="rounded-3xl border border-white/10 bg-[#0F1320]/80 p-6 backdrop-blur-2xl shadow-[0_28px_60px_rgba(6,12,36,0.55)]">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-white">
              <GitBranch size={20} className="text-[#7C6CFF]" />
              <h3 className="text-lg font-semibold">GitHub ინტეგრაცია</h3>
            </div>
            <p className="mt-2 text-sm text-[#A0A4AD]">
              მართეთ GitHub მენეჯმენტის ჰაბზე წვდომა. ცვლილება ინახება მხოლოდ ამ ბრაუზერში და მაშინვე მოქმედებს AI Developer
              პანელზე.
            </p>
            <p className="mt-3 text-xs text-[#7C7F8F]">
              მუდმივი ჩასართავად დამატეთ <code className="rounded bg-[#121622] px-1 py-0.5 text-[10px] font-mono text-[#C8CAE2]">VITE_GITHUB_ENABLED=1</code>{' '}
              თქვენს გარემოში.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-[#A0A4AD]">{isGitHubEnabled ? 'აქტიური' : 'გათიშულია'}</span>
            <Switch
              checked={isGitHubEnabled}
              onCheckedChange={handleGitHubToggle}
              aria-label="Toggle GitHub integration"
              style={gitHubSwitchStyle}
            />
          </div>
        </div>
      </div>

      {/* AI Model Settings */}
      <div className="rounded-3xl border border-white/10 bg-[#0F1320]/80 p-6 backdrop-blur-2xl shadow-[0_28px_60px_rgba(6,12,36,0.55)]">
        <h3 className="text-lg font-semibold mb-4 text-white">🤖 AI მოდელის პარამეტრები</h3>
        <div className="space-y-4">
          {/* Model Selection */}
          <div>
            <label className="block text-sm font-medium mb-2 text-[#A0A4AD]">მოდელი</label>
            <select
              value={selectedModel || ''}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-[#161D33]/80 px-3 py-2 text-sm text-white outline-none transition focus:border-[#7C6CFF]"
            >
              {availableModels.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.label}
                </option>
              ))}
            </select>
          </div>

          {/* Temperature */}
          <div>
            <label className="block text-sm font-medium mb-2 text-[#A0A4AD]">
              კრეატიულობა (Temperature): {modelControls.temperature}
            </label>
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={modelControls.temperature}
              onChange={(e) => setModelControls({
                ...modelControls,
                temperature: parseFloat(e.target.value)
              })}
              className="w-full h-2 rounded-lg bg-gradient-to-r from-[#7C6CFF]/60 via-[#25D98E]/60 to-[#FFC94D]/60"
            />
          </div>

          {/* Max Tokens */}
          <div>
            <label className="block text-sm font-medium mb-2 text-[#A0A4AD]">
              მაქს. ტოკენები: {modelControls.maxTokens}
            </label>
            <input
              type="range"
              min="100"
              max="4000"
              step="100"
              value={modelControls.maxTokens}
              onChange={(e) => setModelControls({
                ...modelControls,
                maxTokens: parseInt(e.target.value)
              })}
              className="w-full h-2 rounded-lg bg-gradient-to-r from-[#25D98E]/60 via-[#7C6CFF]/60 to-[#E14B8E]/60"
            />
          </div>
        </div>
      </div>

      {/* System Cleaner */}
      <div className="rounded-3xl border border-white/10 bg-[#0F1320]/80 p-6 backdrop-blur-2xl shadow-[0_28px_60px_rgba(6,12,36,0.55)]">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Shield size={20} />
          სისტემის გამწმენდი
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">ავტო-გაწმენდა</div>
              <div className="text-sm text-[#A0A4AD]">
                ავტომატური სისტემის ოპტიმიზაცია
              </div>
            </div>
            <button
              onClick={onToggleCleaner}
              className={`rounded-xl border px-4 py-2 font-semibold transition-all duration-200 ${
                cleanerEnabled
                  ? 'border-[#25D98E]/60 bg-[#25D98E]/20 text-[#BFF7DF] hover:border-[#25D98E] hover:bg-[#25D98E]/30'
                  : 'border-white/10 bg-white/5 text-[#A0A4AD] hover:border-white/20'
              }`}
            >
              {cleanerEnabled ? 'ჩართული' : 'გამორთული'}
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">მანუალური გაწმენდა</div>
              <div className="text-sm text-[#A0A4AD]">
                {lastCleanup
                  ? `ბოლო გაწმენდა: ${formatTimestamp(lastCleanup)}`
                  : 'არ მოხდენილა'
                }
              </div>
            </div>
            <button
              onClick={onManualCleanup}
              disabled={isCleaningNow}
              className="inline-flex items-center gap-2 rounded-xl border border-[#7C6CFF]/60 bg-[#7C6CFF]/20 px-4 py-2 font-semibold text-white transition-all duration-200 hover:border-[#7C6CFF] hover:bg-[#7C6CFF]/30 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isCleaningNow ? (
                <RefreshCw size={16} className="animate-spin" />
              ) : (
                <Trash2 size={16} />
              )}
              {isCleaningNow ? 'გაწმენდა...' : 'გაწმენდა'}
            </button>
          </div>
        </div>
      </div>

      {/* Telemetry */}
      <div className="rounded-3xl border border-white/10 bg-[#0F1320]/80 p-6 backdrop-blur-2xl shadow-[0_28px_60px_rgba(6,12,36,0.55)]">
        <h3 className="text-lg font-semibold mb-4 text-white">📊 ტელემეტრია</h3>
        <div className="grid grid-cols-2 gap-4 text-sm text-[#A0A4AD]">
          <div className="rounded-2xl border border-white/10 bg-[#121A2E]/70 px-4 py-3 text-white shadow-[0_18px_40px_rgba(6,12,36,0.45)]">
            <div className="text-xs uppercase tracking-wide text-[#A0A4AD]">სულ მოთხოვნები</div>
            <div className="mt-1 text-xl font-semibold text-white">{telemetryData.totalRequests}</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-[#121A2E]/70 px-4 py-3 text-white shadow-[0_18px_40px_rgba(6,12,36,0.45)]">
            <div className="text-xs uppercase tracking-wide text-[#A0A4AD]">საშუალო დაყოვნება</div>
            <div className="mt-1 text-xl font-semibold text-white">{telemetryData.averageLatency}ms</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-[#121A2E]/70 px-4 py-3 text-white shadow-[0_18px_40px_rgba(6,12,36,0.45)]">
            <div className="text-xs uppercase tracking-wide text-[#A0A4AD]">შეცდომების რაოდენობა</div>
            <div className="mt-1 text-xl font-semibold text-[#FFC94D]">{telemetryData.errorRate}%</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-[#121A2E]/70 px-4 py-3 text-white shadow-[0_18px_40px_rgba(6,12,36,0.45)]">
            <div className="text-xs uppercase tracking-wide text-[#A0A4AD]">ბოლო განახლება</div>
            <div className="mt-1 text-xl font-semibold text-white">
              {formatTimestamp(telemetryData.lastUpdate)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsTab;
