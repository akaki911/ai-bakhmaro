/**
 * ტესტი 1: გრამატიკული სისწორე
 * ტესტავს გურულოს გრამატიკულ სისწორეს ქართულ ენაზე
 */

const axios = require('axios');

const AI_SERVICE_URL = 'http://localhost:8008';
const GRAMMAR_TEST_QUERIES = [
  {
    query: 'გამარჯობა, როგორ ხარ?',
    expectedGrammar: 'სწორი გამარჯობა და კითხვა'
  },
  {
    query: 'მითხარი რა არის პროექტის სტრუქტურა',
    expectedGrammar: 'სწორი წინადადება'
  },
  {
    query: 'შეამოწმე ეს კოდი და მითხარი რა შეცდომებია',
    expectedGrammar: 'სწორი ბრძანება'
  },
  {
    query: 'რა განსხვავებაა ჯავასკრიპტსა და პითონს შორის',
    expectedGrammar: 'სწორი შედარება'
  }
];

async function testGrammarCorrectness() {
  console.log('📝 დაწყება: გრამატიკული სისწორის ტესტი\n');

  for (const testCase of GRAMMAR_TEST_QUERIES) {
    console.log(`💬 კითხვა: "${testCase.query}"`);
    console.log(`🎯 მოსალოდნელი: ${testCase.expectedGrammar}`);

    try {
      const startTime = Date.now();

      const response = await axios.post(`${AI_SERVICE_URL}/api/ai/chat`, {
        message: testCase.query,
        userId: 'grammar_test_user'
      });

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      console.log(`✅ პასუხი მიღებულია ${responseTime}ms-ში`);
      console.log(`🧠 მოდელი: ${response.data.model}`);
      console.log(`📝 პასუხი: ${response.data.response.substring(0, 300)}...`);

      if (response.data.success) {
        // გრამატიკული შემოწმება
        const responseText = response.data.response;

        // მარტივი გრამატიკული შემოწმებები
        const hasGeorgian = /[ა-ჰ]/.test(responseText);
        const hasProperPunctuation = /[.!?]$/.test(responseText.trim());
        const hasCompleteSentences = responseText.split(/[.!?]/).length > 1;

        console.log(`🇬🇪 ქართული ტექსტი: ${hasGeorgian ? '✅' : '❌'}`);
        console.log(`❓ პუნქტუაცია: ${hasProperPunctuation ? '✅' : '❌'}`);
        console.log(`📄 სრული წინადადებები: ${hasCompleteSentences ? '✅' : '❌'}`);

        // ხელით შემოწმება საჭიროა დეტალური გრამატიკისთვის
        console.log(`⚠️  ხელით შემოწმება საჭიროა დეტალური გრამატიკისთვის`);
      } else {
        console.log(`❌ მოთხოვნა ჩავარდა: ${response.data.error || 'უცნობი შეცდომა'}`);
      }

    } catch (error) {
      console.error(`❌ ტესტი ჩავარდა: ${error.message}`);
    }

    console.log('─'.repeat(80) + '\n');

    // დაყოვნება ტესტებს შორის
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('📊 გრამატიკული ტესტი დასრულებულია. გთხოვთ, განიხილეთ პასუხები ხელით.');
}

// გაუშვი ტესტი
if (require.main === module) {
  testGrammarCorrectness().catch(console.error);
}

module.exports = { testGrammarCorrectness };
