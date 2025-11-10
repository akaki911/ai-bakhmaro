import React from 'react';
import { Database, Users, Layers, Clock, TrendingUp } from 'lucide-react';

/**
 * StatsOverview Component
 * 
 * Displays Vector Memory statistics with visual metrics
 * - Total embeddings count
 * - Unique sources and users
 * - Oldest and newest entries
 * 
 * Phase 3: Vector Memory UI
 */

interface StatsOverviewProps {
  stats: {
    total_embeddings: number;
    sources: number;
    users: number;
    oldest: string;
    newest: string;
  } | null;
  loading: boolean;
  onRefresh: () => void;
  language?: 'ka' | 'en';
}

export const StatsOverview: React.FC<StatsOverviewProps> = ({
  stats,
  loading,
  onRefresh,
  language = 'ka'
}) => {
  const t = {
    title: language === 'ka' ? 'სტატისტიკა' : 'Statistics',
    totalEmbeddings: language === 'ka' ? 'სულ ჩანაწერი' : 'Total Embeddings',
    sources: language === 'ka' ? 'წყაროები' : 'Sources',
    users: language === 'ka' ? 'მომხმარებლები' : 'Users',
    oldest: language === 'ka' ? 'უძველესი' : 'Oldest',
    newest: language === 'ka' ? 'უახლესი' : 'Newest',
    refresh: language === 'ka' ? 'განახლება' : 'Refresh',
    noData: language === 'ka' ? 'მონაცემები არ არის' : 'No data available'
  };

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('ka-GE', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return '-';
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-600 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center">
          <TrendingUp className="w-5 h-5 mr-2 text-blue-500" />
          {t.title}
        </h3>
        <button
          onClick={onRefresh}
          disabled={loading}
          className={`px-3 py-1 text-sm rounded transition-colors ${
            loading
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-500 text-white hover:bg-blue-600'
          }`}
        >
          {loading ? '⏳' : t.refresh}
        </button>
      </div>

      {!stats && !loading && (
        <div className="text-center py-8 text-gray-500">
          <Database className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>{t.noData}</p>
        </div>
      )}

      {stats && (
        <div className="grid grid-cols-2 gap-4">
          {/* Total Embeddings */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg p-4 border border-blue-200 dark:border-blue-700">
            <div className="flex items-center mb-2">
              <Database className="w-5 h-5 mr-2 text-blue-600 dark:text-blue-400" />
              <span className="text-sm text-gray-600 dark:text-gray-400">{t.totalEmbeddings}</span>
            </div>
            <div className="text-3xl font-bold text-blue-700 dark:text-blue-300">
              {stats.total_embeddings.toLocaleString()}
            </div>
          </div>

          {/* Sources */}
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-lg p-4 border border-purple-200 dark:border-purple-700">
            <div className="flex items-center mb-2">
              <Layers className="w-5 h-5 mr-2 text-purple-600 dark:text-purple-400" />
              <span className="text-sm text-gray-600 dark:text-gray-400">{t.sources}</span>
            </div>
            <div className="text-3xl font-bold text-purple-700 dark:text-purple-300">
              {stats.sources.toLocaleString()}
            </div>
          </div>

          {/* Users */}
          <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg p-4 border border-green-200 dark:border-green-700">
            <div className="flex items-center mb-2">
              <Users className="w-5 h-5 mr-2 text-green-600 dark:text-green-400" />
              <span className="text-sm text-gray-600 dark:text-gray-400">{t.users}</span>
            </div>
            <div className="text-3xl font-bold text-green-700 dark:text-green-300">
              {stats.users.toLocaleString()}
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-lg p-4 border border-orange-200 dark:border-orange-700">
            <div className="flex items-center mb-2">
              <Clock className="w-5 h-5 mr-2 text-orange-600 dark:text-orange-400" />
              <span className="text-sm text-gray-600 dark:text-gray-400">{t.oldest} / {t.newest}</span>
            </div>
            <div className="text-xs text-orange-700 dark:text-orange-300 space-y-1">
              <div className="truncate">{formatDate(stats.oldest)}</div>
              <div className="truncate font-semibold">{formatDate(stats.newest)}</div>
            </div>
          </div>
        </div>
      )}

      {loading && !stats && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      )}
    </div>
  );
};
