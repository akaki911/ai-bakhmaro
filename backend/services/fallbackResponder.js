const DEFAULT_GREETING = '🤖 გამარჯობა! მე ვარ AI დეველოპერი. როგორ შემიძლია დაგეხმარო?';
const DEFAULT_CODE_HELP = '💻 კოდთან დაკავშირებით რას გჭირდებათ? შემიძლია დაგეხმარო React, TypeScript, ან Firebase-ის კომპონენტებში.';
const DEFAULT_RESPONSE_PREFIX = '🤖 მადლობა შეკითხვისთვის:';

function generateFallbackResponse(message) {
  if (!message) {
    return `${DEFAULT_RESPONSE_PREFIX} (ცარიელი შეტყობინება). სისტემამ ჩართო მინიმალური მხარდაჭერის რეჟიმი.`;
  }

  const lowerMessage = message.toLowerCase();

  const mathResult = calculateMath(message);
  if (mathResult) {
    return mathResult;
  }

  if (lowerMessage.includes('გამარჯობა') || lowerMessage.includes('hello')) {
    return DEFAULT_GREETING;
  }

  if (lowerMessage.includes('კოდი') || lowerMessage.includes('code')) {
    return DEFAULT_CODE_HELP;
  }

  return `${DEFAULT_RESPONSE_PREFIX} "${message}". სისტემა მუშაობს ლოკალურ სარეზერვო რეჟიმში. შევძელი მხოლოდ საბაზისო დახმარების გაწევა.`;
}

function calculateMath(expression) {
  try {
    let cleaned = expression
      .replace(/რამდენია/gi, '')
      .replace(/\s+/g, '')
      .trim();

    const mathMatch = cleaned.match(/(\d+(?:\.\d+)?\s*[\+\-\*\/]\s*\d+(?:\.\d+)?)/);
    if (mathMatch) {
      const expr = mathMatch[1];
      if (/^[\d\+\-\*\/\(\)\.]+$/.test(expr)) {
        const result = eval(expr);
        return `**${expr} = ${result}**\n\nეს არის მათემატიკური გამოთვლა 🧮`;
      }
    }
  } catch (error) {
    console.error('Math calculation error:', error);
  }
  return null;
}

module.exports = {
  generateFallbackResponse,
};
