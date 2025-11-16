/**
 * API Client Abstraction Layer
 * 
 * This file centralizes all communication with the backend.
 * Currently, it re-exports the mock service functions.
 * To connect to a real backend, you only need to change this file
 * to make real fetch() calls to your API endpoints.
 */
 
// Re-export all functions from the mock service.
// This allows the rest of the application to be decoupled
// from the data source implementation.
export * from './services/guruloService';
