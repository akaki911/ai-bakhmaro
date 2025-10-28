/**
 * Gurulo AI Development Workspace - Static Site Information
 * Curated reference data for consistent answers about the ai.bakhmaro.co platform.
 */

const GURULO_PLATFORM_INFO = {
  title: 'Gurulo AI Development Workspace',
  description: 'Full-stack AI engineering environment that powers ai.bakhmaro.co and the Gurulo assistant.',

  focusAreas: {
    ai_assistant: {
      name: 'Gurulo Assistant',
      description: 'Conversational AI developer partner that understands the monorepo and automates maintenance tasks.',
      features: [
        'Context-aware chat with repository introspection',
        'Automatic proposal drafting and task breakdowns',
        'Memory layer for long-running initiatives'
      ]
    },
    automation: {
      name: 'Automation Toolkit',
      description: 'Scripts and services that execute repository updates, monitoring, and diagnostics.',
      features: [
        'Repository analysis and static code intelligence',
        'Autonomous change execution with safeguards',
        'CI health and performance tracking'
      ]
    },
    monitoring: {
      name: 'AI Service Monitoring',
      description: 'Health checks and analytics for Groq models plus fallback orchestration.',
      features: [
        'Model routing with latency tracking',
        'System watchdog for runtime anomalies',
        'Enhanced logging for diagnostics'
      ]
    }
  },

  technologies: {
    frontend: 'React + Next.js + Tailwind CSS',
    backend: 'Node.js + Express + Firebase integrations',
    ai: 'Groq LLaMA models with OpenAI fallback support',
    tooling: 'pnpm workspace with automated scripts and diagnostics'
  },

  coreCapabilities: [
    'AI-powered code exploration and explanation',
    'Repository-wide semantic search and embeddings',
    'Automated task execution via trusted operations',
    'Project health reporting and incident detection',
    'Integrated developer tooling dashboards'
  ]
};

const RESPONSE_TEMPLATES = {
  platform_overview: () => {
    return `🧠 **Gurulo AI Development Workspace**\n\n` +
      `• **Purpose:** Full-stack environment dedicated to AI development on ai.bakhmaro.co\n` +
      `• **Assistant:** Gurulo — repository-aware AI developer partner\n` +
      `• **Focus Areas:** automation toolkit, AI service monitoring, developer experience enhancements\n` +
      `• **Core Capabilities:** semantic search, task automation, diagnostics, AI prompt management\n` +
      `• **Stack:** React/Next.js frontend, Node.js/Express services, Firebase infrastructure, Groq + OpenAI models`;
  },

  project_structure_detailed: () => {
    return `🏗️ **Project Structure Highlights**\n\n` +
      `📁 **ai-service/** — Express service hosting the Gurulo orchestration layer\n` +
      `  • controllers/ai_controller.js — primary entrypoint for chat, streaming, and health endpoints\n` +
      `  • services/ — Groq integration, memory systems, automation utilities, monitoring helpers\n` +
      `  • context/ — system prompts, repository context, and workspace metadata\n\n` +
      `📁 **ai-frontend/** — UI for interacting with Gurulo and viewing diagnostics\n` +
      `  • src/features/ai-assistant/ — conversational interface components\n` +
      `  • src/features/ops-center/ — automation dashboards and task history\n\n` +
      `📁 **backend/** — supporting APIs, background jobs, and integration scripts\n` +
      `📁 **functions/** — Firebase cloud functions for scheduled automation and hooks\n` +
      `📁 **shared/** — common utilities, policies, and memory adapters used by multiple services`;
  },

  component_mapping: () => {
    return `🧩 **Key Components & Services**\n\n` +
      `• gurulo_intent_router.js — classifies developer questions and routes to specialized flows\n` +
      `• prompt_manager.js — builds adaptive system and user prompts for model calls\n` +
      `• codeAnalyzer.js — inspects repository files for insights and impact analysis\n` +
      `• site_summary.js — curated facts about the AI workspace\n` +
      `• trusted_ops_policy.js — enforces guardrails for automated code execution\n` +
      `• ai-frontend/src/features/ai-assistant/ — primary UI for interacting with Gurulo`;
  },

  key_files_mapping: () => {
    return `🗂️ **High-Value Files**\n\n` +
      `• ai-service/server.js — Express bootstrap and route wiring\n` +
      `• ai-service/controllers/ai_controller.js — request handling and orchestration\n` +
      `• ai-service/services/groq_service.js — Groq SDK integration and health checks\n` +
      `• ai-service/services/consolidated_memory_service.js — long-term memory access layer\n` +
      `• ai-service/context/system_prompts.js — system prompt registry for Gurulo\n` +
      `• shared/gurulo-core/* — core policies, automation rules, and shared helpers`;
  },

  automation_pipeline: () => {
    return `⚙️ **Automation Pipeline**\n\n` +
      `1️⃣ **Intent Routing:** gurulo_intent_router.js identifies the requested workflow\n` +
      `2️⃣ **Context Assembly:** context_retrieval_service.js gathers repository facts and memory\n` +
      `3️⃣ **Execution:** repository_automation_service.js and trusted_ops execute approved operations\n` +
      `4️⃣ **Validation:** enhanced_error_handler.js and performance_monitoring.js track outcomes\n` +
      `5️⃣ **Reporting:** ai_metrics_service.js records analytics for dashboards`;
  },

  monitoring_stack: () => {
    return `📊 **Monitoring Stack**\n\n` +
      `• System Watchdog — watches process health, filesystem signals, and queue pressure\n` +
      `• groq_connection_manager.js — connection pooling with latency metrics\n` +
      `• ai_metrics_service.js — aggregates call statistics and error rates\n` +
      `• replit_monitor_service.js — tracks deployment heartbeat and environment state\n` +
      `• diagnostics/ scripts — quick entry points for health checks and validations`;
  }
};

const COMPONENT_SUMMARIES = {
  GuruloAssistant: 'Conversation engine that coordinates Groq responses with repository context.',
  AutomationToolkit: 'Execution layer for repository automation and diagnostics.',
  MonitoringSuite: 'Health monitoring utilities and analytics collectors for AI workloads.'
};

const topicToModules = {
  ai_services: [
    'ai-service/controllers/ai_controller.js',
    'ai-service/services/groq_service.js',
    'ai-service/services/gurulo_response_builder.js'
  ],
  automation: [
    'ai-service/services/repository_automation_service.js',
    'ai-service/services/trusted_ops_policy.js',
    'ai-service/services/auto_issue_detector.js'
  ],
  monitoring: [
    'ai-service/services/system_watchdog.js',
    'ai-service/services/performance_monitoring.js',
    'ai-service/services/health_monitor.js'
  ],
  frontend_ai: [
    'ai-frontend/src/features/ai-assistant',
    'ai-frontend/src/features/ops-center'
  ]
};

class SiteSummary {
  static getModulesForTopic(topic) {
    return topicToModules[topic] || [];
  }

  static getAvailableTopics() {
    return Object.keys(topicToModules);
  }

  isStaticInfoQuery(message) {
    const staticQueries = [
      'ai პლატფორმის დეტალები',
      'გურულო პლატფორმის შესახებ',
      'workspace overview',
      'platform overview',
      'ai development summary',
      'პროექტის სრული აღწერა'
    ];

    const lowerMessage = message.toLowerCase();
    return staticQueries.some(query => lowerMessage.includes(query.toLowerCase()));
  }
}

module.exports = {
  GURULO_PLATFORM_INFO,
  RESPONSE_TEMPLATES,
  COMPONENT_SUMMARIES,

  getStaticResponse: (queryType) => {
    if (!queryType) return null;

    const key = queryType.toLowerCase();

    switch (key) {
      case 'platform_overview':
      case 'site_info':
      case 'full_info':
        return RESPONSE_TEMPLATES.platform_overview();
      case 'project_structure_detailed':
      case 'project_structure':
      case 'structure_detailed':
        return RESPONSE_TEMPLATES.project_structure_detailed();
      case 'component_mapping':
      case 'components_overview':
        return RESPONSE_TEMPLATES.component_mapping();
      case 'key_files_mapping':
      case 'important_files':
        return RESPONSE_TEMPLATES.key_files_mapping();
      case 'automation_pipeline':
      case 'automation_overview':
        return RESPONSE_TEMPLATES.automation_pipeline();
      case 'monitoring_stack':
      case 'monitoring_overview':
        return RESPONSE_TEMPLATES.monitoring_stack();
      default:
        return null;
    }
  },

  classifyForRAG: (message) => {
    const lowerMessage = message.toLowerCase();

    const ragPatterns = {
      needs_multi_stage: [
        'სრული პროექტის ანალიზი',
        'სრული დეტალური ინფორმაცია',
        'comprehensive analysis',
        'platform overview'
      ],
      needs_structure_focus: [
        'სტრუქტურა', 'არქიტექტურა', 'ორგანიზაცია', 'დირექტორიები', 'folders'
      ],
      needs_component_focus: [
        'კომპონენტები', 'სერვისები', 'modules', 'ui components'
      ],
      needs_code_analysis: [
        'კოდის ანალიზი', 'implementation detail', 'როგორ მუშაობს', 'logic explanation'
      ]
    };

    for (const [type, patterns] of Object.entries(ragPatterns)) {
      if (patterns.some(pattern => lowerMessage.includes(pattern))) {
        return type;
      }
    }

    return 'general_rag';
  },

  getPreBuiltContextForFiles: (fileTypes) => {
    const fileContexts = {
      ai_core: {
        description: 'Core Gurulo orchestration files inside ai-service.',
        keyFeatures: ['Groq integration', 'system prompts', 'stream orchestration'],
        relatedFiles: [
          'ai-service/controllers/ai_controller.js',
          'ai-service/services/groq_service.js',
          'ai-service/context/system_prompts.js'
        ]
      },
      automation: {
        description: 'Automation services coordinating repository actions.',
        keyFeatures: ['Trusted operations', 'error handling', 'task execution'],
        relatedFiles: [
          'ai-service/services/repository_automation_service.js',
          'ai-service/services/trusted_ops_policy.js',
          'ai-service/services/auto_issue_detector.js'
        ]
      },
      monitoring: {
        description: 'Monitoring and health tracking utilities.',
        keyFeatures: ['watchdog', 'performance metrics', 'alerts'],
        relatedFiles: [
          'ai-service/services/system_watchdog.js',
          'ai-service/services/performance_monitoring.js',
          'ai-service/services/health_monitor.js'
        ]
      },
      frontend_ai: {
        description: 'Frontend modules for interacting with Gurulo.',
        keyFeatures: ['chat interface', 'operations center', 'diagnostics views'],
        relatedFiles: [
          'ai-frontend/src/features/ai-assistant',
          'ai-frontend/src/features/ops-center'
        ]
      }
    };

    return (fileTypes || [])
      .map(type => fileContexts[type])
      .filter(Boolean);
  },

  getTokenOptimizedSummary: (maxTokens = 500) => {
    let summary = '🧠 Gurulo AI Development Workspace\n\n';

    if (maxTokens > 200) {
      summary += 'Focus: AI assistant orchestration, automation toolkit, monitoring stack\n';
      summary += 'Stack: React/Next.js, Node.js/Express, Firebase, Groq/OpenAI\n';
    }

    if (maxTokens > 300) {
      summary += 'Capabilities: semantic search, trusted automation, diagnostics, memory\n';
    }

    if (maxTokens > 400) {
      summary += 'Key directories: ai-service/, ai-frontend/, backend/, functions/, shared/\n';
    }

    return summary;
  },

  getPlatformInfo: () => GURULO_PLATFORM_INFO,

  isStaticInfoQuery: (message) => {
    const summaryHelper = new SiteSummary();
    return summaryHelper.isStaticInfoQuery(message);
  },

  requiresMultiStageRAG: (message) => {
    const indicators = [
      'სრული პროექტის ანალიზი',
      'comprehensive analysis',
      'platform architecture overview',
      'დეტალური აღწერა მთელი პლატფორმის'
    ];

    const lowerMessage = message.toLowerCase();
    return indicators.some(indicator => lowerMessage.includes(indicator));
  },

  getModulesForTopic: (topic) => SiteSummary.getModulesForTopic(topic),

  getAvailableTopics: () => SiteSummary.getAvailableTopics()
};
