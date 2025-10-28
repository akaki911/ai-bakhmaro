const express = require('express');
const router = express.Router();

const { sanitizeResponse, flattenStructured } = require('../utils/enhanced_sanitizer');
const guruloCore = require('../../shared/gurulo-core');
const { normalizeResponse, GURULO_CORE_VERSION } = guruloCore.response;
const { applyBrandGuard, guruloIdentity } = guruloCore.identity;

// Import AI services with fallback
let groqService;
try {
  groqService = require('../services/groq_service');
} catch (error) {
  console.warn('⚠️ Groq service not available for streaming:', error.message);
}

const codexAgent = require('../agents/codex_agent');

const isCodexAvailable = () => {
  try {
    return Boolean(codexAgent?.isEnabled?.());
  } catch (error) {
    console.warn('⚠️ Codex availability check failed:', error.message);
    return false;
  }
};

// SOL-203: POST /api/ai/stream - Server-Sent Events streaming endpoint

const createStreamCollector = (options = {}) => {
  const {
    userId = 'anonymous',
    language = 'ka',
    salutation = guruloIdentity.salutation,
    audience,
    baseMetadata = {},
  } = options;

  const chunks = [];
  const brandIssues = new Set();

  return {
    addChunk(text, issues = []) {
      const normalized = typeof text === 'string' ? text.trim() : '';
      if (normalized) {
        chunks.push(normalized);
      }
      if (Array.isArray(issues)) {
        for (const issue of issues) {
          if (issue) {
            brandIssues.add(issue);
          }
        }
      }
    },
    finalize(meta = {}) {
      const normalizedMeta = meta && typeof meta === 'object' ? meta : {};
      const metadata = { ...baseMetadata, ...(normalizedMeta.metadata || {}) };
      const streamMeta = metadata.stream && typeof metadata.stream === 'object' ? { ...metadata.stream } : {};
      streamMeta.chunkCount = chunks.length;
      streamMeta.brandIssues = Array.from(brandIssues);
      metadata.stream = streamMeta;

      return normalizeResponse(userId, chunks.join('\n'), {
        audience: normalizedMeta.audience || audience,
        language: normalizedMeta.language || language,
        salutation: normalizedMeta.salutation || salutation,
        warnings: normalizedMeta.warnings,
        sections: normalizedMeta.sections,
        task: normalizedMeta.task,
        plan: normalizedMeta.plan,
        final: normalizedMeta.final,
        verification: normalizedMeta.verification,
        metadata,
      });
    },
    isEmpty() {
      return chunks.length === 0;
    },
  };
};

const processChunkPayload = (payload, userQuery = '') => {
  const flattened = flattenStructured(payload);
  const normalized = typeof flattened === 'string' ? flattened : String(flattened ?? '');
  const sanitized = sanitizeResponse(normalized, userQuery || '') ?? '';
  const brandResult = applyBrandGuard(typeof sanitized === 'string' ? sanitized : String(sanitized ?? ''), {
    forceGeorgian: true,
  });

  const text = typeof brandResult.text === 'string' ? brandResult.text.trim() : '';
  const issues = Array.isArray(brandResult.issues) ? brandResult.issues : [];

  return { text, issues };
};

const writeSseData = (res, raw) => {
  const text = typeof raw === 'string' ? raw : String(raw ?? '');
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    res.write(`data: ${line}\n`);
  }
  res.write('\n');
};

const sendTextChunk = (res, text, userQuery, collector, options = {}) => {
  const { collect = true } = options || {};
  const processed = processChunkPayload(text, userQuery);

  if (!processed.text) {
    return;
  }

  if (collect && collector) {
    collector.addChunk(processed.text, processed.issues);
  }

  res.write('event: chunk\n');
  writeSseData(res, processed.text);
};

const sendMetaEvent = (res, payload) => {
  if (!payload || typeof payload !== 'object') {
    return;
  }
  res.write('event: meta\n');
  writeSseData(res, JSON.stringify(payload));
};

const splitFallbackIntoSegments = (content) => {
  const normalized = (content || '').toString().trim();
  if (!normalized) {
    return [''];
  }

  const paragraphs = normalized.split(/\n{2,}/).map((part) => part.trim()).filter(Boolean);
  if (paragraphs.length >= 3) {
    return paragraphs.slice(0, 4);
  }

  const approxSize = Math.max(1, Math.ceil(normalized.length / 3));
  const segments = [];
  for (let index = 0; index < normalized.length; index += approxSize) {
    segments.push(normalized.slice(index, index + approxSize));
  }
  return segments.filter(Boolean);
};

const resolveContent = (value) => {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) {
    return value
      .map((item) => resolveContent(item))
      .filter(Boolean)
      .join('\n');
  }
  if (typeof value === 'object') {
    const contentLikeKeys = ['content', 'response', 'message', 'text', 'value'];
    for (const key of contentLikeKeys) {
      if (key in value) {
        const resolved = resolveContent(value[key]);
        if (resolved) return resolved;
      }
    }
    if ('ka' in value && typeof value.ka === 'string') {
      return value.ka;
    }
    if ('en' in value && typeof value.en === 'string') {
      return value.en;
    }
    const firstString = Object.values(value).find((item) => typeof item === 'string');
    if (typeof firstString === 'string') {
      return firstString;
    }
    return JSON.stringify(value);
  }
  return '';
};

router.post('/stream', async (req, res) => {
  console.log('🌊 AI Stream endpoint accessed');
  
  try {
    const { message, personalId = '01019062020', params = {} } = req.body;
    
    console.log('🔍 Stream Request:', { 
      message: message?.substring(0, 50), 
      personalId,
      streaming: true
    });

    if (!message || message.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Message is required for streaming'
      });
    }

    const metadataPayload = typeof params.metadata === 'object' && params.metadata ? { ...params.metadata } : {};
    const {
      language: metadataLanguage,
      salutation: metadataSalutation,
      audience: metadataAudience,
      warnings: metadataWarnings,
      sections: metadataSections,
      task: metadataTask,
      plan: metadataPlan,
      final: metadataFinal,
      verification: metadataVerification,
      ...metadataRest
    } = metadataPayload;

    const normalizedLanguage = metadataLanguage === 'en' ? 'en' : 'ka';
    const streamCollector = createStreamCollector({
      userId: personalId,
      language: normalizedLanguage,
      salutation:
        typeof metadataSalutation === 'string' && metadataSalutation.trim()
          ? metadataSalutation.trim()
          : guruloIdentity.salutation,
      audience: metadataAudience,
      baseMetadata: metadataRest,
    });

    const codexRequested =
      params?.useCodex === true ||
      req.body?.useCodex === true ||
      metadataPayload.useCodex === true ||
      params?.model === 'codex' ||
      params?.selectedModel === 'codex';
    const groqAvailable = Boolean(groqService && typeof groqService.askGroq === 'function');
    const codexFallback = !groqAvailable && isCodexAvailable();
    const shouldUseCodex = isCodexAvailable() && (codexRequested || codexFallback);
    let activeMode = shouldUseCodex ? 'codex' : groqAvailable ? 'live' : 'offline-fallback';
    const streamMetadataExtras = {};

    const emitCoreMeta = (() => {
      let emitted = false;
      return (modeOverride, extraMetadata = {}) => {
        if (emitted) {
          return null;
        }
        emitted = true;

        const mode = modeOverride || activeMode;
        const normalized = streamCollector.finalize({
          audience: metadataAudience,
          warnings: metadataWarnings,
          sections: metadataSections,
          task: metadataTask,
          plan: metadataPlan,
          final: metadataFinal,
          verification: metadataVerification,
          metadata: {
            ...streamMetadataExtras,
            ...extraMetadata,
            streamMode: mode,
            codexRequested: codexRequested === true,
            codexAttempted: shouldUseCodex,
            groqAvailable,
          },
        });

        sendMetaEvent(res, {
          channel: 'direct-ai',
          mode,
          format: GURULO_CORE_VERSION,
          plainText: normalized.plainText,
          core: normalized,
        });

        return normalized;
      };
    })();

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Cache-Control');

    if (typeof res.flushHeaders === 'function') {
      res.flushHeaders();
    }

    res.write('event: start\n');
    writeSseData(res, 'streaming');

    // Immediate lead-in chunk to unblock clients
    sendTextChunk(res, 'გურულო პასუხს ამზადებს…', message, streamCollector, { collect: false });

    sendMetaEvent(res, { channel: 'direct-ai', mode: activeMode });

    // Heartbeat to keep connection alive
    const heartbeat = setInterval(() => {
      const payload = JSON.stringify({ ts: Date.now() });
      res.write('event: ping\n');
      writeSseData(res, payload);
    }, 1000);

    if (shouldUseCodex) {
      res.setHeader('X-Stream-Mode', 'codex');

      try {
        const codexResult = await codexAgent.stream({
          command: params?.command || 'chat',
          message,
          instructions: params?.instructions,
          code: params?.code,
          extraContext: params?.extraContext,
          filePath: params?.filePath,
          conversation: Array.isArray(params?.conversation) ? params.conversation : [],
          metadata: {
            ...metadataPayload,
            origin: metadataPayload.origin || 'http-stream',
            notifySlack: metadataPayload.notifySlack ?? params?.notifySlack === true,
            useCodex: true,
          },
          userId: personalId,
          onChunk: (chunk) => sendTextChunk(res, chunk, message, streamCollector),
        });

        if (streamCollector.isEmpty() && typeof codexResult?.text === 'string' && codexResult.text.trim()) {
          sendTextChunk(res, codexResult.text, message, streamCollector);
        } else if (!codexResult?.text) {
          sendTextChunk(res, 'Codex-მა ცარიელი პასუხი დააბრუნა.', message, streamCollector);
        }

        const codexMeta = { engine: 'codex' };
        if (codexResult?.meta && typeof codexResult.meta === 'object') {
          codexMeta.codexMeta = codexResult.meta;
        }
        if (codexResult?.telemetry && typeof codexResult.telemetry === 'object') {
          codexMeta.codexTelemetry = codexResult.telemetry;
        }

        emitCoreMeta('codex', codexMeta);

        res.write('event: end\n');
        writeSseData(res, 'complete');

        clearInterval(heartbeat);
        res.end();
        return;
      } catch (codexError) {
        console.error('❌ Codex streaming error:', codexError);
        const errorMessage = codexError?.message || 'Codex failure';
        streamMetadataExtras.codexError = { message: errorMessage };
        sendMetaEvent(res, {
          channel: 'direct-ai',
          mode: 'codex-error',
          message: errorMessage,
        });
        activeMode = groqAvailable ? 'live' : 'offline-fallback';
        sendMetaEvent(res, { channel: 'direct-ai', mode: activeMode });
        sendTextChunk(
          res,
          'Codex სერვისთან პირდაპირი კავშირი ვერ განხორციელდა – გურულო გადადის ალტერნატიულ მოდელზე…',
          message,
          streamCollector,
        );
      }
    }

    if (!groqService || typeof groqService.askGroq !== 'function') {
      activeMode = 'offline-fallback';
      streamMetadataExtras.groqStatus = 'unavailable';
      sendMetaEvent(res, { channel: 'direct-ai', mode: activeMode });
      const fallbackMessage = [
        '🔌 **Offline რეჟიმი აქტიურია** – პირდაპირი Groq კავშირი დროებით მიუწვდომელია.',
        message
          ? `მიღებული შეტყობინება: "${message.slice(0, 120)}${message.length > 120 ? '…' : ''}"`
          : 'შეტყობინება ვერ იქნა ამოღებული.',
        'გაგიწევთ დახმარებას ლოკალური ცოდნით სანამ რეალურ დროში სტრიმინგი აღდგება.'
      ].join('\n\n');

      const segments = splitFallbackIntoSegments(fallbackMessage);
      const safeSegments = segments.length ? segments : [''];
      const total = safeSegments.length;

      res.setHeader('X-Stream-Mode', 'fallback-offline');

      for (let index = 0; index < total; index += 1) {
        const content = safeSegments[index] ?? '';
        sendMetaEvent(res, {
          chunk: index + 1,
          total,
          mode: 'offline-fallback'
        });
        sendTextChunk(res, content, message, streamCollector);
        // Provide a brief delay to preserve streaming semantics for consumers and tests
        // even when we are synthesizing the stream locally.
        // eslint-disable-next-line no-await-in-loop
        await new Promise((resolve) => setTimeout(resolve, 120));
      }

      emitCoreMeta('offline-fallback', { engine: 'offline', reason: 'groq_unavailable' });

      res.write('event: end\n');
      writeSseData(res, 'complete');

      clearInterval(heartbeat);
      res.end();
      return;
    }

    // Georgian system prompt for streaming
    const systemPrompt = `გამარჯობა! თქვენ ხართ გურულო AI - ai.bakhmaro.co-ს ოფიციალური დეველოპერული ასისტენტი. პლატფორმა ეკუთვნის აკაკი ცინცაძეს (კაკი) პირადი ნომრით 01019062020 და თქვენ ზრუნავთ სისტემის ტექნიკურ სიზუსტეზე და კოდის ხარისხზე.

**STREAMING MODE ACTIVE** - მუშაობთ რეალურ დროში.

Language: ყველა პასუხი ქართულ ენაზე 🇬🇪
Response style: პირდაპირი, ტექნიკური, კონკრეტული

Role: Senior Full-Stack Engineer supporting ai.bakhmaro.co developer operations
Grammar: თითოეული წინადადება იყოს გრამატიკულად გამართული და ბუნებრივ ქართულ ენაზე.
File Guidance: თუ კონკრეტული ფაილის ნახვა ვერ ხერხდება, ნათლად აუხსენით შეზღუდვა და სთხოვეთ ზუსტი ბილიკი ან დამატებითი დეტალი.`;

    try {
      activeMode = 'live';
      streamMetadataExtras.groqStatus = 'online';
      sendMetaEvent(res, { channel: 'direct-ai', mode: activeMode });
      // Use streaming mode from Groq service
      const streamResponse = await groqService.askGroq([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message }
      ], true); // Enable streaming

      if (typeof streamResponse === 'string') {
        // Simple string response - chunk it
        const chunks = streamResponse.match(/.{1,50}/g) || [streamResponse];

        for (let i = 0; i < chunks.length; i++) {
          sendTextChunk(res, chunks[i], message, streamCollector);

          // Small delay for natural streaming effect
          await new Promise(resolve => setTimeout(resolve, 90));
        }
      } else {
        // Full response fallback
        const fallbackContent = resolveContent(streamResponse) || 'No response';
        const segments = splitFallbackIntoSegments(fallbackContent);
        const safeSegments = segments.length ? segments : [''];
        const total = safeSegments.length;
        for (let index = 0; index < total; index += 1) {
          sendMetaEvent(res, {
            chunk: index + 1,
            total,
            mode: 'offline'
          });
          sendTextChunk(res, safeSegments[index], message, streamCollector);
          // Slight delay for natural streaming effect
          await new Promise((resolve) => setTimeout(resolve, 90));
        }
      }

      emitCoreMeta(activeMode, { engine: 'groq', responseType: typeof streamResponse });

      // Send completion event without leaking forbidden markers
      res.write('event: end\n');
      writeSseData(res, 'complete');

    } catch (streamError) {
      console.error('🌊 Streaming error:', streamError?.message);
      activeMode = 'error';
      const processedError = processChunkPayload(`Streaming failed: ${streamError?.message || 'unknown error'}`, message);
      if (processedError.text) {
        streamCollector.addChunk(processedError.text, processedError.issues);
      }
      streamMetadataExtras.error = { message: streamError?.message || 'Streaming failed' };
      sendMetaEvent(res, { channel: 'direct-ai', mode: activeMode });
      res.write('event: error\n');
      writeSseData(res, processedError.text || 'Streaming failed');
      emitCoreMeta('error', { engine: 'groq', error: streamMetadataExtras.error });
    }

    clearInterval(heartbeat);
    res.end();

  } catch (error) {
    console.error('❌ Stream endpoint error:', error);
    res.status(500).json({
      success: false,
      error: 'Stream endpoint failed',
      message: error.message
    });
  }
});

module.exports = router;
