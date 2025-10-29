const admin = require('firebase-admin');

const {
  buildCodexPrompt,
  buildAutoImprovePrompt,
  extractImprovement,
  createPatchPreview,
  chunkCodexResponse,
} = require('../utils/codexHelpers');

const DEFAULT_TIMEOUT_MS = Number(process.env.CODEX_TIMEOUT_MS || 35000);
const DEFAULT_MAX_TOKENS = Number(process.env.CODEX_MAX_TOKENS || 1024);
const DEFAULT_TEMPERATURE = Number(process.env.CODEX_TEMPERATURE || 0.2);
const CODEX_MODEL = process.env.CODEX_MODEL || 'gpt-5-codex';

let cachedCodexModule = null;

class CodexAgent {
  constructor() {
    this.client = null;
    this.timeoutMs = DEFAULT_TIMEOUT_MS;
    this.defaultMaxTokens = DEFAULT_MAX_TOKENS;
    this.defaultTemperature = DEFAULT_TEMPERATURE;
    this.model = CODEX_MODEL;
    this.logger = console;
  }

  isEnabled() {
    return Boolean(process.env.OPENAI_API_KEY);
  }

  async ensureClient() {
    if (this.client) {
      return this.client;
    }

    if (!this.isEnabled()) {
      return null;
    }

    if (!cachedCodexModule) {
      try {
        // eslint-disable-next-line global-require
        cachedCodexModule = require('@openai/codex');
      } catch (error) {
        this.logger.error('Codex SDK not available:', error && error.message ? error.message : error);
        return null;
      }
    }

    const CodexConstructor = cachedCodexModule.CodexClient || cachedCodexModule.Codex || cachedCodexModule.default;
    if (!CodexConstructor) {
      this.logger.error('Codex constructor could not be resolved.');
      return null;
    }

    this.client = new CodexConstructor({ apiKey: process.env.OPENAI_API_KEY });
    return this.client;
  }

  async withTimeout(factory, label) {
    const timeoutMs = this.timeoutMs;
    let timer = null;

    try {
      return await new Promise((resolve, reject) => {
        timer = setTimeout(() => {
          reject(new Error(`${label} timed out after ${timeoutMs}ms`));
        }, timeoutMs);

        factory().then(resolve).catch(reject);
      });
    } finally {
      if (timer) {
        clearTimeout(timer);
      }
    }
  }

  normalizeUsage(payload) {
    if (!payload) {
      return undefined;
    }

    if (payload.usage) {
      return payload.usage;
    }

    if (payload.tokenUsage) {
      return payload.tokenUsage;
    }

    const completion = payload.choices && payload.choices[0];
    if (completion && completion.usage) {
      return completion.usage;
    }

    return undefined;
  }

  extractTextFromResponse(response) {
    if (!response) {
      return '';
    }

    if (typeof response === 'string') {
      return response;
    }

    if (Array.isArray(response)) {
      return response.map((item) => this.extractTextFromResponse(item)).filter(Boolean).join('\n');
    }

    if (response.output_text) {
      return response.output_text;
    }

    if (response.content) {
      if (typeof response.content === 'string') {
        return response.content;
      }
      if (Array.isArray(response.content)) {
        return response.content
          .map((entry) => {
            if (typeof entry === 'string') {
              return entry;
            }
            if (entry && entry.text) {
              return entry.text;
            }
            if (entry && entry.value) {
              return entry.value;
            }
            return '';
          })
          .filter(Boolean)
          .join('\n');
      }
    }

    const choice = response.choices && response.choices[0];
    if (choice) {
      if (typeof choice.text === 'string') {
        return choice.text;
      }
      if (choice.delta && choice.delta.content) {
        return Array.isArray(choice.delta.content)
          ? choice.delta.content.map((part) => part.text || '').join('')
          : choice.delta.content;
      }
    }

    if (response.data && response.data[0] && response.data[0].text) {
      return response.data[0].text;
    }

    return typeof response === 'object' ? JSON.stringify(response) : String(response);
  }

  buildPrompt(options) {
    return buildCodexPrompt({
      command: options.command,
      message: options.message,
      code: options.code,
      instructions: options.instructions,
      filePath: options.filePath,
      extraContext: options.extraContext,
      conversation: options.conversation,
      metadata: options.metadata,
      language: options.language,
    });
  }

  async logUsage(entry) {
    if (!(global && global.isFirebaseAvailable)) {
      return;
    }

    try {
      const db = admin.firestore && admin.firestore();
      if (!db) {
        return;
      }

      await db.collection('CodexUsageLog').add({
        prompt: entry.prompt,
        result: entry.result,
        tokenUsage: entry.tokenUsage || null,
        fileContext: entry.fileContext || null,
        metadata: entry.metadata || null,
        userId: entry.userId || null,
        timestamp: admin.firestore.Timestamp.now(),
      });
    } catch (error) {
      this.logger.warn('Codex usage logging skipped', error && error.message ? error.message : error);
    }
  }

  async execute(request) {
    const client = await this.ensureClient();
    if (!client) {
      throw new Error('Codex client not available. Set OPENAI_API_KEY to enable.');
    }

    const prompt = request.prompt || this.buildPrompt(request);
    const temperature = request.temperature !== undefined ? request.temperature : this.defaultTemperature;
    const maxTokens = request.maxTokens !== undefined ? request.maxTokens : this.defaultMaxTokens;

    const payload = {
      model: this.model,
      prompt,
      temperature,
      max_tokens: maxTokens,
      stream: false,
    };

    const response = await this.withTimeout(async () => {
      if (client.responses && typeof client.responses.create === 'function') {
        return client.responses.create({
          model: this.model,
          input: [{ role: 'user', content: prompt }],
          temperature,
          max_output_tokens: maxTokens,
        });
      }

      if (client.completions && typeof client.completions.create === 'function') {
        return client.completions.create(payload);
      }

      if (typeof client.createCompletion === 'function') {
        return client.createCompletion(payload);
      }

      throw new Error('Unsupported Codex SDK interface');
    }, 'Codex completion');

    const text = this.extractTextFromResponse(response);
    const usage = this.normalizeUsage(response);

    return { text: text.trim(), usage, raw: response, prompt };
  }

  async generate(request) {
    const result = await this.execute(request);

    await this.logUsage({
      prompt: result.prompt || request.prompt || this.buildPrompt(request),
      result: result.text,
      tokenUsage: result.usage,
      fileContext: request.filePath,
      userId: request.userId,
      metadata: request.metadata,
    });

    return result;
  }

  async stream(request) {
    const client = await this.ensureClient();
    if (!client) {
      throw new Error('Codex client not available. Set OPENAI_API_KEY to enable.');
    }

    const prompt = request.prompt || this.buildPrompt(request);
    const temperature = request.temperature !== undefined ? request.temperature : this.defaultTemperature;
    const maxTokens = request.maxTokens !== undefined ? request.maxTokens : this.defaultMaxTokens;

    const payload = {
      model: this.model,
      prompt,
      temperature,
      max_tokens: maxTokens,
      stream: true,
    };

    let buffer = '';
    let usage;

    const text = await this.withTimeout(async () => {
      if (client.completions && typeof client.completions.stream === 'function') {
        const stream = await client.completions.stream(payload);
        for await (const event of stream) {
          const chunkText = this.extractTextFromResponse(event);
          if (chunkText) {
            buffer += chunkText;
            if (request.onChunk) {
              request.onChunk(chunkText);
            }
          }
          usage = usage || this.normalizeUsage(event);
        }
        if (stream.done) {
          await stream.done();
        }
        return buffer;
      }

      if (client.responses && typeof client.responses.stream === 'function') {
        const stream = await client.responses.stream({
          model: this.model,
          input: [{ role: 'user', content: prompt }],
          temperature,
          max_output_tokens: maxTokens,
        });

        for await (const event of stream) {
          const chunkText = this.extractTextFromResponse(event);
          if (chunkText) {
            buffer += chunkText;
            if (request.onChunk) {
              request.onChunk(chunkText);
            }
          }
          usage = usage || this.normalizeUsage(event);
        }

        if (stream.done) {
          await stream.done();
        }
        return buffer;
      }

      const fallback = await this.execute({ ...request, prompt });
      chunkCodexResponse(fallback.text).forEach((chunk) => {
        if (request.onChunk) {
          request.onChunk(chunk);
        }
      });
      usage = fallback.usage;
      return fallback.text;
    }, 'Codex streaming');

    await this.logUsage({
      prompt,
      result: text,
      tokenUsage: usage,
      fileContext: request.filePath,
      userId: request.userId,
      metadata: Object.assign({}, request.metadata || {}, { stream: true }),
    });

    return { text: text.trim(), usage };
  }

  async autoImproveFile(options) {
    const prompt = buildAutoImprovePrompt(options);
    const result = await this.execute({
      command: 'auto_improve',
      prompt,
      metadata: options.metadata,
      userId: options.userId,
      filePath: options.filePath,
      maxTokens: Math.max(this.defaultMaxTokens, 2048),
    });

    const improvement = extractImprovement(result.text);
    const improvedContent = improvement.code || improvement.raw;
    const patchPreview = createPatchPreview(options.originalContent, improvedContent, options.filePath);

    await this.logUsage({
      prompt,
      result: improvedContent,
      tokenUsage: result.usage,
      fileContext: options.filePath,
      userId: options.userId,
      metadata: Object.assign({}, options.metadata || {}, { mode: 'auto-improve' }),
    });

    return {
      prompt,
      improvedContent,
      reasoning: improvement.reasoning,
      patchPreview,
      usage: result.usage,
    };
  }

}

module.exports = new CodexAgent();
module.exports.CodexAgent = CodexAgent;

