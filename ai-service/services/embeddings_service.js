'use strict';

/**
 * Embeddings Service
 * 
 * Generates vector embeddings for text using external APIs.
 * Supports OpenAI embeddings API (primary) with fallback options.
 * 
 * Models:
 * - text-embedding-ada-002 (OpenAI) - 1536 dimensions
 * - text-embedding-3-small (OpenAI) - 1536 dimensions (faster)
 * - Local fallback - simple hashing for development
 * 
 * Phase 3: Vector Memory Integration
 */
class EmbeddingsService {
  constructor() {
    this.openaiApiKey = process.env.OPENAI_API_KEY;
    this.model = 'text-embedding-ada-002'; // OpenAI's embeddings model
    this.dimensions = 1536;
    this.useLocalFallback = !this.openaiApiKey;
    
    // Metrics
    this.metrics = {
      generateCount: 0,
      errorCount: 0,
      totalTokens: 0,
      cacheHits: 0
    };
    
    // Simple cache for recently generated embeddings
    this.cache = new Map();
    this.cacheSize = 100;
    
    if (this.useLocalFallback) {
      console.warn('⚠️ [EMBEDDINGS] OpenAI API key not found - using local fallback');
    } else {
      console.log('✅ [EMBEDDINGS] Service initialized with OpenAI API');
    }
  }

  /**
   * Generate embedding for text using OpenAI API
   * @param {string} text - Text to embed
   * @returns {Promise<Object>} Result with embedding vector
   */
  async generateEmbedding(text) {
    if (!text || typeof text !== 'string') {
      return { success: false, error: 'Invalid text input' };
    }

    // Check cache first
    const cacheKey = this.hashText(text);
    if (this.cache.has(cacheKey)) {
      this.metrics.cacheHits++;
      console.log('💾 [EMBEDDINGS] Cache hit');
      return { 
        success: true, 
        embedding: this.cache.get(cacheKey),
        cached: true,
        dimensions: this.dimensions
      };
    }

    // Use local fallback if no API key
    if (this.useLocalFallback) {
      return this.generateLocalEmbedding(text);
    }

    try {
      // Call OpenAI embeddings API
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.openaiApiKey}`
        },
        body: JSON.stringify({
          model: this.model,
          input: text
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`OpenAI API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      const embedding = data.data[0].embedding;

      // Update metrics
      this.metrics.generateCount++;
      this.metrics.totalTokens += data.usage?.total_tokens || 0;

      // Cache the result
      this.addToCache(cacheKey, embedding);

      console.log(`✅ [EMBEDDINGS] Generated embedding (${embedding.length} dimensions)`);

      return {
        success: true,
        embedding,
        dimensions: embedding.length,
        model: this.model,
        tokens: data.usage?.total_tokens || 0
      };
    } catch (error) {
      console.error('❌ [EMBEDDINGS] Generation failed:', error);
      this.metrics.errorCount++;
      
      // Fallback to local embedding on error
      console.warn('⚠️ [EMBEDDINGS] Falling back to local embedding');
      return this.generateLocalEmbedding(text);
    }
  }

  /**
   * Generate embeddings for multiple texts (batch)
   * @param {string[]} texts - Array of texts to embed
   * @returns {Promise<Object>} Result with array of embeddings
   */
  async generateBatchEmbeddings(texts) {
    if (!Array.isArray(texts) || texts.length === 0) {
      return { success: false, error: 'Invalid texts input' };
    }

    // For local fallback or small batches, process one by one
    if (this.useLocalFallback || texts.length <= 3) {
      const results = await Promise.all(
        texts.map(text => this.generateEmbedding(text))
      );
      
      const embeddings = results.map(r => r.embedding);
      const success = results.every(r => r.success);
      
      return { 
        success, 
        embeddings,
        count: embeddings.length 
      };
    }

    try {
      // Call OpenAI embeddings API with batch
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.openaiApiKey}`
        },
        body: JSON.stringify({
          model: this.model,
          input: texts
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      const embeddings = data.data.map(item => item.embedding);

      // Update metrics
      this.metrics.generateCount += texts.length;
      this.metrics.totalTokens += data.usage?.total_tokens || 0;

      console.log(`✅ [EMBEDDINGS] Generated ${embeddings.length} embeddings in batch`);

      return {
        success: true,
        embeddings,
        count: embeddings.length,
        model: this.model,
        tokens: data.usage?.total_tokens || 0
      };
    } catch (error) {
      console.error('❌ [EMBEDDINGS] Batch generation failed:', error);
      this.metrics.errorCount++;
      
      // Fallback to processing one by one
      const results = await Promise.all(
        texts.map(text => this.generateLocalEmbedding(text))
      );
      
      return { 
        success: true, 
        embeddings: results.map(r => r.embedding),
        count: results.length,
        fallback: true
      };
    }
  }

  /**
   * Generate simple local embedding (fallback)
   * Uses hash-based vector generation for development/testing
   * @param {string} text - Text to embed
   * @returns {Promise<Object>} Result with embedding
   */
  async generateLocalEmbedding(text) {
    try {
      const embedding = new Array(this.dimensions).fill(0);
      
      // Simple hash-based embedding
      for (let i = 0; i < text.length; i++) {
        const charCode = text.charCodeAt(i);
        const index = (i * charCode) % this.dimensions;
        embedding[index] += charCode / 255.0;
      }
      
      // Normalize the embedding
      const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
      if (norm > 0) {
        for (let i = 0; i < embedding.length; i++) {
          embedding[i] /= norm;
        }
      }

      console.log('🔧 [EMBEDDINGS] Generated local fallback embedding');

      return {
        success: true,
        embedding,
        dimensions: this.dimensions,
        model: 'local-fallback'
      };
    } catch (error) {
      console.error('❌ [EMBEDDINGS] Local generation failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Simple text hashing for cache key
   * @param {string} text - Text to hash
   * @returns {string} Hash string
   */
  hashText(text) {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(36);
  }

  /**
   * Add embedding to cache with LRU eviction
   * @param {string} key - Cache key
   * @param {number[]} embedding - Embedding vector
   */
  addToCache(key, embedding) {
    if (this.cache.size >= this.cacheSize) {
      // Remove oldest entry (first key in Map)
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, embedding);
  }

  /**
   * Clear embedding cache
   */
  clearCache() {
    this.cache.clear();
    console.log('🧹 [EMBEDDINGS] Cache cleared');
  }

  /**
   * Get service metrics
   * @returns {Object} Metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      cacheSize: this.cache.size,
      cacheLimit: this.cacheSize,
      averageTokensPerEmbedding: this.metrics.generateCount > 0
        ? Math.round(this.metrics.totalTokens / this.metrics.generateCount)
        : 0,
      usingFallback: this.useLocalFallback
    };
  }
}

module.exports = new EmbeddingsService();
