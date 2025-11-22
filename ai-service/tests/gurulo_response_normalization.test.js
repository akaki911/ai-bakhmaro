const guruloCore = require('../shared/gurulo-core');

const { normalizeResponse, SECTION_ORDER } = guruloCore.response;

describe('Gurulo response normalization', () => {
  test('produces all required sections with Georgian tone', () => {
    const normalized = normalizeResponse('tester-id', 'ეს არის ტესტური პასუხი.\n\nსაბოლოო ნაწილი.');

    SECTION_ORDER.forEach((key) => {
      expect(normalized.sections[key]).toBeDefined();
      expect(Array.isArray(normalized.sections[key].bullets)).toBe(true);
    });

    expect(normalized.language).toBe('ka');
    expect(normalized.sections.final.bullets[0]).toMatch(/^კაკი/);
    expect(normalized.meta.brand.issues).toEqual(expect.any(Array));
  });
});
