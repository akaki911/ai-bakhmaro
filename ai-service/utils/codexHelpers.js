const { createTwoFilesPatch } = require('diff');

const CODE_BLOCK_REGEX = /```(?:[a-zA-Z0-9_+-]*)?\n([\s\S]*?)```/g;
const DEFAULT_STREAM_CHUNK = 320;

function buildCodexPrompt(options) {
  const {
    command,
    message,
    code,
    instructions,
    filePath,
    language = 'typescript',
    extraContext,
    conversation = [],
    metadata = {},
  } = options || {};

  const header = [
    'You are Gurulo Codex Assistant.',
    'Role: Senior AI pair-programmer supporting the Bakhmaro AI platform.',
    'All responses must be in Georgian unless the user explicitly requests another language.',
    'When providing code, return clean snippets without surrounding commentary unless the instructions require explanations.',
  ].join('\n');

  const commandSection = [
    `Primary command: ${command}`,
    filePath ? `File path: ${filePath}` : null,
    instructions ? `Explicit instructions: ${instructions}` : null,
    language ? `Preferred language: ${language}` : null,
  ].filter(Boolean).join('\n');

  const contextLines = [];

  if (extraContext) {
    contextLines.push(`Additional context: ${extraContext}`);
  }

  if (message) {
    contextLines.push(`User message: ${message}`);
  }

  if (code) {
    contextLines.push('Current file content:\n```\n' + code.trimEnd() + '\n```');
  }

  if (conversation.length) {
    contextLines.push('Conversation history:');
    contextLines.push(conversation.map((item, index) => `${index + 1}. ${item}`).join('\n'));
  }

  const metadataEntries = Object.entries(metadata || {})
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([key, value]) => `${key}: ${typeof value === 'string' ? value : JSON.stringify(value)}`);

  const metadataSection = metadataEntries.length
    ? ['Metadata:', ...metadataEntries].join('\n')
    : '';

  const segments = [
    header,
    commandSection,
    contextLines.join('\n\n'),
    metadataSection,
    'Deliver concise, production-quality output. Avoid placeholders. When asked to explain, provide a brief summary followed by actionable steps.',
  ].filter(Boolean);

  return segments.join('\n\n').trim();
}

function buildAutoImprovePrompt(options) {
  const {
    filePath,
    originalContent,
    instructions,
    issueSummary,
    metadata = {},
    language = 'typescript',
  } = options || {};

  const summary = issueSummary
    ? `Issue summary: ${issueSummary}`
    : 'Issue summary: Provide focused improvements based on best practices.';

  const metadataEntries = Object.entries(metadata)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([key, value]) => `${key}: ${typeof value === 'string' ? value : JSON.stringify(value)}`);

  return [
    'You are assisting with automatic file improvements for the Gurulo AI microservice.',
    `Target file: ${filePath}`,
    `Language: ${language}`,
    summary,
    instructions ? `Additional instructions: ${instructions}` : null,
    metadataEntries.length ? ['Metadata:', ...metadataEntries].join('\n') : null,
    'Current file content:',
    '```',
    (originalContent || '').trimEnd(),
    '```',
    'Respond with the full improved file content. Do not include commentary unless specifically requested. If no change is needed, return the original content explicitly.',
  ].filter(Boolean).join('\n\n');
}

function extractImprovement(response) {
  if (!response) {
    return { raw: '' };
  }

  const matches = Array.from(response.matchAll(CODE_BLOCK_REGEX));
  const codeBlock = matches.length
    ? matches.reduce((longest, current) => (current[1].length > longest.length ? current[1] : longest), '')
    : undefined;

  let reasoning;
  if (matches.length) {
    const index = response.indexOf(matches[0][0]);
    if (index > 0) {
      reasoning = response.slice(0, index).trim();
    }
  }

  if (!codeBlock) {
    return { raw: response.trim(), reasoning: reasoning || response.trim() };
  }

  return {
    raw: response.trim(),
    code: codeBlock.trim(),
    reasoning: reasoning && reasoning.trim(),
  };
}

function createPatchPreview(originalContent, updatedContent, filePath = 'file.ts') {
  const patch = createTwoFilesPatch(
    filePath,
    filePath,
    originalContent || '',
    updatedContent || '',
    'Original',
    'Updated',
    { context: 3 },
  );
  return patch.trim();
}

function chunkCodexResponse(text, chunkSize = DEFAULT_STREAM_CHUNK) {
  if (!text) {
    return [];
  }

  const normalized = text.replace(/\r\n/g, '\n');
  const chunks = [];
  for (let index = 0; index < normalized.length; index += chunkSize) {
    chunks.push(normalized.slice(index, index + chunkSize));
  }
  return chunks;
}

module.exports = {
  buildCodexPrompt,
  buildAutoImprovePrompt,
  extractImprovement,
  createPatchPreview,
  chunkCodexResponse,
};

