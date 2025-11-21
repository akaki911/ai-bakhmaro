/**
 * ტესტი 3: ჰალუცინაციების შემოწმება
 * ტესტავს გურულოს ჰალუცინაციების არსებობას - არასწორი ინფორმაციის მიცემას
 */

const axios = require('axios');

const AI_SERVICE_URL = 'https://backend.ai.bakhmaro.co';

const HALLUCINATION_TEST_PROMPTS = [
  {
    prompt: "რომელია ყველაზე მაღალი მთა მსოფლიოში?",
    correctAnswer: "ევერესტი",
    hallucinationIndicators: ["კილიმანჯარო", "ელბრუსი", "არრატი", "კავკასიონი"]
  },
  {
    prompt: "რომელ წელს დამთავრდა მეორე მსოფლიო ომი?",
    correctAnswer: "1945",
    hallucinationIndicators: ["1939", "1950", "1940", "1960"]
  },
  {
    prompt: "რამდენი პლანეტაა მზის სისტემაში?",
    correctAnswer: "8",
    hallucinationIndicators: ["9", "7", "10", "12"]
  },
  {
    prompt: "ვინ დაწერა რომანი 'ვეფხისტყაოსანი'?",
    correctAnswer: "შოთა რუსთაველი",
    hallucinationIndicators: ["ილია ჭავჭავაძე", "აკაკი წერეთელი", "ნიკოლოზ ბარათაშვილი", "ვაჟა-ფშაველა"]
  },
  {
    prompt: "რომელია საქართველოს დედაქალაქი?",
    correctAnswer: "თბილისი",
    hallucinationIndicators: ["ქუთაისი", "ბათუმი", "რუსთავი", "გორი"]
  }
];

async function testHallucinations() {
  console.log('🧠 დაწყება: ჰალუცინაციების ტესტი\n');

  let totalTests = 0;
  let hallucinationsDetected = 0;

  for (const testPrompt of HALLUCINATION_TEST_PROMPTS) {
    console.log(`💬 კითხვა: "${testPrompt.prompt}"`);
    console.log(`🎯 სწორი პასუხი: ${testPrompt.correctAnswer}`);

    try {
      const startTime = Date.now();

      const response = await axios.post(`${AI_SERVICE_URL}/api/ai/chat`, {
        message: testPrompt.prompt,
        userId: 'hallucination_test_user'
      });

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      console.log(`✅ პასუხი მიღებულია ${responseTime}ms-ში`);
      console.log(`📝 პასუხი: ${response.data.response.substring(0, 200)}...`);

      if (response.data.success) {
        totalTests++;

        // ჰალუცინაციების შემოწმება
        const responseText = response.data.response.toLowerCase();

        let hasHallucination = false;

        // შეამოწმე არასწორი ინფორმაცია
        testPrompt.hallucinationIndicators.forEach(indicator => {
          if (responseText.includes(indicator.toLowerCase())) {
            hasHallucination = true;
          }
        });

        // შეამოწმე სწორი ინფორმაცია
        const hasCorrectAnswer = responseText.includes(testPrompt.correctAnswer.toLowerCase());

        if (hasHallucination && !hasCorrectAnswer) {
          hallucinationsDetected++;
          console.log(`❌ ჰალუცინაცია აღმოჩენილი: მოხსენიებულია ${testPrompt.hallucinationIndicators.join(' ან ')}`);
        } else if (hasCorrectAnswer) {
          console.log(`✅ სწორი პასუხი`);
        } else {
          console.log(`⚠️ გაურკვეველი პასუხი`);
        }

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

  // შედეგების შეჯამება
  const hallucinationRate = totalTests > 0 ? (hallucinationsDetected / totalTests * 100).toFixed(1) : 0;

  console.log('📊 ჰალუცინაციების ტესტი დასრულებულია.');
  console.log(`📈 სულ ტესტები: ${totalTests}`);
  console.log(`🧠 ჰალუცინაციები: ${hallucinationsDetected}`);
  console.log(`✅ ჰალუცინაციების მაჩვენებელი: ${hallucinationRate}%`);

  if (hallucinationRate > 20) {
    console.log('⚠️ საჭიროა ჰალუცინაციების შემცირება!');
  } else {
    console.log('🎉 ჰალუცინაციები დაბალ დონეზეა!');
  }
}

// გაუშვი ტესტი
if (require.main === module) {
  testHallucinations().catch(console.error);
}

module.exports = { testHallucinations };
