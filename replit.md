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
    -   **Git Native Service (Phase 1)**: Comprehensive Git integration with native commands and GitHub API fallback. Features include Chokidar file watcher for auto-commit functionality, Firestore secrets vault with AES-256-CBC encryption for credentials, Octokit fallback mechanism when native commands fail, and PostgreSQL-backed performance metrics with latency tracking.
    -   **Vector Memory & Semantic Search**: Self-hosted vector database using PostgreSQL pgvector, OpenAI embeddings API integration with LRU cache and local fallback, and a dedicated API and frontend UI for managing vector memories.
    -   **UnifiedConsole (Phase 4)**: Replit-style unified developer interface combining Chat, Terminal, Memory, Logs, and Execution panels in a single screen. Features resizable split panels, collapsible sidebars (Services, Metrics, Logs), StatusBar with real-time metrics (connection, CPU, RAM, errors), QuickActionsToolbar (Cmd+K command palette), and responsive design for mobile and desktop.
    -   **Cloud Run Auto-Execution Layer (Phase 5)**: Production deployment infrastructure with Google Cloud Run orchestration. Includes cloudrun_executor.js for container lifecycle management (deploy, execute, scale, terminate), cloudbuild.yaml for multi-stage builds across all services, auto_deploy_trigger.js with Firestore triggers for automated deployments, and cost_monitor_service.js for usage tracking, budget alerts, and optimization recommendations.
    -   **Gurulo Response Rendering Fix (Nov 2025)**: Fixed critical frontend bug where Gurulo AI responses displayed raw JSON instead of plainText. Frontend now correctly passes full gurulo-core payload to parseAssistantPayload, allowing parseGuruloCoreCandidate and adaptGuruloCorePayload to extract plainText properly. Both streaming and non-streaming response flows validated.
    -   **Mail System Integration (Nov 2025)**: Complete IMAP/SMTP email management system integrated into Gurulo AI Developer Panel. Features include:
        - **Frontend**: 11 modular components migrated from standalone mail/ app (Sidebar, EmailList, EmailListItem, EmailDetail, ComposeModal, Header, Settings, icons, hooks, types, services)
        - **Backend API**: Full REST API at /api/mail/* routes (CRUD accounts, fetchEmails, sendEmail, moveEmail)
        - **Session Management**: express-session middleware configured in backend/index.js with MemoryStore for development
        - **Integration**: guruloService.ts refactored to use backend API via ai-frontend/src/services/mailService.ts
        - **UI/UX**: Gurulo theme (#050914 bg, cyan-500 accents, white/5 borders, rounded-2xl) applied across all 7 main components
        - **State Management**: MailTab.tsx implements mail/App.tsx complete logic (account switching, folder navigation, email composition)
        - **Default Account**: gurulo@bakhmaro.co (PrivateEmail.com IMAP/SMTP) for system notifications
        - **Pending Backend**: Custom folders, tags, and drafts temporarily use localStorage (marked with TODO comments)
        - **Fixed**: ComposeModal auto-save timeout cleanup to prevent memory leaks
        - **Fixed (Nov 16)**: Frontend API routing - apiBase.shared.js now detects local development (localhost, .replit.dev) and forces relative URLs to use Vite proxy instead of production backend. Development session auto-initialization in MailTab.tsx for personalId 01019062020 (SUPER_ADMIN)
    -   **Authentication Security Hardening (Nov 17, 2025)**: Eliminated critical security vulnerability where unauthorized users could access the system as SUPER_ADMIN without authentication. Changes include:
        - **Removed Development Bypasses**: Deleted auto-session creation endpoint `/api/mail/dev/init-session` from backend/routes/mail.js
        - **Frontend Protection**: Removed `ensureDevSession()` function and all invocations from AuthContext.tsx
        - **Route Guard Hardening**: Removed development mode authentication bypass from ProtectedRoute.tsx (lines 25-27)
        - **Guest Access Disabled**: Set `VITE_ENABLE_PUBLIC_CHAT=false` environment variable
        - **Email Validation Fixed**: Corrected admin email from `admin@bakhmaro.com` to `admin@bakhmaro.co`
        - **Access Restriction**: Only Akaki Tsintadze (personal ID: 01019062020, email: admin@bakhmaro.co) can access as SUPER_ADMIN
        - **Authentication Enforced**: Unauthenticated users now see login page with WebAuthn (Passkey) and Fallback code options
        - **Verified Protection**: Backend returns 401 Unauthorized for unauthenticated requests, frontend properly enforces authentication checks

## External Dependencies
-   **PostgreSQL**: Primary database for persistence, including pgvector extension.
-   **Groq API**: Utilized by the AI service.
-   **OpenAI API**: Used for embeddings generation (text-embedding-ada-002).
-   **Chokidar**: For real-time file system monitoring.
-   **React-Syntax-Highlighter**: For code preview.
-   **Firebase**: For data persistence and session management.
-   **Nodemailer**: For SMTP email sending functionality.
-   **PrivateEmail.com**: Mail server for gurulo@bakhmaro.co (IMAP: mail.privateemail.com:993, SMTP: mail.privateemail.com:465).