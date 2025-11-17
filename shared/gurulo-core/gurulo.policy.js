'use strict';

const DEFAULT_PERMISSIONS = Object.freeze({
  allowUiNavigation: true,
  allowFileSystemEdits: false,
  allowSecretInspection: false,
  allowEscalation: true,
  allowThirdPartyAttribution: false,
});

function getUserPermissions(user) {
  const permissions = { ...DEFAULT_PERMISSIONS };

  if (user?.role === 'SUPER_ADMIN' && user?.personalId === '01019062020') {
    permissions.allowFileSystemEdits = true;
    permissions.allowSecretInspection = true;
    permissions.allowEscalation = true;
    permissions.allowThirdPartyAttribution = true;
  }

  return permissions;
}

const PROHIBITED_DISCLOSURES = [
  {
    code: 'model_name',
    pattern: /\bgpt[-\w]*\b/gi,
    replacement: 'Gurulo შიდა მოდელი',
    message: 'გარე მოდელის სახელები არ უნდა გამოჩნდეს პასუხებში — დავტოვე "Gurulo შიდა მოდელი".',
  },
  {
    code: 'model_name',
    pattern: /\bclaude[-\w]*\b/gi,
    replacement: 'Gurulo შიდა მოდელი',
    message: 'Anthropic/Claude მოდელის მოხსენიება ამოვიღე ბრენდის თანმიმდევრულობისთვის.',
  },
  {
    code: 'model_name',
    pattern: /\bgemini[-\w]*\b/gi,
    replacement: 'Gurulo შიდა მოდელი',
    message: 'Google Gemini მოდელი საჯაროდ არ ვახსენოთ — გადავცვალე ნეიტრალური ფორმით.',
  },
  {
    code: 'model_name',
    pattern: /\bllama[-\w]*\b/gi,
    replacement: 'Gurulo შიდა მოდელი',
    message: 'Meta LLaMA მოდელის ხსენება ამოვიღე შიდა პოლიტიკის დაცვით.',
  },
  {
    code: 'model_name',
    pattern: /\bmixtral[-\w]*\b/gi,
    replacement: 'Gurulo შიდა მოდელი',
    message: 'Mixtral მოდელის ხსენება აკრძალულია — ჩავანაცვლე ნეიტრალური ჩანაწერით.',
  },
  {
    code: 'model_name',
    pattern: /\bsonnet[-\w]*\b/gi,
    replacement: 'Gurulo შიდა მოდელი',
    message: 'Sonnet მოდელის სახელის ნაცვლად გამოვიყენე ნეიტრალური ფორმულირება.',
  },
  {
    code: 'model_name',
    pattern: /\bdeepseek[-\w]*\b/gi,
    replacement: 'Gurulo შიდა მოდელი',
    message: 'DeepSeek მოდელის სახელები საჯაროდ არ ითქმის — ჩანაცვლება შევასრულე.',
  },
  {
    code: 'vendor_reference',
    pattern: /\bopenai\b/gi,
    replacement: 'ჩვენი შიდა გუნდი',
    message: 'გარე მომწოდებლების სახელები არ უნდა ვახსენოთ — ტექსტი გადავწერე შიდა ფორმით.',
  },
];

const safetyHooks = new Set();

const normalizeWarnings = (warnings = []) => {
  if (!Array.isArray(warnings)) {
    return [];
  }
  return warnings
    .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
    .filter(Boolean);
};

function registerSafetyHook(hook) {
  if (typeof hook !== 'function') {
    return () => undefined;
  }
  safetyHooks.add(hook);
  return () => safetyHooks.delete(hook);
}

function enforcePolicy(text, context = {}) {
  let output = typeof text === 'string' ? text : '';
  const violations = new Set();
  const warningMessages = new Set();

  for (const rule of PROHIBITED_DISCLOSURES) {
    if (rule.pattern.test(output)) {
      output = output.replace(rule.pattern, rule.replacement);
      violations.add(rule.code);
      if (rule.message) {
        warningMessages.add(rule.message);
      }
    }
  }

  const permissions = getUserPermissions(context?.user);
  if (context?.audience === 'public_front') {
    permissions.allowEscalation = false;
  }

  const result = {
    text: output.trim(),
    violations: Array.from(violations),
    warnings: Array.from(warningMessages),
    permissions,
  };

  for (const hook of safetyHooks) {
    try {
      const hookResult = hook({ result, context });
      if (!hookResult) {
        continue;
      }
      if (typeof hookResult.text === 'string') {
        result.text = hookResult.text;
      }
      const hookWarnings = normalizeWarnings(hookResult.warnings);
      for (const warning of hookWarnings) {
        warningMessages.add(warning);
      }
      if (Array.isArray(hookResult.violations)) {
        for (const violation of hookResult.violations) {
          if (typeof violation === 'string') {
            violations.add(violation);
          }
        }
      }
    } catch (error) {
      warningMessages.add(`safety_hook_error:${error.message}`);
    }
  }

  result.warnings = Array.from(warningMessages);
  result.violations = Array.from(violations);

  return result;
}

module.exports = {
  DEFAULT_PERMISSIONS,
  PROHIBITED_DISCLOSURES,
  getUserPermissions,
  enforcePolicy,
  registerSafetyHook,
};
