/**
 * Bakhmaro AI Operations Platform - Static Site Information
 * ხელით მომზადებული ბაზისური ინფორმაცია ზუსტი პასუხებისთვის
 */

const BAKHMARO_PLATFORM_INFO = {
  title: "ბახმაროს AI ოპერაციების პლატფორმა",
  description: "გურულოს შიდა ოპერაციული გარემო დეველოპერული ინსტრუმენტებით, მონიტორინგით და უსაფრთხოების პოლიტიკებით",

  // ძირითადი ოპერაციული დომენები
  categories: {
    ai_operations: {
      name: "AI ოპერაციები",
      description: "Gurulo ასისტენტების მართვა და კონტექსტის ნაკადები",
      features: ["RAG არხები", "პომპტის კონტროლი", "სესიების ზედამხედველობა", "auto-update არხები"]
    },
    observability: {
      name: "მონიტორინგი",
      description: "სისტემური ჯანმრთელობის და შესრულების მეთვალყურეობა",
      features: ["SystemMonitoringDashboard", "PerformanceDashboard", "PostApplyHealthCheck", "watchdog სერვისები"]
    },
    security: {
      name: "უსაფრთხოება",
      description: "WebAuthn, მოწყობილობების ამოცნობა და უსაფრთხოების აუდიტი",
      features: ["Passkey მხარდაჭერა", "DeviceManagement", "SecurityAuditTab", "Safety Switch"]
    },
    collaboration: {
      name: "თანამშრომლობა",
      description: "GitHub ინტეგრაციები და საერთო სამუშაო ინსტრუმენტები",
      features: ["EnterpriseCollaboration", "GitHubManagement", "shared ლოგები", "LiveProgressPanel"]
    }
  },

  // ტექნიკური სისტემები
  technical_systems: {
    ai_orchestration: {
      name: "AI ორკესტრაცია",
      process: [
        "მოთხოვნის კლასიფიკაცია Gurulo-ს მიერ",
        "კონტექსტის შეკრება codeAnalyzer/fileService-ით",
        "პომპტის გამდიდრება და პოლიტიკის შემოწმება",
        "Groq პასუხის გენერაცია",
        "შედეგის ლოგირება და მონიტორინგი"
      ]
    },
    monitoring: {
      name: "მონიტორინგის სისტემა",
      components: [
        "SystemMonitoringDashboard", "PerformanceDashboard",
        "AutoUpdateMonitoringDashboard", "BackupSystemDashboard"
      ]
    },
    security: {
      name: "უსაფრთხოების მართვა",
      roles: [
        "Operator - ყოველდღიური ოპერაციები",
        "Admin - ადმინისტრატორი",
        "Super Admin - სუპერ ადმინისტრატორი"
      ]
    }
  },

  // ადმინისტრაციული ფუნქციები
  admin_features: {
    dashboard: "Operations Dashboard რეალურ დროში მეტრიკებით",
    monitoring: "მონიტორინგის პანელები და health-check-ები",
    ai_control: "Gurulo როლების და კონტექსტის მართვა",
    security: "Passkey/WebAuthn მოწყობილობების კონტროლი",
    audits: "SecurityAuditTab და ლოგების ანალიზი"
  },

  // ტექნოლოგიური სტეკი
  technologies: {
    frontend: "React + TypeScript + Tailwind CSS",
    backend: "Node.js + Express + Firebase",
    database: "Firestore (NoSQL)",
    auth: "Firebase Authentication & WebAuthn",
    ai: "Groq API (Llama models) + Gurulo Orchestration",
    deployment: "Replit Platform & Firebase"
  },

  // ძირითადი ფუნქციები
  core_features: [
    "ოპერაციული მონიტორინგი და health-check-ები",
    "AI კონტექსტის მართვა და RAG ნაკადები",
    "უსაფრთხოება Passkey/WebAuthn საშუალებით",
    "მაღალი გამტარუნარიანობის ლოგირება",
    "GitHub და შიდა ინტეგრაციების მხარდაჭერა",
    "Georgian-first UI/UX და მრავალი ენის მხარდაჭერა",
    "დაცვის და აღდგენის ავტომატიზირებული მექანიზმები"
  ]
};

// Enhanced განსაზღვრული შაბლონები RAG ოპტიმიზაციისთვის
const RESPONSE_TEMPLATES = {
  platform_overview: () => {
    return `🏔️ **ბახმაროს AI ოპერაციების პლატფორმა**

📋 **ოპერაციული დომენები:**
• 🤖 AI ოპერაციები - Gurulo ასისტენტის მართვა, კონტექსტის განახლება და RAG არხები
• 📈 მონიტორინგი - SystemMonitoringDashboard, PerformanceDashboard და health-check მოდულები
• 🔐 უსაფრთხოება - Passkey/WebAuthn, მოწყობილობის ამოცნობა, უსაფრთხოების აუდიტის ჩანაწერები
• 🤝 თანამშრომლობა - GitHub ინტეგრაციები, EnterpriseCollaboration და რეალურ დროში ლოგების გაზიარება

⚙️ **ბირთვული სერვისები:**
• AI კონტროლერი და Groq ინტეგრაცია
• ოპერაციების ავტომატიზაციის task-ები და rollout კონტროლი
• Health/diagnostics API-ები და watchdog მონიტორინგი
• არქივაციისა და ბექაფის კონტროლი

🔧 **ტექნოლოგიები:**
• Frontend: React + TypeScript + Tailwind CSS
• Backend: Node.js + Express + Firebase
• Database: Firestore (NoSQL)
• AI: Groq API (Llama models) + Gurulo ოპერაციული კომპოზიტორი
• Deployment: Replit Platform & Firebase`;
  },

  project_structure_detailed: () => {
    return `🏗️ **პროექტის დეტალური სტრუქტურა:**

📁 **Frontend Structure (ai-frontend/src/):**
• components/ - UI კომპონენტები (AIAssistantEnhanced.tsx, SystemMonitoringDashboard.tsx, PerformanceDashboard.tsx)
• components/futuristic-chat/ - AIChatInterface.tsx, LiveAgentView.tsx, SessionSidebar.tsx
• pages/ - GurulaManagementPage.tsx, DeviceManagement.tsx, AdminPasskeyLogin.tsx
• services/ - adminAiApi.ts, loggingService.ts, integrationRegistryService.ts
• utils/ - rateLimitHandler.ts, networkErrorDetection.ts, guruloCoreAdapter.ts

📁 **Backend Structure (backend/):**
• ai_controller.js - AI მოთხოვნების კონტროლერი და სტატიკური პასუხები
• services/ - site_summary.js, groq_service.js, codeAnalyzer.js, fileService.js
• utils/ - rpid.js, georgianTermNormalizer და უსაფრთხოების დამხმარე ფუნქციები
• routes/ - API endpoints და middleware-ები
• config/ - WebAuthn და პლატფორმის გარემოს კონფიგურაცია

📁 **AI Service (ai-service/):**
• core/ - task_manager.js, tool_registry.js, codexHelpers.js
• services/ - diagnostics და პრომპტის მენეჯმენტი
• server.js - მიკროსერვისის entry point`;
  },

  component_mapping: () => {
    return `🧩 **კომპონენტების რუკა:**

📋 **AI ოპერაციები:**
• AIAssistantEnhanced.tsx - მთავარი AI ოპერაციების პანელი
• AIChatInterface.tsx - რეალურ დროში დიალოგის ინტერფეისი
• LiveProgressPanel.tsx - სესიის პროგრესის აღრიცხვა

📋 **მონიტორინგი და ანალიტიკა:**
• SystemMonitoringDashboard.tsx - ინფრასტრუქტურის სტატუსი და health სიგნალები
• PerformanceDashboard.tsx - latency/throughput მეტრიკები
• PostApplyHealthCheck.tsx - განახლების შემდგომი ვალიდაცია

📋 **ადმინისტრაცია და უსაფრთხოება:**
• GurulaManagementPage.tsx - Gurulo ასისტენტების მართვა
• DeviceManagement.tsx - მოწყობილობების და WebAuthn კონფიგურაცია
• AdminLogs.tsx - ოპერაციული ლოგებისა და აქტივობების ნახვა`;
  },

  key_files_mapping: () => {
    return `🗂️ **მნიშვნელოვანი ფაილების რუკა:**

🔴 **Core Files:**
• ai-frontend/src/AIDashboardShell.tsx - მთავარი აპლიკაციის ჩარჩო
• backend/ai_controller.js - ცენტრალური AI კონტროლერი
• backend/services/site_summary.js - სტატიკური კონტექსტი და RAG რუკები
• ai-service/server.js - Gurulo AI მიკროსერვისი

🟡 **Operational Logic:**
• ai-frontend/src/components/SystemMonitoringDashboard.tsx - ოპერაციული მეტრიკები
• ai-frontend/src/services/adminAiApi.ts - ადმინ API ქოლ-აუთები
• backend/services/codeAnalyzer.js - RAG ფაილების ანალიზი
• functions/src/routes/ai_chat.js - Firebase Functions ინტერფეისი

🟢 **Supporting Files:**
• ai-frontend/src/utils/rateLimitHandler.ts - მოთხოვნების კონტროლი
• ai-frontend/src/utils/networkErrorDetection.ts - ქსელის დიაგნოსტიკა
• backend/utils/rpid.js - WebAuthn RPID კონფიგურაცია
• ai-service/core/tool_registry.js - ინსტრუმენტების რეგისტრი

🔵 **Configuration Files:**
• package.json - Dependencies
• tsconfig.json - TypeScript კონფიგურაცია
• firebase.json - Firebase deployment პარამეტრები
• vite.config.mts - Frontend build კონფიგურაცია`;
  },

  operations_flow: () => {
    return `🧭 **ოპერაციული ნაკადი:**

1️⃣ **კვეთის კლასიფიკაცია** - Gurulo განსაზღვრავს მოთხოვნის ტიპს და ამოარჩევს შესაბამის მოდულს
2️⃣ **კონტექსტის აგება** - codeAnalyzer და fileService ქმნიან ზუსტ სამუშაო კონტექსტს
3️⃣ **გადამოწმება** - უსაფრთხოების წესები, device recognition და rate limiter-ები აფილტრავენ რისკიან მოქმედებებს
4️⃣ **შესრულება** - AI ასისტენტი აწარმოებს მოთხოვნილ მოქმედებას ან პასუხს
5️⃣ **მონიტორინგი** - SystemMonitoringDashboard/PostApplyHealthCheck ადევნებს თვალს სტატუსს
6️⃣ **ლოგირება** - AdminLogs და loggingService ინახავს დეტალურ ჩანაწერებს`;
  },

  admin_panel: () => {
    return `👨‍💼 **ადმინისტრაციული პანელი:**

📊 **Operations Dashboard:**
• რეალურ დროში სტატუსი (კონტექსტი, მოდელების ხელმისაწვდომობა, პროცესების მდგომარეობა)
• Health/latency მეტრიკები და კონტროლი
• მონიტორინგის ალერტების მართვა

🔐 **უსაფრთხოების მართვა:**
• DeviceManagement.tsx - Passkey/WebAuthn მოწყობილობების რეგისტრაცია
• SecurityAuditTab.tsx - აუდიტის ჩანაწერების ნახვა
• SafetySwitch მოდული - მაღალრისკიანი ბრძანებების ბლოკირება

🧠 **AI ოპერაციები:**
• GurulaManagementPage.tsx - Gurulo ავატრების/როლების მართვა
• AIMemoryManager.tsx - კონტექსტის მეხსიერების კონტროლი
• AIRolloutManager.tsx - ავტომატური განახლების არხები`;
  },

  pricing_system: () => {
    return `🛡️ **Guardrail სისტემა და შესრულების კონტროლი:**

📈 **მონიტორინგის ტიპები:**
• PerformanceDashboard.tsx - latency და throughput ზღვარი
• AutoUpdateMonitoringDashboard.tsx - rollout სტატუსი და rollback პარამეტრები
• BackupSystemDashboard.tsx - მონაცემთა დაცვა

⚙️ **ავტომატიზაცია:**
• rateLimitHandler.ts - მოთხოვნების დოზირება
• safety switch-ები - რისკიანი ბრძანებების გაჩერება
• SystemCleanerService.ts - დროებითი მონაცემების მართვა

🎯 **ოპერაციული მიზნები:**
• მაღალი ხელმისაწვდომობა Gurulo-სთვის
• გამჭვირვალე ლოგირება და აუდიტი
• უსაფრთხო განახლებები და სწრაფი აღდგენა`;
  }
};

const COMPONENT_SUMMARIES = {
  'AIAssistantEnhanced': 'AI ოპერაციების მთავარი პანელი, სადაც Gurulo ასისტენტი მართავს კონტექსტს და პასუხებს.',
  'AIChatInterface': 'futuristic-chat მოდულის ინტერფეისი რეალურ დროში დიალოგებისთვის და developer ხელსაწყოებისთვის.',
  'SystemMonitoringDashboard': 'ინფრასტრუქტურის და სერვისების სტატუსის ვიზუალიზაცია რეალურ დროში მეტრიკებით.',
  'PerformanceDashboard': 'პერფორმანსის დეტალური მეტრიკები და latency/throughput მონიტორინგი.',
  'GurulaManagementPage': 'Gurulo ასისტენტების, როლებისა და პოლიტიკის კონფიგურაციის მართვა.',
  'DeviceManagement': 'Passkey/WebAuthn მოწყობილობების რეგისტრაცია და device recognition კონტროლი.',
  'AdminLogs': 'ოპერაციული ლოგების, აუდიტის ჩანაწერებისა და სისტემური შეტყობინებების ცენტრალიზებული ნახვა.'
};

// Topic to modules mapping for targeted RAG analysis
const topicToModules = {
  ai_operations: [
    'AIAssistantEnhanced.tsx', 'AIChatInterface.tsx', 'AIMemoryManager.tsx',
    'GurulaManagementPage.tsx', 'ai_controller.js'
  ],
  monitoring: [
    'SystemMonitoringDashboard.tsx', 'PerformanceDashboard.tsx', 'AutoUpdateMonitoringDashboard.tsx',
    'PostApplyHealthCheck.tsx', 'ai-service/server.js'
  ],
  security: [
    'DeviceManagement.tsx', 'SecurityAuditTab.tsx', 'rpid.js',
    'ai_admin.js'
  ],
  collaboration: [
    'GitHubManagement', 'EnterpriseCollaboration.tsx', 'AdminLogs.tsx',
    'integrationRegistryService.ts'
  ],
};

class SiteSummary {
  // Get modules for specific topic
  static getModulesForTopic(topic) {
    return topicToModules[topic] || [];
  }

  // Get all available topics
  static getAvailableTopics() {
    return Object.keys(topicToModules);
  }

  // Check if query is asking for static information
  isStaticInfoQuery(message) {
    const staticQueries = [
      'საიტის სრული ინფორმაცია',
      'პლატფორმის დეტალები', 
      'განსაზღვრული ინფორმაცია',
      'ჩემი საიტის აღწერა',
      'როგორ მუშაობს ჩემი საიტი',
      'პლატფორმის სტრუქტურა',
      'ბახმაროს სისტემა',
      'მოკლე შეჯამება',
      'bullet point ინფორმაცია'
    ];

    const lowerMessage = message.toLowerCase();
    return staticQueries.some(query => lowerMessage.includes(query.toLowerCase()));
  }
}

// Enhanced ძირითადი ექსპორტი RAG ოპტიმიზაციისთვის
const fs = require('fs');
const path = require('path');

module.exports = {
  BAKHMARO_PLATFORM_INFO,
  RESPONSE_TEMPLATES,

  // Enhanced Helper ფუნქცია კონკრეტული ინფორმაციისთვის
  getStaticResponse: (queryType) => {
    const templates = RESPONSE_TEMPLATES;

    switch (queryType.toLowerCase()) {
      case 'platform_overview':
      case 'site_info':
      case 'full_info':
        return templates.platform_overview();

      case 'project_structure_detailed':
      case 'project_structure':
      case 'structure_detailed':
        return templates.project_structure_detailed();

      case 'component_mapping':
      case 'components_overview':
        return templates.component_mapping();

      case 'key_files_mapping':
      case 'important_files':
        return templates.key_files_mapping();

      case 'operations_flow':
      case 'operations_overview':
        return templates.operations_flow();

      case 'admin_panel':
      case 'admin_features':
        return templates.admin_panel();

      case 'pricing_system':
      case 'pricing_info':
        return templates.pricing_system();

      default:
        return null;
    }
  },

  // NEW: RAG-specific query classification helper
  classifyForRAG: (message) => {
    const lowerMessage = message.toLowerCase();

    const ragPatterns = {
      'needs_multi_stage': [
        'მთელი საიტის შესახებ', 'სრული დეტალური ინფორმაცია', 'ყველაფერი რაც არის',
        'პროექტის სრული ანალიზი', 'მთლიანი სისტემის აღწერა'
      ],
      'needs_structure_focus': [
        'სტრუქტურა', 'არქიტექტურა', 'ორგანიზაცია', 'დირექტორიები',
        'ფოლდერები', 'ფაილების განლაგება'
      ],
      'needs_component_focus': [
        'კომპონენტები', 'მოდულები', 'სერვისები', 'React კომპონენტები',
        'ფუნქციონალი', 'UI ელემენტები'
      ],
      'needs_code_analysis': [
        'კოდის ანალიზი', 'ფუნქციები', 'იმპლემენტაცია', 'ალგორითმები',
        'ლოგიკა', 'როგორ მუშაობს კონკრეტულად'
      ]
    };

    for (const [type, patterns] of Object.entries(ragPatterns)) {
      if (patterns.some(pattern => lowerMessage.includes(pattern))) {
        return type;
      }
    }

    return 'general_rag';
  },

  // NEW: Get pre-built context for specific file types
  getPreBuiltContextForFiles: (fileTypes) => {
    const fileContexts = {
      'ai_operations': {
        description: 'AI ოპერაციების ცენტრალური ფაილები და Gurulo კონტროლი',
        keyFeatures: ['RAG კონტექსტი', 'პომპტის მართვა', 'auto-update არხები'],
        relatedFiles: ['ai-frontend/src/components/AIAssistantEnhanced.tsx', 'backend/ai_controller.js', 'backend/services/codeAnalyzer.js']
      },
      'monitoring': {
        description: 'მონიტორინგისა და health-check სისტემის ფაილები',
        keyFeatures: ['Realtime metrics', 'post-apply ვალიდაცია', 'watchdog სერვისები'],
        relatedFiles: ['ai-frontend/src/components/SystemMonitoringDashboard.tsx', 'ai-frontend/src/components/PostApplyHealthCheck.tsx', 'ai-frontend/src/components/AutoUpdateMonitoringDashboard.tsx']
      },
      'security': {
        description: 'უსაფრთხოების და აუდიტის ფაილები',
        keyFeatures: ['Passkey/WebAuthn', 'device recognition', 'audit trails'],
        relatedFiles: ['ai-frontend/src/pages/DeviceManagement.tsx', 'ai-frontend/src/components/SecurityAuditTab.tsx', 'backend/utils/rpid.js']
      },
      'collaboration': {
        description: 'თანამშრომლობისა და ინტეგრაციების ფაილები',
        keyFeatures: ['GitHub მართვა', 'ლოგების გაზიარება', 'integration registry'],
        relatedFiles: ['ai-frontend/src/components/GitHubManagement', 'ai-frontend/src/components/AdminLogs.tsx', 'ai-frontend/src/services/integrationRegistryService.ts']
      }
    };

    return fileTypes.map(type => fileContexts[type]).filter(Boolean);
  },

  // NEW: Get token-optimized summary
  getTokenOptimizedSummary: (maxTokens = 500) => {
    const baseInfo = BAKHMARO_PLATFORM_INFO;
    let summary = `🏔️ ბახმაროს AI ოპერაციების პლატფორმა\n\n`;

    if (maxTokens > 200) {
      summary += `📋 დომენები: AI ოპერაციები, მონიტორინგი, უსაფრთხოება, თანამშრომლობა\n`;
      summary += `⚙️ ინფრასტრუქტურა: React/TypeScript + Node.js/Express + Firebase + Groq\n`;
      summary += `🤖 AI: Gurulo orchestration + RAG pipeline-ები\n`;
    }

    if (maxTokens > 300) {
      summary += `🔧 ბირთვული სერვისები: codeAnalyzer, task_manager, watchdog და backup მოდულები\n`;
    }

    if (maxTokens > 400) {
      summary += `🔐 უსაფრთხოების ელემენტები: Passkey/WebAuthn, device recognition, audit logs\n`;
      summary += `📡 მონიტორინგი: SystemMonitoringDashboard, PerformanceDashboard, AutoUpdateMonitoringDashboard\n`;
    }

    return summary;
  },

  // ზოგადი პლატფორმის ინფორმაცია
  getPlatformInfo: () => BAKHMARO_PLATFORM_INFO,

  // Enhanced შემოწმება - არის თუ არა კითხვა "სტატიკური" ტიპის
  isStaticInfoQuery: (message) => {
    const staticQueries = [
      'საიტის სრული ინფორმაცია',
      'პლატფორმის დეტალები', 
      'განსაზღვრული ინფორმაცია',
      'ჩემი საიტის აღწერა',
      'როგორ მუშაობს ჩემი საიტი',
      'პლატფორმის სტრუქტურა',
      'ბახმაროს სისტემა',
      'მოკლე შეჯამება',
      'bullet point ინფორმაცია'
    ];

    const lowerMessage = message.toLowerCase();
    return staticQueries.some(query => lowerMessage.includes(query.toLowerCase()));
  },

  // NEW: Check if query requires multi-stage processing
  requiresMultiStageRAG: (message) => {
    const multiStageIndicators = [
      'მთელი საიტის შესახებ დაწვრილებითი ინფორმაცია',
      'სრული პროექტის ანალიზი',
      'ყველაფერი რაც არის',
      'დეტალური აღწერა მთელი პლატფორმის',
      'კომპლექსური ანალიზი',
      'comprehensive analysis'
    ];

    const lowerMessage = message.toLowerCase();
    return multiStageIndicators.some(indicator => lowerMessage.includes(indicator));
  },

  // Get modules for specific topic
  getModulesForTopic: (topic) => {
    return SiteSummary.getModulesForTopic(topic);
  },

  // Get all available topics
  getAvailableTopics: () => {
    return SiteSummary.getAvailableTopics();
  }
};
