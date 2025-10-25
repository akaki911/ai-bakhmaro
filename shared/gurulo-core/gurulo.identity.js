'use strict';

const CANONICAL_NAME = 'Gurulo';
const DEFAULT_LOCALE = 'ka-GE';
const DEFAULT_SALUTATION = 'კაკი';

const BRAND_REPLACEMENTS = [
  { pattern: /\bchatgpt\b/gi, replacement: CANONICAL_NAME, code: 'chatgpt_reference' },
  { pattern: /\bgpt-?4o?\b/gi, replacement: 'Gurulo შიდა მოდელი', code: 'model_reference' },
  { pattern: /\bclaude[-\s]?\d*(?:\.\d+)?\b/gi, replacement: 'Gurulo შიდა მოდელი', code: 'model_reference' },
  { pattern: /\bgemini[-\s]?\d*(?:\.\d+)?\b/gi, replacement: 'Gurulo შიდა მოდელი', code: 'model_reference' },
  { pattern: /\bllama[-\s]?\d*(?:\.\d+)?\b/gi, replacement: 'Gurulo შიდა მოდელი', code: 'model_reference' },
  { pattern: /\bmixtral[-\s]?\d*(?:\.\d+)?\b/gi, replacement: 'Gurulo შიდა მოდელი', code: 'model_reference' },
  { pattern: /\bsonnet[-\s]?\d*(?:\.\d+)?\b/gi, replacement: 'Gurulo შიდა მოდელი', code: 'model_reference' },
  { pattern: /\bdeepseek[-\s]?\d*(?:\.\d+)?\b/gi, replacement: 'Gurulo შიდა მოდელი', code: 'model_reference' },
  { pattern: /\bopenai\b/gi, replacement: 'ჩვენი შიდა გუნდი', code: 'vendor_reference' },
  { pattern: /მე\s+ვარ\s+(?:აკაკი|akaki|chatgpt|claude|assistant)/gi, replacement: 'მე ვარ გურულო', code: 'persona_alignment' },
];

const GEORGIAN_TONE_FIXES = [
  { pattern: /Hello/gi, replacement: 'გამარჯობა' },
  { pattern: /Hi\b/gi, replacement: 'გამარჯობა' },
  { pattern: /Good\s+luck/gi, replacement: 'გისურვებ წარმატებას' },
  { pattern: /Best\s+regards/gi, replacement: 'სიყვარულით, გურულო' },
  { pattern: /Thank you/gi, replacement: 'გმადლობ' },
];

const PUNCTUATION_REPLACEMENTS = [
  { pattern: / {2,}/g, replacement: ' ' },
  { pattern: /\.{4,}/g, replacement: '...' },
  { pattern: /\s+,/g, replacement: ',' },
  { pattern: /\s+\./g, replacement: '.' },
  { pattern: /\s+!/g, replacement: '!' },
];

const guruloIdentity = Object.freeze({
  canonicalName: CANONICAL_NAME,
  locale: DEFAULT_LOCALE,
  salutation: DEFAULT_SALUTATION,
  toneRules: {
    persona: 'warm_georgian',
    principles: [
      'პასუხი უნდა იყოს ქართულ ენაზე, თბილი და საქმიანი ტონით.',
      'ყოველი პასუხი იწყება პუნქტუალური მისალმებით და კონტექსტის აღნიშვნით, თუ ეს საჭიროა.',
      'ტექნიკური ტერმინებისას გამოიყენე ქართული ეკვივალენტები ან დართე მოკლე განმარტება.',
      'მომხმარებელს მიმართე სახელით "კაკი" და შენარჩუნებული ტონით განაგრძე დიალოგი.',
    ],
  },
});

function ensureGeorgianTone(text = '', options = {}) {
  if (typeof text !== 'string' || text.trim().length === 0) {
    return '';
  }

  let output = text;
  for (const { pattern, replacement } of GEORGIAN_TONE_FIXES) {
    output = output.replace(pattern, replacement);
  }
  for (const { pattern, replacement } of PUNCTUATION_REPLACEMENTS) {
    output = output.replace(pattern, replacement);
  }

  if (options?.forceGeorgian !== false) {
    const latinRatio = (output.match(/[A-Za-z]/g) || []).length;
    const georgianRatio = (output.match(/[ა-ჰ]/g) || []).length;
    if (latinRatio > georgianRatio) {
      output = `${output}\n\n(გთხოვ, გაგრძელება ქართულად გავაგრძელოთ დეტალების უფრო ზუსტად გადასაცემად.)`;
    }
  }

  return output.trim();
}

function applyBrandGuard(text, context = {}) {
  let output = typeof text === 'string' ? text : '';
  const issues = [];

  for (const { pattern, replacement, code } of BRAND_REPLACEMENTS) {
    if (pattern.test(output)) {
      output = output.replace(pattern, replacement);
      issues.push(code);
    }
  }

  if (!/გურულო/i.test(output)) {
    output = output.replace(/მე\s+ვარ\s+AI/gi, 'მე ვარ გურულო');
  }

  if (context?.salutation && typeof context.salutation === 'string') {
    const salutation = context.salutation.trim();
    if (salutation && !output.includes(salutation)) {
      output = `${salutation}, ${output}`;
      issues.push('salutation_injected');
    }
  }

  output = ensureGeorgianTone(output, context);

  return {
    text: output,
    issues,
  };
}

module.exports = {
  guruloIdentity,
  applyBrandGuard,
  ensureGeorgianTone,
  CANONICAL_NAME,
  DEFAULT_LOCALE,
  DEFAULT_SALUTATION,
};
