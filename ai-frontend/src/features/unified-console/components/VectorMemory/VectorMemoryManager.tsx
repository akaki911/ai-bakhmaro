import React, { useState } from 'react';
import { useVectorMemory } from '../../../../hooks/useVectorMemory';
import { StatsOverview } from './StatsOverview';
import { MemoryTable } from './MemoryTable';
import { SearchWorkbench, SearchParams } from './SearchWorkbench';
import { X, Info } from 'lucide-react';

/**
 * VectorMemoryManager Component
 * 
 * Main container for Vector Memory management interface
 * Integrates:
 * - StatsOverview: Statistics dashboard
 * - SearchWorkbench: Semantic search interface
 * - MemoryTable: Memory entries table with CRUD
 * 
 * Phase 3: Vector Memory UI
 */

interface MemoryEntry {
  id: number;
  text: string;
  metadata: any;
  source: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  similarity?: number;
}

interface VectorMemoryManagerProps {
  language?: 'ka' | 'en';
}

export const VectorMemoryManager: React.FC<VectorMemoryManagerProps> = ({
  language = 'ka'
}) => {
  const {
    stats,
    searchResults,
    loading,
    error,
    fetchStats,
    searchVector,
    deleteMemory,
    clearError
  } = useVectorMemory();

  const [selectedMemory, setSelectedMemory] = useState<MemoryEntry | null>(null);

  const t = {
    title: language === 'ka' ? 'ვექტორული მეხსიერება' : 'Vector Memory',
    description: language === 'ka' 
      ? 'სემანტიკური ძიება და მეხსიერების მენეჯმენტი PostgreSQL pgvector-ით'
      : 'Semantic search and memory management with PostgreSQL pgvector',
    close: language === 'ka' ? 'დახურვა' : 'Close'
  };

  const handleSearch = async (params: SearchParams) => {
    await searchVector(params);
  };

  const handleDeleteMemory = async (id: number) => {
    try {
      await deleteMemory(id);
      // If deleted memory was selected, clear selection
      if (selectedMemory?.id === id) {
        setSelectedMemory(null);
      }
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const handleViewMemory = (memory: MemoryEntry) => {
    setSelectedMemory(memory);
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center">
            <Info className="w-6 h-6 mr-2 text-blue-500" />
            {t.title}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {t.description}
          </p>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-lg p-4 flex items-start justify-between">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 mr-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <div>
              <h4 className="text-sm font-medium text-red-800 dark:text-red-300">Error</h4>
              <p className="text-sm text-red-700 dark:text-red-400 mt-1">{error}</p>
            </div>
          </div>
          <button
            onClick={clearError}
            className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 min-h-0">
        {/* Left Column */}
        <div className="space-y-4 flex flex-col min-h-0">
          {/* Stats Overview */}
          <StatsOverview
            stats={stats}
            loading={loading}
            onRefresh={fetchStats}
            language={language}
          />

          {/* Search Workbench */}
          <SearchWorkbench
            onSearch={handleSearch}
            loading={loading}
            language={language}
          />
        </div>

        {/* Right Column - Memory Table */}
        <div className="flex flex-col min-h-0 overflow-hidden">
          <MemoryTable
            memories={searchResults}
            loading={loading}
            onDelete={handleDeleteMemory}
            onView={handleViewMemory}
            language={language}
          />
        </div>
      </div>

      {/* Memory Detail Modal */}
      {selectedMemory && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {language === 'ka' ? 'მეხსიერების დეტალები' : 'Memory Details'} #{selectedMemory.id}
              </h3>
              <button
                onClick={() => setSelectedMemory(null)}
                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {language === 'ka' ? 'ტექსტი' : 'Text'}
                  </label>
                  <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
                    {selectedMemory.text}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {language === 'ka' ? 'წყარო' : 'Source'}
                    </label>
                    <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded text-gray-900 dark:text-gray-100 font-mono text-sm">
                      {selectedMemory.source}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {language === 'ka' ? 'მომხმარებელი' : 'User'}
                    </label>
                    <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded text-gray-900 dark:text-gray-100 font-mono text-sm">
                      {selectedMemory.user_id}
                    </div>
                  </div>
                </div>

                {selectedMemory.similarity !== undefined && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {language === 'ka' ? 'მსგავსება' : 'Similarity'}
                    </label>
                    <div className="px-3 py-2 bg-green-50 dark:bg-green-900/20 rounded text-green-700 dark:text-green-300 font-mono text-sm">
                      {(selectedMemory.similarity * 100).toFixed(2)}%
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {language === 'ka' ? 'მეტამონაცემები' : 'Metadata'}
                  </label>
                  <pre className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg text-xs text-gray-900 dark:text-gray-100 overflow-x-auto">
                    {JSON.stringify(selectedMemory.metadata, null, 2)}
                  </pre>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {language === 'ka' ? 'შექმნილია' : 'Created'}
                    </label>
                    <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded text-gray-900 dark:text-gray-100 text-sm">
                      {new Date(selectedMemory.created_at).toLocaleString('ka-GE')}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {language === 'ka' ? 'განახლებულია' : 'Updated'}
                    </label>
                    <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded text-gray-900 dark:text-gray-100 text-sm">
                      {new Date(selectedMemory.updated_at).toLocaleString('ka-GE')}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
              <button
                onClick={() => setSelectedMemory(null)}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 rounded-lg transition-colors"
              >
                {t.close}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
