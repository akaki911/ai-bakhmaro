import React from 'react';
import { useTranslation } from 'react-i18next';
import classNames from 'classnames';
import { Bars3Icon } from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';

interface ImproveSidebarItem {
  id: string;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  active: boolean;
  badge?: number | string | null;
}

interface ImproveSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  items: ImproveSidebarItem[];
  serviceState?: 'ok' | 'degraded' | 'offline';
  addon?: React.ReactNode;
}

const stateTone: Record<'ok' | 'degraded' | 'offline', string> = {
  ok: 'border border-emerald-400/60 bg-emerald-500/15 text-emerald-100 shadow-[0_0_18px_rgba(16,185,129,0.35)]',
  degraded: 'border border-amber-400/60 bg-amber-500/15 text-amber-100 shadow-[0_0_18px_rgba(251,191,36,0.3)]',
  offline: 'border border-slate-400/40 bg-slate-600/20 text-slate-200 shadow-[0_0_18px_rgba(148,163,184,0.25)]',
};

export const ImproveSidebar: React.FC<ImproveSidebarProps> = ({
  collapsed,
  onToggle,
  items,
  serviceState = 'ok',
  addon,
}) => {
  const { t } = useTranslation();

  return (
    <motion.aside
      initial={{ width: 60 }}
      animate={{ width: collapsed ? 60 : 250 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="relative flex h-full flex-col border-r border-white/10 bg-white/5 shadow-[0_35px_120px_rgba(2,6,23,0.55)] backdrop-blur-2xl"
      data-testid="ai-imp:sidebar"
      aria-label={t('aiImprove.sidebar.ariaLabel', 'Auto-Improve გვერდითი ნავიგაცია')}
    >
      <div className="flex items-center justify-between px-3 py-4">
        <button
          type="button"
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/10 text-slate-200 shadow-[0_15px_45px_rgba(2,6,23,0.4)] transition hover:border-cyan-400/60 hover:text-cyan-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
          onClick={onToggle}
          aria-label={collapsed ? t('aiImprove.sidebar.expand', 'გახსნა') : t('aiImprove.sidebar.collapse', 'დახურვა')}
          aria-expanded={!collapsed}
        >
          <Bars3Icon className="h-5 w-5" aria-hidden="true" />
        </button>
        {!collapsed && (
          <span
            className={classNames(
              'inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide',
              stateTone[serviceState],
            )}
          >
            {serviceState === 'ok'
              ? t('aiImprove.sidebar.status.ok', 'სტაბილური')
              : serviceState === 'degraded'
                ? t('aiImprove.sidebar.status.degraded', 'დაგვიანება')
                : t('aiImprove.sidebar.status.offline', 'შეზღუდული რეჟიმი')}
          </span>
        )}
      </div>

      <nav
        className={classNames(
          'flex flex-1 flex-col gap-3 px-2 pb-6',
          collapsed ? 'items-center' : 'items-stretch',
        )}
        aria-label={t('aiImprove.sidebar.sections', 'Auto-Improve სექციები')}
      >
        <div
          className={classNames(
            'flex flex-col gap-2',
            collapsed ? 'w-full items-center' : 'items-stretch',
          )}
        >
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={item.onClick}
              data-testid={`ai-imp:sidebar-item:${item.id}`}
              className={classNames(
                'group flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-slate-300 shadow-[0_18px_55px_rgba(2,6,23,0.35)] transition hover:border-cyan-400/60 hover:text-cyan-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400',
                item.active && 'border-cyan-400/80 text-white shadow-[0_0_35px_rgba(34,211,238,0.35)]',
                collapsed && 'justify-center px-0 py-3',
              )}
              aria-current={item.active ? 'true' : undefined}
              title={collapsed ? item.label : undefined}
            >
              <span aria-hidden="true" className="text-lg">
                {item.icon}
              </span>
              {!collapsed && (
                <span className="flex-1 truncate text-left font-jetbrains text-[0.85rem] uppercase tracking-[0.16em] text-slate-200">
                  {item.label}
                </span>
              )}
              {!collapsed && item.badge !== null && item.badge !== undefined && (
                <span className="inline-flex min-w-[1.5rem] items-center justify-center rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs font-semibold text-cyan-100">
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </div>
        {!collapsed && addon ? <div className="flex justify-center">{addon}</div> : null}
      </nav>
    </motion.aside>
  );
};

export default ImproveSidebar;
