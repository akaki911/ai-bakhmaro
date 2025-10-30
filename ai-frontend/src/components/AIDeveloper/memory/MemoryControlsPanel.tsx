import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CircleCheck,
  CircleDashed,
  Clock,
  Database,
  History,
  Info,
  ListChecks,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  User as UserIcon,
  Users,
  XCircle,
  Zap,
} from 'lucide-react';
import type { MemoryControls, SavedMemoryEntry, MemoryDashboardMetrics } from '../../../types/aimemory';

interface MemoryControlsPanelProps {
  controls: MemoryControls;
  memories: SavedMemoryEntry[];
  metrics: MemoryDashboardMetrics;
  loading?: boolean;
  error?: string | null;
  onToggle: (feature: 'savedMemories' | 'chatHistory', enabled: boolean) => Promise<void> | void;
  onRefresh: () => Promise<void> | void;
  onSaveQuickMemory?: () => void;
  userDisplayName?: string;
  expandedViewEnabled: boolean;
  onExpandedViewChange: (value: boolean) => void;
  variant?: 'active' | 'archived';
  title?: string;
  accentEmoji?: string;
}

const ToggleSwitch: React.FC<{
  id: string;
  label: string;
  description: string;
  enabled: boolean;
  loading?: boolean;
  onChange: (value: boolean) => void;
  icon: React.ReactNode;
}> = ({ id, label, description, enabled, loading, onChange, icon }) => (
  <button
    type="button"
    aria-pressed={enabled}
    aria-describedby={`${id}-description`}
    onClick={() => onChange(!enabled)}
    className={`group flex w-full flex-col gap-4 rounded-2xl border px-5 py-4 text-left transition-all duration-200 sm:flex-row sm:items-center sm:justify-between ${
      enabled
        ? 'border-emerald-400/70 bg-emerald-500/10 shadow-[0_18px_30px_rgba(22,255,190,0.15)]'
        : 'border-white/10 bg-white/5'
    } ${loading ? 'cursor-not-allowed opacity-70' : 'hover:-translate-y-0.5 hover:scale-[1.01] hover:border-emerald-400/70 hover:bg-emerald-400/10'}`}
    disabled={loading}
  >
    <div className="flex items-start gap-3 text-left">
      <span
        className={`mt-1 flex h-10 w-10 items-center justify-center rounded-2xl border text-base ${
          enabled ? 'border-emerald-400/60 bg-emerald-500/15 text-emerald-100' : 'border-white/10 bg-white/10 text-slate-300'
        }`}
      >
        {icon}
      </span>
      <div>
        <p className="text-sm font-semibold text-white">{label}</p>
        <p id={`${id}-description`} className="text-xs text-gray-400">
          {description}
        </p>
      </div>
    </div>
    <span
      className={`inline-flex h-8 w-16 items-center rounded-full border px-1 transition-all duration-200 ${
        enabled ? 'border-emerald-400/80 bg-emerald-400/30 justify-end' : 'border-white/10 bg-white/10 justify-start'
      }`}
    >
      <span
        className={`h-6 w-6 rounded-full shadow-lg transition ${
          enabled ? 'scale-95 bg-white text-emerald-500' : 'bg-slate-200/90 text-slate-600'
        }`}
      />
    </span>
  </button>
);

type TimeRangeFilter = '24h' | '7d' | '30d' | 'all';
type StatusFilter = 'all' | 'confirmed' | 'pending' | 'issues' | 'logs';

const parseDateSafe = (value?: string | null): Date | null => {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
};

const formatDateForDisplay = (value?: string | null): string => {
  const parsed = parseDateSafe(value);
  if (!parsed) {
    return '—';
  }

  return parsed.toLocaleString('ka-GE');
};

const badgeToneClassMap: Record<'emerald' | 'red' | 'amber' | 'slate' | 'sky', { wrapper: string; text: string }> = {
  emerald: {
    wrapper: 'border-emerald-500/60 bg-emerald-500/10',
    text: 'text-emerald-200',
  },
  red: {
    wrapper: 'border-red-500/60 bg-red-500/10',
    text: 'text-red-200',
  },
  amber: {
    wrapper: 'border-amber-500/60 bg-amber-500/10',
    text: 'text-amber-100',
  },
  slate: {
    wrapper: 'border-gray-700 bg-gray-900/80',
    text: 'text-gray-300',
  },
  sky: {
    wrapper: 'border-sky-500/60 bg-sky-500/10',
    text: 'text-sky-200',
  },
};

const MemoryMetricBadge: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: number | string;
  tone?: keyof typeof badgeToneClassMap;
}> = ({ icon, label, value, tone = 'slate' }) => {
  const palette = badgeToneClassMap[tone];
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${
        palette.wrapper
      } ${palette.text}`}
    >
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-900/60 text-current">{icon}</span>
      <span>{label}</span>
      <span className="rounded-md bg-black/20 px-1.5 py-0.5 text-[11px] font-semibold tracking-wide">{value}</span>
    </span>
  );
};

type MemoryGlyphTone = 'emerald' | 'violet' | 'sky' | 'amber' | 'rose' | 'slate';

const glyphToneClasses: Record<MemoryGlyphTone, { wrapper: string; text: string }> = {
  emerald: {
    wrapper: 'border-emerald-400/60 bg-emerald-500/20',
    text: 'text-emerald-100',
  },
  violet: {
    wrapper: 'border-violet-400/60 bg-violet-500/20',
    text: 'text-violet-100',
  },
  sky: {
    wrapper: 'border-sky-400/60 bg-sky-500/20',
    text: 'text-sky-100',
  },
  amber: {
    wrapper: 'border-amber-400/60 bg-amber-500/20',
    text: 'text-amber-100',
  },
  rose: {
    wrapper: 'border-rose-400/60 bg-rose-500/20',
    text: 'text-rose-100',
  },
  slate: {
    wrapper: 'border-white/20 bg-white/10',
    text: 'text-slate-100',
  },
};

const getMemoryGlyph = (memory: SavedMemoryEntry): { emoji: string; tone: MemoryGlyphTone } => {
  const normalizedTags = (memory.tags ?? []).map((tag) => tag.toLowerCase());
  if (normalizedTags.some((tag) => tag.includes('quick') || tag.includes('note'))) {
    return { emoji: '⚡', tone: 'emerald' };
  }
  if (normalizedTags.some((tag) => tag.includes('project'))) {
    return { emoji: '🗂️', tone: 'violet' };
  }
  if (normalizedTags.some((tag) => tag.includes('chat') || tag.includes('conversation'))) {
    return { emoji: '💬', tone: 'sky' };
  }
  if ((memory.errorCount ?? 0) > 0 || memory.syncStatus === 'error') {
    return { emoji: '🚨', tone: 'rose' };
  }
  if (!memory.userConfirmed) {
    return { emoji: '📥', tone: 'amber' };
  }
  if (normalizedTags.some((tag) => tag.includes('preference') || tag.includes('user'))) {
    return { emoji: '🧑‍💻', tone: 'sky' };
  }
  if (memory.syncStatus === 'syncing' || memory.syncStatus === 'pending') {
    return { emoji: '⏳', tone: 'amber' };
  }

  return { emoji: '🧠', tone: 'emerald' };
};

interface MemoryListProps {
  memories: SavedMemoryEntry[];
  metrics: MemoryDashboardMetrics;
  query: string;
  onQueryChange: (value: string) => void;
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  expanded: boolean;
  showDetailedMetrics: boolean;
  onRequestExpand?: () => void;
  timeRange: TimeRangeFilter;
  statusFilter: StatusFilter;
  onStatusFilterChange: (next: StatusFilter) => void;
  onTimeRangeChange: (next: TimeRangeFilter) => void;
  variant: 'active' | 'archived';
}

const MemoryList: React.FC<MemoryListProps> = ({
  memories,
  metrics,
  query,
  onQueryChange,
  selectedIds,
  onSelectionChange,
  expanded,
  showDetailedMetrics,
  onRequestExpand,
  timeRange,
  statusFilter,
  onStatusFilterChange,
  onTimeRangeChange,
  variant,
}) => {
  const filteredMemories = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const now = Date.now();
    const threshold =
      timeRange === '24h'
        ? now - 24 * 60 * 60 * 1000
        : timeRange === '7d'
        ? now - 7 * 24 * 60 * 60 * 1000
        : timeRange === '30d'
        ? now - 30 * 24 * 60 * 60 * 1000
        : null;

    return memories.filter((memory) => {
      if (statusFilter === 'confirmed' && !memory.userConfirmed) {
        return false;
      }
      if (statusFilter === 'pending' && memory.userConfirmed) {
        return false;
      }
      const issuesCount = (memory.errorCount ?? 0) + (memory.warningCount ?? 0);
      if (statusFilter === 'issues' && issuesCount === 0) {
        return false;
      }
      if (statusFilter === 'logs' && (memory.logCount ?? 0) === 0) {
        return false;
      }

      if (threshold) {
        const eventTimestamp =
          parseDateSafe(memory.updatedAt)?.getTime() ??
          parseDateSafe(memory.lastAccessedAt)?.getTime() ??
          parseDateSafe(memory.createdAt)?.getTime() ??
          null;

        if (eventTimestamp && eventTimestamp < threshold) {
          return false;
        }
      }

      if (!normalized) {
        return true;
      }

      const haystack = [
        memory.key,
        typeof memory.value === 'string' ? memory.value : JSON.stringify(memory.value),
        memory.summary,
        Array.isArray(memory.tags) ? memory.tags.join(' ') : '',
        memory.ownerName,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(normalized);
    });
  }, [memories, query, statusFilter, timeRange]);

  const visibleMemories = useMemo(
    () => (expanded ? filteredMemories : filteredMemories.slice(0, 4)),
    [filteredMemories, expanded],
  );

  const allVisibleSelected = useMemo(
    () => visibleMemories.length > 0 && visibleMemories.every((memory) => selectedIds.includes(memory.id)),
    [selectedIds, visibleMemories],
  );

  const toggleSelection = (memoryId: string, checked: boolean) => {
    if (checked) {
      onSelectionChange(Array.from(new Set([...selectedIds, memoryId])));
    } else {
      onSelectionChange(selectedIds.filter((id) => id !== memoryId));
    }
  };

  const toggleAllVisible = () => {
    if (allVisibleSelected) {
      const visibleIds = visibleMemories.map((memory) => memory.id);
      onSelectionChange(selectedIds.filter((id) => !visibleIds.includes(id)));
    } else {
      const visibleIds = visibleMemories.map((memory) => memory.id);
      onSelectionChange(Array.from(new Set([...selectedIds, ...visibleIds])));
    }
  };

  const statusOptions: Array<{ value: StatusFilter; label: string }> = [
    { value: 'all', label: 'ყველა' },
    { value: 'confirmed', label: 'დადასტ.' },
    { value: 'pending', label: 'მოლოდინი' },
    { value: 'issues', label: 'გაფრთხილება' },
    { value: 'logs', label: 'ლოგი' },
  ];

  const healthTone = metrics.healthScore >= 75 ? 'emerald' : metrics.healthScore >= 50 ? 'amber' : 'red';

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-[0_20px_45px_rgba(12,10,32,0.35)]">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-col gap-3 md:flex-row md:items-center md:gap-4">
          <div className="relative flex-1 min-w-[220px]">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              type="search"
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder="ძიება მეხსიერებაში…"
              className="w-full rounded-2xl border border-white/15 bg-white/5 py-2 pl-9 pr-3 text-sm text-slate-100 placeholder:text-white/40 focus:border-emerald-400 focus:outline-none focus:ring-0"
            />
          </div>
          <div className="flex items-center gap-2 text-xs text-white/70">
            <label htmlFor="memory-range" className="uppercase tracking-wide text-white/50">
              პერიოდი
            </label>
            <select
              id="memory-range"
              value={timeRange}
              onChange={(event) => onTimeRangeChange(event.target.value as TimeRangeFilter)}
              className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-slate-100 focus:border-emerald-400 focus:outline-none"
            >
              <option value="24h">24 სთ</option>
              <option value="7d">7 დღე</option>
              <option value="30d">30 დღე</option>
              <option value="all">ყველა</option>
            </select>
          </div>
        </div>
        <button
          type="button"
          onClick={toggleAllVisible}
          disabled={visibleMemories.length === 0}
          className={`inline-flex items-center justify-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
            visibleMemories.length === 0
              ? 'cursor-not-allowed border-white/10 bg-white/5 text-white/40'
              : allVisibleSelected
              ? 'border-emerald-400/80 bg-emerald-500/20 text-white shadow-[0_12px_22px_rgба(16,185,129,0.25)]'
              : 'border-white/15 bg-white/5 text-white/70 hover:border-emerald-400/60 hover:text-emerald-100'
          }`}
        >
          {allVisibleSelected ? 'მონიშვნის მოხსნა' : 'ყველას მონიშვნა'}
        </button>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {statusOptions.map((option) => {
          const active = statusFilter === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onStatusFilterChange(option.value)}
              className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs transition ${
                active
                  ? variant === 'archived'
                    ? 'border-indigo-300/70 bg-indigo-500/20 text-slate-100 shadow-[0_12px_24px_rgба(129,140,248,0.25)]'
                    : 'border-emerald-400/80 bg-emerald-500/20 text-white shadow-[0_12px_24px_rgба(16,185,129,0.35)]'
                  : variant === 'archived'
                  ? 'border-white/15 bg-white/5 text-white/60 hover:border-indigo-200/60 hover:text-indigo-100'
                  : 'border-white/15 bg-white/5 text-white/60 hover:border-emerald-300/60 hover:text-emerald-100'
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <MemoryMetricBadge icon={<Database size={12} />} label="ლოგი" value={metrics.logCount} tone={metrics.logCount > 0 ? 'emerald' : 'slate'} />
        <MemoryMetricBadge icon={<XCircle size={12} />} label="შეცდომა" value={metrics.errorCount} tone={metrics.errorCount > 0 ? 'red' : 'slate'} />
        <MemoryMetricBadge
          icon={<ShieldCheck size={12} />}
          label="გაფრთხილება"
          value={metrics.warningCount}
          tone={metrics.warningCount > 0 ? 'amber' : 'slate'}
        />
        <MemoryMetricBadge
          icon={<Activity size={12} />}
          label="ჯანმრთელობა"
          value={`${metrics.healthScore}%`}
          tone={healthTone}
        />
        <MemoryMetricBadge
          icon={<BarChart3 size={12} />}
          label="დარწმუნებულობა"
          value={`${metrics.averageConfidence}%`}
          tone={metrics.averageConfidence > 74 ? 'emerald' : metrics.averageConfidence > 49 ? 'amber' : 'red'}
        />
      </div>
      <div className="mt-5 space-y-4">
        {visibleMemories.length === 0 && (
          <div className="rounded-2xl border border-dashed border-white/15 bg-white/5 px-5 py-8 text-center text-sm text-slate-300/80">
            არჩეული ფილტრებით შედეგი არ მოიძებნა.
          </div>
        )}
        {visibleMemories.map((memory) => {
          const memoryValue =
            typeof memory.value === 'string' ? memory.value : JSON.stringify(memory.value, null, 2);
          const checked = selectedIds.includes(memory.id);
          const updatedLabel = memory.updatedAt || memory.createdAt;
          const lastAccessed = memory.lastAccessedAt;
          const confidenceRaw = typeof memory.confidenceScore === 'number' ? memory.confidenceScore : memory.userConfirmed ? 0.92 : 0.6;
          const confidencePercent = Math.round(confidenceRaw > 1 ? confidenceRaw : confidenceRaw * 100);
          const syncStatus = memory.syncStatus ?? (memory.userConfirmed ? 'synced' : 'pending');
          const syncProgressRaw = typeof memory.syncProgress === 'number' ? memory.syncProgress : undefined;
          const syncProgress = Math.min(100, Math.max(0, syncProgressRaw ?? (memory.userConfirmed ? 100 : Math.max(60, metrics.averageConfidence - 5))));
          const usageCount = memory.usageCount ?? memory.conversationCount ?? 0;
          const issuesCount = (memory.errorCount ?? 0) + (memory.warningCount ?? 0);

          const syncBadge = (() => {
            switch (syncStatus) {
              case 'synced':
                return { className: 'border-emerald-400/60 bg-emerald-500/15 text-emerald-100', label: 'სინქრონიზებულია', icon: <CircleCheck size={12} /> };
              case 'syncing':
                return { className: 'border-sky-400/60 bg-sky-500/15 text-sky-100', label: 'სინქის მიმდინარეობა', icon: <CircleDashed size={12} /> };
              case 'pending':
                return { className: 'border-amber-400/60 bg-amber-500/15 text-amber-100', label: 'დამუშავება გრძელდება', icon: <CircleDashed size={12} /> };
              case 'error':
                return { className: 'border-red-500/60 bg-red-500/15 text-red-100', label: 'სინქი შეჩერდა', icon: <XCircle size={12} /> };
              default:
                return { className: 'border-white/20 bg-white/10 text-slate-200/80', label: 'სტატუსი უცნობია', icon: <CircleDashed size={12} /> };
            }
          })();

          const glyph = getMemoryGlyph(memory);
          const glyphTone = glyphToneClasses[glyph.tone];
          const cardBaseClass =
            variant === 'archived'
              ? 'border-white/15 bg-white/5 text-slate-200/85 hover:border-indigo-200/50 hover:bg-white/10'
              : 'border-emerald-400/40 bg-emerald-500/5 text-emerald-50/95 hover-border-emerald-300/70 hover:bg-emerald-500/10';
          const selectedClass =
            variant === 'archived'
              ? 'border-indigo-300/70 bg-indigo-500/15 text-slate-50 ring-2 ring-indigo-300/50'
              : 'border-emerald-400/80 bg-emerald-500/15 text-white ring-2 ring-emerald-400/60';

          return (
            <button
              type="button"
              key={memory.id}
              onClick={() => toggleSelection(memory.id, !checked)}
              aria-pressed={checked}
              className={`group relative flex w-full flex-col gap-4 rounded-2xl border px-5 py-4 text-left transition-all duration-200 ${cardBaseClass} ${
                checked ? selectedClass : ''
              } ${issuesCount > 0 && !checked ? 'shadow-[0_0_0_1px_rgba(251,191,36,0.25)]' : ''}`}
            >
              <span
                className={`absolute right-4 top-4 inline-flex h-7 w-7 items-center justify-center rounded-full border text-xs transition ${
                  checked
                    ? 'border-white/40 bg-white/10 text-white'
                    : variant === 'archived'
                    ? 'border-white/15 bg-white/5 text-white/50 group-hover:border-indigo-200/50 group-hover:text-indigo-100'
                    : 'border-white/20 bg-white/5 text-white/60 group-hover:border-emerald-300/60 group-hover:text-emerald-100'
                }`}
              >
                {checked ? <CheckCircle2 size={16} /> : <CircleDashed size={14} />}
              </span>
              <div className="flex items-start gap-3">
                <span
                  className={`flex h-12 w-12 items-center justify-center rounded-2xl border text-lg ${glyphTone.wrapper} ${glyphTone.text} ${
                    variant === 'archived' ? 'opacity-80' : ''
                  }`}
                >
                  {glyph.emoji}
                </span>
                <div className="flex-1 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className={`flex flex-wrap items-center gap-2 text-sm font-semibold ${variant === 'archived' ? 'text-slate-100/90' : 'text-white'}`}>
                      {memory.key}
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] ${
                          memory.userConfirmed
                            ? 'border-emerald-400/60 bg-emerald-500/15 text-emerald-100'
                            : 'border-amber-400/60 bg-amber-500/15 text-amber-100'
                        }`}
                      >
                        {memory.userConfirmed ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
                        {memory.userConfirmed ? 'დადასტურებული' : 'გადასამოწმებელი'}
                      </span>
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] ${syncBadge.className}`}>
                        {syncBadge.icon}
                        {syncBadge.label}
                      </span>
                    </span>
                    {updatedLabel ? (
                      <span className="text-[11px] text-slate-300/80">{formatDateForDisplay(updatedLabel)}</span>
                    ) : null}
                  </div>
                  <p className={`whitespace-pre-wrap text-sm leading-relaxed ${variant === 'archived' ? 'text-slate-200/80' : 'text-emerald-50/90'}`}>
                    {memoryValue}
                  </p>
                  {memory.summary && (
                    <p className={`flex items-center gap-2 text-xs ${variant === 'archived' ? 'text-slate-200/70' : 'text-emerald-200/80'}`}>
                      <Sparkles size={12} /> {memory.summary}
                    </p>
                  )}
                  <div className={`flex flex-wrap items-center gap-2 text-[11px] ${variant === 'archived' ? 'text-slate-300/70' : 'text-emerald-100/80'}`}>
                    {memory.source && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-2.5 py-0.5">
                        <Database size={10} /> {memory.source}
                      </span>
                    )}
                    {memory.ownerName && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-2.5 py-0.5">
                        <Users size={10} /> {memory.ownerName}
                      </span>
                    )}
                    {lastAccessed && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-2.5 py-0.5">
                        <Clock size={10} /> ბოლო გამოყენება: {formatDateForDisplay(lastAccessed)}
                      </span>
                    )}
                    {usageCount > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-2.5 py-0.5">
                        <Activity size={10} /> გამოყენება: {usageCount}
                      </span>
                    )}
                    {Array.isArray(memory.tags) &&
                      memory.tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-2.5 py-0.5 uppercase"
                        >
                          #{tag}
                        </span>
                      ))}
                  </div>
                  <div className="grid gap-3 text-[11px] text-slate-200/80 sm:grid-cols-2">
                    <div>
                      <div className="flex justify-between">
                        <span>დარწმუნებულობა</span>
                        <span>{Math.min(100, Math.max(0, confidencePercent))}%</span>
                      </div>
                      <div className="mt-1 h-2 rounded-full bg-white/10">
                        <div
                          className={`h-2 rounded-full ${
                            confidencePercent >= 75
                              ? 'bg-emerald-400'
                              : confidencePercent >= 50
                              ? 'bg-amber-400'
                              : 'bg-red-500'
                          }`}
                          style={{ width: `${Math.min(100, Math.max(0, confidencePercent))}%` }}
                          aria-hidden
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between">
                        <span>სინქის პროგრესი</span>
                        <span>{Math.round(syncProgress)}%</span>
                      </div>
                      <div className="mt-1 h-2 rounded-full bg-white/10">
                        <div
                          className={`h-2 rounded-full ${
                            syncStatus === 'error'
                              ? 'bg-red-500'
                              : syncStatus === 'syncing' || syncStatus === 'pending'
                              ? 'bg-amber-400'
                              : 'bg-sky-400'
                          }`}
                          style={{ width: `${Math.round(syncProgress)}%` }}
                          aria-hidden
                        />
                      </div>
                    </div>
                  </div>
                  {showDetailedMetrics && (
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-200/80">
                      <MemoryMetricBadge
                        icon={<Database size={10} />}
                        label="ლოგი"
                        value={memory.logCount ?? 0}
                        tone={(memory.logCount ?? 0) > 0 ? 'emerald' : 'slate'}
                      />
                      <MemoryMetricBadge
                        icon={<XCircle size={10} />}
                        label="შეცდომა"
                        value={memory.errorCount ?? 0}
                        tone={(memory.errorCount ?? 0) > 0 ? 'red' : 'slate'}
                      />
                      <MemoryMetricBadge
                        icon={<ShieldCheck size={10} />}
                        label="გაფრთხილება"
                        value={memory.warningCount ?? 0}
                        tone={(memory.warningCount ?? 0) > 0 ? 'amber' : 'slate'}
                      />
                    </div>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
      {!expanded && filteredMemories.length > visibleMemories.length && (
        <button
          type="button"
          onClick={onRequestExpand}
          className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-emerald-200 hover:text-emerald-100"
        >
          <ListChecks size={14} />
          სრულ მართვაზე გადასვლა
        </button>
      )}
      {expanded && (
        <a href="#gurulo-memory-manager" className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-emerald-200 hover:text-emerald-100">
          <ListChecks size={14} />
          სრულ მართვაზე გადასვლა
        </a>
      )}
    </div>
  );
};

const MemoryControlsPanel: React.FC<MemoryControlsPanelProps> = ({
  controls,
  memories,
  metrics,
  loading,
  error,
  onToggle,
  onRefresh,
  onSaveQuickMemory,
  userDisplayName,
  expandedViewEnabled,
  onExpandedViewChange,
  variant = 'active',
  title,
  accentEmoji,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showDetailedMetrics, setShowDetailedMetrics] = useState(true);
  const [userToggledMetrics, setUserToggledMetrics] = useState(false);
  const [timeRange, setTimeRange] = useState<TimeRangeFilter>(variant === 'archived' ? 'all' : '30d');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  useEffect(() => {
    setSelectedIds((previous) => previous.filter((id) => memories.some((memory) => memory.id === id)));
  }, [memories]);

  useEffect(() => {
    if (variant === 'archived') {
      setTimeRange('all');
    }
  }, [variant]);

  const fallbackMetrics = useMemo(() => {
    const total = memories.length;
    const confirmed = memories.filter((memory) => memory.userConfirmed).length;
    const pending = Math.max(total - confirmed, 0);
    const log = memories.reduce((running, memory) => running + (memory.logCount ?? 0), 0);
    const errorCount = memories.reduce((running, memory) => running + (memory.errorCount ?? 0), 0);
    const warning = memories.reduce((running, memory) => running + (memory.warningCount ?? 0), 0);
    const confidenceAccumulator = memories.reduce((running, memory) => {
      const explicit = typeof memory.confidenceScore === 'number' ? memory.confidenceScore : undefined;
      const normalized = explicit !== undefined ? (explicit > 1 ? explicit / 100 : explicit) : memory.userConfirmed ? 0.9 : 0.55;
      return running + Math.max(0, Math.min(1, normalized));
    }, 0);
    const averageConfidence = total === 0 ? 0 : Math.round((confidenceAccumulator / total) * 100);

    return { total, confirmed, pending, log, error: errorCount, warning, averageConfidence };
  }, [memories]);

  const totalCount = metrics.total ?? fallbackMetrics.total;
  const confirmedCount = metrics.confirmed ?? fallbackMetrics.confirmed;
  const pendingCount = metrics.pending ?? fallbackMetrics.pending;
  const logBadgeCount = metrics.logCount ?? fallbackMetrics.log;
  const errorBadgeCount = metrics.errorCount ?? fallbackMetrics.error;
  const warningBadgeCount = metrics.warningCount ?? fallbackMetrics.warning;
  const averageConfidence = metrics.averageConfidence ?? fallbackMetrics.averageConfidence;
  const syncedCount = metrics.synced ?? 0;
  const syncingCount = metrics.syncing ?? 0;
  const failingCount = metrics.failing ?? 0;
  const selectionCount = selectedIds.length;
  const isFeatureAvailable = controls.referenceSavedMemories || controls.referenceChatHistory;
  const metricsPanelVisible = variant === 'active' && isFeatureAvailable && showDetailedMetrics;
  const confirmationProgress = totalCount === 0 ? 0 : Math.round((confirmedCount / totalCount) * 100);
  const pendingProgress = totalCount === 0 ? 0 : Math.round((pendingCount / totalCount) * 100);
  const issuesTotal = errorBadgeCount + warningBadgeCount;
  const healthScore = metrics.healthScore ?? Math.max(
    0,
    Math.min(100, Math.round((confirmedCount / Math.max(totalCount, 1)) * 100) - errorBadgeCount * 2 - warningBadgeCount),
  );
  const healthStatus = healthScore >= 75 ? 'სტაბილური' : healthScore >= 50 ? 'ყურადღება' : 'გაფრთხილება';
  const healthTone =
    healthScore >= 75
      ? 'text-emerald-200 border-emerald-500/60 bg-emerald-500/10'
      : healthScore >= 50
      ? 'text-amber-100 border-amber-500/60 bg-amber-500/10'
      : 'text-red-200 border-red-500/60 bg-red-500/10';

  const handleExpandedToggle = () => {
    const nextValue = !expandedViewEnabled;
    onExpandedViewChange(nextValue);
  };

  useEffect(() => {
    if (variant !== 'active') {
      return;
    }
    if (!isFeatureAvailable) {
      setShowDetailedMetrics(false);
      setUserToggledMetrics(false);
    }
  }, [isFeatureAvailable, variant]);

  useEffect(() => {
    if (variant !== 'active') {
      return;
    }
    if (isFeatureAvailable && !showDetailedMetrics && !userToggledMetrics) {
      setShowDetailedMetrics(true);
    }
  }, [isFeatureAvailable, showDetailedMetrics, userToggledMetrics, variant]);

  const accent = accentEmoji ?? (variant === 'archived' ? '📦' : '🧠');
  const subtitle =
    variant === 'archived'
      ? 'გურულოს მშვიდად შენახული ჩანაწერები, რომლებიც საჭიროების შემთხვევაში მარტივად აღდგება.'
      : 'გურულოს აქტიური მეხსიერება და მიმდინარე ჩანაწერები — განახლებული რეალურ დროში.';

  return (
    <section className="flex h-full flex-col gap-6 text-slate-100">
      <header className="space-y-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-[10px] uppercase tracking-[0.28em] text-white/50">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-lg">
                {accent}
              </span>
              <span>{variant === 'archived' ? 'Archive Stream' : 'Active Stream'}</span>
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-white">{title ?? 'AI მეხსიერება'}</h2>
              <p className="mt-1 text-sm text-white/60">{subtitle}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-white/60">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1">
                <UserIcon size={14} className="text-emerald-300" />
                {userDisplayName || 'ანგარიში დაუდგენელია'}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1">
                <Clock size={12} className="text-sky-300" /> ბოლო აქტივობა: {formatDateForDisplay(metrics.lastActivity)}
              </span>
              {variant === 'active' && (
                <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1">
                  <Zap size={12} className={isFeatureAvailable ? 'text-emerald-300' : 'text-amber-300'} />
                  {isFeatureAvailable ? 'ფუნქციები აქტიურია' : 'ფუნქციები გათიშულია'}
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {variant === 'active' && (
              <button
                type="button"
                onClick={() => onSaveQuickMemory?.()}
                className="inline-flex items-center gap-2 rounded-full border border-emerald-400/70 bg-emerald-500/20 px-4 py-1.5 text-xs font-semibold text-white shadow-[0_12px_24px_rgба(16,185,129,0.3)] transition hover:border-emerald-300/70 hover:bg-emerald-500/25"
              >
                <Save size={14} /> სწრაფი შენახვა
              </button>
            )}
            <button
              type="button"
              onClick={onRefresh}
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-semibold text-white/80 transition hover:border-emerald-300/60 hover:text-white"
            >
              <RefreshCw size={14} /> განახლება
            </button>
            <button
              type="button"
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-semibold transition ${
                selectionCount === 0
                  ? 'cursor-not-allowed border-white/10 bg-white/5 text-white/40'
                  : 'border-red-400/60 bg-red-500/15 text-red-100 hover:border-red-300/70'
              }`}
              disabled={selectionCount === 0}
              title={selectionCount === 0 ? 'მონიშნე ჩანაწერები წასაშლელად' : 'მონიშნული ჩანაწერების წაშლა'}
            >
              <Trash2 size={14} /> წაშლა
            </button>
            <button
              type="button"
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-semibold transition ${
                logBadgeCount > 0
                  ? 'border-emerald-400/60 bg-emerald-500/15 text-emerald-100'
                  : 'border-white/15 bg-white/5 text-white/50'
              }`}
              title="ლოგების ნახვა"
            >
              <Database size={14} /> ლოგი
              <span className="ml-1 inline-flex min-w-[1.5rem] items-center justify-center rounded-full bg-white/10 px-1 text-[10px] text-slate-100">
                {logBadgeCount}
              </span>
            </button>
            <button
              type="button"
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-semibold transition ${
                errorBadgeCount > 0
                  ? 'border-red-400/60 bg-red-500/15 text-red-100'
                  : 'border-white/15 bg-white/5 text-white/50'
              }`}
              title="შეცდომების მონიტორინგი"
            >
              <XCircle size={14} /> შეცდომა
              <span className="ml-1 inline-flex min-w-[1.5rem] items-center justify-center rounded-full bg-white/10 px-1 text-[10px] text-slate-100">
                {errorBadgeCount}
              </span>
            </button>
            <button
              type="button"
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-semibold transition ${
                warningBadgeCount > 0
                  ? 'border-amber-400/60 bg-amber-500/15 text-amber-100'
                  : 'border-white/15 bg-white/5 text-white/50'
              }`}
              title="გაფრთხილებების ნახვა"
            >
              <ShieldCheck size={14} /> გაფრთხილება
              <span className="ml-1 inline-flex min-w-[1.5rem] items-center justify-center rounded-full bg-white/10 px-1 text-[10px] text-slate-100">
                {warningBadgeCount}
              </span>
            </button>
            {variant === 'active' && (
              <button
                type="button"
                onClick={() =>
                  setShowDetailedMetrics((previous) => {
                    const next = !previous;
                    setUserToggledMetrics(true);
                    return next;
                  })
                }
                aria-pressed={metricsPanelVisible}
                className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-semibold transition ${
                  metricsPanelVisible
                    ? 'border-emerald-400/70 bg-emerald-500/15 text-white shadow-[0_12px_24px_rgба(16,185,129,0.3)]'
                    : 'border-white/15 bg-white/5 text-white/60 hover:border-emerald-400/60 hover:text-emerald-100'
                }`}
                title={metricsPanelVisible ? 'მეტრიკების ჩაკეცვა' : 'მეტრიკების ჩვენება'}
              >
                <ListChecks size={14} /> {metricsPanelVisible ? 'მეტრიკების ჩაკეცვა' : 'მეტრიკების ჩვენება'}
              </button>
            )}
            <button
              type="button"
              onClick={handleExpandedToggle}
              disabled={variant === 'active' && !isFeatureAvailable}
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-semibold transition ${
                variant === 'active' && !isFeatureAvailable
                  ? 'cursor-not-allowed border-white/10 bg-white/5 text-white/40'
                  : expandedViewEnabled
                  ? 'border-emerald-400/70 bg-emerald-500/15 text-white hover:border-emerald-300/70'
                  : 'border-white/15 bg-white/5 text-white/70 hover:border-emerald-400/60 hover:text-emerald-100'
              }`}
              title={
                variant === 'active'
                  ? isFeatureAvailable
                    ? expandedViewEnabled
                      ? 'გაფართოებული ხედის ჩაკეცვა'
                      : 'გაფართოებული ხედის გახსნა'
                    : 'სრულ მენეჯერზე წვდომა მხოლოდ გააქტიურებული ფუნქციებისას'
                  : expandedViewEnabled
                  ? 'არქივის სრულ ხედზე გადასვლა'
                  : 'არქივის სრულ ხედზე გადასვლა'
              }
            >
              {expandedViewEnabled ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              {expandedViewEnabled ? 'სრული ხედვის ჩაკეცვა' : 'სრული ხედვის გახსნა'}
            </button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-white/70">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1">
            სულ: <span className="font-semibold text-white">{totalCount}</span>
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/60 bg-emerald-500/15 px-3 py-1 text-emerald-100">
            დადასტურებული: {confirmedCount}
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-amber-400/60 bg-amber-500/15 px-3 py-1 text-amber-100">
            გადასამოწმებელი: {pendingCount}
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-sky-400/60 bg-sky-500/15 px-3 py-1 text-sky-100">
            სინქი: {syncedCount}/{totalCount}
          </span>
          {selectionCount > 0 && (
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/60 bg-emerald-500/15 px-3 py-1 text-emerald-100">
              მონიშნული: {selectionCount}
            </span>
          )}
        </div>
        {error && (
          <div className="rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-xs text-red-200">
            ❌ {error}
          </div>
        )}
      </header>
      {variant === 'active' && !isFeatureAvailable && (
        <p className="text-xs text-amber-200/80">
          გაფართოებული მეხსიერების სანახავად ჩართე შესაბამისი ფუნქციები (შენახული მეხსიერებები ან ჩატის ისტორია).
        </p>
      )}
      {variant === 'active' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <ToggleSwitch
            id="toggle-saved-memories"
            label="შენახული მეხსიერებების გამოყენება"
            description="გურულო პასუხებში გამოიყენებს მომხმარებლის ფაქტებს და პრეფერენციებს"
            enabled={controls.referenceSavedMemories}
            loading={loading}
            onChange={(value) => onToggle('savedMemories', value)}
            icon={<Zap size={16} />}
          />
          <ToggleSwitch
            id="toggle-chat-history"
            label="ჩატის ისტორიის გათვალისწინება"
            description="გურულო გამოიყენებს წინა დიალოგებს სრული კონტექსტისთვის"
            enabled={controls.referenceChatHistory}
            loading={loading}
            onChange={(value) => onToggle('chatHistory', value)}
            icon={<History size={16} />}
          />
        </div>
      )}
      {variant === 'active' ? (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-inner">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-semibold text-white">📊 გაერთიანებული მეტრიკები</p>
            <div className="flex flex-wrap items-center gap-2 text-xs text-white/70">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1">
                <Database size={12} /> ლოგები: {logBadgeCount}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/60 bg-emerald-500/15 px-3 py-1 text-emerald-100">
                <CheckCircle2 size={12} /> დადასტურებული: {confirmedCount}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-amber-400/60 bg-amber-500/15 px-3 py-1 text-amber-100">
                <AlertTriangle size={12} /> გადასამოწმებელი: {pendingCount}
              </span>
            </div>
          </div>
          {metricsPanelVisible ? (
            <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs text-white/60">დადასტურების პროგრესი</p>
                <p className="mt-2 text-lg font-semibold text-emerald-200">{confirmationProgress}%</p>
                <div className="mt-3 space-y-2 text-[11px] text-white/70">
                  <div>
                    <div className="flex justify-between">
                      <span>დადასტურებული</span>
                      <span>{confirmedCount}</span>
                    </div>
                    <div className="mt-1 h-2 rounded-full bg-white/10">
                      <div className="h-2 rounded-full bg-emerald-400" style={{ width: `${confirmationProgress}%` }} aria-hidden />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify_between">
                      <span>გადასამოწმებელი</span>
                      <span>{pendingCount}</span>
                    </div>
                    <div className="mt-1 h-2 rounded-full bg-white/10">
                      <div className="h-2 rounded-full bg-amber-400" style={{ width: `${pendingProgress}%` }} aria-hidden />
                    </div>
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs text-white/60">შეტყობინებები</p>
                <p className="mt-2 text-lg font-semibold text-white">{logBadgeCount}</p>
                <p className="text-[11px] text-white/50">ლოგები, შეცდომები და გაფრთხილებები ერთ ხედში</p>
                <div className="mt-3 space-y-2 text-[11px] text-white/70">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1 text-emerald-200">
                      <Database size={12} /> ლოგები
                    </span>
                    <span>{logBadgeCount}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1 text-red-200">
                      <XCircle size={12} /> შეცდომა
                    </span>
                    <span>{errorBadgeCount}</span>
                  </div>
                  <div className="flex items_center justify_between">
                    <span className="inline-flex items-center gap-1 text-amber-200">
                      <ShieldCheck size={12} /> გაფრთხილება
                    </span>
                    <span>{warningBadgeCount}</span>
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs text-white/60">სინქრონიზაცია</p>
                <p className="mt-2 text-lg font-semibold text-white">{syncedCount}/{totalCount}</p>
                <p className="text-[11px] text-white/50">აქტიური, მიმდინარენი და პრობლემური ჩანაწერები</p>
                <div className="mt-3 space-y-2 text-[11px] text-white/70">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1 text-emerald-200">
                      <CircleCheck size={12} /> სინქრონიზებული
                    </span>
                    <span>{syncedCount}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1 text-sky-200">
                      <CircleDashed size={12} /> მიმდინარეობს
                    </span>
                    <span>{syncingCount}</span>
                  </div>
                  <div className="flex items-center justify_between">
                    <span className="inline-flex items-center gap-1 text-red-200">
                      <XCircle size={12} /> პრობლემური
                    </span>
                    <span>{failingCount}</span>
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs text-white/60">სისტემის ჯანმრთელობა</p>
                <span className={`mt-2 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-semibold ${healthTone}`}>
                  <CheckCircle2 size={14} /> {healthStatus}
                </span>
                <p className="mt-3 text-[11px] text-white/70">ჯანმრთელობის ქულა: {healthScore}%</p>
                <p className="text-[11px] text-white/70">საშუალო დარწმუნებულობა: {averageConfidence}%</p>
                <p className="text-[11px] text-white/70">გაფრთხილებები და შეცდომები: {issuesTotal}</p>
                <p className="text-[11px] text-white/50">კონტროლის განახლება: {controls.lastUpdated ? formatDateForDisplay(controls.lastUpdated) : '—'}</p>
              </div>
            </div>
          ) : (
            <p className="mt-3 text-xs text-white/50">მეტრიკები ჩაკეცილია. გამოიყენე „მეტრიკების ჩვენება" ღილაკი სრული სურათისთვის.</p>
          )}
        </div>
      ) : (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-5 text-sm text-white/70">
          <p className="text-xs uppercase tracking-[0.2em] text-white/40">არქივი</p>
          <p className="mt-2 text-lg font-semibold text-white">სულ {totalCount} ჩანაწერი</p>
          <div className="mt-3 grid gap-2 text-xs text-white/60 sm:grid-cols-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1">
              <CheckCircle2 size={12} className="text-emerald-300" /> დადასტურებული: {confirmedCount}
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1">
              <AlertTriangle size={12} className="text-amber-300" /> გადასამოწმებელი: {pendingCount}
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1">
              <Database size={12} className="text-emerald-300" /> ლოგები: {logBadgeCount}
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1">
              <XCircle size={12} className="text-red-300" /> შეცდომები: {errorBadgeCount}
            </span>
          </div>
        </div>
      )}
      <MemoryList
        memories={memories}
        metrics={metrics}
        query={query}
        onQueryChange={setQuery}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        expanded={expandedViewEnabled}
        showDetailedMetrics={metricsPanelVisible}
        onRequestExpand={() => onExpandedViewChange(true)}
        timeRange={timeRange}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        onTimeRangeChange={setTimeRange}
        variant={variant}
      />
      {variant === 'active' && (
        <p className="flex items-start gap-2 text-xs text-white/50">
          <Info size={14} className="mt-0.5 text-emerald-300" />
          გურულო შესაძლოა გამოიყენოს მეხსიერება პერსონალიზებული პასუხებისთვის (მაგალითად Bing-ის ძიებასთან ინტეგრაციისას).
          <a
            href="https://help.openai.com/en/articles/8151410-chatgpt-memory"
            target="_blank"
            rel="noreferrer"
            className="ml-1 text-emerald-300 hover:text-emerald-200"
          >
            გაიგე მეტი
          </a>
        </p>
      )}
    </section>
  );
};

export default MemoryControlsPanel;
