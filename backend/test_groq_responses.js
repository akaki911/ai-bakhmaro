
const { askGroq } = require('./services/groq_service');

const testQuestions = [
  {
    id: 1,
    question: "რა პასუხისმგებლობა აქვს audit_service.js-ში logRouteDecision ფუნქციას?",
    context: "ეს კითხვა ეხება აუდიტის სერვისის ქცევას"
  },
  {
    id: 2,
    question: "როგორ მუშაობს trusted device ამოცნობის პროცესი backend-ში?",
    context: "ეს კითხვა ეხება device_service-ის ლოგიკას"
  },
  {
    id: 3,
    question: "რისთვის გამოიყენება secretsScanner სერვისი?",
    context: "ეს კითხვა ეხება უსაფრთხოების სკანირების ფუნქციებს"
  },
  {
    id: 4,
    question: "როგორ ეხმარება developer_panel.js დეველოპერებს?",
    context: "ეს კითხვა ეხება დეველოპერის პანელის შესაძლებლობებს"
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
