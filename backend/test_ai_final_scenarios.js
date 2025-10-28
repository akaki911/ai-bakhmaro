
const axios = require('axios');

// ფინალური ტესტირების სცენარები Bakhmaro AI სისტემისთვის
const FINAL_TEST_SCENARIOS = [
  // 1. პლატფორმის მიმოხილვა
  {
    id: 'platform_overview',
    query: 'მომიყევი Bakhmaro backend-ის მთავარ სერვისებზე',
    expectedElements: ['developer_panel', 'device_recognition', 'audit_service', 'metrics'],
    description: 'Platform overview with structured layout'
  },

  // 2. უსაფრთხო მოწყობილობები
  {
    id: 'device_security',
    query: 'როგორ ხდება trusted device-ის იდენტიფიკაცია და ავტორიზაცია?',
    expectedElements: ['trusted_device_store', 'device_service', 'session', 'firestore'],
    description: 'Trusted device recognition flow'
  },

  // 3. ტექნიკური კითხვა
  {
    id: 'technical_components',
    query: 'რომელი ფაილები უზრუნველყოფს უსაფრთხოების აუდიტს?',
    expectedElements: ['audit_service.js', 'security_audit.js', 'logRouteDecision', 'FieldValue'],
    description: 'Technical file structure for audit logging'
  },

  // 4. გარემოს შემოწმება
  {
    id: 'environment_checks',
    query: 'როგორ ხდება გარემოს კონფიგურაციის შემოწმება verifyEnv სკრიპტით?',
    expectedElements: ['verifyEnv.js', 'runtimeConfig', 'checks', 'output'],
    description: 'Environment verification workflow'
  },

  // 5. საიდუმლოებების მართვა
  {
    id: 'secret_management',
    query: 'როგორ ხდება საიდუმლოებების მართვა და სინქრონიზაცია?',
    expectedElements: ['secretsScanner', 'secretsVault', 'secretsSyncService', 'alerts'],
    description: 'Secret management and sync explanation'
  },

  // 6. სუპერ ადმინის ფუნქციები
  {
    id: 'super_admin_functions',
    query: 'რა შეუძლია SUPER_ADMIN როლს?',
    expectedElements: ['manage_users', 'manage_roles', 'view_logs', 'advanced settings'],
    description: 'Super admin capabilities and permissions'
  },

  // 7. მისალმება და დახმარება
  {
    id: 'greeting_help',
    query: 'გამარჯობა, როგორ შემიძლია დახმარება?',
    expectedElements: ['მისალმება', 'დახმარების შეთავაზება', 'სერვისები'],
    description: 'Greeting and help offering'
  },

  // 8. მობილური რესპონსივობა
  {
    id: 'developer_utilities',
    query: 'რა ხელსაწყოები აქვს დეველოპერის პანელს?',
    expectedElements: ['bulk download', 'file tree', 'stats', 'health'],
    description: 'Developer tooling overview'
  },

  // 9. შეცდომების მართვა
  {
    id: 'error_handling',
    query: 'როგორ ხდება შეცდომების მართვა და მონიტორინგი?',
    expectedElements: ['ErrorBoundary', 'globalErrorHandler', 'logging'],
    description: 'Error handling and monitoring systems'
  },

  // 10. მომხმარებლის ავთენტიფიკაცია
  {
    id: 'user_authentication',
    query: 'როგორ მუშაობს მომხმარებლის ავთენტიფიკაცია და ავტორიზაცია?',
    expectedElements: ['Firebase Auth', 'ProtectedRoute', 'useAuth', 'roles'],
    description: 'Authentication and authorization flow'
  },

  // 11. მუქი თემა
  {
    id: 'observability',
    query: 'როგორ ხდება სისტემის მონიტორინგი და მეტრიკების შეგროვება?',
    expectedElements: ['prom-client', 'metrics', 'performance_monitoring', 'uptime'],
    description: 'Observability and metrics collection'
  },

  // 12. AI ასისტენტი
  {
    id: 'ai_assistant_functionality',
    query: 'რას აკეთებს AI ასისტენტი და როგორ მუშაობს?',
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
        const metadata = response.data.metadata || {};

        // შევამოწმოთ პასუხის ხარისხი
        const qualityChecks = {
          hasResponse: !!aiResponse,
          notEmpty: aiResponse.length > 50,
          containsBullets: /[•·▪▫]|\d+\.|\-\s/.test(aiResponse),
          inGeorgian: /[ა-ჰ]/.test(aiResponse),
          reasonableLength: aiResponse.length > 100 && aiResponse.length < 2000,
          fastResponse: responseTime < 15000,
          containsExpectedElements: scenario.expectedElements.some(element => 
            aiResponse.toLowerCase().includes(element.toLowerCase())
          )
        };

        const qualityScore = Object.values(qualityChecks).filter(Boolean).length;
        const maxScore = Object.keys(qualityChecks).length;
        const passed = qualityScore >= (maxScore * 0.7); // 70% threshold

        if (passed) {
          passedTests++;
          console.log(`✅ PASSED (${qualityScore}/${maxScore}) - ${responseTime}ms`);
        } else {
          console.log(`❌ FAILED (${qualityScore}/${maxScore}) - ${responseTime}ms`);
        }

        console.log(`📏 პასუხის სიგრძე: ${aiResponse.length} სიმბოლო`);
        console.log(`⚡ პასუხის დრო: ${responseTime}ms`);
        console.log(`🎯 ხარისხის ქულა: ${qualityScore}/${maxScore}`);
        
        // ვაჩვენოთ პასუხის ნაწილი
        const preview = aiResponse.substring(0, 200) + (aiResponse.length > 200 ? '...' : '');
        console.log(`💬 პასუხის preview: "${preview}"`);

        results.push({
          scenario: scenario.id,
          passed,
          responseTime,
          qualityScore,
          maxScore,
          qualityChecks,
          responseLength: aiResponse.length,
          metadata
        });

      } else {
        console.log(`❌ FAILED - არასწორი response status: ${response.status}`);
        results.push({
          scenario: scenario.id,
          passed: false,
          error: `HTTP ${response.status}`,
          responseTime
        });
      }

    } catch (error) {
      console.log(`❌ FAILED - შეცდომა: ${error.message}`);
      results.push({
        scenario: scenario.id,
        passed: false,
        error: error.message,
        responseTime: Date.now() - Date.now()
      });
    }

    // პაუზა ტესტებს შორის
    if (i < FINAL_TEST_SCENARIOS.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  // ფინალური შედეგები
  console.log('\n' + '='.repeat(60));
  console.log('🏁 ფინალური ტესტირების შედეგები');
  console.log('='.repeat(60));
  
  console.log(`✅ გავლილი ტესტები: ${passedTests}/${FINAL_TEST_SCENARIOS.length}`);
  console.log(`📊 წარმატების პროცენტი: ${Math.round((passedTests / FINAL_TEST_SCENARIOS.length) * 100)}%`);
  console.log(`⚡ საშუალო პასუხის დრო: ${Math.round(totalResponseTime / FINAL_TEST_SCENARIOS.length)}ms`);

  // ყველაზე ჩაშლილი ტესტები
  const failedTests = results.filter(r => !r.passed);
  if (failedTests.length > 0) {
    console.log('\n❌ ჩაშლილი ტესტები:');
    failedTests.forEach(test => {
      console.log(`  • ${test.scenario}: ${test.error || 'quality issues'}`);
    });
  }

  // ყველაზე ნელი ტესტები
  const slowTests = results.filter(r => r.responseTime > 10000);
  if (slowTests.length > 0) {
    console.log('\n🐌 ნელი ტესტები (>10s):');
    slowTests.forEach(test => {
      console.log(`  • ${test.scenario}: ${test.responseTime}ms`);
    });
  }

  // რეკომენდაციები
  console.log('\n📋 რეკომენდაციები:');
  if (passedTests === FINAL_TEST_SCENARIOS.length) {
    console.log('🎉 ყველა ტესტი წარმატებით გაიარა! AI სისტემა მზადაა პროდუქციისთვის.');
  } else if (passedTests >= FINAL_TEST_SCENARIOS.length * 0.8) {
    console.log('✨ AI სისტემა კარგ მდგომარეობაშია, მცირე გაუმჯობესებები საჭიროა.');
  } else {
    console.log('⚠️ AI სისტემას სჭირდება მნიშვნელოვანი გაუმჯობესებები.');
  }

  return results;
}

// მთავარი ფუნქცია
async function main() {
  try {
    await runFinalTests();
  } catch (error) {
    console.error('💥 ტესტირების შეცდომა:', error.message);
    process.exit(1);
  }
}

// გავუშვათ ტესტები
if (require.main === module) {
  main();
}

module.exports = {
  runFinalTests,
  FINAL_TEST_SCENARIOS
};
