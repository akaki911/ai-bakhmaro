const fs = require('fs').promises;
const path = require('path');
const VectorMemoryService = require('./vector_memory_service');
const embeddingsService = require('./embeddings_service');

/**
 * Semantic Search Service (Enhanced with pgvector)
 * 
 * Provides semantic search capabilities using PostgreSQL pgvector.
 * Falls back to local JSON knowledge base if vector memory is unavailable.
 * 
 * Features:
 * - Real vector embeddings via OpenAI/embeddings API
 * - PostgreSQL pgvector similarity search
 * - Fallback to local JSON knowledge base
 * - Hybrid search (vector + keyword)
 * 
 * Phase 3: Vector Memory Integration
 */

class SemanticSearchService {
  constructor() {
    // Legacy JSON knowledge base (fallback)
    this.knowledgeBase = null;
    this.isLoaded = false;
    
    // Vector memory service (primary)
    this.vectorMemory = new VectorMemoryService();
    this.vectorMemoryEnabled = false;
  }

  /**
   * Initialize the service (load knowledge base and initialize vector memory)
   * This should be called once when the server starts
   */
  async initialize() {
    await Promise.all([
      this.loadKnowledgeBase(),
      this.initializeVectorMemory()
    ]);
  }

  /**
   * Initialize vector memory service
   */
  async initializeVectorMemory() {
    try {
      const result = await this.vectorMemory.initialize();
      if (result.success) {
        this.vectorMemoryEnabled = true;
        console.log('✅ [SEMANTIC SEARCH] Vector memory enabled');
      } else {
        console.warn('⚠️ [SEMANTIC SEARCH] Vector memory unavailable, using fallback');
      }
    } catch (error) {
      console.warn('⚠️ [SEMANTIC SEARCH] Vector memory initialization failed:', error.message);
    }
  }

  /**
   * Load knowledge base from JSON file (fallback)
   * This should be called once when the server starts
   */
  async loadKnowledgeBase() {
    try {
      console.log('📚 Loading knowledge base...');

      const knowledgeBasePath = path.join(__dirname, '..', 'knowledge_base.json');

      // Check if knowledge base exists
      try {
        await fs.access(knowledgeBasePath);
      } catch (error) {
        console.warn('⚠️ Knowledge base not found. Please run build_knowledge_base.js first.');
        this.knowledgeBase = { chunks: [] };
        this.isLoaded = true;
        return;
      }

      const data = await fs.readFile(knowledgeBasePath, 'utf-8');
      this.knowledgeBase = JSON.parse(data);
      this.isLoaded = true;

      console.log(`✅ Knowledge base loaded: ${this.knowledgeBase.totalChunks} chunks`);
      console.log(`📊 Embedding model: ${this.knowledgeBase.embeddingModel}`);
      console.log(`Dimensions: ${this.knowledgeBase.embeddingDimensions}`);

    } catch (error) {
      console.error('❌ Error loading knowledge base:', error.message);
      // Initialize with empty knowledge base to prevent crashes
      this.knowledgeBase = { chunks: [] };
      this.isLoaded = true;
    }
  }

  /**
   * Search using vector memory (primary method)
   * @param {string} query - Search query
   * @param {Object} options - Search options
   * @returns {Promise<Array>} Search results
   */
  async searchVector(query, options = {}) {
    if (!this.vectorMemoryEnabled) {
      console.warn('⚠️ Vector memory not enabled, falling back to local search');
      return await this.findSimilarChunks(query, options.limit || 5);
    }

    try {
      // Generate embedding for query
      const embeddingResult = await embeddingsService.generateEmbedding(query);
      
      if (!embeddingResult.success) {
        console.error('❌ Failed to generate query embedding');
        return await this.findSimilarChunks(query, options.limit || 5);
      }

      // Search vector memory
      const searchResult = await this.vectorMemory.findSimilar(
        embeddingResult.embedding,
        {
          limit: options.limit || 5,
          threshold: options.threshold || 0.7,
          source: options.source,
          userId: options.userId,
          metadata: options.metadata
        }
      );

      if (!searchResult.success) {
        console.error('❌ Vector search failed');
        return await this.findSimilarChunks(query, options.limit || 5);
      }

      console.log(`✅ Found ${searchResult.results.length} vector results`);
      return searchResult.results;
    } catch (error) {
      console.error('❌ Vector search error:', error);
      return await this.findSimilarChunks(query, options.limit || 5);
    }
  }

  /**
   * Store text in vector memory
   * @param {string} text - Text to store
   * @param {Object} metadata - Metadata
   * @param {string} source - Source type
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Result
   */
  async storeInVectorMemory(text, metadata = {}, source = 'knowledge_base', userId = 'system') {
    if (!this.vectorMemoryEnabled) {
      return { success: false, error: 'Vector memory not enabled' };
    }

    try {
      // Generate embedding
      const embeddingResult = await embeddingsService.generateEmbedding(text);
      
      if (!embeddingResult.success) {
        return { success: false, error: 'Failed to generate embedding' };
      }

      // Store in vector memory
      const result = await this.vectorMemory.storeEmbedding(
        text,
        embeddingResult.embedding,
        metadata,
        source,
        userId
      );

      return result;
    } catch (error) {
      console.error('❌ Failed to store in vector memory:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Calculate cosine similarity between two vectors
   * @param {number[]} vecA - First vector
   * @param {number[]} vecB - Second vector
   * @returns {number} Similarity score between -1 and 1
   */
  cosineSimilarity(vecA, vecB) {
    if (!vecA || !vecB || vecA.length !== vecB.length) {
      return 0;
    }

    let dotProduct = 0.0;
    let normA = 0.0;
    let normB = 0.0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    return denominator === 0 ? 0 : dotProduct / denominator;
  }

  /**
   * Find the most similar chunks to a query (string or embedding vector)
   * @param {string|number[]} query - The user's query string or embedding vector
   * @param {number} limit - Number of top results to return (default: 5)
   * @returns {Array} Array of similar chunks with similarity scores
   */
  async findSimilarChunks(query, limit = 5) {
    const queryEmbedding = typeof query === 'string'
      ? await this.buildQueryEmbedding(query)
      : query;

    if (!Array.isArray(queryEmbedding) || queryEmbedding.length === 0) {
      console.warn('⚠️ Could not generate query embedding for semantic search');
      return [];
    }

    if (!this.isLoaded) {
      console.warn('⚠️ Knowledge base not loaded');
      return [];
    }

    if (!this.knowledgeBase?.chunks || this.knowledgeBase.chunks.length === 0) {
      console.warn('⚠️ No chunks in knowledge base');
      return [];
    }

    console.log(`🔍 Searching through ${this.knowledgeBase.chunks.length} chunks...`);

    // Calculate similarity for each chunk
    const similarities = this.knowledgeBase.chunks.map(chunk => {
      const similarity = this.cosineSimilarity(queryEmbedding, chunk.embedding);
      return {
        ...chunk,
        similarity: similarity
      };
    });

    // Sort by similarity (highest first) and return top K
    const results = similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit) // Use 'limit' instead of 'topK'
      .map(result => {
        const rawText = result.text || '';
        const maxLength = 600;
        const trimmed = rawText.length > maxLength
          ? `${rawText.slice(0, maxLength)}…`
          : rawText;

        return {
          ...result,
          rawText,
          content: trimmed,
          snippet: trimmed,
          originType: result.originType || 'knowledge_base',
        };
      });

    console.log(`🎯 Found ${results.length} similar chunks:`);
    results.forEach((result, index) => {
      console.log(
        `  ${index + 1}. ${result.id} (similarity: ${result.similarity.toFixed(4)}, chars: ${result.content.length})`
      );
    });

    return results;
  }

  /**
   * Build an embedding for a query using the embeddings service.
   * @param {string} query - Query text
   * @returns {Promise<number[]|null>} Embedding vector or null on failure
   */
  async buildQueryEmbedding(query) {
    try {
      const embeddingResult = await embeddingsService.generateEmbedding(query);
      if (!embeddingResult.success) {
        return null;
      }

      if (this.knowledgeBase?.embeddingDimensions &&
          embeddingResult.embedding.length !== this.knowledgeBase.embeddingDimensions) {
        console.warn(
          `⚠️ Embedding dimension mismatch: KB expects ${this.knowledgeBase.embeddingDimensions}, got ${embeddingResult.embedding.length}`
        );
      }

      return embeddingResult.embedding;
    } catch (error) {
      console.error('❌ Failed to build query embedding:', error.message);
      return null;
    }
  }

  /**
   * Get knowledge base statistics
   * @returns {Object} Statistics about the loaded knowledge base
   */
  getStats() {
    if (!this.isLoaded) {
      return { loaded: false };
    }

    return {
      loaded: true,
      totalChunks: this.knowledgeBase?.totalChunks || 0,
      embeddingModel: this.knowledgeBase?.embeddingModel || 'unknown',
      embeddingDimensions: this.knowledgeBase?.embeddingDimensions || 0,
      created: this.knowledgeBase?.created || null,
      version: this.knowledgeBase?.version || 'unknown'
    };
  }

  /**
   * Check if the service is ready to use
   * @returns {boolean} True if knowledge base is loaded
   */
  isReady() {
    return this.isLoaded && this.knowledgeBase && Array.isArray(this.knowledgeBase.chunks);
  }
}

// Create singleton instance
const semanticSearchService = new SemanticSearchService();

module.exports = {
  semanticSearchService,
  SemanticSearchService
};