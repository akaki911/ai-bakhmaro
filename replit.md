# Bakhmaro AI Operations Platform

## Overview
This project powers the internal Bakhmaro AI operations workspace, focusing on developer tooling, observability dashboards, and safeguard automations. It ensures the resilience of a multi-service platform through a modern frontend, a robust backend, and an advanced AI service. The AI service incorporates RAG capabilities for live codebase awareness, session management, and compliance-focused assistants. The platform prioritizes security, performance, seamless user experience, and full Georgian language support.

## User Preferences
- Project uses Georgian language as primary interface
- Clean, modern UI design with Tailwind CSS
- Multi-service architecture with proper separation of concerns
- Production-grade AI capabilities with real codebase awareness

## System Architecture
The platform features a multi-service architecture:
-   **Frontend**: React + TypeScript + Vite (Port 5000), styled with Tailwind CSS.
-   **Backend**: Node.js + Express (Port 5002) for API requests and authentication.
-   **AI Service**: Node.js microservice (Port 5001) with advanced Retrieval-Augmented Generation (RAG) for codebase understanding, real-time file monitoring, and intelligent safety switches.
-   **Database**: PostgreSQL with pgvector extension for semantic search and vector memory.
-   **UI/UX**: Clean, modern design with full Georgian language support across all interfaces.
-   **Technical Implementations**:
    -   **Firebase Integration**: Unified configuration for data persistence (Firestore) and session management.
    -   **Proxy Routing**: Vite proxy for seamless communication.
    -   **Authentication**: Secure endpoint migration and authentication guards.
    -   **Port Management Security**: Industrial-grade port management with advanced security and service restart capabilities.
    -   **Autonomous Agent (PROJECT "AUTONOMY")**: Unified RAG system with multi-source context, conversational memory fix for Georgian, secure terminal control, and intelligent safety switches.
    -   **Real-time Code Intelligence (PROJECT "PHOENIX")**: ProjectIntelligenceService for real-time file scanning, context building, and sensitive file exclusion.
    -   **Enhanced File System Monitor**: API endpoints for real-time monitoring, changes, insights, security reports, and complexity analysis.
    -   **Developer Console**: Features an enhanced file tree with search, a multi-tab terminal, and a lightweight code preview.
    -   **Security Hardening**: Prevention of package installation bypasses, destructive command confirmation, and terminal command validation.
    -   **Workspace Executor**: Secure JavaScript code execution using `isolated-vm` for true V8 isolate-based sandboxing, resource limits, and dangerous pattern detection. This includes a visual execution interface in the Developer Console with SSE streaming.
    -   **Semantic Memory System**: Full end-to-end integration of Vector Memory into the AI Chat system, including semantic search, UI indicators, and memory persistence.
    -   **Git Native Integration**: PostgreSQL-backed Git metrics history storage with performance trend analysis and latency reduction calculations.
    -   **Vector Memory & Semantic Search**: Self-hosted vector database using PostgreSQL pgvector, OpenAI embeddings API integration with LRU cache and local fallback, and a dedicated API and frontend UI for managing vector memories.

## External Dependencies
-   **PostgreSQL**: Primary database for persistence, including pgvector extension.
-   **Groq API**: Utilized by the AI service.
-   **OpenAI API**: Used for embeddings generation (text-embedding-ada-002).
-   **Chokidar**: For real-time file system monitoring.
-   **React-Syntax-Highlighter**: For code preview.
-   **Firebase**: For data persistence and session management.