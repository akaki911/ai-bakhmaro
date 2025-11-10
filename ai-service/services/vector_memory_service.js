'use strict';

const { Pool } = require('pg');

/**
 * Vector Memory Service
 * 
 * Provides semantic search capabilities using PostgreSQL pgvector extension.
 * Stores and retrieves text embeddings for intelligent context-aware search.
 * 
 * Features:
 * - Store text with vector embeddings in PostgreSQL
 * - Semantic search using cosine similarity
 * - Metadata-based filtering
 * - Rolling cache for frequently accessed embeddings
 * 
 * Phase 3: Vector Memory Integration
 */
class VectorMemoryService {
  constructor() {
    // Database connection with proper SSL handling
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? true : false,
      max: 20, // Maximum pool size
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000
    });
    
    this.isInitialized = false;
    this.embeddingDimensions = 1536; // OpenAI ada-002 / Groq embeddings
    
    // Cache for frequently accessed embeddings
    this.cache = new Map();
    this.cacheSize = 100;
    this.cacheTTL = 5 * 60 * 1000; // 5 minutes
    
    // Metrics
    this.metrics = {
      storeCount: 0,
      searchCount: 0,
      cacheHits: 0,
      cacheMisses: 0
    };
    
    console.log('🧠 [VECTOR MEMORY] Service initialized');
  }

  /**
   * Initialize the vector memory service
   * Verifies pgvector extension and table existence
   */
  async initialize() {
    if (this.isInitialized) {
      return { success: true, message: 'Already initialized' };
    }

    try {
      // Check if pgvector extension exists
      const extensionCheck = await this.pool.query(
        `SELECT EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'vector') as exists`
      );
      
      if (!extensionCheck.rows[0].exists) {
        console.warn('⚠️ [VECTOR MEMORY] pgvector extension not found - attempting to create');
        await this.pool.query('CREATE EXTENSION IF NOT EXISTS vector');
      }

      // Check if memory_embeddings table exists
      const tableCheck = await this.pool.query(
        `SELECT EXISTS(SELECT 1 FROM information_schema.tables 
         WHERE table_name = 'memory_embeddings') as exists`
      );
      
      if (!tableCheck.rows[0].exists) {
        console.warn('⚠️ [VECTOR MEMORY] memory_embeddings table not found - run migrations first');
        return { 
          success: false, 
          error: 'memory_embeddings table not found. Run migration 002_create_vector_memory.sql' 
        };
      }

      this.isInitialized = true;
      console.log('✅ [VECTOR MEMORY] Initialized successfully');
      
      return { success: true, message: 'Vector memory service ready' };
    } catch (error) {
      console.error('❌ [VECTOR MEMORY] Initialization failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Store text with its embedding in PostgreSQL
   * @param {string} text - Text to store
   * @param {number[]} embedding - Vector embedding (1536 dimensions)
   * @param {Object} metadata - Additional metadata
   * @param {string} source - Source type (knowledge_base, conversation, code, etc.)
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Result with stored embedding ID
   */
  async storeEmbedding(text, embedding, metadata = {}, source = 'conversation', userId = 'system') {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // Validate embedding dimensions
      if (!embedding || embedding.length !== this.embeddingDimensions) {
        throw new Error(`Invalid embedding dimensions. Expected ${this.embeddingDimensions}, got ${embedding?.length || 0}`);
      }

      // Convert embedding array to pgvector format
      const embeddingVector = `[${embedding.join(',')}]`;

      // Insert into database
      const result = await this.pool.query(
        `INSERT INTO memory_embeddings (text, embedding, metadata, source, user_id, created_at)
         VALUES ($1, $2, $3, $4, $5, now())
         RETURNING id, created_at`,
        [text, embeddingVector, JSON.stringify(metadata), source, userId]
      );

      this.metrics.storeCount++;
      
      console.log(`✅ [VECTOR MEMORY] Stored embedding ID: ${result.rows[0].id}`);
      
      return {
        success: true,
        id: result.rows[0].id,
        createdAt: result.rows[0].created_at
      };
    } catch (error) {
      console.error('❌ [VECTOR MEMORY] Failed to store embedding:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Find similar embeddings using cosine similarity
   * @param {number[]} queryEmbedding - Query vector embedding
   * @param {Object} options - Search options
   * @returns {Promise<Array>} Similar embeddings with similarity scores
   */
  async findSimilar(queryEmbedding, options = {}) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const {
      limit = 5,
      threshold = 0.7,  // Minimum similarity threshold (0-1)
      source = null,    // Filter by source type
      userId = null,    // Filter by user
      metadata = null   // Filter by metadata fields
    } = options;

    try {
      // Validate query embedding
      if (!queryEmbedding || queryEmbedding.length !== this.embeddingDimensions) {
        throw new Error(`Invalid query embedding dimensions. Expected ${this.embeddingDimensions}`);
      }

      // Convert to pgvector format
      const queryVector = `[${queryEmbedding.join(',')}]`;

      // Build WHERE clauses
      const whereClauses = [];
      const params = [queryVector, limit];
      let paramIndex = 3;

      if (source) {
        whereClauses.push(`source = $${paramIndex}`);
        params.push(source);
        paramIndex++;
      }

      if (userId) {
        whereClauses.push(`user_id = $${paramIndex}`);
        params.push(userId);
        paramIndex++;
      }

      if (metadata) {
        for (const [key, value] of Object.entries(metadata)) {
          whereClauses.push(`metadata->>'${key}' = $${paramIndex}`);
          params.push(value);
          paramIndex++;
        }
      }

      const whereClause = whereClauses.length > 0 
        ? `WHERE ${whereClauses.join(' AND ')}` 
        : '';

      // Query for similar embeddings using cosine distance
      // Note: <-> is cosine distance (lower is better, 0 = identical)
      // We convert to similarity: 1 - distance (higher is better, 1 = identical)
      const query = `
        SELECT 
          id,
          text,
          metadata,
          source,
          user_id,
          created_at,
          1 - (embedding <-> $1::vector) AS similarity
        FROM memory_embeddings
        ${whereClause}
        ORDER BY embedding <-> $1::vector
        LIMIT $2
      `;

      const result = await this.pool.query(query, params);
      
      // Filter by similarity threshold
      const results = result.rows
        .filter(row => row.similarity >= threshold)
        .map(row => ({
          id: row.id,
          text: row.text,
          metadata: row.metadata,
          source: row.source,
          userId: row.user_id,
          similarity: parseFloat(row.similarity.toFixed(4)),
          createdAt: row.created_at
        }));

      this.metrics.searchCount++;
      
      console.log(`🔍 [VECTOR MEMORY] Found ${results.length} similar embeddings (threshold: ${threshold})`);
      
      return { success: true, results };
    } catch (error) {
      console.error('❌ [VECTOR MEMORY] Search failed:', error);
      return { success: false, error: error.message, results: [] };
    }
  }

  /**
   * Delete embedding by ID
   * @param {number} id - Embedding ID
   * @returns {Promise<Object>} Result
   */
  async deleteEmbedding(id) {
    try {
      const result = await this.pool.query(
        'DELETE FROM memory_embeddings WHERE id = $1 RETURNING id',
        [id]
      );

      if (result.rowCount === 0) {
        return { success: false, error: 'Embedding not found' };
      }

      console.log(`🗑️ [VECTOR MEMORY] Deleted embedding ID: ${id}`);
      return { success: true, id };
    } catch (error) {
      console.error('❌ [VECTOR MEMORY] Delete failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get embedding by ID
   * @param {number} id - Embedding ID
   * @returns {Promise<Object>} Embedding data
   */
  async getEmbedding(id) {
    try {
      const result = await this.pool.query(
        `SELECT id, text, metadata, source, user_id, created_at, updated_at
         FROM memory_embeddings
         WHERE id = $1`,
        [id]
      );

      if (result.rowCount === 0) {
        return { success: false, error: 'Embedding not found' };
      }

      const row = result.rows[0];
      return {
        success: true,
        embedding: {
          id: row.id,
          text: row.text,
          metadata: row.metadata,
          source: row.source,
          userId: row.user_id,
          createdAt: row.created_at,
          updatedAt: row.updated_at
        }
      };
    } catch (error) {
      console.error('❌ [VECTOR MEMORY] Get embedding failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get statistics about stored embeddings
   * @returns {Promise<Object>} Statistics
   */
  async getStats() {
    try {
      const result = await this.pool.query(`
        SELECT 
          COUNT(*) as total_embeddings,
          COUNT(DISTINCT source) as sources,
          COUNT(DISTINCT user_id) as users,
          MIN(created_at) as oldest,
          MAX(created_at) as newest
        FROM memory_embeddings
      `);

      const stats = result.rows[0];
      
      return {
        success: true,
        stats: {
          totalEmbeddings: parseInt(stats.total_embeddings),
          sources: parseInt(stats.sources),
          users: parseInt(stats.users),
          oldest: stats.oldest,
          newest: stats.newest,
          metrics: this.metrics
        }
      };
    } catch (error) {
      console.error('❌ [VECTOR MEMORY] Get stats failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Cleanup: close database connections
   */
  async shutdown() {
    try {
      await this.pool.end();
      console.log('✅ [VECTOR MEMORY] Shutdown complete');
    } catch (error) {
      console.error('❌ [VECTOR MEMORY] Shutdown error:', error);
    }
  }
}

module.exports = VectorMemoryService;
