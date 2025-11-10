import React, { useState } from 'react';
import { Trash2, Eye, Calendar, Tag, User, FileText } from 'lucide-react';

/**
 * MemoryTable Component
 * 
 * Displays vector memory entries in a table with CRUD operations
 * - View memory details
 * - Delete memories
 * - Filter by source/user
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

interface MemoryTableProps {
  memories: MemoryEntry[];
  loading: boolean;
  onDelete: (id: number) => Promise<void>;
  onView: (memory: MemoryEntry) => void;
  language?: 'ka' | 'en';
}

export const MemoryTable: React.FC<MemoryTableProps> = ({
  memories,
  loading,
  onDelete,
  onView,
  language = 'ka'
}) => {
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const t = {
    title: language === 'ka' ? 'მეხსიერების ჩანაწერები' : 'Memory Entries',
    noEntries: language === 'ka' ? 'ჩანაწერები არ არის' : 'No entries found',
    id: language === 'ka' ? 'ID' : 'ID',
    text: language === 'ka' ? 'ტექსტი' : 'Text',
    source: language === 'ka' ? 'წყარო' : 'Source',
    user: language === 'ka' ? 'მომხმარებელი' : 'User',
    created: language === 'ka' ? 'შექმნილია' : 'Created',
    actions: language === 'ka' ? 'მოქმედებები' : 'Actions',
    view: language === 'ka' ? 'ნახვა' : 'View',
    delete: language === 'ka' ? 'წაშლა' : 'Delete',
    deleting: language === 'ka' ? 'იშლება...' : 'Deleting...',
    similarity: language === 'ka' ? 'მსგავსება' : 'Similarity'
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('ka-GE', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return '-';
    }
  };

  const truncateText = (text: string, maxLength: number = 100) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const handleDelete = async (id: number) => {
    if (!confirm(language === 'ka' ? 'ნამდვილად გსურთ წაშლა?' : 'Are you sure you want to delete?')) {
      return;
    }

    setDeletingId(id);
    try {
      await onDelete(id);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-600">
      <div className="px-4 py-3 border-b border-gray-300 dark:border-gray-600">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center">
          <FileText className="w-5 h-5 mr-2 text-blue-500" />
          {t.title}
          {memories.length > 0 && (
            <span className="ml-2 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded-full">
              {memories.length}
            </span>
          )}
        </h3>
      </div>

      {loading && memories.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      ) : memories.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>{t.noEntries}</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  {t.id}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  {t.text}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  {t.source}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  {t.user}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  {t.created}
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  {t.actions}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {memories.map((memory) => (
                <tr
                  key={memory.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                >
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 font-mono">
                    #{memory.id}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 max-w-md">
                    <div className="flex items-start">
                      <span className="flex-1">{truncateText(memory.text)}</span>
                      {memory.similarity !== undefined && (
                        <span className="ml-2 px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs rounded-full whitespace-nowrap">
                          {(memory.similarity * 100).toFixed(1)}%
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <div className="flex items-center text-gray-600 dark:text-gray-400">
                      <Tag className="w-3 h-3 mr-1" />
                      {memory.source}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <div className="flex items-center text-gray-600 dark:text-gray-400">
                      <User className="w-3 h-3 mr-1" />
                      {memory.user_id}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                    <div className="flex items-center">
                      <Calendar className="w-3 h-3 mr-1" />
                      {formatDate(memory.created_at)}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => onView(memory)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors"
                        title={t.view}
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(memory.id)}
                        disabled={deletingId === memory.id}
                        className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title={t.delete}
                      >
                        {deletingId === memory.id ? (
                          <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
