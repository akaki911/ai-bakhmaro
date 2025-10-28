
const { askGroq } = require('./services/groq_service');

const testQuestions = [
  {
    id: 1,
    question: 'რა ფუნქცია აქვს repository_automation_service.js-ში?',
    context: 'ეს კითხვა ეხება ავტომატიზაციის ნაკადის ლოგიკას'
  },
  {
    id: 2,
    question: 'როგორ მუშაობს gurulo_intent_router.js?',
    context: 'ეს კითხვა ეხება მოთხოვნების კლასიფიკაციის მექანიზმს'
  },
  {
    id: 3,
    question: 'რა როლს ასრულებს system_watchdog.js?',
    context: 'ეს კითხვა ეხება მონიტორინგისა და უსაფრთხოების ფუნქციას'
  },
  {
    id: 4,
    question: 'როგორ ფორმირდება სისტემური პრომპტი Gurulo-სთვის?',
    context: 'ეს კითხვა ეხება prompt_manager-ის ლოგიკას'
  }
];

async function testGroqResponses() {
  console.log('🧪 Testing Groq API responses...');
  
  for (const test of testQuestions) {
    console.log(`\n📝 Test ${test.id}: ${test.question}`);
    
    try {
      const response = await askGroq(test.question);
      
      console.log(`✅ Response received (length: ${response.length})`);
      console.log(`📄 First 200 chars: ${response.substring(0, 200)}...`);
      
      // Check Georgian language quality
      const georgianChars = (response.match(/[ა-ჰ]/g) || []).length;
      const totalChars = response.length;
      const georgianPercentage = (georgianChars / totalChars) * 100;
      
      console.log(`🇬🇪 Georgian content: ${georgianPercentage.toFixed(1)}%`);
      
      // Check for common Georgian grammar issues
      const hasArtificialPatterns = /შესრულება მოხდა|ანალიზის ჩატარება|მოქმედების განხორციელება/.test(response);
      console.log(`📝 Artificial patterns: ${hasArtificialPatterns ? '❌ Found' : '✅ Clean'}`);
      
      // Check response relevance 
      const keywords = ['ფუნქცია', 'მუშაობს', 'ლოგიკა', 'სერვისი', 'კომპონენტი'];
      const hasRelevantKeywords = keywords.some(keyword => response.includes(keyword));
      console.log(`🎯 Relevance: ${hasRelevantKeywords ? '✅ Good' : '❌ Poor'}`);
      
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }
    
    // Wait between requests
    await new Promise(resolve => setTimeout(resolve, 1500));
  }
  
  console.log('\n🏁 Groq testing completed!');
}

// Run tests if script is executed directly
if (require.main === module) {
  testGroqResponses().catch(console.error);
}

module.exports = { testGroqResponses };
