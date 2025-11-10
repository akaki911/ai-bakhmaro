import { GURULO_CORE_CONFIG, type GuruloSectionKey } from '../config/guruloCore';
import type { ChatSection, ChatStructuredContent } from '../components/futuristic-chat/FuturisticChatPanel';

type GuruloCoreSection = {
  title?: unknown;
  bullets?: unknown;
  cta?: unknown;
};

type GuruloCorePayload = {
  version: string;
  language?: string;
  locale?: string;
  persona?: string;
  address?: string;
  sections?: Partial<Record<GuruloSectionKey | string, GuruloCoreSection | unknown>>;
  warnings?: unknown;
  plainText?: string;
  meta?: Record<string, unknown>;
};

const cleanBullet = (value: string): string => value.replace(/^[•*\-]\s*/, '').trim();

const toStringArray = (value: unknown, depth = 0): string[] => {
  if (depth > 6 || value == null) {
    return [];
  }

  if (typeof value === 'string') {
    return value
      .replace(/\r\n/g, '\n')
      .split(/\n+/)
      .map((line) => cleanBullet(line))
      .filter(Boolean);
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return [String(value)];
  }

  if (Array.isArray(value)) {
    return value.flatMap((entry) => toStringArray(entry, depth + 1)).map((line) => cleanBullet(line)).filter(Boolean);
  }

  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    if (Array.isArray(record.bullets)) {
      return toStringArray(record.bullets, depth + 1);
    }
    const candidateKeys: Array<keyof typeof record> = ['text', 'content', 'message', 'value'];
    for (const key of candidateKeys) {
      if (record[key]) {
        const resolved = toStringArray(record[key], depth + 1);
        if (resolved.length) {
          return resolved;
        }
      }
    }
  }

  return [];
};

const dedupeStrings = (values: string[]): string[] => {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const trimmed = value.trim();
    if (!trimmed || seen.has(trimmed)) {
      continue;
    }
    seen.add(trimmed);
    result.push(trimmed);
  }
  return result;
};

export const parseGuruloCoreCandidate = (value: unknown): GuruloCorePayload | null => {
  if (isGuruloCorePayload(value)) {
    return value;
  }

  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const record = value as Record<string, unknown>;
    const nestedKeys: Array<keyof typeof record> = ['core', 'response', 'data', 'payload'];
    for (const key of nestedKeys) {
      if (key in record) {
        const nested = parseGuruloCoreCandidate(record[key]);
        if (nested) {
          return nested;
        }
      }
    }
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed.startsWith('{')) {
      return null;
    }
    try {
      const parsed = JSON.parse(trimmed);
      return isGuruloCorePayload(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      const parsed = parseGuruloCoreCandidate(entry);
      if (parsed) {
        return parsed;
      }
    }
  }

  return null;
};

export const isGuruloCorePayload = (value: unknown): value is GuruloCorePayload => {
  return Boolean(value && typeof value === 'object' && (value as { version?: string }).version === GURULO_CORE_CONFIG.version);
};

export const adaptGuruloCorePayload = (
  payload: GuruloCorePayload,
  fallbackLanguage: 'ka' | 'en',
): { content: ChatStructuredContent[]; plainText: string } => {
  const language: 'ka' | 'en' = payload.language === 'en' || payload.language === 'ka' ? (payload.language as 'ka' | 'en') : fallbackLanguage;
  const labels = GURULO_CORE_CONFIG.sectionLabels[language];
  const salutation = payload.address && typeof payload.address === 'string' && payload.address.trim().length
    ? payload.address.trim()
    : GURULO_CORE_CONFIG.salutation;

  const sections: ChatSection[] = [];
  const plainLines: string[] = [];

  for (const key of GURULO_CORE_CONFIG.sectionOrder) {
    const sectionSource = payload.sections?.[key];
    const normalizedBullets = sectionSource ? toStringArray(sectionSource) : [];
    const fallbackBullets = key === 'warnings' ? [] : toStringArray(labels[key]);
    let bullets = normalizedBullets.length ? normalizedBullets : fallbackBullets;
    let title = labels[key];
    let cta = '';

    if (sectionSource && typeof sectionSource === 'object' && !Array.isArray(sectionSource)) {
      const record = sectionSource as Record<string, unknown>;
      if (typeof record.title === 'string') {
        title = record.title.trim() || title;
      }
      if (typeof record.cta === 'string') {
        cta = record.cta.trim();
      }
    }

    if (key === 'final') {
      if (bullets.length === 0) {
        bullets = [`${salutation}, ${GURULO_CORE_CONFIG.finalGreeting[language]}`];
      } else if (!bullets[0].startsWith(salutation)) {
        bullets[0] = `${salutation}, ${bullets[0].replace(/^[,\s]+/, '')}`;
      }
    }

    if (key === 'verification' && bullets.length === 0) {
      bullets = [GURULO_CORE_CONFIG.verificationFallback[language]];
    }

    if (key === 'warnings') {
      const combinedWarnings = dedupeStrings([
        ...bullets,
        ...toStringArray(payload.warnings),
      ]);
      bullets = combinedWarnings.length ? combinedWarnings : [labels.warnings];
    }

    const section: ChatSection = {
      title,
      bullets,
      cta,
    };
    sections.push(section);

    if (title) {
      plainLines.push(title);
    }
    plainLines.push(...bullets);
    if (cta) {
      plainLines.push(cta);
    }
  }

  const warningsSection = sections[sections.length - 1]?.bullets ?? [];
  const warnings = dedupeStrings([...warningsSection, ...toStringArray(payload.warnings)]);

  const block: ChatStructuredContent = {
    language,
    persona: typeof payload.persona === 'string' ? payload.persona.trim() : 'Gurulo',
    address: salutation,
    sections,
    warnings,
    meta: payload.meta ?? {},
    sectionOrder: [...GURULO_CORE_CONFIG.sectionOrder],
  };

  const plainText = payload.plainText && payload.plainText.trim().length
    ? payload.plainText
    : plainLines.join('\n');

  return {
    content: [block],
    plainText,
  };
};
