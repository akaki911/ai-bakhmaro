const axios = require('axios');

// ფინალური ტესტირების სცენარები Gurulo AI Workspace-ისთვის
const FINAL_TEST_SCENARIOS = [
  {
    id: 'platform_overview',
    query: 'მომიყევი Gurulo AI Workspace-ის ძირითადი მოდულები',
    expectedElements: ['Automation toolkit', 'Monitoring stack', 'Memory layer', 'AI assistant'],
    description: 'Platform overview with structured layout'
  },
  {
    id: 'automation_pipeline',
    query: 'ნაბიჯ-ნაბიჯ აღწერე როგორ მუშაობს repository_automation_service',
    expectedElements: ['intent routing', 'context assembly', 'trusted execution', 'validation'],
    description: 'Automation flow explanation'
  },
  {
    id: 'role_permissions',
    query: 'რა შესაძლებლობები აქვს Gurulo-ს admin როლს?',
    expectedElements: ['manage_automation', 'view_metrics', 'approve_changes'],
    description: 'Role permissions and access levels'
  },
  {
    id: 'technical_components',
    query: 'რომელი ფაილები მართავენ Gurulo-ს პასუხის აგებას?',
    expectedElements: ['ai_controller.js', 'gurulo_intent_router.js', 'prompt_manager.js'],
    description: 'Technical file structure for response orchestration'
  },
  {
    id: 'resource_usage',
    query: 'როგორ კონტროლდება რესურსების ხარჯი AI სერვისში?',
    expectedElements: ['performance_monitoring', 'system_watchdog', 'Groq metrics'],
    description: 'Resource usage and monitoring explanation'
  },
  {
    id: 'automation_guardrails',
    query: 'როგორ ხდება Trusted Ops ოპერაციების დაცვა?',
    expectedElements: ['trusted_ops_policy', 'repository_automation_service', 'audit logs'],
    description: 'Automation safety and guardrails'
  },
  {
    id: 'super_admin_functions',
    query: 'რა შეუძლია SUPER_ADMIN როლს Gurulo-ში?',
    expectedElements: ['manage_users', 'manage_roles', 'view_logs', 'toggle_automation'],
    description: 'Super admin capabilities and permissions'
  },
  {
    id: 'greeting_help',
    query: 'გამარჯობა, როგორ შემიძლია დახმარება?',
    expectedElements: ['მისალმება', 'დახმარების შეთავაზება', 'სერვისები'],
    description: 'Greeting and help offering'
  },
  {
    id: 'workspace_responsiveness',
    query: 'რა უზრუნველყოფს UI-ის რესპონსიულობას დეველოპერულ დაფაზე?',
    expectedElements: ['Tailwind CSS', 'responsive design', 'layout primitives'],
    description: 'UI responsiveness and design approach'
  },
  {
    id: 'error_handling',
    query: 'როგორ ხდება შეცდომების მართვა და მონიტორინგი?',
    expectedElements: ['ErrorBoundary', 'globalErrorHandler', 'logging'],
    description: 'Error handling and monitoring systems'
  },
  {
    id: 'auth_flow',
    query: 'როგორ მუშაობს ავტენტიფიკაცია და ავტორიზაცია დეველოპერულ სივრცეში?',
    expectedElements: ['Firebase Auth', 'ProtectedRoute', 'useAuth', 'roles'],
    description: 'Authentication and authorization flow'
  },
  {
    id: 'messaging_system',
    query: 'როგორ მუშაობს შეტყობინებების სისტემა დეველოპერულ გუნდში?',
    expectedElements: ['MessagingSystem', 'real-time', 'notifications'],
    description: 'Internal messaging and notification system'
  },
  {
    id: 'automation_audit',
    query: 'როგორ ხდება ავტომატიზაციის შედეგების აუდიტი?',
    expectedElements: ['auto_issue_detector', 'proposal_memory_module', 'audit logs'],
    description: 'Automation auditing and history'
  },
  {
    id: 'dark_theme',
    query: 'როგორ მუშაობს მუქი/ღია თემების სისტემა?',
    expectedElements: ['ThemeContext', 'dark mode', 'localStorage', 'toggle'],
    description: 'Dark/light theme system implementation'
  },
  {
    id: 'ai_assistant_functionality',
    query: 'რას აკეთებს Gurulo AI ასისტენტი და როგორ მუშაობს?',
    expectedElements: ['Groq API', 'Georgian language', 'memory system', 'streaming'],
    description: 'AI assistant functionality and features'
  }
];

const BASE_URL = 'http://localhost:5001';
const AI_ENDPOINT = `${BASE_URL}/api/ai/chat`;

async function runFinalTests() {
  console.log('🚀 დაწყებულია AI სისტემის ფინალური ტესტირება...\n');

  const results = [];
  let passedTests = 0;
  let totalResponseTime = 0;

  for (let i = 0; i < FINAL_TEST_SCENARIOS.length; i++) {
    const scenario = FINAL_TEST_SCENARIOS[i];
    console.log(`\n📝 ტესტი ${i + 1}/${FINAL_TEST_SCENARIOS.length}: ${scenario.id}`);
    console.log(`❓ კითხვა: "${scenario.query}"`);
    console.log(`📋 მოსალოდნელი: ${scenario.description}`);

    try {
      const startTime = Date.now();

      const response = await axios.post(AI_ENDPOINT, {
        message: scenario.query,
        userId: 'test_final_user'
      }, {
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const responseTime = Date.now() - startTime;
      totalResponseTime += responseTime;

      if (response.status === 200 && response.data.response) {
        const aiResponse = response.data.response;
        const plainText = typeof aiResponse === 'string' ? aiResponse : aiResponse.plainText;

        const matches = scenario.expectedElements.every((element) =>
          plainText && plainText.toLowerCase().includes(element.toLowerCase())
        );

        if (matches) {
          console.log('✅ ტესტი წარმატებულია');
          passedTests += 1;
        } else {
          console.log('⚠️ ტესტი ვერ გადავიდა მოსალოდნელ კრიტერიუმებზე');
        }

        results.push({
          scenario: scenario.id,
          passed: matches,
          responseTime,
          response: plainText
        });
      } else {
        console.log('❌ AI პასუხი არ მოიძებნა');
      }
    } catch (error) {
      console.error('❌ ტესტის შეცდომა:', error.message);
      results.push({ scenario: scenario.id, passed: false, error: error.message });
    }
  }

  const averageResponseTime = Math.round(totalResponseTime / FINAL_TEST_SCENARIOS.length);
  console.log(`\n📊 ტესტირების შედეგები: ${passedTests}/${FINAL_TEST_SCENARIOS.length} წარმატებული`);
  console.log(`⏱️ საშუალო პასუხის დრო: ${averageResponseTime}ms`);

  return { results, passedTests, averageResponseTime };
}

module.exports = { runFinalTests, FINAL_TEST_SCENARIOS };
