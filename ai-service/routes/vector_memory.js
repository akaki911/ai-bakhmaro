'use strict';

const express = require('express');
const router = express.Router();
const { requireAssistantAuth } = require('../middleware/service_auth');

/**
 * Vector Memory API Routes
 * 
 * Provides RESTful API for vector memory management:
 * - Store embeddings with automatic text embedding
 * - Semantic search using cosine similarity
 * - Retrieve and delete specific memories
 * - View statistics and metrics
 * 
 * Phase 3: Vector Memory Integration
 */

// Instantiate services (singleton pattern)
const VectorMemoryService = require('../services/vector_memory_service');
const EmbeddingsService = require('../services/embeddings_service');

const vectorMemoryService = new VectorMemoryService();
const embeddingsService = new EmbeddingsService();

/**
 * POST /api/ai/vector-memory/embeddings
 * Store text with automatic embedding generation
 * 
 * Body:
 *   - text: string (required) - Text to store
 *   - metadata: object (optional) - Additional metadata
 *   - source: string (optional) - Source type (knowledge_base, conversation, code)
 *   - userId: string (optional) - User ID (defaults to authenticated user)
 *   - embedding: number[] (optional) - Pre-computed embedding (1536-dim)
 */
router.post('/embeddings', requireAssistantAuth, async (req, res) => {
  try {
    const { text, metadata = {}, source = 'conversation', userId, embedding } = req.body;

    // Validation
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'ტექსტი სავალდებულოა',
        errorEn: 'Text is required'
      });
    }

    if (text.length > 10000) {
      return res.status(400).json({
        success: false,
        error: 'ტექსტი ძალიან გრძელია (მაქს. 10,000 სიმბოლო)',
        errorEn: 'Text is too long (max 10,000 characters)'
      });
    }

    // Auto-generate embedding if not provided
    let finalEmbedding = embedding;
    if (!finalEmbedding) {
      const embeddingResult = await embeddingsService.generateEmbedding(text);
      
      if (!embeddingResult || !embeddingResult.success) {
        return res.status(500).json({
          success: false,
          error: 'ვექტორის გენერირება ვერ მოხერხდა',
          errorEn: 'Failed to generate embedding',
          details: embeddingResult?.error || 'Unknown error'
        });
      }
      
      finalEmbedding = embeddingResult.embedding;
    }

    // Store in vector memory
    const targetUserId = userId || req.user?.userId || 'system';
    const result = await vectorMemoryService.storeEmbedding(
      text,
      finalEmbedding,
      metadata,
      source,
      targetUserId
    );

    // Check if store was successful
    if (!result || !result.success) {
      return res.status(500).json({
        success: false,
        error: 'მეხსიერების შენახვა ვერ მოხერხდა',
        errorEn: 'Failed to store memory',
        details: result?.error || 'Unknown error'
      });
    }

    res.json({
      success: true,
      data: result,
      message: 'მეხსიერება წარმატებით შენახულია',
      messageEn: 'Memory stored successfully'
    });

  } catch (error) {
    console.error('❌ [VECTOR MEMORY API] Store error:', error);
    res.status(500).json({
      success: false,
      error: 'მეხსიერების შენახვა ვერ მოხერხდა',
      errorEn: 'Failed to store memory',
      details: error.message
    });
  }
});

/**
 * POST /api/ai/vector-memory/search
 * Semantic search using text query or embedding
 * 
 * Body:
 *   - query: string (optional) - Text query for semantic search
 *   - embedding: number[] (optional) - Pre-computed embedding vector
 *   - limit: number (optional) - Max results (default: 10, max: 100)
 *   - threshold: number (optional) - Minimum similarity score (0-1)
 *   - source: string (optional) - Filter by source type
 *   - userId: string (optional) - Filter by user ID
 */
router.post('/search', requireAssistantAuth, async (req, res) => {
  try {
    const {
      query,
      embedding,
      limit = 10,
      threshold = 0.7,
      source,
      userId
    } = req.body;

    // Validation - either query or embedding must be provided
    if (!query && !embedding) {
      return res.status(400).json({
        success: false,
        error: 'query ან embedding სავალდებულოა',
        errorEn: 'Either query or embedding is required'
      });
    }

    if (limit > 100) {
      return res.status(400).json({
        success: false,
        error: 'limit არ უნდა აღემატებოდეს 100-ს',
        errorEn: 'Limit must not exceed 100'
      });
    }

    // Generate embedding from query if not provided
    let searchEmbedding = embedding;
    if (!searchEmbedding && query) {
      const embeddingResult = await embeddingsService.generateEmbedding(query);
      
      if (!embeddingResult || !embeddingResult.success) {
        return res.status(500).json({
          success: false,
          error: 'ვექტორის გენერირება ვერ მოხერხდა',
          errorEn: 'Failed to generate embedding',
          details: embeddingResult?.error || 'Unknown error'
        });
      }
      
      searchEmbedding = embeddingResult.embedding;
    }

    // Perform semantic search
    const searchResult = await vectorMemoryService.findSimilar(searchEmbedding, {
      limit,
      threshold,
      source,
      userId
    });

    // Check if search was successful
    if (!searchResult || !searchResult.success) {
      return res.status(500).json({
        success: false,
        error: 'ძიება ვერ მოხერხდა',
        errorEn: 'Search failed',
        details: searchResult?.error || 'Unknown error'
      });
    }

    const results = searchResult.results || [];

    res.json({
      success: true,
      data: results,
      query: query || '(embedding provided)',
      count: results.length,
      message: `${results.length} შედეგი მოიძებნა`,
      messageEn: `Found ${results.length} results`
    });

  } catch (error) {
    console.error('❌ [VECTOR MEMORY API] Search error:', error);
    res.status(500).json({
      success: false,
      error: 'ძიება ვერ მოხერხდა',
      errorEn: 'Search failed',
      details: error.message
    });
  }
});

/**
 * GET /api/ai/vector-memory/stats
 * Get vector memory statistics and metrics
 * IMPORTANT: Must be before /:id to avoid route collision
 */
router.get('/stats', requireAssistantAuth, async (req, res) => {
  try {
    const stats = await vectorMemoryService.getStats();

    if (!stats || !stats.success) {
      return res.status(500).json({
        success: false,
        error: 'სტატისტიკის წაკითხვა ვერ მოხერხდა',
        errorEn: 'Failed to retrieve statistics',
        details: stats?.error
      });
    }

    res.json({
      success: true,
      data: stats.data || stats,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ [VECTOR MEMORY API] Stats error:', error);
    res.status(500).json({
      success: false,
      error: 'სტატისტიკის წაკითხვა ვერ მოხერხდა',
      errorEn: 'Failed to retrieve statistics',
      details: error.message
    });
  }
});

/**
 * GET /api/ai/vector-memory/:id
 * Retrieve specific memory by ID
 */
router.get('/:id', requireAssistantAuth, async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        error: 'არასწორი ID',
        errorEn: 'Invalid ID'
      });
    }

    const result = await vectorMemoryService.getEmbedding(parseInt(id));

    if (!result || !result.success) {
      return res.status(404).json({
        success: false,
        error: 'მეხსიერება არ მოიძებნა',
        errorEn: 'Memory not found',
        details: result?.error
      });
    }

    res.json({
      success: true,
      data: result.data || result
    });

  } catch (error) {
    console.error('❌ [VECTOR MEMORY API] Get error:', error);
    res.status(500).json({
      success: false,
      error: 'მეხსიერების წაკითხვა ვერ მოხერხდა',
      errorEn: 'Failed to retrieve memory',
      details: error.message
    });
  }
});

/**
 * DELETE /api/ai/vector-memory/:id
 * Delete specific memory by ID
 */
router.delete('/:id', requireAssistantAuth, async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        error: 'არასწორი ID',
        errorEn: 'Invalid ID'
      });
    }

    const result = await vectorMemoryService.deleteEmbedding(parseInt(id));

    if (!result || !result.success) {
      const statusCode = result?.error?.includes('not found') ? 404 : 500;
      return res.status(statusCode).json({
        success: false,
        error: result?.error?.includes('not found') ? 'მეხსიერება არ მოიძებნა' : 'მეხსიერების წაშლა ვერ მოხერხდა',
        errorEn: result?.error?.includes('not found') ? 'Memory not found' : 'Failed to delete memory',
        details: result?.error
      });
    }

    res.json({
      success: true,
      message: 'მეხსიერება წაშლილია',
      messageEn: 'Memory deleted successfully'
    });

  } catch (error) {
    console.error('❌ [VECTOR MEMORY API] Delete error:', error);
    res.status(500).json({
      success: false,
      error: 'მეხსიერების წაშლა ვერ მოხერხდა',
      errorEn: 'Failed to delete memory',
      details: error.message
    });
  }
});

module.exports = router;