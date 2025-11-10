const express = require('express');
const { z } = require('zod');

const router = express.Router();

const { detectIntent } = require('../services/gurulo_intent_router');
const codexAgent = require('../agents/codex_agent');
const guruloCore = require('../../shared/gurulo-core');
const { normalizeResponse, GURULO_CORE_VERSION } = guruloCore.response;
const {
  buildGreetingResponse,
  buildSmalltalkResponse,
  buildParamRequestResponse,
  buildAvailabilityResults,
  buildPricingInfoResponse,
  buildWeatherInfoResponse,
  buildTripPlanResponse,
  buildPoliciesFaqResponse,
  buildContactSupportResponse,
  buildTransportResponse,
  buildLocalAttractionsResponse,
  buildLegacyFeatureResponse,
  buildOffTopicResponse,
} = require('../services/gurulo_response_builder');

const chatRequestSchema = z.object({
  message: z.string().min(1, 'Message cannot be empty'),
  personalId: z.string().trim().min(1).optional(),
  conversationHistory: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant', 'system']).default('user'),
        content: z.string().min(1, 'Content cannot be empty'),
      }),
    )
    .optional()
    .default([]),
  selectedModel: z.string().trim().min(1).optional(),
  modelOverride: z.string().trim().min(1).optional(),
  metadata: z.record(z.any()).optional(),
  audience: z.enum(['public_front', 'admin_dev']).optional(),
  semanticContext: z
    .object({
      results: z.array(
        z.object({
          id: z.number(),
          text: z.string(),
          similarity: z.number(),
          metadata: z.record(z.any()).optional(),
          source: z.string().optional(),
          userId: z.string().optional(),
          createdAt: z.string().optional(),
        }),
      ),
      searchQuery: z.string(),
      metadata: z
        .object({
          resultCount: z.number(),
          threshold: z.number(),
          maxResults: z.number(),
          searchDuration: z.number().optional(),
        })
        .optional(),
    })
    .optional(),
}).passthrough();

const validateChatRequest = (req, res, next) => {
  const parsed = chatRequestSchema.safeParse(req.body);

  if (!parsed.success) {
    res.set('X-Content-Format', 'text');
    return res.status(400).json({
      success: false,
      error: 'Invalid request body',
      details: parsed.error.issues,
      timestamp: new Date().toISOString(),
    });
  }

  req.chatRequest = parsed.data;
  return next();
};

const normalizeConversationHistory = (history = []) => {
  const allowedRoles = new Set(['user', 'assistant', 'system']);

  return (Array.isArray(history) ? history : [])
    .filter((entry) => entry && typeof entry.content === 'string' && entry.content.trim().length > 0)
    .map((entry) => ({
      role: allowedRoles.has(entry.role) ? entry.role : 'user',
      content: entry.content.trim(),
    }))
    .slice(-20);
};

const normalizeIntentName = (value) => {
  if (typeof value !== 'string') {
    return value;
  }

  const normalized = value.trim().toLowerCase();
  const mapping = {
    check_availability: 'availability',
  };

  return mapping[normalized] || normalized;
};

const buildSuccessResponse = (intent, payload, historyLength, audience, normalizationContext = {}) => {
  const baseMetadata = payload && typeof payload === 'object' && payload.metadata ? { ...payload.metadata } : {};
  const telemetry = { ...(payload.telemetry || {}), ...(baseMetadata.telemetry || {}) };

  if (typeof telemetry.intent_detected === 'string') {
    telemetry.intent_detected = normalizeIntentName(telemetry.intent_detected);
  }

  const normalized = normalizeResponse(
    normalizationContext.userId || normalizationContext.personalId || 'anonymous',
    payload.response,
    {
      audience,
      language: normalizationContext.language || baseMetadata.language,
      sections: normalizationContext.sections,
      warnings: baseMetadata.warnings || payload.warnings,
      task: normalizationContext.task,
      plan: normalizationContext.plan,
      final: normalizationContext.final,
      verification: normalizationContext.verification,
      metadata: {
        ...normalizationContext.metadata,
        ...baseMetadata,
        telemetry,
        intent: intent.name,
        confidence: intent.confidence,
      },
    },
  );

  const responseMetadata = {
    ...baseMetadata,
    intent: intent.name,
    confidence: intent.confidence,
    telemetry,
    core: normalized.meta,
    format: GURULO_CORE_VERSION,
  };

  const normalizedIntent = normalizeIntentName(intent.name);
  if (typeof normalizedIntent === 'string' && normalizedIntent !== intent.name) {
    responseMetadata.intentNormalized = normalizedIntent;
  }

  if (Array.isArray(payload.quickPicks)) {
    responseMetadata.quickPicks = payload.quickPicks;
  }

  const baseResponse = {
    success: true,
    response: normalized.plainText,
    plainText: normalized.plainText,
    core: normalized,
    metadata: responseMetadata,
    conversationHistoryLength: historyLength,
  };

  if (Array.isArray(payload.quickPicks) && payload.quickPicks.length) {
    baseResponse.quickPicks = payload.quickPicks;
  }

  return baseResponse;
};

const handleChatRequest = async (req, res) => {
  const body = req.chatRequest || req.body;
  const {
    message,
    personalId = 'anonymous',
    conversationHistory = [],
    metadata = {},
    audience: audienceCandidate,
    semanticContext,
  } = body;

  const normalizedHistory = normalizeConversationHistory(conversationHistory);
  const historyLength = normalizedHistory.length;

  const metadataAudience =
    metadata && typeof metadata === 'object' && typeof metadata.audience === 'string'
      ? metadata.audience
      : undefined;
  const audience =
    audienceCandidate === 'public_front' || audienceCandidate === 'admin_dev'
      ? audienceCandidate
      : metadataAudience === 'public_front' || metadataAudience === 'admin_dev'
        ? metadataAudience
        : 'admin_dev';
  const builderOptions = { audience };

  const codexEnabled = typeof codexAgent?.isEnabled === 'function' && codexAgent.isEnabled();
  const useCodex = codexEnabled && (
    body.useCodex === true ||
    metadata?.useCodex === true ||
    body.selectedModel === 'codex' ||
    body.modelOverride === 'codex'
  );

  try {
    console.log('🤖 AI Chat endpoint hit', {
      hasHistory: historyLength > 0,
      personalId,
      messageLength: message.length,
      hasSemanticContext: !!semanticContext,
      semanticResultsCount: semanticContext?.results?.length || 0,
    });

    if (useCodex) {
      const conversationForCodex = normalizedHistory.map((entry) => `${entry.role}: ${entry.content}`);
      const slashMatch = message.trim().match(/^\/(improve|refactor|explain)\b/i);
      const codexCommand = (metadata?.codexCommand || slashMatch?.[1]?.toLowerCase() || 'chat').replace('-', '_');
      const strippedMessage = slashMatch ? message.replace(/^\/[a-zA-Z_-]+\s*/, '') : message;

      let enhancedMessage = strippedMessage;
      if (semanticContext && semanticContext.results && semanticContext.results.length > 0) {
        const memoryContext = semanticContext.results
          .map((r, idx) => `Memory ${idx + 1} (${(r.similarity * 100).toFixed(0)}% match): ${r.text}`)
          .join('\n\n');
        enhancedMessage = `🧠 Relevant Memory Context:\n${memoryContext}\n\n---\nUser Query: ${strippedMessage}`;
        console.log(`🧠 [SEMANTIC] Injected ${semanticContext.results.length} memories into Codex prompt`);
      }

      try {
        const codexResult = await codexAgent.generate({
          command: codexCommand,
          message: enhancedMessage,
          instructions: metadata?.instructions,
          filePath: metadata?.filePath || metadata?.targetFile,
          conversation: conversationForCodex,
          metadata: {
            ...metadata,
            semanticContext,
            origin: metadata?.origin || 'chat-endpoint',
            useCodex: true,
          },
          userId: personalId,
        });

        return res.status(200).json({
          success: true,
          response: codexResult.text,
          metadata: {
            model: 'codex',
            usage: codexResult.usage || null,
            command: codexCommand,
          },
          conversationHistoryLength: historyLength,
        });
      } catch (codexError) {
        console.error('⚠️ Codex chat fallback error:', codexError?.message || codexError);
      }
    }

    const intent = detectIntent(message, { metadata });

    const respondWithPayload = (payload) => {
      res.set('X-Content-Format', 'text');
      return res
        .status(200)
        .json(
          buildSuccessResponse(intent, payload, historyLength, audience, {
            userId: personalId,
            language: metadata.language,
            metadata,
            semanticContext,
          }),
        );
    };

    if (intent.name === 'off_topic_consumer_block') {
      return respondWithPayload(buildOffTopicResponse(metadata, builderOptions));
    }

    if (intent.name === 'greeting') {
      return respondWithPayload(buildGreetingResponse(metadata, builderOptions));
    }

    if (intent.name === 'smalltalk') {
      return respondWithPayload(buildSmalltalkResponse(metadata, builderOptions));
    }

    if (intent.name === 'check_availability') {
      if (intent.missingParams.length) {
        return respondWithPayload(buildParamRequestResponse(intent.missingParams, metadata, builderOptions));
      }
      return respondWithPayload(buildAvailabilityResults(intent.params, metadata, builderOptions));
    }

    if (intent.name === 'pricing_info') {
      return respondWithPayload(buildPricingInfoResponse(metadata, builderOptions));
    }

    if (intent.name === 'weather_info') {
      return respondWithPayload(buildWeatherInfoResponse(metadata, builderOptions));
    }

    if (intent.name === 'trip_plan') {
      return respondWithPayload(buildTripPlanResponse(metadata, builderOptions));
    }

    if (intent.name === 'policies_faq') {
      return respondWithPayload(buildPoliciesFaqResponse(metadata, builderOptions));
    }

    if (intent.name === 'contact_support') {
      return respondWithPayload(buildContactSupportResponse(metadata, builderOptions));
    }

    if (intent.name === 'transport') {
      return respondWithPayload(buildTransportResponse(metadata, builderOptions));
    }

    if (intent.name === 'local_attractions') {
      return respondWithPayload(buildLocalAttractionsResponse(metadata, builderOptions));
    }

    if (intent.name === 'legacy_feature') {
      return respondWithPayload(buildLegacyFeatureResponse(metadata, builderOptions));
    }

    return respondWithPayload(buildOffTopicResponse(metadata, builderOptions));
  } catch (error) {
    console.error('❌ AI Chat error:', error);
    const fallbackMessage = metadata.language === 'en'
      ? 'Sorry, the AI helper is temporarily unavailable. Please try again soon.'
      : 'ბოდიში, AI სისტემა დროებით მიუწვდომელია. სცადეთ ცოტა ხანში კვლავ.';

    const normalizedFallback = normalizeResponse(personalId, fallbackMessage, {
      audience,
      metadata,
    });

    res.set('X-Content-Format', 'text');
    return res.status(500).json({
      success: false,
      error: 'AI Chat service unavailable',
      details: error.message,
      response: normalizedFallback.plainText,
      plainText: normalizedFallback.plainText,
      core: normalizedFallback,
      metadata: {
        core: normalizedFallback.meta,
        format: GURULO_CORE_VERSION,
      },
      timestamp: new Date().toISOString(),
    });
  }
};

router.post('/chat', validateChatRequest, handleChatRequest);
router.post('/intelligent-chat', validateChatRequest, handleChatRequest);

module.exports = router;
module.exports.handleChatRequest = handleChatRequest;
module.exports.validateChatRequest = validateChatRequest;

