'use strict';

const {
  guruloIdentity,
  applyBrandGuard,
  ensureGeorgianTone,
  DEFAULT_SALUTATION,
} = require('./gurulo.identity.js');
const { enforcePolicy } = require('./gurulo.policy.js');

const GURULO_CORE_VERSION = 'gurulo-core/v1';
const SECTION_ORDER = ['task', 'plan', 'final', 'verification', 'warnings'];

const SECTION_LABELS = {
  task: { ka: 'დავალება', en: 'Task' },
  plan: { ka: 'გეგმა / განმარტება', en: 'Plan / Explanation' },
  final: { ka: 'საბოლოო პასუხი', en: 'Final' },
  verification: { ka: 'გადამოწმება', en: 'Verification' },
  warnings: { ka: 'გაფრთხილებები', en: 'Warnings' },
};

const BRAND_ISSUE_MESSAGES = {
  chatgpt_reference: 'გარე ჩეთ GPT ბრენდის ხსენება ამოვიღე — ყოველთვის გამოიყენე Gurulo.',
  model_reference: 'მოდელის კონკრეტული სახელები არ ვაზიარებთ — ჩანაცვლებულია ნეიტრალური ფორმულირებით.',
  vendor_reference: 'გარე მომწოდებლის ნაცვლად გამოვიყენე "ჩვენი შიდა გუნდი".',
  persona_alignment: 'პერსონა შევაჯერე, რომ პასუხი დარჩეს გურულოს სახელით.',
  salutation_injected: 'პასუხს დავამატე კაკის მიმართვა ბრენდის ტონის შესანარჩუნებლად.',
};

const DEFAULT_VERIFICATION = {
  ka: 'გთხოვ გადაამოწმო თითოეული ნაბიჯი და შემატყობინო შედეგი.',
  en: 'Please verify each step and share the outcome.',
};

const DEFAULT_WARNING_FALLBACK = {
  ka: 'არ გააზიარო გასაღებები, ტოკენები და პირადი ინფორმაცია — საჭიროების შემთხვევაში გამოიყენე მხარდაჭერის არხი.',
  en: 'Do not share tokens, secrets, or personal data — escalate privately if needed.',
};

const DEFAULT_FINAL_MESSAGE = {
  ka: 'გისმენ და მზად ვარ დაგეხმარო ნებისმიერ საკითხში.',
  en: "I'm ready to assist with the next steps.",
};

function isCorePayload(value) {
  return Boolean(value && typeof value === 'object' && value.version === GURULO_CORE_VERSION);
}

function extractPlainText(value, depth = 0) {
  if (depth > 8 || value == null) {
    return '';
  }

  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => extractPlainText(item, depth + 1))
      .filter(Boolean)
      .join('\n');
  }

  if (typeof value === 'object') {
    if (typeof value.plainText === 'string') {
      return value.plainText;
    }
    if (Array.isArray(value.sections)) {
      return value.sections
        .map((section) => extractPlainText(section, depth + 1))
        .filter(Boolean)
        .join('\n');
    }
    const candidateKeys = ['response', 'message', 'text', 'content', 'value', 'body', 'result', 'assistant', 'summary', 'prompt'];
    for (const key of candidateKeys) {
      if (key in value) {
        const nested = extractPlainText(value[key], depth + 1);
        if (nested) {
          return nested;
        }
      }
    }
    return Object.values(value)
      .map((entry) => extractPlainText(entry, depth + 1))
      .filter(Boolean)
      .join('\n');
  }

  return '';
}

function toBulletArray(value, depth = 0) {
  if (depth > 6 || value == null) {
    return [];
  }

  if (typeof value === 'string') {
    return value
      .replace(/\r\n/g, '\n')
      .split(/\n+/)
      .map((line) => line.replace(/^[•*\-]\s*/, '').trim())
      .filter(Boolean);
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return [String(value)];
  }

  if (Array.isArray(value)) {
    return value
      .flatMap((entry) => toBulletArray(entry, depth + 1))
      .map((line) => line.replace(/^[•*\-]\s*/, '').trim())
      .filter(Boolean);
  }

  if (typeof value === 'object') {
    if (Array.isArray(value.bullets)) {
      return toBulletArray(value.bullets, depth + 1);
    }
    const candidateKeys = ['text', 'content', 'value', 'message'];
    for (const key of candidateKeys) {
      if (typeof value[key] === 'string' || Array.isArray(value[key])) {
        const bullets = toBulletArray(value[key], depth + 1);
        if (bullets.length) {
          return bullets;
        }
      }
    }
    if (Array.isArray(value.sections)) {
      return value.sections.flatMap((section) => toBulletArray(section, depth + 1));
    }
    return [];
  }

  return [];
}

function dedupeStrings(values) {
  const seen = new Set();
  const result = [];
  for (const value of values) {
    const trimmed = typeof value === 'string' ? value.trim() : '';
    if (!trimmed || seen.has(trimmed)) {
      continue;
    }
    seen.add(trimmed);
    result.push(trimmed);
  }
  return result;
}

function resolveLanguage(metaLanguage) {
  if (typeof metaLanguage === 'string' && metaLanguage.toLowerCase().startsWith('en')) {
    return 'en';
  }
  return 'ka';
}

function ensureSalutationBullets(bullets, salutation, language) {
  const result = [...bullets];
  if (result.length === 0) {
    result.push(`${salutation}, ${DEFAULT_FINAL_MESSAGE[language]}`);
    return result;
  }

  const first = result[0];
  if (!first.startsWith(salutation)) {
    const trimmed = first.replace(/^[,\s]+/, '');
    result[0] = `${salutation}, ${trimmed}`;
  }
  return result;
}

function readSectionInput(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    const bullets = toBulletArray(value);
    return { title: '', cta: '', bullets };
  }

  const title = typeof value.title === 'string' ? value.title.trim() : '';
  const cta = typeof value.cta === 'string' ? value.cta.trim() : '';
  const bullets = toBulletArray(value.bullets ?? value.text ?? value.content ?? value.message ?? value.value);

  return { title, cta, bullets };
}

function mergeSectionInputs(primary, fallback) {
  const merged = { title: '', cta: '', bullets: [] };
  if (fallback) {
    const fallbackProcessed = readSectionInput(fallback);
    merged.title = fallbackProcessed.title;
    merged.cta = fallbackProcessed.cta;
    merged.bullets = fallbackProcessed.bullets;
  }
  if (primary) {
    const primaryProcessed = readSectionInput(primary);
    merged.title = primaryProcessed.title || merged.title;
    merged.cta = primaryProcessed.cta || merged.cta;
    merged.bullets = primaryProcessed.bullets.length ? primaryProcessed.bullets : merged.bullets;
  }
  return merged;
}

function normalizeResponse(userId, source, meta = {}) {
  const candidateCore = isCorePayload(source) ? source : null;
  const metaObject = meta && typeof meta === 'object' ? meta : {};
  const providedSections = {};

  if (candidateCore && candidateCore.sections && typeof candidateCore.sections === 'object') {
    for (const key of SECTION_ORDER) {
      if (candidateCore.sections[key]) {
        providedSections[key] = candidateCore.sections[key];
      }
    }
  }

  if (metaObject.sections && typeof metaObject.sections === 'object') {
    for (const key of SECTION_ORDER) {
      if (metaObject.sections[key]) {
        providedSections[key] = metaObject.sections[key];
      }
    }
  }

  const rawText = candidateCore?.plainText || extractPlainText(source) || '';
  const language = resolveLanguage(candidateCore?.language || metaObject.language);
  const locale = language === 'en' ? 'en-US' : guruloIdentity.locale;
  const salutation = (metaObject.salutation || candidateCore?.address || guruloIdentity.salutation || DEFAULT_SALUTATION).trim() || DEFAULT_SALUTATION;

  const policyResult = enforcePolicy(rawText, {
    audience: metaObject.audience || candidateCore?.audience || metaObject.metadata?.audience,
  });

  const brandResult = applyBrandGuard(policyResult.text, {
    salutation,
    forceGeorgian: language !== 'en',
  });

  let sanitized = ensureGeorgianTone(brandResult.text, { forceGeorgian: language !== 'en' });
  if (!sanitized.trim()) {
    sanitized = `${salutation}, ${DEFAULT_FINAL_MESSAGE[language]}`;
  }

  const segments = sanitized
    .split(/\n{2,}/)
    .map((segment) => segment.trim())
    .filter(Boolean);

  const firstSegment = segments[0] || sanitized;
  const lastSegment = segments.length > 1 ? segments[segments.length - 1] : sanitized;
  const middleSegments = segments.slice(1, Math.max(1, segments.length - 1));

  const defaultTask = metaObject.task || firstSegment;
  const defaultPlan = metaObject.plan || middleSegments.join('\n');
  const defaultFinal = metaObject.final || lastSegment;
  const defaultVerification = metaObject.verification || DEFAULT_VERIFICATION[language];
  const defaultWarnings = metaObject.warnings || candidateCore?.warnings || [];

  const sectionMap = {};

  for (const key of SECTION_ORDER) {
    const fallbackValue = (
      key === 'task' ? defaultTask
        : key === 'plan' ? defaultPlan
        : key === 'final' ? defaultFinal
        : key === 'verification' ? defaultVerification
        : defaultWarnings
    );
    const merged = mergeSectionInputs(providedSections[key], fallbackValue);
    const title = merged.title || SECTION_LABELS[key][language];
    let bullets = merged.bullets;
    let cta = merged.cta || '';

    if (key === 'final') {
      bullets = ensureSalutationBullets(bullets, salutation, language);
    }
    if (key === 'verification' && bullets.length === 0) {
      bullets = toBulletArray(defaultVerification);
    }
    if (key === 'warnings') {
      bullets = dedupeStrings([
        ...bullets,
        ...toBulletArray(policyResult.warnings),
        ...dedupeStrings((defaultWarnings && Array.isArray(defaultWarnings) ? defaultWarnings : [defaultWarnings])),
        ...brandResult.issues
          .map((issue) => BRAND_ISSUE_MESSAGES[issue])
          .filter(Boolean),
      ]);
      if (bullets.length === 0) {
        bullets = [DEFAULT_WARNING_FALLBACK[language]];
      }
      cta = '';
    }

    sectionMap[key] = {
      title,
      bullets,
      cta,
    };
  }

  const warningsCombined = dedupeStrings([
    ...sectionMap.warnings.bullets,
    ...policyResult.warnings,
    ...brandResult.issues.map((issue) => BRAND_ISSUE_MESSAGES[issue]).filter(Boolean),
  ]);

  const structuredSections = SECTION_ORDER.map((key) => ({
    title: sectionMap[key].title,
    bullets: sectionMap[key].bullets,
    cta: sectionMap[key].cta,
  }));

  const coreMeta = {
    policy: {
      violations: policyResult.violations,
      warnings: policyResult.warnings,
      permissions: policyResult.permissions,
    },
    brand: {
      issues: brandResult.issues,
    },
    source: metaObject,
  };

  const structuredBlock = {
    version: GURULO_CORE_VERSION,
    persona: guruloIdentity.canonicalName,
    address: salutation,
    language,
    locale,
    sections: structuredSections,
    warnings: warningsCombined,
    meta: coreMeta,
    sectionOrder: [...SECTION_ORDER],
  };

  const normalized = {
    version: GURULO_CORE_VERSION,
    persona: guruloIdentity.canonicalName,
    locale,
    language,
    address: salutation,
    user: {
      id: typeof userId === 'string' && userId.trim() ? userId.trim() : 'anonymous',
      salutation,
    },
    plainText: sanitized,
    sections: sectionMap,
    warnings: warningsCombined,
    meta: coreMeta,
    structured: [structuredBlock],
  };

  return normalized;
}

module.exports = {
  normalizeResponse,
  SECTION_ORDER,
  SECTION_LABELS,
  GURULO_CORE_VERSION,
};
