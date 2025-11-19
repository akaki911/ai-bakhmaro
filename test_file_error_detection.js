/**
 * ტესტი 2: ფაილის შეცდომების აღმოჩენა და მოგვარება
 * ტესტავს გურულოს შესაძლებლობას აღმოაჩინოს და გაასწოროს კოდის შეცდომები
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

const AI_SERVICE_URL = 'http://localhost:8008';

// შექმენი დეფექტური კოდის ფაილი ტესტირებისთვის
const buggyCode = `
// დეფექტური JavaScript კოდი ტესტირებისთვის
function calculateSum(a, b) {
  // შეცდომა: ცვლადი არ არის გამოცხადებული
  result = a + b;
  return result;
}

// შეცდომა: ფუნქცია არასწორად გამოიყენება
console.log(calculateSum(5, 10));

// შეცდომა: სინტაქსური შეცდომა
function greetUser(name) {
  console.log("გამარჯობა, " + name!
}

// შეცდომა: ლოგიკური შეცდომა
function isEven(number) {
  if (number % 2 = 0) {  // უნდა იყოს ===
    return true;
  }
  return false;
}
`;

const testFilePath = path.join(__dirname, 'test_buggy_code.js');

// შექმენი დეფექტური ფაილი
fs.writeFileSync(testFilePath, buggyCode);

const ERROR_DETECTION_QUERIES = [
  {
    query: `შეამოწმე ეს ფაილი: ${testFilePath} და მითხარი რა შეცდომებია`,
    expectedErrors: ['ცვლადი result არ არის გამოცხადებული', 'სინტაქსური შეცდომა greetUser ფუნქციაში', 'ლოგიკური შეცდომა isEven ფუნქციაში (= უნდა იყოს ===)']
  },
  {
    query: `გაასწორე შეცდომები ამ ფაილში: ${testFilePath}`,
    expectedFixes: ['დაამატე var/let/const result-სთვის', 'გაასწორე სინტაქსი greetUser-ში', 'შეცვალე = ===-ით isEven-ში']
  }
];

async function testFileErrorDetection() {
  console.log('🔧 დაწყება: ფაილის შეცდომების აღმოჩენის ტესტი\n');

  for (const testCase of ERROR_DETECTION_QUERIES) {
    console.log(`💬 კითხვა: "${testCase.query}"`);
    console.log(`🎯 მოსალოდნელი შეცდომები/გასწორებები: ${testCase.expectedErrors.join(', ')}`);

    try {
      const startTime = Date.now();

      const response = await axios.post(`${AI_SERVICE_URL}/api/ai/chat`, {
        message: testCase.query,
        userId: 'error_detection_test_user'
      });

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      console.log(`✅ პასუხი მიღებულია ${responseTime}ms-ში`);
      console.log(`🧠 მოდელი: ${response.data.model}`);
      console.log(`📝 პასუხი: ${response.data.response.substring(0, 500)}...`);

      if (response.data.success) {
        // შეამოწმე შეცდომების აღმოჩენა
        const responseText = response.data.response.toLowerCase();

        let detectedErrors = 0;
        testCase.expectedErrors.forEach(expectedError => {
          const errorKey = expectedError.toLowerCase();
          if (responseText.includes('შეცდომ') || responseText.includes('error') ||
              responseText.includes('result') || responseText.includes('greetuser') ||
              responseText.includes('iseven') || responseText.includes('=')) {
            detectedErrors++;
          }
        });

        console.log(`🔍 აღმოჩენილი შეცდომები: ${detectedErrors}/${testCase.expectedErrors.length}`);

        // შეამოწმე გასწორების შეთავაზებები
        const hasFixSuggestions = responseText.includes('გაასწორე') ||
                                 responseText.includes('შეცვალე') ||
                                 responseText.includes('დაამატე') ||
                                 responseText.includes('fix') ||
                                 responseText.includes('correct');

        console.log(`🔧 გასწორების შეთავაზებები: ${hasFixSuggestions ? '✅' : '❌'}`);
      } else {
        console.log(`❌ მოთხოვნა ჩავარდა: ${response.data.error || 'უცნობი შეცდომა'}`);
      }

    } catch (error) {
      console.error(`❌ ტესტი ჩავარდა: ${error.message}`);
    }

    console.log('─'.repeat(80) + '\n');

    // დაყოვნება ტესტებს შორის
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  // წაშალე ტესტის ფაილი
  try {
    fs.unlinkSync(testFilePath);
    console.log('🗑️ ტესტის ფაილი წაშლილია');
  } catch (err) {
    console.warn('⚠️ ტესტის ფაილის წაშლა ვერ მოხერხდა:', err.message);
  }

  console.log('📊 ფაილის შეცდომების ტესტი დასრულებულია.');
}

// გაუშვი ტესტი
if (require.main === module) {
  testFileErrorDetection().catch(console.error);
}

module.exports = { testFileErrorDetection };
