import { useState, useCallback, useEffect } from 'react';

/**
 * useVectorMemory Hook
 * 
 * Custom hook for Vector Memory API operations
 * Endpoints: /api/ai/vector-memory
 * 
 * Features:
 * - Store embeddings (POST /embeddings)
 * - Semantic search (POST /search)
 * - Get memory by ID (GET /:id)
 * - Delete memory (DELETE /:id)
 * - Get statistics (GET /stats)
 * 
 * Phase 3: Vector Memory & Semantic Search
 */

interface VectorMemoryStats {
  total_embeddings: number;
  sources: number;
  users: number;
  oldest: string;
  newest: string;
}

interface MemoryEmbedding {
  id: number;
  text: string;
  metadata: any;
  source: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  similarity?: number;
}

interface SearchResult {
  results: MemoryEmbedding[];
  count: number;
  query: string;
}

interface StoreRequest {
  text: string;
  embedding?: number[];
  metadata?: any;
  source?: string;
  userId?: string;
}

interface SearchRequest {
  query?: string;
  embedding?: number[];
  limit?: number;
  threshold?: number;
  source?: string;
  userId?: string;
}

export const useVectorMemory = () => {
  const [stats, setStats] = useState<VectorMemoryStats | null>(null);
  const [searchResults, setSearchResults] = useState<MemoryEmbedding[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const BASE_URL = '/api/ai/vector-memory';

  /**
   * Fetch vector memory statistics
   */
  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${BASE_URL}/stats`, {
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.errorEn || 'Failed to fetch statistics');
      }

      const result = await response.json();
      
      if (result.success && result.data) {
        setStats(result.data);
      } else {
        throw new Error(result.error || 'Invalid response format');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error('❌ [VECTOR MEMORY] Stats fetch failed:', err);
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Store text with automatic embedding generation
   */
  const storeEmbedding = useCallback(async (request: StoreRequest) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${BASE_URL}/embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.errorEn || 'Failed to store embedding');
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Store operation failed');
      }

      // Refresh stats after successful store
      await fetchStats();

      return result.data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error('❌ [VECTOR MEMORY] Store failed:', err);
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchStats]);

  /**
   * Semantic search with query text or embedding
   */
  const searchVector = useCallback(async (request: SearchRequest) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${BASE_URL}/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.errorEn || 'Search failed');
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Search operation failed');
      }

      setSearchResults(result.data || []);
      return { results: result.data || [], count: result.count || 0, query: result.query || '' };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error('❌ [VECTOR MEMORY] Search failed:', err);
      setError(message);
      setSearchResults([]);
      return { results: [], count: 0, query: request.query || '' };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Get specific memory by ID
   */
  const getMemory = useCallback(async (id: number) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${BASE_URL}/${id}`, {
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.errorEn || 'Memory not found');
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Get operation failed');
      }

      return result.data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error('❌ [VECTOR MEMORY] Get failed:', err);
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Delete memory by ID
   */
  const deleteMemory = useCallback(async (id: number) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${BASE_URL}/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.errorEn || 'Delete failed');
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Delete operation failed');
      }

      // Refresh stats after successful delete
      await fetchStats();

      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error('❌ [VECTOR MEMORY] Delete failed:', err);
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchStats]);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Auto-fetch stats on mount
   */
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    // State
    stats,
    searchResults,
    loading,
    error,

    // Actions
    fetchStats,
    storeEmbedding,
    searchVector,
    getMemory,
    deleteMemory,
    clearError
  };
};
