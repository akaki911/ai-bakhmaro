import React, { useState } from 'react';
import { Search, Filter, Loader } from 'lucide-react';

/**
 * SearchWorkbench Component
 * 
 * Semantic search interface for vector memory
 * - Query text input
 * - Similarity threshold slider
 * - Source/user filters
 * - Results limit control
 * 
 * Phase 3: Vector Memory UI
 */

interface SearchWorkbenchProps {
  onSearch: (params: SearchParams) => Promise<void>;
  loading: boolean;
  language?: 'ka' | 'en';
}

export interface SearchParams {
  query: string;
  limit: number;
  threshold: number;
  source?: string;
  userId?: string;
}

export const SearchWorkbench: React.FC<SearchWorkbenchProps> = ({
  onSearch,
  loading,
  language = 'ka'
}) => {
  const [query, setQuery] = useState('');
  const [limit, setLimit] = useState(10);
  const [threshold, setThreshold] = useState(0.7);
  const [source, setSource] = useState('');
  const [userId, setUserId] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const t = {
    title: language === 'ka' ? 'სემანტიკური ძიება' : 'Semantic Search',
    queryPlaceholder: language === 'ka' ? 'შეიყვანეთ ძიების ტექსტი...' : 'Enter search query...',
    search: language === 'ka' ? 'ძიება' : 'Search',
    searching: language === 'ka' ? 'მიმდინარეობს ძიება...' : 'Searching...',
    limit: language === 'ka' ? 'შედეგების რაოდენობა' : 'Results Limit',
    threshold: language === 'ka' ? 'მსგავსების ზღვარი' : 'Similarity Threshold',
    advancedFilters: language === 'ka' ? 'დამატებითი ფილტრები' : 'Advanced Filters',
    source: language === 'ka' ? 'წყარო (არასავალდებულო)' : 'Source (optional)',
    user: language === 'ka' ? 'მომხმარებელი (არასავალდებულო)' : 'User (optional)',
    clear: language === 'ka' ? 'გასუფთავება' : 'Clear'
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!query.trim()) {
      return;
    }

    await onSearch({
      query: query.trim(),
      limit,
      threshold,
      source: source.trim() || undefined,
      userId: userId.trim() || undefined
    });
  };

  const handleClear = () => {
    setQuery('');
    setSource('');
    setUserId('');
    setLimit(10);
    setThreshold(0.7);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-600 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center">
          <Search className="w-5 h-5 mr-2 text-blue-500" />
          {t.title}
        </h3>
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
        >
          <Filter className="w-4 h-4 mr-1" />
          {t.advancedFilters}
        </button>
      </div>

      <form onSubmit={handleSearch} className="space-y-4">
        {/* Query Input */}
        <div>
          <div className="relative">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.queryPlaceholder}
              disabled={loading}
              className="w-full px-4 py-3 pr-12 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            />
            {loading && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <Loader className="w-5 h-5 text-blue-500 animate-spin" />
              </div>
            )}
          </div>
        </div>

        {/* Advanced Filters */}
        {showAdvanced && (
          <div className="space-y-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
            {/* Limit Slider */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t.limit}: <span className="font-bold text-blue-600 dark:text-blue-400">{limit}</span>
              </label>
              <input
                type="range"
                min="1"
                max="100"
                value={limit}
                onChange={(e) => setLimit(parseInt(e.target.value))}
                disabled={loading}
                className="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>1</span>
                <span>50</span>
                <span>100</span>
              </div>
            </div>

            {/* Threshold Slider */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t.threshold}: <span className="font-bold text-blue-600 dark:text-blue-400">{(threshold * 100).toFixed(0)}%</span>
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={threshold * 100}
                onChange={(e) => setThreshold(parseInt(e.target.value) / 100)}
                disabled={loading}
                className="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>0%</span>
                <span>50%</span>
                <span>100%</span>
              </div>
            </div>

            {/* Source Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t.source}
              </label>
              <input
                type="text"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder="e.g., chat, docs, code"
                disabled={loading}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              />
            </div>

            {/* User Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t.user}
              </label>
              <input
                type="text"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="e.g., system, admin"
                disabled={loading}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              />
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center space-x-3">
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center justify-center"
          >
            {loading ? (
              <>
                <Loader className="w-4 h-4 mr-2 animate-spin" />
                {t.searching}
              </>
            ) : (
              <>
                <Search className="w-4 h-4 mr-2" />
                {t.search}
              </>
            )}
          </button>
          <button
            type="button"
            onClick={handleClear}
            disabled={loading}
            className="px-4 py-3 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t.clear}
          </button>
        </div>
      </form>
    </div>
  );
};
