/**
 * Semantic Context Types
 * 
 * Shared types for Vector Memory integration in Chat
 * Phase 3: Chat Integration
 */

export interface VectorMemoryResult {
  id: number;
  text: string;
  metadata: any;
  source: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  similarity: number;
}

export interface SemanticContextPayload {
  results: VectorMemoryResult[];
  searchQuery: string;
  metadata: {
    resultCount: number;
    threshold: number;
    maxResults: number;
    searchDuration?: number;
  };
}

export interface ChatSemanticSearchOptions {
  enabled: boolean;
  threshold: number;
  maxResults: number;
  minQueryLength: number;
  debounceMs: number;
}

export interface MemoryPersistenceConfig {
  autosave: boolean;
  minSimilarityForAutosave: number;
  includeConversationHistory: boolean;
}

export const DEFAULT_SEMANTIC_SEARCH_OPTIONS: ChatSemanticSearchOptions = {
  enabled: true,
  threshold: 0.72,
  maxResults: 3,
  minQueryLength: 10,
  debounceMs: 150
};

export const DEFAULT_MEMORY_PERSISTENCE_CONFIG: MemoryPersistenceConfig = {
  autosave: false,
  minSimilarityForAutosave: 0.85,
  includeConversationHistory: false
};
