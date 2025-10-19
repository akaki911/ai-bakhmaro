import admin from 'firebase-admin';

import {
  buildCodexPrompt,
  buildAutoImprovePrompt,
  extractImprovement,
  createPatchPreview,
  chunkCodexResponse,
  summarizeForSlack,
  sanitizeSlackText,
  type CodexCommand,
  type BuildCodexPromptOptions,
  type AutoImprovePromptOptions,
  type ExtractedImprovement,
} from '../utils/codexHelpers';

type CodexClientInstance = any;
type SlackClientInstance = any;

interface CodexCompletionRequest extends Partial<BuildCodexPromptOptions> {
  command: CodexCommand;
  userId?: string;
  metadata?: Record<string, unknown>;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  onChunk?: (chunk: string) => void;
  onMeta?: (meta: Record<string, unknown>) => void;
  signal?: AbortSignal;
}

interface CodexCompletionResult {
  text: string;
  usage?: Record<string, unknown>;
  raw?: unknown;
  prompt?: string;
}

interface AutoImproveResult {
  prompt: string;
  improvedContent: string;
  reasoning?: string;
  patchPreview: string;
  usage?: Record<string, unknown>;
}

const DEFAULT_TIMEOUT_MS = Number(process.env.CODEX_TIMEOUT_MS || 35000);
const DEFAULT_MAX_TOKENS = Number(process.env.CODEX_MAX_TOKENS || 1024);
const DEFAULT_TEMPERATURE = Number(process.env.CODEX_TEMPERATURE || 0.2);
const CODEX_MODEL = process.env.CODEX_MODEL || 'gpt-5-codex';

let cachedCodexModule: any = null;
let cachedSlackModule: any = null;

export class CodexAgent {
  private client: CodexClientInstance | null = null;
  private slackClient: SlackClientInstance | null = null;
  private readonly timeoutMs: number;
  private readonly defaultMaxTokens: number;
  private readonly defaultTemperature: number;
  private readonly model: string;
  private readonly logger = console;

  constructor() {
    this.timeoutMs = DEFAULT_TIMEOUT_MS;
    this.defaultMaxTokens = DEFAULT_MAX_TOKENS;
    this.defaultTemperature = DEFAULT_TEMPERATURE;
    this.model = CODEX_MODEL;
  }

  public isEnabled(): boolean {
    return Boolean(process.env.OPENAI_API_KEY);
  }

  public shouldUseSlack(): boolean {
    return process.env.CODEX_SLACK_ENABLED === 'true' && Boolean(process.env.SLACK_BOT_TOKEN);
  }

  public getSlackChannel(): string {
    return process.env.CODEX_SLACK_CHANNEL || '#dev-ai';
  }

  private async resolveCodexConstructor(): Promise<any> {
    if (cachedCodexModule) {
      return cachedCodexModule.CodexClient || cachedCodexModule.Codex || cachedCodexModule.default;
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
      cachedCodexModule = require('@openai/codex');
    } catch (error: any) {
      this.logger.error('Codex SDK not available:', error?.message || error);
      return null;
    }

    return cachedCodexModule?.CodexClient || cachedCodexModule?.Codex || cachedCodexModule?.default;
  }

  private async ensureClient(): Promise<CodexClientInstance | null> {
    if (this.client) {
      return this.client;
    }

    if (!this.isEnabled()) {
      return null;
    }

    const CodexConstructor = await this.resolveCodexConstructor();
    if (!CodexConstructor) {
      this.logger.error('Codex constructor could not be resolved.');
      return null;
    }

    this.client = new CodexConstructor({ apiKey: process.env.OPENAI_API_KEY as string });
    return this.client;
  }

  private ensureSlackClient(): SlackClientInstance | null {
    if (!this.shouldUseSlack()) {
      return null;
    }

    if (this.slackClient) {
      return this.slackClient;
    }

    const token = process.env.SLACK_BOT_TOKEN as string;
    if (!cachedSlackModule) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
        cachedSlackModule = require('@slack/web-api');
      } catch (error: any) {
        this.logger.warn('Slack SDK not available:', error?.message || error);
        return null;
      }
    }

    const SlackConstructor = cachedSlackModule?.WebClient || cachedSlackModule?.default;
    if (!SlackConstructor) {
      this.logger.warn('Slack WebClient export missing from SDK.');
      return null;
    }

    this.slackClient = new SlackConstructor(token);
    return this.slackClient;
  }

  private async withTimeout<T>(factory: () => Promise<T>, label: string): Promise<T> {
    const timeoutMs = this.timeoutMs;
    let timer: NodeJS.Timeout | null = null;

    try {
      return await new Promise<T>((resolve, reject) => {
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

  private normalizeUsage(payload: any): Record<string, unknown> | undefined {
    if (!payload) {
      return undefined;
    }

    if (payload.usage) {
      return payload.usage;
    }

    if (payload.tokenUsage) {
      return payload.tokenUsage;
    }

    const completion = payload.choices?.[0];
    if (completion?.usage) {
      return completion.usage;
    }

    return undefined;
  }

  private extractTextFromResponse(response: any): string {
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
          .map((entry: any) => {
            if (typeof entry === 'string') {
              return entry;
            }
            if (entry?.text) {
              return entry.text;
            }
            if (entry?.value) {
              return entry.value;
            }
            return '';
          })
          .filter(Boolean)
          .join('\n');
      }
    }

    const choice = response.choices?.[0];
    if (choice) {
      if (typeof choice.text === 'string') {
        return choice.text;
      }
      if (choice.delta?.content) {
        return Array.isArray(choice.delta.content)
          ? choice.delta.content.map((part: any) => part.text ?? '').join('')
          : choice.delta.content;
      }
    }

    if (response.data && response.data[0]?.text) {
      return response.data[0].text;
    }

    return JSON.stringify(response);
  }

  private buildPrompt(options: CodexCompletionRequest): string {
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

  private async postToSlack(command: CodexCommand, output: string, filePath?: string): Promise<void> {
    const client = this.ensureSlackClient();
    if (!client) {
      return;
    }

    const sanitized = sanitizeSlackText(output);
    const summary = summarizeForSlack(command, sanitized, filePath);
    const channel = this.getSlackChannel();

    try {
      await client.chat.postMessage({
        channel,
        text: summary,
      });
    } catch (error: any) {
      this.logger.warn('Slack notification failed', error?.message || error);
    }
  }

  private async logUsage(entry: {
    prompt: string;
    result: string;
    tokenUsage?: Record<string, unknown>;
    fileContext?: string;
    userId?: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    if (!(global as any).isFirebaseAvailable) {
      return;
    }

    try {
      const db = admin.firestore?.();
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
    } catch (error: any) {
      this.logger.warn('Codex usage logging skipped', error?.message || error);
    }
  }

  private async execute(request: CodexCompletionRequest & { prompt?: string }): Promise<CodexCompletionResult> {
    const client = await this.ensureClient();
    if (!client) {
      throw new Error('Codex client not available. Set OPENAI_API_KEY to enable.');
    }

    const prompt = request.prompt || this.buildPrompt(request);
    const temperature = request.temperature ?? this.defaultTemperature;
    const maxTokens = request.maxTokens ?? this.defaultMaxTokens;

    const payload = {
      model: this.model,
      prompt,
      temperature,
      max_tokens: maxTokens,
      stream: false,
    } as Record<string, unknown>;

    return this.withTimeout(async () => {
      let response: any;

      if (typeof (client as any).responses?.create === 'function') {
        response = await (client as any).responses.create({
          model: this.model,
          input: [{ role: 'user', content: prompt }],
          temperature,
          max_output_tokens: maxTokens,
        });
      } else if (typeof (client as any).completions?.create === 'function') {
        response = await (client as any).completions.create(payload);
      } else if (typeof (client as any).createCompletion === 'function') {
        response = await (client as any).createCompletion(payload);
      } else {
        throw new Error('Unsupported Codex SDK interface');
      }

      const text = this.extractTextFromResponse(response);
      const usage = this.normalizeUsage(response);
      return { text: text.trim(), usage, raw: response, prompt };
    }, 'Codex completion');
  }

  public async generate(request: CodexCompletionRequest): Promise<CodexCompletionResult> {
    const result = await this.execute(request);

    await this.logUsage({
      prompt: result.prompt || request.prompt || this.buildPrompt(request),
      result: result.text,
      tokenUsage: result.usage,
      fileContext: request.filePath,
      userId: request.userId,
      metadata: request.metadata,
    });

    if (this.shouldUseSlack() && request.metadata?.notifySlack) {
      await this.postToSlack(request.command, result.text, request.filePath);
    }

    return result;
  }

  public async stream(request: CodexCompletionRequest): Promise<CodexCompletionResult> {
    const client = await this.ensureClient();
    if (!client) {
      throw new Error('Codex client not available. Set OPENAI_API_KEY to enable.');
    }

    const prompt = request.prompt || this.buildPrompt(request);
    const temperature = request.temperature ?? this.defaultTemperature;
    const maxTokens = request.maxTokens ?? this.defaultMaxTokens;

    const payload = {
      model: this.model,
      prompt,
      temperature,
      max_tokens: maxTokens,
      stream: true,
    } as Record<string, unknown>;

    let buffer = '';
    let usage: Record<string, unknown> | undefined;

    const streamFactory = async () => {
      if (typeof (client as any).completions?.stream === 'function') {
        const stream = await (client as any).completions.stream(payload);
        for await (const event of stream) {
          const text = this.extractTextFromResponse(event);
          if (text) {
            buffer += text;
            request.onChunk?.(text);
          }
          usage = usage || this.normalizeUsage(event);
        }
        await stream.done?.();
        return buffer;
      }

      if (typeof (client as any).responses?.stream === 'function') {
        const stream = await (client as any).responses.stream({
          model: this.model,
          input: [{ role: 'user', content: prompt }],
          temperature,
          max_output_tokens: maxTokens,
        });

        for await (const event of stream) {
          const text = this.extractTextFromResponse(event);
          if (text) {
            buffer += text;
            request.onChunk?.(text);
          }
          usage = usage || this.normalizeUsage(event);
        }

        await stream.done?.();
        return buffer;
      }

      const fallback = await this.execute({ ...request, prompt });
      chunkCodexResponse(fallback.text).forEach((chunk) => request.onChunk?.(chunk));
      usage = fallback.usage;
      return fallback.text;
    };

    const text = await this.withTimeout(streamFactory, 'Codex streaming');

    await this.logUsage({
      prompt,
      result: text,
      tokenUsage: usage,
      fileContext: request.filePath,
      userId: request.userId,
      metadata: { ...(request.metadata || {}), stream: true },
    });

    if (this.shouldUseSlack() && request.metadata?.notifySlack) {
      await this.postToSlack(request.command, text, request.filePath);
    }

    return { text: text.trim(), usage };
  }

  public async autoImproveFile(options: AutoImprovePromptOptions & { userId?: string; metadata?: Record<string, unknown> }): Promise<AutoImproveResult> {
    const prompt = buildAutoImprovePrompt(options);
    const result = await this.execute({
      command: 'auto_improve',
      prompt,
      metadata: options.metadata,
      userId: options.userId,
      filePath: options.filePath,
      maxTokens: Math.max(this.defaultMaxTokens, 2048),
    });

    const improvement: ExtractedImprovement = extractImprovement(result.text);
    const improvedContent = improvement.code || improvement.raw;
    const patchPreview = createPatchPreview(options.originalContent, improvedContent, options.filePath);

    await this.logUsage({
      prompt,
      result: improvedContent,
      tokenUsage: result.usage,
      fileContext: options.filePath,
      userId: options.userId,
      metadata: { ...(options.metadata || {}), mode: 'auto-improve' },
    });

    if (this.shouldUseSlack() && options.metadata?.notifySlack) {
      await this.postToSlack('auto_improve', improvement.raw, options.filePath);
    }

    return {
      prompt,
      improvedContent,
      reasoning: improvement.reasoning,
      patchPreview,
      usage: result.usage,
    };
  }

  public async handleSlackMessage(payload: {
    text: string;
    channel?: string;
    user?: string;
    filePath?: string;
  }): Promise<CodexCompletionResult | null> {
    if (!this.shouldUseSlack()) {
      return null;
    }

    const normalized = payload.text.trim();
    const commandMatch = normalized.match(/^\/(improve|refactor|explain)\s+/i);
    const command = (commandMatch?.[1]?.toLowerCase() as CodexCommand) || 'chat';
    const message = normalized.replace(/^\/[a-zA-Z]+\s+/, '');

    const result = await this.generate({
      command,
      message,
      metadata: { origin: 'slack', channel: payload.channel },
      userId: payload.user,
      filePath: payload.filePath,
    });

    const slackClient = this.ensureSlackClient();
    if (slackClient && payload.channel) {
      await slackClient.chat.postMessage({
        channel: payload.channel,
        text: sanitizeSlackText(result.text),
      });
    }

    return result;
  }
}

const codexAgent = new CodexAgent();
export default codexAgent;

