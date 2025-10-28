const express = require('express');
const { getMemory, addToMemory, storeGrammarCorrection, getGrammarFixes } = require('../services/memory_controller');
const { ensureNaturalGeorgian, analyzeGeorgianGrammar } = require('../utils/enhanced_georgian_validator');
const {
  isGreetingMessage,
  normalizeMessageForGreeting
} = require('../utils/greeting_utils');
const { askGroq, checkGroqHealth } = require('../services/groq_service');
const resourceOptimizer = require('../services/resource_optimizer');
const connectionManager = require('../services/groq_connection_manager');
const { getRandomGreeting } = require('../utils/greeting_responses');

const router = express.Router();

// Initialize system watchdog
const SystemWatchdog = require('../services/system_watchdog');
const systemWatchdog = new SystemWatchdog();

// Memory routes - these are now handled by server.js
// router.use('/memory', require('../routes/memory_view'));
// router.use('/memory', require('../routes/memory_sync'));
// router.use('/', require('../routes/ai_routes')); // For /remember endpoint

// Pending operations storage (in-memory for simplicity)
const pendingOps = {};

// System status endpoint
router.get('/system-status', (req, res) => {
  try {
    const status = systemWatchdog.getSystemStatus();
    res.json(status);
  } catch (error) {
    res.status(500).json({
      error: 'System status unavailable',
      message: error.message
    });
  }
});

// Simplified health check endpoint - always returns 200
router.get('/health', (req, res) => {
  console.log('[AI Health Check] Simple health check called');

  const healthStatus = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    ai_controller: 'loaded',
    endpoints: {
      chat: '/api/ai/chat',
      status: '/api/ai/status',
      health: '/api/ai/health'
    },
    version: '2.1'
  };

  res.json(healthStatus);
});

// Groq status check endpoint
router.get('/status', async (req, res) => {
  try {
    const apiKeyExists = !!process.env.GROQ_API_KEY;
    const apiKeyLength = process.env.GROQ_API_KEY ? process.env.GROQ_API_KEY.length : 0;

    console.log('🔍 GROQ API Key Status:', {
      exists: apiKeyExists,
      length: apiKeyLength,
      preview: process.env.GROQ_API_KEY ? `${process.env.GROQ_API_KEY.substring(0, 8)}...` : 'None'
    });

    let groqHealth = { status: 'not_configured', available: false };

    if (apiKeyExists) {
      groqHealth = await checkGroqHealth();
    }

    res.json({
      groq: {
        configured: apiKeyExists,
        apiKeyLength: apiKeyLength,
        status: groqHealth.status,
        available: groqHealth.available,
        model: 'llama3-70b-8192',
        latency: groqHealth.latency || null,
        fallbackMode: !groqHealth.available
      },
      environment: {
        nodeEnv: process.env.NODE_ENV,
        hasEnvFile: require('fs').existsSync('.env')
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Status check error:', error);
    res.status(500).json({
      error: 'Status check failed',
      message: error.message,
      groq: {
        configured: !!process.env.GROQ_API_KEY,
        status: 'error',
        available: false
      },
      timestamp: new Date().toISOString()
    });
  }
});

// Streaming chat endpoint
router.post('/stream', async (req, res) => {
  const startTime = Date.now();
  const { message, userId = 'anonymous', conversationId = `stream-${Date.now()}` } = req.body; // Added conversationId for context

  // Log start of request with file access tracking
  console.log(`🚀 [${userId}] New AI request: "${message}"`);
  console.log(`📂 [${userId}] Starting file system access tracking...`);

  // Set headers for Server-Sent Events
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });

  try {
    const { message, userId = '01019062020', conversationId = `stream-${Date.now()}` } = req.body; // Added conversationId

    if (!message) {
      return res.status(400).json({ 
        error: 'Message is required',
        timestamp: new Date().toISOString()
      });
    }

    console.log(`[AI Stream] Processing streaming message from user ${userId}:`, message);

    // Set SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });

    // Check cache first for streaming too
    const cacheKey = cacheService.generateCacheKey(message, userId);
    const cachedResponse = cacheService.getCachedResponse(cacheKey);

    if (cachedResponse) {
      console.log(`🎯 [AI Stream] Cache hit for user ${userId}`);
      res.write(`data: ${JSON.stringify({ type: 'complete', content: cachedResponse.response, cached: true })}\n\n`);
      res.end();
      return;
    }

    // Get user memory for context (limited)
    const userMemory = await getMemory(userId);

    if (process.env.GROQ_API_KEY) {
      try {
        // SOL-200: Pass through to route without forcing templates
        const { conversationHistory = [] } = req.body;
        const payload = { message, conversationHistory, userId };

        // Use AI chat route (which has proper role-based messages)
        const response = await fetch('http://localhost:5001/api/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const result = await response.json();
        if (result.success) {
          res.write(`data: ${JSON.stringify({ type: 'complete', content: result.response })}\n\n`);
          res.end();
          return;
        }

        let fullResponse = '';

        groqStream.data.on('data', (chunk) => {
          try {
            const lines = chunk.toString().split('\n');

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6).trim();

                if (data === '[DONE]') {
                  res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
                  res.end();
                  return;
                }

                if (data) {
                  try {
                    const parsed = JSON.parse(data);
                    if (parsed.choices && parsed.choices[0] && parsed.choices[0].delta) {
                      const content = parsed.choices[0].delta.content;
                      if (content) {
                        res.write(`data: ${JSON.stringify({ type: 'content', content: content })}\n\n`);
                      }
                    }
                  } catch (parseError) {
                    console.warn('JSON parse error for chunk:', data, parseError.message);
                  }
                }
              }
            }
          } catch (chunkError) {
            console.error('Chunk processing error:', chunkError);
            res.write(`data: ${JSON.stringify({ type: 'error', error: 'Chunk processing failed' })}\n\n`);
          }
        });

        groqStream.data.on('end', async () => {
          console.log('✅ [AI Stream] Stream completed');

          // Cache the completed response
          cacheService.cacheResponse(cacheKey, fullResponse, {
            service: 'groq_stream',
            timestamp: new Date().toISOString(),
            userId: userId
          });

          // Store conversation in memory (summarized)
          const memoryEntry = `Q: ${message.substring(0, 100)}\nA: ${fullResponse.substring(0, 150)}`;
          await addToMemory(userId, memoryEntry);

          res.write(`data: ${JSON.stringify({ type: 'complete', fullResponse })}\n\n`);
          res.end();
        });

        groqStream.data.on('error', (error) => {
          console.error('❌ [AI Stream] Stream error:', error);
          res.write(`data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`);
          res.end();
        });

      } catch (groqError) {
        console.error('❌ [AI Stream] Groq error:', groqError.message);
        res.write(`data: ${JSON.stringify({ type: 'error', error: 'AI სისტემა დროებით მიუწვდომელია' })}\n\n`);
        res.end();
      }
    } else {
      res.write(`data: ${JSON.stringify({ type: 'error', error: 'Groq API არ არის კონფიგურირებული' })}\n\n`);
      res.end();
    }

  } catch (error) {
    console.error('[AI Stream] Stream error:', error);
    res.write(`data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`);
    res.end();
  }
});

// Import cache service
const cacheService = require('../services/ai_cache_service');

// Import auto issue detector for GitHub Issues integration
const autoIssueDetector = require('../services/auto_issue_detector');

// Resource optimization status endpoint
router.get('/resources', (req, res) => {
  try {
    const resourceStats = resourceOptimizer.getResourceStats();
    const connectionStats = connectionManager.getPoolStats();
    const recommendations = resourceOptimizer.getOptimizationRecommendations();

    res.json({
      resources: resourceStats,
      connections: connectionStats,
      optimization: recommendations,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Resource stats error:', error);
    res.status(500).json({
      error: 'Resource monitoring error',
      message: error.message
    });
  }
});

// Import file access service with error handling
let fileAccessService;
try {
  fileAccessService = require('../services/file_access_service');
} catch (error) {
  console.warn('⚠️ FileAccessService not available:', error.message);
  fileAccessService = null;
}

// Chat endpoint - with ultra-aggressive streaming for maximum performance
router.post('/chat', async (req, res) => {
  try {
    const { message, userId = '01019062020', conversationHistory = [], enableStreaming = 'auto', conversationId = `chat-${Date.now()}` } = req.body; // Added conversationId

    if (!message) {
      return res.status(400).json({ 
        error: 'Message is required',
        timestamp: new Date().toISOString()
      });
    }

    console.log(`[AI Chat] Processing message from user ${userId}:`, message);

    // PRIORITY: Check for pending operations FIRST - before any other processing
    const pendingOp = pendingOps[userId];
    if (pendingOp) {
      const msg = message.toLowerCase().trim();
      console.log('🔄 [Pending Operation] Found pending operation for user:', userId, 'Message:', msg);

      // Enhanced confirmation regex - accepts more Georgian variations
      if (/^(კი|დიახ|შეცვალე|ოკ|ok|yes|კაი)\b/i.test(msg)) {
        try {
          const result = await performLabelEdit(pendingOp);
          delete pendingOps[userId];

          return res.json({
            response: `✅ ტექსტი წარმატებით შეიცვალა ${result.filesModified} ფაილში. "${pendingOp.oldLabel}" -> "${pendingOp.newLabel}"`,
            type: 'label_edit_completed',
            filesModified: result.filesModified
          });
        } catch (error) {
          delete pendingOps[userId];
          return res.json({
            response: `❌ შეცდომა ტექსტის შეცვლისას: ${error.message}`,
            type: 'label_edit_error'
          });
        }
      } 
      // Enhanced cancellation regex - accepts more Georgian variations  
      else if (/^(არა|გაუქმ|არა\s*შეცვალო|ნუ|no|cancel|stop|გაწყვეტ)\b/i.test(msg)) {
        delete pendingOps[userId];
        return res.json({
          response: '❌ ცვლილება გაუქმდა.',
          type: 'label_edit_cancelled'
        });
      }
      // Neither confirmation nor cancellation
      else {
        return res.json({
          response: `⏳ გთხოვთ, დაადასტუროთ ცვლილება:\n\n"${pendingOp.oldLabel}" -> "${pendingOp.newLabel}"\n\nპასუხისთვის: "კი" ან "არა"`,
          type: 'label_edit_confirmation_needed',
          pendingOperation: pendingOp
        });
      }
    }

    // ავტომატური სტრიმინგი დიდი უმრავლესობისთვის (80-90% შემცირება perceived latency-ში)
    const shouldStream = enableStreaming === 'auto' ? message.length > 15 : enableStreaming;

    // 🎯 Enhanced query classification with better pattern matching
    const queryType = classifyQuery(message);
    console.log('🔍 Query classified as:', queryType);

    // Directly handle greetings with static responses before any heavy processing
    if (queryType === 'greeting') {
      const greetingResponse = handleGreetingQuery(message);

      return res.json({
        response: greetingResponse,
        timestamp: new Date().toISOString(),
        service: 'greeting_static_response',
        cached: false,
        queryType,
        grammar: { score: 100, errors: [], suggestions: [] },
        enhanced: true,
        static: true
      });
    }

    // Handle label edit requests
    if (typeof queryType === 'object' && queryType.type === 'label_edit_request') {
      const { oldLabel, newLabel } = queryType;
      const searchResults = await fileAccessService.searchInFiles(oldLabel);

      if (searchResults.length > 0) {
        const foundFiles = searchResults.map(result => 
          `${result.file}:${result.line} - ${result.content}`
        ).slice(0, 5).join('\n');

        // Store pending operation
        pendingOps[userId] = {
          oldLabel,
          newLabel,
          searchResults,
          timestamp: Date.now()
        };

        const response = `✅ ვიპოვე "${oldLabel}" შემდეგ ადგილებში:\n\n${foundFiles}\n\nგსურთ ყველა ადგილას შეცვლა "${newLabel}"-ით?\n\nპასუხისთვის: "კი" ან "არა"`;

        return res.json({
          response,
          type: 'label_edit_confirmation',
          searchResults: searchResults.slice(0, 10),
          oldLabel,
          newLabel,
          pendingOperation: true
        });
      } else {
        const response = `❌ ტექსტი "${oldLabel}" ვერ ვიპოვე პროექტში. გთხოვთ, შეამოწმოთ სწორად იყოს დაწერილი, ან მიუთითოთ ფაილის სახელი სადაც უნდა მოხდეს ცვლილება.`;

        return res.json({
          response,
          type: 'label_edit_not_found',
          oldLabel,
          newLabel
        });
      }
    }

    // Handle confirmation for label edits
    if (queryType === 'label_edit_request' && (message.includes('კი') || message.includes('შეცვალე'))) {
      // This would need additional context from previous request - implement session storage
      const response = 'განხორციელების ფუნქცია მზადდება...';
      return res.json({ response, type: 'label_edit_executing' });
    }

    // Handle static information queries with predefined responses
    if (queryType === 'static_info') {
      const siteSummary = require('../services/site_summary');
      let staticResponse = siteSummary.getStaticResponse('platform_overview');

      console.log(`📋 [Static Info] Serving predefined platform information`);

      return res.json({
        response: staticResponse,
        timestamp: new Date().toISOString(),
        service: 'static_info_predefined',
        cached: false,
        queryType: queryType,
        grammar: { score: 100, errors: [], suggestions: [] },
        enhanced: true,
        static: true
      });
    }

    // Handle general site overview queries
    if (queryType === 'site_overview') {
      const siteSummaryBulletList = `🧠 **Gurulo AI Development Workspace**

• **ძირითადი მიზანი:**
  - Repository-aware AI დეველოპერი Gurulo
  - ავტომატიზაციის ნაკადები და Trusted Ops
  - სისტემის მონიტორინგი და დიაგნოსტიკა

• **ძირითადი შესაძლებლობები:**
  - კონტექსტური ჩატის პასუხები და კოდის ანალიზი
  - ავტონომიური ცვლილებების შესრულება უსაფრთხო გარნეტებით
  - სისტემის მეტრიკებისა და ალერტების კონტროლი
  - გრძელი ვადიანი მეხსიერება და ცოდნის შეჯამება

• **ტექნოლოგიები:**
  - Frontend: React + TypeScript + Vite
  - Backend: Node.js + Express
  - AI: Groq (LLaMA) + OpenAI fallback
  - Styling: Tailwind CSS
  - Workspace: pnpm მონორეპო და ავტომატიზაციის სკრიპტები`;

      console.log(`📋 [Site Overview] Serving predefined bullet-point overview`);

      return res.json({
        response: siteSummaryBulletList,
        timestamp: new Date().toISOString(),
        service: 'site_overview_predefined',
        cached: false,
        queryType: queryType,
        grammar: { score: 100, errors: [], suggestions: [] },
        enhanced: true,
        static: true
      });
    }

    // Handle wellbeing queries
    if (queryType === 'wellbeing') {
      const wellbeingResponses = [
        'კარგად ვარ, გმადლობ! რით შემიძლია დაგეხმარო?',
        'მშვენივრად ვმუშაობ! რა საკითხი გაინტერესებს?',
        'ყველაფერი კარგადაა, მზად ვარ დაგეხმარო! რა გჭირდებათ?'
      ];

      const randomResponse = wellbeingResponses[Math.floor(Math.random() * wellbeingResponses.length)];

      console.log(`😊 [Wellbeing] Serving friendly wellbeing response`);

      return res.json({
        response: randomResponse,
        timestamp: new Date().toISOString(),
        service: 'wellbeing_predefined',
        cached: false,
        queryType: queryType,
        grammar: { score: 100, errors: [], suggestions: [] },
        enhanced: true,
        static: true
      });
    }

    // Handle small talk queries
    if (queryType === 'small_talk') {
      const smallTalkResponses = [
        '🤖 კარგად ვმუშაობ! ვეხმარები დეველოპერებს Gurulo-ს AI სივრცის განვითარებაში. რას გჭირდება დახმარება?',
        '😊 ყველაფერი კარგად მიდის! ვანალიზებ კოდს და ვუპასუხებ ტექნიკურ კითხვებს ai.bakhmaro.co-ს შესახებ. რითი შემიძლია დაგეხმარო?',
        '🔧 ვმუშაობ და ველოდები შენს კითხვებს Gurulo-ს პლატფორმაზე! რა ინფორმაცია გაინტერესებს?'
      ];

      const randomResponse = smallTalkResponses[Math.floor(Math.random() * smallTalkResponses.length)];

      console.log(`💬 [Small Talk] Serving friendly small talk response`);

      return res.json({
        response: randomResponse,
        timestamp: new Date().toISOString(),
        service: 'small_talk_predefined',
        cached: false,
        queryType: queryType,
        grammar: { score: 100, errors: [], suggestions: [] },
        enhanced: true,
        static: true
      });
    }

    // Handle general how-it-works queries
    if (queryType === 'general_how_it_works') {
      const howItWorksResponse = `🔧 **როგორ მუშაობს Gurulo AI Development Workspace:**

🏗️ **არქიტექტურა:** React/TypeScript frontend + Node.js/Express სერვისი + Firebase ინფრასტრუქტურა

📋 **ძირითადი პროცესები:**
1. Gurulo იღებს დეველოპერის შეტყობინებას და აგროვებს კონტექსტს
2. prompt_manager აწყობს სისტემურ და მომხმარებლის პრომპტებს
3. groq_service აგზავნის მოთხოვნას მოდელისკენ და იღებს პასუხს
4. repository_automation_service აფასებს შეიძლება თუ არა ავტომატური ცვლილება
5. trusted_ops_policy უზრუნველყოფს უსაფრთხო შესრულებას
6. system_watchdog და performance_monitoring აკვირდებიან ჯანმრთელობას

💻 **მთავარი ფაილები:**
• ai-service/controllers/ai_controller.js - მოთხოვნების ორკესტრატორი
• ai-service/services/gurulo_intent_router.js - კლასიფიკაცია და მიმართულება
• ai-service/services/repository_automation_service.js - Trusted Ops ნაკადი
• ai-service/services/system_watchdog.js - მონიტორინგი
• ai-service/services/site_summary.js - კოდექსის სტატიკური ცოდნა

🤖 **AI ასისტენტი:** კონტექსტური პასუხები, კოდის ანალიზი და ავტომატიზაცია დეველოპერებისთვის`;

      console.log(`🔧 [How It Works] Serving predefined system explanation`);

      return res.json({
        response: howItWorksResponse,
        timestamp: new Date().toISOString(),
        service: 'general_how_it_works_predefined',
        cached: false,
        queryType: queryType,
        grammar: { score: 100, errors: [], suggestions: [] },
        enhanced: true,
        static: true
      });
    }

    // Check cache first
    const cacheKey = cacheService.generateCacheKey(message, userId, queryType);
    const cachedResponse = cacheService.getCachedResponse(cacheKey);

    if (cachedResponse) {
      console.log(`🎯 [AI Chat] Cache hit for user ${userId} (${queryType})`);
      return res.json({
        response: cachedResponse.response,
        timestamp: new Date().toISOString(),
        service: 'cache',
        cached: true,
        queryType: queryType,
        grammar: { score: 100, errors: [], suggestions: [] },
        enhanced: true
      });
    }

    // Get user memory for context (limited)
    const userMemory = await getMemory(userId);
    const grammarFixes = await getGrammarFixes(userId);

    // Limit conversation history to last 3 messages only
    const limitedHistory = conversationHistory.slice(-3);

    let response;
    let usedService = 'fallback';

    // Handle specific technical queries with RAG
    if (queryType === 'project_structure' || queryType === 'full_info') {
      console.log('🔍 [RAG] Processing comprehensive information request');
      response = await handleRAGQuery(message, userId, conversationHistory);
      usedService = 'rag_comprehensive_analysis';
    } else if (queryType === 'code_explanation' || queryType === 'how_it_works') {
      console.log('🔍 [RAG] Processing code analysis request');
      response = await handleRAGQuery(message, userId, conversationHistory);
      usedService = 'rag_code_analysis';
    } else if (queryType.startsWith('file_search_')) {
      const searchType = queryType.replace('file_search_', '');
      console.log(`🔍 [Specialized Search] Processing ${searchType} file search`);
      response = await handleSpecializedFileSearch(message, userId, searchType);
      usedService = `specialized_${searchType}_search`;
    } else {
      // For general queries, also use RAG if they contain technical terms
      if (containsTechnicalTerms(message)) {
        console.log('🔍 [RAG] Processing technical query with RAG');
        response = await handleRAGQuery(message, userId, conversationHistory);
        usedService = 'rag_technical_query';
      }
    }

    // Try Groq first if available  
    console.log('🔑 API Key Check:', {
      exists: !!process.env.GROQ_API_KEY,
      length: process.env.GROQ_API_KEY ? process.env.GROQ_API_KEY.length : 0,
      message: message.substring(0, 50)
    });

    if (process.env.GROQ_API_KEY) {
      try {
        // ზუსტად მიზანმიმართული პრომპტების გენერაცია
        const optimizedPrompt = generateOptimizedPrompt(queryType, userMemory, grammarFixes, {
          originalMessage: message,
          moduleContext: limitedHistory.length > 0 ? limitedHistory[0].content : '',
          codeSnippets: null, // ეს შეიძლება დაემატოს RAG-დან
          errorContext: null  // ეს შეიძლება დაემატოს error detection-დან
        });
        const systemPrompt = optimizedPrompt.system;
        const developerPrompt = optimizedPrompt.developer;

        // ტოკენების ოპტიმიზაცია კლასის მიხედვით
        const tokenLimits = {
          'project_structure': { system: 100, history: 0, user: 150 },
          'code_explanation': { system: 80, history: 100, user: 200 },
          'greeting': { system: 50, history: 0, user: 100 },
          'calculation': { system: 30, history: 0, user: 50 },
          'general': { system: 120, history: 150, user: 200 }
        };

        const limits = tokenLimits[queryType] || tokenLimits['general'];

        const messages = [
          ...(developerPrompt ? [{ role: 'system', content: developerPrompt }] : []),
          { role: 'system', content: systemPrompt.substring(0, limits.system) },
          ...(limits.history > 0 ? limitedHistory.slice(-1).map(h => ({
            role: h.role,
            content: h.content.substring(0, limits.history)
          })) : []),
          { role: 'user', content: message.substring(0, limits.user) }
        ];

        // ავტომატური სტრიმინგით Groq-ის გამოძახება
        const groqResponse = await askGroq(messages, 'auto');

        response = groqResponse.choices[0].message.content;
        usedService = `groq_${groqResponse.model || 'unknown'}_specialized_prompt`;

        // Prompt performance logging
        const promptStats = promptManager.getUsageStats();
        console.log('✅ [AI Chat] Groq response with specialized prompt', {
          model: groqResponse.model,
          responseLength: response.length,
          queryType: queryType,
          promptOptimization: 'Specialized prompts for better accuracy',
          availablePromptTypes: promptStats.totalPrompts
        });
      } catch (groqError) {
        console.error('❌ [AI Chat] Groq error:', groqError.message);

        // Enhanced fallback response with Georgian validation
        let fallbackResponse;

        // Check if this might be a label edit request that wasn't caught
        if (/(?:ჩანაცვლ|შეცვლ|გადარქ|ამოიღ|შეცვალ|გადამარქვ|ტექსტ|წარწერ)/i.test(message)) {
          fallbackResponse = `მგონი გსურთ ტექსტის შეცვლა UI-ში. გთხოვთ, სწორად დაწეროთ ძველი და ახალი ტექსტი ბრჭყალებში:\n\nმაგალითად: "ძველი ტექსტი" შეცვლა "ახალი ტექსტი"-ით\n\nან: "ძველი" ჩანაცვლება "ახალი"-ით`;
        } else {
          fallbackResponse = generateFallbackResponse(message);
        }

        console.log('🔄 Switching to enhanced fallback mode');
        response = fallbackResponse;
        usedService = 'fallback_after_groq_error';
      }
    } else {
      console.warn('⚠️ [AI Chat] No GROQ_API_KEY found - using enhanced fallback mode');
      response = await generateEnhancedFallback(message, userId);
      usedService = 'enhanced_fallback_no_groq';
    }

    // Enhanced Georgian grammatical correction with fallback
    let validatedResponse = response;

    // Skip Georgian validation for label edit responses to avoid over-processing
    if (queryType && (queryType.type === 'label_edit_request' || 
                     queryType === 'label_edit_confirmation' || 
                     queryType === 'label_edit_not_found')) {
      console.log('🎯 Skipping Georgian validation for label edit response');
      validatedResponse = response;
    } else {
      try {
        // Primary: Use Groq for advanced grammar correction
        // Enhanced Georgian validation with fallback
        console.log('🔍 Georgian validator: Processing text:', response.substring(0, 100) + '...');
        const { improveGeorgianWithFallback } = require('../services/ai_response_improver');
        validatedResponse = await improveGeorgianWithFallback(response);
        console.log('✅ Georgian validation completed with enhanced fallback');
      } catch (groqError) {
        console.log('⚠️ Groq grammar correction failed, using sync fallback:', groqError.message);
        // Fallback: Use synchronous basic validator
        try {
          const { ensureNaturalGeorgian } = require('../utils/enhanced_georgian_validator');
          validatedResponse = ensureNaturalGeorgian(response);
          console.log('🔧 Sync grammar correction applied as fallback');
        } catch (syncError) {
          console.log('⚠️ Sync correction also failed, using raw response:', syncError.message);
          validatedResponse = response; // Last resort: use original response
        }
      }
    }

    const grammarValidation = analyzeGeorgianGrammar(validatedResponse);

    // Cache the response for future use
    cacheService.cacheResponse(cacheKey, validatedResponse, {
      service: usedService,
      timestamp: new Date().toISOString(),
      userId: userId
    });

    // Store conversation in memory (summarized)
    const memoryEntry = `Q: ${message.substring(0, 100)}\nA: ${validatedResponse.substring(0, 150)}`;
    await addToMemory(userId, memoryEntry);

    // Store grammar corrections if found
    if (grammarValidation.errors && grammarValidation.errors.length > 0) {
      for (const error of grammarValidation.errors) {
        await storeGrammarCorrection(userId, error.found, error.suggestion);
      }
    }

    // 🤖 SUCCESS MONITORING: Monitor successful AI responses for auto-closing issues
    try {
      await autoIssueDetector.monitorSuccessfulOperation('AI Chat Response', {
        userId: userId,
        service: usedService,
        component: 'ai_controller',
        queryType: queryType,
        responseLength: validatedResponse.length,
        details: `Successfully processed query: ${message.substring(0, 100)}...`
      });
    } catch (successMonitorError) {
      console.warn('⚠️ [Success Monitor] Could not monitor success:', successMonitorError.message);
    }

    res.json({
      response: validatedResponse,
      timestamp: new Date().toISOString(),
      service: usedService,
      cached: false,
      grammar: {
        score: grammarValidation.score || 100,
        errors: grammarValidation.errors || [],
        suggestions: grammarValidation.suggestions || []
      },
      enhanced: true
    });

  } catch (error) {
    console.error('[AI Chat] Chat error:', error);
    
    // 🤖 AUTO-ISSUE DETECTION: Create GitHub issue for AI errors
    try {
      await autoIssueDetector.detectAndCreateIssue(error, {
        userId: userId,
        service: 'AI Chat',
        component: 'ai_controller',
        query: message,
        conversationId: conversationId
      });
    } catch (issueError) {
      console.warn('⚠️ [Auto Issue] Could not create GitHub issue:', issueError.message);
    }
    
    // Provide user-friendly error messages based on error type
    let userMessage = 'AI სერვისში შეცდომა მოხდა';
    let suggestions = [];

    if (error.message?.includes('timeout')) {
      userMessage = 'AI სერვისი დროებით ნელა პასუხობს. გთხოვთ, სცადოთ კვლავ.';
      suggestions = ['დაელოდეთ რამდენიმე წამს და სცადეთ კვლავ', 'შეამცირეთ შეკითხვის სიგრძე'];
    } else if (error.message?.includes('Rate limit')) {
      userMessage = 'AI სერვისი დროებით გადატვირთულია. გთხოვთ, მოკლე ხანში სცადოთ.';
      suggestions = ['დაელოდეთ 1-2 წუთს', 'სცადეთ უფრო მოკლე შეკითხვა'];
    } else if (error.message?.includes('API')) {
      userMessage = 'AI მოდელთან კავშირის პრობლემა. ვცდილობთ აღდგენას.';
      suggestions = ['შეამოწმეთ ინტერნეტ კავშირი', 'სცადეთ განახლება'];
    }

    res.status(500).json({
      error: userMessage,
      details: error.message,
      suggestions: suggestions,
      conversationId: conversationId, // Use the conversationId for tracking
      timestamp: new Date().toISOString(),
      canRetry: true
    });
  }
});

// Import prompt manager
const promptManager = require('../services/prompt_manager');

function generateOptimizedPrompt(queryType, userMemory, grammarFixes, additionalContext = {}) {
  const memoryContext = userMemory?.data ? userMemory.data.substring(0, 100) : '';

  // Context-ის მომზადება prompt manager-ისთვის
  const contextData = {
    message: additionalContext.originalMessage || '',
    siteContext: memoryContext,
    moduleContext: additionalContext.moduleContext,
    codeSnippets: additionalContext.codeSnippets,
    errorContext: additionalContext.errorContext,
    technicalContext: additionalContext.technicalContext
  };

  // მიზანმიმართული პრომპტის მიღება
  const promptData = promptManager.classifyAndGetPrompt(
    additionalContext.originalMessage || '', 
    contextData
  );

  // Token optimization
  const optimizedPrompt = promptManager.optimizeForTokens(promptData, 150);

  console.log(`🎯 Using specialized prompt type: ${queryType}`);

  return {
    system: optimizedPrompt.system,
    developer: optimizedPrompt.developer,
    tokens: optimizedPrompt.tokens,
  };
}

// Enhanced query classification system with specific term recognition
function classifyQuery(message) {
  const safeMessage = typeof message === 'string' ? message : '';
  const lowerMessage = safeMessage.toLowerCase();
  const normalizedMessage = normalizeMessageForGreeting(safeMessage);

  // Greeting patterns with normalized detection
  if (isGreetingMessage(safeMessage, normalizedMessage)) {
    return 'greeting';
  }

  // Small talk patterns - Georgian variants
  if (/^(როგორ\s+ხარ|რა\s+ხდება|როგორა|რა\s+ამბავი|how\s+are\s+you)\s*[!?]*$/i.test(lowerMessage)) {
    return 'small_talk';
  }

  // Platform information queries
  if (/^(რა\s+არის|რა\s+გინდ|რას\s+აკეთებ|რა\s+შეგიძლია|what\s+can|capabilities)\s*[!?]*$/i.test(lowerMessage)) {
    return 'status_check';
  }

  // Enhanced classification with specific term recognition
  const patterns = {
    file_search_automation: [
      /(მოძებნე|ძებნა|find|search).*(ავტომატიზ|automation|ops)/i,
      /(trusted\s*ops|automation).*(ფაილ|file|component|კომპონენტ)/i,
      /(repository|automation)_service/i
    ],

    file_search_monitoring: [
      /(მოძებნე|ძებნა|find|search).*(monitor|მონიტორ|watchdog|latency|metrics)/i,
      /(system_watchdog|performance_monitoring|health_monitor)/i
    ],

    file_search_memory: [
      /(მოძებნე|ძებნა|find|search).*(მეხსიერ|memory|context)/i,
      /(consolidated_memory_service|memory_controller)/i
    ],

    file_search_prompt: [
      /(მოძებნე|ძებნა|find|search).*(პრომპტ|prompt|system prompt)/i,
      /(prompt_manager|system_prompts)/i
    ],

    file_search_admin: [
      /(მოძებნე|ძებნა|find|search).*(ადმინ|admin)/i,
      /(ადმინ|admin).*(დაშბორდ|dashboard|პანელ|panel)/i
    ],

    file_search_messaging: [
      /(მოძებნე|ძებნა|find|search).*(მესიჯ|message|შეტყობინება)/i,
      /(მესიჯ|message).*(სისტემ|system)/i
    ],

    label_edit_request: [
      /შეცვალე/, /change/, /დაარქვი/, /rename/, /მაგივრად/, /instead of/,
      /ტექსტის/, /text/, /ლეიბლი/, /label/, /სახელწოდება/, /title/,
      /რედაქტირება/, /edit/, /მოდიფიკაცია/, /modify/, /გადარქმევა/,
      /ეწეროს/, /should say/, /წერია/, /says/, /სათაური/, /header/
    ],

    code_help: [
      /როგორ/, /how to/, /ვერ მუშაობს/, /not working/, /error/, /შეცდომა/,
      /debug/, /fix/, /problem/, /issue/, /გაუმართე/, /გასწორება/
    ],

    site_overview: [
      /რა არის/, /what is/, /გითხარით/, /tell me/, /ახსენით/, /explain/,
      /სრული ინფორმაცია/, /full information/, /როგორ მუშაობს/, /how.*work/,
      /overview/, /summary/, /ზოგადი/, /general/
    ]
  };

    // Label edit request (enhanced with normalization)
    const normalizeLabelEditMessage = (msg) => {
      const replacements = {
        'პნელი': 'პანელი',
        'ტექსტის': '',
        'ამ ': '',
        'ტექსტით': '',
        'გადარქმევა': 'შეცვლა',
        'ჩანაცვლება': 'შეცვლა'
      };
      let cleaned = msg.toLowerCase();
      Object.entries(replacements).forEach(([k, v]) => {
        cleaned = cleaned.replace(new RegExp(k, 'gi'), v);
      });
      return cleaned.trim();
    };

    // More flexible regex for label editing - looks for two quoted texts anywhere in message
    const normalizedMessage = normalizeLabelEditMessage(message);
    // Enhanced pattern that handles various punctuation and word spacing
    const editPattern = /["'„"]([^"'„"]+)["'„"].+?["'„"]([^"'„"]+)["'„"]/i;
    const labelEditMatches = normalizedMessage.match(editPattern);

    if (labelEditMatches) {
        return {
            type: 'label_edit_request',
            oldLabel: labelEditMatches[1].trim(),
            newLabel: labelEditMatches[2].trim()
        };
    }

  for (const type in patterns) {
    if (patterns.hasOwnProperty(type)) {
      const regexes = patterns[type];
      for (const regex of regexes) {
        if (regex.test(message)) {
          return type;
        }
      }
    }
  }

  // Static information queries - highest priority
  const siteSummary = require('../services/site_summary');
  if (siteSummary.isStaticInfoQuery(message)) {
    return'static_info';
  }

  // Site overview queries (bullet-point format)
  if (/მოკლე\s*(აღწერა|შეჯამება|ინფორმაცია)|საიტის\s*(აღწერა|ინფორმაცია)|რა\s*არის\s*(ეს|gurulo)|gurulo\s*\S*\s*შესახებ/i.test(message)) {
    return 'site_overview';
  }

  // General how-it-works queries (system explanation)
  if (/როგორ\s*მუშაობს\s*(საიტი|სისტემა|ყველაფერი)|როგორ\s*ფუნქციონირებს|როგორ\s*არის\s*მოწყობილი/i.test(message)) {
    return 'general_how_it_works';
  }

  // Project structure queries (technical details)
  if (/სრული\s*ინფორმაცია|სტრუქტურ|პლატფორმ|მთლიანი|არქიტექტურ|ტექნიკური\s*დეტალები/i.test(message)) {
    return 'project_structure';
  }

  // Code explanation queries  
  if (/რომელი?\s*(კოდი|ფაილი|ფუნქცია|კომპონენტი)|რა\s*(აქვს|არის|მუშაობს|შეიცავს|გვიჩვენებს)/i.test(message)) {
    return 'code_explanation';
  }

  // Specific how it works queries (module-level)
  if (/როგორ\s*(მუშაობს|ფუნქციონირებს|იმუშავებს)\s+[a-zA-Z]/i.test(message)) {
    return 'how_it_works';
  }

  // Additional greeting detection handled via normalized helper above

  // Wellbeing/small talk detection - specific patterns
  if (/^(როგორ\s+ხარ|how\s+are\s+you|კარგად\s+ხარ|რა\s+ხდება|რა\s+განწყობაში\s+ხარ|როგორ\s+მუშაობ|რითი\s+გეკავები|რას\s+აკეთებ)[\s\!\?]*$/i.test(message)) {
    return 'wellbeing';
  }

  // Handle simple calculations naturally without special treatment
  if (lowerMessage.match(/^\s*[\d+\-*/().\s]+\s*[?!]?\s*$/)) {
    const mathResult = calculateMath(message);
    if (mathResult) return mathResult;
  }

  // Default general query
  return 'general';
}

// Specialized handlers for different query types
// Main RAG query handler
async function handleRAGQuery(message, userId, conversationHistory = []) {
  try {
    console.log('🔍 [RAG] Processing technical query with enhanced context');

    // Enhanced file search with multiple strategies and fallback
    let relevantFiles = [];

    try {
      const searchTerms = extractSearchTerms(message);
      console.log('🔍 [RAG] Search terms:', searchTerms);

      // Safe FileAccessService import with fallback
      let FileAccessService;
      try {
        FileAccessService = require('../services/file_access_service');
      } catch (importError) {
        console.error('❌ FileAccessService import failed:', importError.message);

        // Create fallback FileAccessService
        FileAccessService = {
          searchInFiles: async (term, extensions) => {
            console.log('🔄 Using fallback file search for:', term);
            const fs = require('fs').promises;
            const path = require('path');
            const results = [];

            try {
              // Search in current directory only
              const files = await fs.readdir(process.cwd(), { withFileTypes: true });
              for (const file of files) {
                if (file.isFile() && extensions.some(ext => file.name.endsWith(ext))) {
                  try {
                    const content = await fs.readFile(path.join(process.cwd(), file.name), 'utf8');
                    if (content.includes(term)) {
                      results.push({
                        file: file.name,
                        line: 1,
                        content: `File contains: ${term}`
                      });
                    }
                  } catch (readError) {
                    // Skip unreadable files
                  }
                }
              }
            } catch (error) {
              console.warn('🔄 Fallback search failed:', error.message);
            }

            return results;
          }
        };
      }

      // Use FileAccessService (real or fallback) for comprehensive search
      for (const term of searchTerms) {
        const results = await FileAccessService.searchInFiles(term, ['.tsx', '.ts', '.js', '.jsx']);
        relevantFiles.push(...results);
      }
    } catch (error) {
      console.error('❌ RAG file search error:', error.message);
    }

    if (relevantFiles.length === 0) {
      console.log('⚠️ [RAG] No relevant files found, using general response');
      return await generateEnhancedFallback(message, userId, conversationHistory);
    }

    // Build enhanced context with file contents
    let contextSections = [];
    let fileAccessService;
    try {
        fileAccessService = require('../services/file_access_service');
    } catch (error) {
        console.warn('⚠️ FileAccessService not available:', error.message);
        fileAccessService = null;
    }

    if (fileAccessService && relevantFiles.length > 0) {
      for (const file of relevantFiles.slice(0, 5)) {
        try {
          const content = await fileAccessService.readFileContent(file.path);
          if (content) {
            contextSections.push({
              path: file.path,
              type: file.type || 'file',
              relevance: file.score || 1,
              content: content.substring(0, 1500), // Limit content size
              functions: file.functions || []
            });
          }
        } catch (fileError) {
          console.log(`⚠️ [RAG] Could not read file ${file.path}:`, fileError.message);
        }
      }
    }

    // Enhanced RAG context generation
    const combinedContext = contextSections.map(s =>
      `📄 **${s.path}** (რელევანტურობა: ${s.relevance})\n` +
      `\`\`\`${s.type}\n${s.content.substring(0, 1500)}\n\`\`\`\n` +
      (s.functions.length > 0 ? `ფუნქციები: ${s.functions.join(', ')}\n` : '')
    ).join('\n');

    // Enhanced prompt with structured context
    const enhancedPrompt = `მოხმარებლის შეკითხვა: ${message}\n\n` +
      `კოდის კონტექსტი:\n${combinedContext}\n\n` +
      `გამოიყენე ზემოთ მოცემული კოდის კონტექსტი შეკითხვაზე პასუხის გასაცემად. შეინარჩუნე კონტექსტი და ტექნიკური სიზუსტე.`;

    // Get Groq response
    const { askGroq } = require('../services/groq_service');
    const groqResponse = await askGroq([
      { role: 'system', content: 'თქვენ ხართ კოდის ანალიზის ექსპერტი.' },
      { role: 'user', content: enhancedPrompt }
    ], 'auto');

    const aiResponse = groqResponse.choices[0].message.content;
    return aiResponse;

  } catch (error) {
    console.error('❌ [RAG Handler] Failed:', error);
    return await generateEnhancedFallback(message, userId);
  }
}

// Enhanced fallback with basic RAG principles
async function generateEnhancedFallback(message, userId) {
  try {
    console.log('🔄 [Enhanced Fallback] Generating intelligent fallback...');

    // Try to get some basic project info even without full RAG
    let fallbackInfo = '🏗️ Gurulo AI Workspace-ის ძირითადი ინფორმაცია:\n\n';

    // Search for relevant files using corrected service
    let fileAccessService;
    try {
        fileAccessService = require('../services/file_access_service');
    } catch (error) {
        console.warn('⚠️ FileAccessService not available:', error.message);
        fileAccessService = null;
    }
    try {
      if (fileAccessService) {
        const searchResults = await fileAccessService.searchInFiles(message);
        if (searchResults.length > 0) {
          fallbackInfo += `📁 **მოძებნილი ფაილები:**\n`;
          searchResults.slice(0, 5).forEach(result => {
            fallbackInfo += `• ${result.file}: ${result.content.substring(0, 100)}...\n`;
          });
          fallbackInfo += '\n';
        }
      }
    } catch (searchError) {
      console.log('⚠️ [Enhanced Fallback] Search failed:', searchError.message);
    }

    // Get project structure overview
    try {
      if (fileAccessService) {
        const structure = await fileAccessService.getProjectStructure();
        if (structure && Object.keys(structure).length > 0) {
          fallbackInfo += `📊 **პროექტის ძირითადი სტრუქტურა:**\n`;
          const mainDirs = Object.keys(structure).filter(path => 
            !path.includes('/') && structure[path].type === 'directory'
          );
          mainDirs.forEach(dir => {
            fallbackInfo += `📁 ${dir}/\n`;
          });
          fallbackInfo += '\n';
        }
      }
    } catch (structureError) {
      console.log('⚠️ [Enhanced Fallback] Could not get structure:', structureError.message);
    }

    fallbackInfo += `🔧 **ტექნიკური დეტალები:**\n`;
    fallbackInfo += `• React/TypeScript Frontend\n`;
    fallbackInfo += `• Node.js/Express Backend\n`;
    fallbackInfo += `• Firebase Integration\n`;
    fallbackInfo += `• AI Assistant (Groq)\n\n`;

    fallbackInfo += `⚠️ სრული RAG ანალიზისთვის Groq API საჭიროა.`;

    return fallbackInfo;

  } catch (error) {
    console.error('❌ [Enhanced Fallback] Failed:', error);
    return generateProjectStructureFallback();
  }
}

function containsTechnicalTerms(message) {
  const technicalTerms = [
    'კოდი', 'code', 'ფაილი', 'file', 'ფუნქცია', 'function',
    'კომპონენტი', 'component', 'სერვისი', 'service', 'api',
    'backend', 'frontend', 'react', 'typescript', 'firebase',
    'database', 'ბაზა', 'სისტემა', 'system', 'მონაცემ', 'data'
  ];

  return technicalTerms.some(term => 
    message.toLowerCase().includes(term.toLowerCase())
  );
}

async function handleCodeExplanationQuery(message, userId, conversationHistory) {
  try {
    console.log('💻 Processing code explanation query');

    const codeAnalyzer = require('../services/codeAnalyzer');
    const explanation = await codeAnalyzer.analyzeForQuery(message, conversationHistory);
    return explanation || generateFallbackResponse(message);
  } catch (error) {
    console.error('❌ Code explanation failed:', error);
    return generateFallbackResponse(message);
  }
}

async function handleHowItWorksQuery(message, userId) {
  try {
    console.log('🔧 Processing how-it-works query');

    // Extract the main subject from the query
    const subject = extractSubjectFromQuery(message);

    if (subject) {
      const explanation = await explainModule(subject);
      return explanation || generateFallbackResponse(message);
    }

    return generateFallbackResponse(message);
  } catch (error) {
    console.error('❌ How-it-works explanation failed:', error);
    return generateFallbackResponse(message);
  }
}

function handleGreetingQuery(message) {
  return getRandomGreeting();
}

function extractSubjectFromQuery(message) {
  // Extract key terms from "როგორ მუშაობს X" type queries
  const matches = message.match(/როგორ\s*(მუშაობს|ფუნქციონირებს)\s*([^\?]*)/i);
  if (matches && matches[2]) {
    return matches[2].trim();
  }

  // Look for common subjects
  const subjects = ['ბრონირების', 'ფასების', 'კოტეჯების', 'მომხმარებლების', 'ადმინ', 'სასტუმროების'];
  for (const subject of subjects) {
    if (message.includes(subject)) {
      return subject;
    }
  }

  return null;
}

async function explainModule(term) {
  try {
    const { searchInFiles, getFileContext } = require('../services/fileService');

    console.log(`🔍 Searching for files related to: ${term}`);

    // Search for relevant files
    const searchResults = await searchInFiles(term, ['.ts', '.tsx', '.js', '.jsx']);

    if (searchResults.length === 0) {
      return `${term}-ის შესახებ ინფორმაცია ვერ მოიძებნა კოდბეისში.`;
    }

    // Get content from top 3 most relevant files
    const topFiles = searchResults.slice(0, 3);
    const fileContents = await Promise.all(
      topFiles.map(result => getFileContext(result.file))
    );

    // Build context for Groq
    let context = `📁 შესაბამისი ფაილები "${term}"-ის შესახებ:\n\n`;
    fileContents.forEach(file => {
      if (file.content) {
        context += `**${file.path}**\n\`\`\`${file.type}\n${file.content.substring(0, 2000)}\n\`\`\`\n\n`;
      }
    });

    // Ask Groq to explain
    const { askGroq } = require('../services/groq_service');
    const prompt = `შეაჯამე და ახსენი როგორ მუშაობს "${term}" ამ კოდში:\n\n${context}`;

    const response = await askGroq([
      { 
        role: 'system', 
        content: 'თქვენ ხართ კოდის ექსპერტი. ახსენით ფუნქციონალობა ქართულად, გასაგებად და დეტალურად.' 
      },
      { role: 'user', content: prompt }
    ]);

    return response.choices[0].message.content;

  } catch (error) {
    console.error('❌ Module explanation failed:', error);
    return `${term}-ის ახსნა ვერ მოხერხდა: ${error.message}`;
  }
}

function generateProjectStructureFallback() {
  return `🏗️ Gurulo AI Workspace-ის სტრუქტურა:

📁 **ai-service/** (Node.js/Express)
• controllers/ai_controller.js - მთავარი ორკესტრატორი
• services/gurulo_intent_router.js - მოთხოვნების კლასიფიკაცია
• services/repository_automation_service.js - Trusted Ops ნაკადი
• services/system_watchdog.js - მონიტორინგის ბირთვი

📁 **ai-frontend/** (React/TypeScript)
• src/components/AIAssistantEnhanced.tsx - Gurulo UI
• src/components/SystemMonitoringDashboard.tsx - მეტრიკების პანელი
• src/components/AutoImprove/ - ავტომატიზაციის UI

📁 **shared/**
• gurulo-core/ - საერთო პოლიტიკები და დამხმარე მოდულები
• gurulo-memory/ - მეხსიერების ადაპტერები

📁 **functions/**
• Firebase Functions ავტომატიზაციისა და განრიგის სერვისებისთვის

⚠️ სრული ანალიზისთვის Groq API საჭიროა.`;
}

// SOL-200: Natural fallback response (no rigid templates)
function generateFallbackResponse(message) {
  const safeMessage = typeof message === 'string' ? message : '';
  const lowerMessage = safeMessage.toLowerCase();
  const normalizedMessage = normalizeMessageForGreeting(safeMessage);

  console.log('⚠️ Using fallback response for:', safeMessage);

  // File search requests
  if (lowerMessage.includes('ფაილის მოძებნა') || lowerMessage.includes('დეშბორდის')) {
    return `ფაილის ძებნა გჭირდება? გთხოვ მითხრა კონკრეტული კომპონენტი.

AI ინსტრუმენტების მაგალითები:
• AIAssistantEnhanced.tsx - Gurulo UI
• SystemMonitoringDashboard.tsx - მეტრიკების პანელი
• repository_automation_service.js - Trusted Ops ნაკადი
• gurulo_intent_router.js - მოთხოვნების კლასიფიკაცია

💡 **იყავი უფრო კონკრეტული:**
• "repository_automation_service.js რა აკეთებს?"
• "SystemMonitoringDashboard-ში რა მეტრიკებია?"
• "Prompt manager სად ინახება?"

მითხარი და მოგიძებნი! 😊`;
  }

  // Programming/Technical questions with intelligent responses
  if (/რომელი?\s*(კოდი|ფაილი|ფუნქცია|კომპონენტი)/i.test(safeMessage) ||
      /რა\s*(აქვს|არის|მუშაობს|შეიცავს|გვიჩვენებს)/i.test(safeMessage)) {

    return `📁 რომელი ფაილი გაინტერესებს? მითხარი და ვნახავ რა შეიცავს:

📂 **React კომპონენტები (.tsx):**
• AIAssistantEnhanced, SystemMonitoringDashboard, AutoUpdateControl

⚙️ **TypeScript/JS სერვისები:**
• gurulo_intent_router, repository_automation_service, prompt_manager

🧠 **AI კონტექსტი:**
• consolidated_memory_service, context_retrieval_service

რომელი ფაილი ან სერვისი გაშიფროთ? 🤔`;
  }

  // Natural greeting responses
  if (lowerMessage.includes('გამარჯობა') || lowerMessage.includes('hello') || lowerMessage.includes('გამარჯობათ')) {
    return handleGreetingQuery(message);
  }

  // How-to questions with contextual help
  if (/როგორ\s*(გავაკეთო|მუშაობს|დავაყენო|დავწერო)/i.test(safeMessage)) {
    return `🤔 "${safeMessage}" - კარგი კითხვაა!

💡 **რჩევები:**
• React: გამოიყენე component-driven არქიტექტურა და Context
• TypeScript: განსაზღვრე მკაცრი ტიპები shared მოდულებში
• Gurulo: prompt_manager და site_summary დაგეხმარება კონტექსტში
• Automation: trusted_ops_policy და repository_automation_service გადაამოწმე

რა კონკრეტულად გინდა გააკეთო? 🛠️`;
  }

  // Service/Logic questions
  if (lowerMessage.includes('სერვისი') || lowerMessage.includes('ლოგიკა') || lowerMessage.includes('service')) {
    return `⚙️ ეს სერვისები გვაქვს Gurulo-ში:

📋 **ძირითადი სერვისები:**
• groq_service.js - მოდელთან კომუნიკაცია
• gurulo_response_builder.js - პასუხის აგება
• repository_automation_service.js - ავტომატიზაციის ნაკადები
• system_watchdog.js - სისტემური მონიტორინგი

რომელი დეტალი გჭირდება? 🤓`;
  }

  // Friendly default response - more natural and encouraging
  return `🤔 ჰმ... ჯერ ზუსტად ვერ მივხვდი რას ეძებ.

💭 **შეიძლება ეს გინდოდა:**
• "repository_automation_service.js რა აკეთებს?" - ავტომატიზაციის ახსნა
• "system_watchdog.js როგორ მუშაობს?" - მონიტორინგის დეტალები
• "Prompt manager სად ინახება?" - კონტექსტის აგების წყარო

📝 **ან უბრალოდ ჩამწერე:**
• "საიტის აღწერა" - რას აკეთებს Gurulo
• "ფაილების სია" - რომელი AI სერვისებია
• "როგორ დავიწყო?" - მოკლე გაიდი

მითხარი რა გჭირდება და ვეცდები დაგეხმარო! 😊`;
}

// Simple math calculator
function calculateMath(expression) {
  try {
    // Remove Georgian question words
    let mathExpr = expression
      .replace(/რამდენია\s*/gi, '')
      .replace(/რა\s*არის\s*/gi, '')
      .trim();

    // Basic safety check - only allow numbers, operators, and spaces
    if (!/^[\d+\-*/().\s]+$/.test(mathExpr)) {
      return null;
    }

    // Use Function constructor instead of eval for safety
    const result = Function(`"use strict"; return (${mathExpr})`)();

    if (typeof result === 'number' && !isNaN(result)) {
      return result.toString();
    }
    return null;
  } catch (error) {
    return null;
  }
}

// Specialized file search handler for specific components
async function handleSpecializedFileSearch(message, userId, searchType) {
  try {
    console.log(`🔍 [Specialized Search] Processing ${searchType} search for user ${userId}`);

    const searchTermMappings = {
      automation: ['ავტომატიზაცია', 'automation', 'trusted_ops', 'repository_automation_service', 'auto_issue_detector'],
      monitoring: ['მონიტორინგი', 'monitoring', 'system_watchdog', 'performance_monitoring', 'health_monitor'],
      memory: ['მეხსიერება', 'memory', 'consolidated_memory_service', 'memory_controller'],
      prompt: ['პრომპტ', 'prompt', 'prompt_manager', 'system_prompts'],
      admin: ['ადმინი', 'admin', 'AdminDashboard', 'AdminLayout', 'AdminUsers', 'administrator'],
      messaging: ['მესიჯი', 'messaging', 'MessagingSystem', 'message', 'notification']
    };

    const searchTerms = searchTermMappings[searchType] || [searchType];
    let allResults = [];

    // Perform search for each term
    for (const term of searchTerms) {
      try {
        const results = await fileAccessService.searchInFiles(term, ['.tsx', '.ts', '.js', '.jsx']);
        allResults.push(...results);
      } catch (error) {
        console.error(`❌ Search failed for term ${term}:`, error.message);
      }
    }

    // Remove duplicates and sort by relevance
    const uniqueResults = allResults.filter((result, index, self) =>
      index === self.findIndex(r => r.file === result.file && r.line === result.line)
    ).sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));

    if (uniqueResults.length === 0) {
      return `❌ "${searchType}"-ისთვის რელევანტური ფაილები ვერ მოიძებნა პროექტში.`;
    }

    // Build enhanced response with file contents
    let contextSections = [];

    for (const result of uniqueResults.slice(0, 5)) {
      try {
        const content = await fileAccessService.readFileContent(result.file);
        if (content) {
          contextSections.push({
            path: result.file,
            line: result.line,
            relevance: result.relevanceScore || 1,
            content: content.substring(0, 1500),
            matchedTerms: result.matchedTerms || []
          });
        }
      } catch (fileError) {
        console.log(`⚠️ Could not read file ${result.file}:`, fileError.message);
      }
    }

    // Create detailed response
    let response = `🔍 **${searchType.toUpperCase()} ფაილების ძებნის შედეგები:**\n\n`;

    response += `📊 **მოძებნილი ფაილები:** ${uniqueResults.length}\n`;
    response += `🎯 **ტოპ ${Math.min(5, contextSections.length)} რელევანტური ფაილი:**\n\n`;

    contextSections.forEach((section, index) => {
      response += `**${index + 1}. ${section.path}** (რელევანტურობა: ${section.relevance})\n`;
      response += `📍 ხაზი: ${section.line}\n`;
      if (section.matchedTerms.length > 0) {
        response += `🔤 მოძებნილი ტერმინები: ${section.matchedTerms.join(', ')}\n`;
      }
      response += `\`\`\`typescript\n${section.content.substring(0, 500)}\n\`\`\`\n\n`;
    });

    // If using Groq, enhance with AI analysis
    if (process.env.GROQ_API_KEY && contextSections.length > 0) {
      try {
        const combinedContext = contextSections.map(s => 
          `📄 **${s.path}**\n\`\`\`\n${s.content}\n\`\`\`\n`
        ).join('\n');

        const enhancedPrompt = `მომხმარებლის შეკითხვა: ${message}\n\n` +
          `${searchType} კომპონენტების კონტექსტი:\n${combinedContext}\n\n` +
          `გააანალიზე და ახსენი ზემოთ მოცემული ${searchType} ფაილების ფუნქციონალობა.`;

        const { askGroq } = require('../services/groq_service');
        const groqResponse = await askGroq([
          { role: 'system', content: `თქვენ ხართ ${searchType} კომპონენტების ანალიზის ექსპერტი.` },
          { role: 'user', content: enhancedPrompt }
        ], 'auto');

        response += `\n🤖 **AI ანალიზი:**\n${groqResponse.choices[0].message.content}`;
      } catch (groqError) {
        console.log(`⚠️ Groq analysis failed for ${searchType}:`, groqError.message);
      }
    }

    return response;

  } catch (error) {
    console.error(`❌ Specialized ${searchType} search failed:`, error);
    return `❌ ${searchType} ფაილების ძებნა ვერ მოხერხდა: ${error.message}`;
  }
}

// Enhanced Groq validation with anti-pattern prevention
async function validateAndFixWithGroq(text, validationType = 'comprehensive_grammar') {
  try {
    const { askGroq } = require('../services/groq_service');

    // Define specific prompts for different validation types
    const validationPrompts = {
      basic: 'გასწორე ქართული გრამატიკა ამ ტექსტში და დააბრუნე მხოლოდ გასწორებული ტექსტი.',
      comprehensive: 'ჩაატარე სრული ქართული ენის ვალიდაცია, გასწორე გრამატიკა, ორთოგრაფია და გახადე ტექსტი ბუნებრივი. დააბრუნე მხოლოდ გასწორებული ტექსტი.',
      technical: 'გასწორე ქართული გრამატიკა და ტექნიკური ტერმინოლოგია ამ ტექსტში. დააბრუნე მხოლოდ გასწორებული ტექსტი.',
      comprehensive_grammar: 'გასწორე ქართული გრამატიკა და ორთოგრაფია. თავიდან აიცილე "მე ვარ..." სტილის თვითაღმოჩენები. საჭიროების შემთხვევაში შეცვალე "ჩემი საიტი" -> "Gurulo AI Workspace". გახადე ტექსტი ბუნებრივი და პროფესიონალური. დააბრუნე მხოლოდ გასწორებული ტექსტი.'
    };

    const prompt = validationPrompts[validationType] || validationPrompts.basic;

    // Call Groq with increased temperature
    const groqResponse = await askGroq([
      { role: 'system', content: 'თქვენ ხართ ქართული ენის გრამატიკის კორექტორი.' },
      { role: 'user', content: `${prompt} ტექსტი: ${text}` }
    ], 'auto');

    const correctedText = groqResponse.choices[0].message.content;
    return correctedText;

  } catch (error) {
    console.error('❌ Groq validation error:', error);
    throw error;
  }
}

// --- Helper functions ---
async function searchFilesForLabel(label) {
  if (!fileAccessService) {
    throw new Error('File access service არ არის ხელმისაწვდომი');
  }

  const searchResults = await fileAccessService.searchInFiles(label);

  // Structure the results for easier handling
  const formattedResults = searchResults.map(result => ({
    file: result.file,
    matches: 1, // Simplify to just number of matching lines
    locations: [{
      line: result.line,
      context: result.content
    }]
  }));

  return formattedResults;
}

async function performLabelEdit(operation) {
  if (!fileAccessService) {
    throw new Error('File access service არ არის ხელმისაწვდომი');
  }

  const { oldLabel, newLabel } = operation;

  const searchResults = await fileAccessService.searchInFiles(oldLabel);

  let filesModified = 0;

  for (const result of searchResults) {
    try {
      const fileContent = await fileAccessService.readFileContent(result.file);
      const newContent = fileContent.replace(new RegExp(escapeRegExp(oldLabel), 'g'), newLabel);
      await fileAccessService.replaceFileContent(result.file, newContent);
      filesModified++;
    } catch (error) {
      console.error(`❌ Failed to modify file ${result.file}:`, error.message);
    }
  }

  return { filesModified };
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

// Main AI query handler
async function handleAIQuery(query, userId, context = {}) {
  try {
    console.log(`🤖 [handleAIQuery] Processing query from user ${userId}: ${query.substring(0, 100)}...`);

    // Check for deployment requests
    if (query.includes('deploy') || query.includes('გავუშვათ') || query.includes('rollback') || query.includes('დაბრუნება')) {
      return await handleDeploymentRequest(query, userId);
    }

    // Check for database operations
    if (query.includes('create collection') || query.includes('query') || query.includes('კოლექცია') || query.includes('ძებნა')) {
      return await handleDatabaseOperation(query, userId);
    }

    // Check for code analysis requests
    if (query.includes('search') || query.includes('rebuild index') || query.includes('მოძებნე') || query.includes('ინდექსის განახლება')) {
      return await handleDeepCodeAnalysis(query, userId);
    }

    // Check for infrastructure management
    if (query.includes('health check') || query.includes('system status') || query.includes('ჯანმრთელობის შემოწმება') || query.includes('სისტემის სტატუსი')) {
      return await handleInfrastructureManagement(query, userId);
    }

    // Default fallback
    return {
      response: '🤖 AI ასისტენტი მზადაა დაგეხმაროთ! გთხოვთ, დააკონკრეტოთ თქვენი მოთხოვნა.',
      metadata: { operation: 'general_query' }
    };

  } catch (error) {
    console.error('❌ [handleAIQuery] Error:', error);
    return {
      response: '❌ შეცდომა მოხდა AI სისტემაში. გთხოვთ, კვლავ სცადოთ.',
      metadata: { operation: 'error', error: error.message }
    };
  }
}

// Initialize controllers
function initializeControllers() {
  console.log('🤖 AI Controllers initialized successfully');
  return true;
}

// Replit-like operation handlers
async function handleDeploymentRequest(query, userId) {
  const deploymentService = require('../services/deployment_service');

  if (query.includes('deploy') || query.includes('გავუშვათ')) {
    const result = await deploymentService.deployToReplit({
      triggeredBy: userId,
      buildFrontend: true
    });

    return {
      response: result.success 
        ? `✅ დეპლოიმენტი წარმატებით განხორციელდა!\n\n🚀 თქვენი აპლიკაცია ახლავე ხელმისაწვდომია\n📊 დეტალები: ${JSON.stringify(result.deployment, null, 2)}`
        : `❌ დეპლოიმენტი ვერ მოხერხდა: ${result.error}\n\n🔍 გთხოვთ შეამოწმოთ კოდი და კვლავ სცადოთ.`,
      metadata: { operation: 'deployment', result }
    };
  }

  if (query.includes('rollback') || query.includes('დაბრუნება')) {
    const history = deploymentService.getDeploymentHistory();
    return {
      response: `📋 დეპლოიმენტის ისტორია:\n${history.map(h => `• ${h.id} - ${h.timestamp} (${h.status})`).join('\n')}\n\nრომელ ვერსიაზე გსურთ დაბრუნება?`,
      metadata: { operation: 'rollback_list', history }
    };
  }

  return { response: 'არასწორი დეპლოიმენტის ოპერაცია' };
}

async function handleDatabaseOperation(query, userId) {
  const firebaseOps = require('../services/firebase_operations_service');

  // Parse database operation from query
  if (query.includes('create') || query.includes('შექმნა')) {
    const collectionMatch = query.match(/collection\s+(\w+)/i) || query.match(/კოლექცია\s+(\w+)/i);
    if (collectionMatch) {
      const result = await firebaseOps.createCollection(collectionMatch[1], {
        name: `AI_Created_${Date.now()}`,
        description: 'Created by AI Assistant'
      });

      return {
        response: result.success 
          ? `✅ კოლექცია "${collectionMatch[1]}" წარმატებით შეიქმნა!\n📄 დოკუმენტის ID: ${result.id}`
          : `❌ კოლექციის შექმნა ვერ მოხერხდა: ${result.error}`,
        metadata: { operation: 'create_collection', result }
      };
    }
  }

  if (query.includes('query') || query.includes('ძებნა')) {
    const collectionMatch = query.match(/in\s+(\w+)/i) || query.match(/(\w+)\s+კოლექციაში/i);
    if (collectionMatch) {
      const result = await firebaseOps.queryCollection(collectionMatch[1]);

      return {
        response: result.success 
          ? `📊 "${collectionMatch[1]}" კოლექციის შედეგები:\n${JSON.stringify(result.data, null, 2)}`
          : `❌ ძებნა ვერ მოხერხდა: ${result.error}`,
        metadata: { operation: 'query_collection', result }
      };
    }
  }

  return { response: 'არასწორი მონაცემთა ბაზის ოპერაცია' };
}

async function handleDeepCodeAnalysis(query, userId) {
  const codeIndex = require('../services/code_index_service');

  if (query.includes('search') || query.includes('ძებნა') || query.includes('მოძებნე')) {
    const searchTerm = query.replace(/(search|ძებნა|მოძებნე)/gi, '').trim();
    const results = await codeIndex.searchInIndex(searchTerm);

    const response = results.length > 0 
      ? `🔍 კოდის ძებნის შედეგები "${searchTerm}"-სთვის:\n\n${results.slice(0, 10).map(r => 
          `📁 ${r.path} (${r.type}) - რელევანტობა: ${r.relevance}\n` +
          `   ფუნქციები: ${r.functions?.join(', ') || 'არცერთი'}\n` +
          `   კომპონენტები: ${r.components?.join(', ') || 'არცერთი'}`
        ).join('\n\n')}`
      : `❌ "${searchTerm}"-ისთვის ვერაფერი მოიძებნა`;

    return {
      response,
      metadata: { operation: 'code_search', searchTerm, resultCount: results.length }
    };
  }

  if (query.includes('rebuild index') || query.includes('ინდექსის განახლება')) {
    await codeIndex.buildIndex();
    return {
      response: '🔄 კოდის ინდექსი წარმატებით განახლდა!\n📚 ყველა ფაილი გადაინექსირდა',
      metadata: { operation: 'rebuild_index' }
    };
  }

  return { response: 'არასწორი კოდის ანალიზის ოპერაცია' };
}

async function handleInfrastructureManagement(query, userId) {
  if (query.includes('health check') || query.includes('ჯანმრთელობის შემოწმება')) {
    const deploymentService = require('../services/deployment_service');
    const healthResult = await deploymentService.performHealthChecks();

    return {
      response: `🏥 სისტემის ჯანმრთელობის შემოწმება:\n\n${healthResult.summary}\n\n` +
        Object.entries(healthResult.checks).map(([key, check]) => 
          `${check.success ? '✅' : '❌'} ${key}: ${check.message}`
        ).join('\n'),
      metadata: { operation: 'health_check', result: healthResult }
    };
  }

  if (query.includes('system status') || query.includes('სისტემის სტატუსი')) {
    const status = {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.version,
      environment: process.env.NODE_ENV || 'development'
    };

    return {
      response: `📊 სისტემის სტატუსი:\n\n` +
        `⏱️ მუშაობის დრო: ${Math.floor(status.uptime / 3600)}h ${Math.floor((status.uptime % 3600) / 60)}m\n` +
        `💾 მეხსიერება: ${Math.round(status.memory.used / 1024 / 1024)}MB გამოყენებული\n` +
        `🔧 Node.js ვერსია: ${status.version}\n` +
        `🌍 გარემო: ${status.environment}`,
      metadata: { operation: 'system_status', status }
    };
  }

  return { response: 'არასწორი ინფრასტრუქტურის მართვის ოპერაცია' };
}

// Helper function to track file modifications
async function trackFileModification(filePath, operationType, userId, success) {
  try {
    const fs = require('fs').promises;
    const path = require('path');
    const logFilePath = path.join(process.cwd(), 'file_access.log');
    const timestamp = new Date().toISOString();

    const logEntry = `${timestamp} - User: ${userId} - Operation: ${operationType} - File: ${filePath} - Success: ${success}\n`;
    await fs.appendFile(logFilePath, logEntry, 'utf8');
    console.log(`✅ [${userId}] File access logged for ${filePath} (${operationType})`);
  } catch (error) {
    console.error('❌ [File Tracking] Error logging file access:', error.message);
  }
}

// Enhanced ძირითადი ფუნქცია RAG processing-ისთვის
async function processWithRAG(message, userId) {
  try {
    console.log('🔍 [RAG] Processing technical query with RAG');

    // Import FileAccessService here
    const FileAccessService = require('../services/file_access_service');

    // Search for relevant files first
    let searchTerms = FileAccessService.expandSearchTerms(message);
    let fileResults = [];

    for (const term of searchTerms) {
      try {
        const results = await FileAccessService.searchInFiles(term);
        fileResults.push(...results);
      } catch (error) {
        console.error(`❌ RAG file search error: ${error.message}`);
      }
    }

    // Build file contents array by reading the actual files
    const fileContents = await Promise.all(
      fileResults.slice(0, 5).map(result => getFileContext(result.file))
    );

    // Combine all text into one large context string
    let contextText = fileContents.map(file => file.content).join('\n\n');

    // Get Groq response
    const { askGroq } = require('../services/groq_service');
    const groqResponse = await askGroq([
      { role: 'system', content: 'თქვენ ხართ კოდის ანალიზის ექსპერტი.' },
      { role: 'user', content: `მოხმარებლის შეკითხვა: ${message}\n\nკოდის კონტექსტი:\n${contextText}` }
    ], 'auto');

    const aiResponse = groqResponse.choices[0].message.content;
    return aiResponse;

  } catch (error) {
    console.error('❌ [RAG Handler] Failed:', error);
    return await generateEnhancedFallback(message, userId);
  }
}

async function performFileSearch(term, userId) {
  const startTime = Date.now();

  try {
    const FileAccessService = require('../services/file_access_service');

    // Expand search terms
    const expandedTerms = FileAccessService.expandSearchTerms(term);
    console.log(`🔍 [${userId}] Searching for: ${expandedTerms.join(', ')}`);

    // Search in files with enhanced scoring
    const searchResults = await Promise.all(
      expandedTerms.slice(0, 5).map(searchTerm =>
        FileAccessService.searchInFiles(searchTerm, ['.tsx', '.ts', '.js', '.jsx'])
      )
    );

    // Flatten and deduplicate results with enhanced scoring
    const allResults = searchResults.flat();
    const uniqueResults = allResults.reduce((acc, result) => {
      const existing = acc.find(r => r.file === result.file && r.line === result.line);
      if (existing) {
        // Combine relevance scores for same file/line
        existing.relevanceScore = (existing.relevanceScore || 0) + (result.relevanceScore || 1);
        existing.matchedTerms = [...new Set([...(existing.matchedTerms || []), ...(result.matchedTerms || [])])];
      } else {
        acc.push(result);
      }
      return acc;
    }, []);

    // Sort by relevance score
    uniqueResults.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));

    // Enhanced logging with performance metrics
    const searchDuration = Date.now() - startTime;
    console.log(`📁 [${userId}] File Access Activity:`);
    console.log(`⏱️ Search Duration: ${searchDuration}ms`);
    console.log(`🎯 Total Results: ${allResults.length}, Unique: ${uniqueResults.length}`);
    console.log(`📊 Top Results by Relevance:`);

    uniqueResults.slice(0, 5).forEach((result, index) => {
      console.log(`  ${index + 1}. 📖 ${result.file}:${result.line} (score: ${result.relevanceScore || 1})`);
      console.log(`     🔤 Terms: ${(result.matchedTerms || []).join(', ')}`);
      trackFileModification(result.file, 'search', userId, true);
    });

    // Cache performance metrics
    const performanceData = {
      searchTerm: term,
      expandedTerms: expandedTerms.length,
      totalResults: allResults.length,
      uniqueResults: uniqueResults.length,
      duration: searchDuration,
      timestamp: new Date().toISOString()
    };

    // Store performance data (optional)
    try {
      await storeSearchMetrics(userId, performanceData);
    } catch (metricsError) {
      console.log('⚠️ Could not store search metrics:', metricsError.message);
    }

    console.log(`📊 Search completed: ${uniqueResults.length} relevant files in ${searchDuration}ms`);
    return uniqueResults;
  } catch (error) {
    console.error('❌ [File Search] Error:', error);
    return [];
  }
}

// Store search metrics for performance analysis
async function storeSearchMetrics(userId, performanceData) {
  try {
    const fs = require('fs').promises;
    const path = require('path');
    const metricsPath = path.join(process.cwd(), 'ai-service', 'search_metrics.json');

    let metrics = [];
    try {
      const existingData = await fs.readFile(metricsPath, 'utf8');
      metrics = JSON.parse(existingData);
    } catch (error) {
      // File doesn't exist yet, start with empty array
    }

    metrics.push({ userId, ...performanceData });

    // Keep only last 100 entries
    if (metrics.length > 100) {
      metrics = metrics.slice(-100);
    }

    await fs.writeFile(metricsPath, JSON.stringify(metrics, null, 2));
  } catch (error) {
    console.log('⚠️ Search metrics storage failed:', error.message);
  }
}

// Helper function to get file context with activity logging
async function getFileContext(filePath, userId = 'system') {
  try {
    const fs = require('fs').promises;
    const path = require('path');

    const fullPath = path.join(process.cwd(), filePath);
    console.log(`📖 [${userId}] Reading file: ${filePath}`);

    const content = await fs.readFile(fullPath, 'utf8');
    const extension = path.extname(filePath);

    console.log(`✅ [${userId}] Successfully read ${content.length} characters from ${filePath}`);
    trackFileModification(filePath, 'read', userId, true);

    return {
      path: filePath,
      content: content.substring(0, 3000), // Limit content size
      type: extension.substring(1) || 'text',
      size: content.length
    };
  } catch (error) {
    console.error(`❌ [${userId}] Error reading file ${filePath}:`, error.message);
    trackFileModification(filePath, 'read', userId, false);
    return {
      path: filePath,
      content: null,
      type: 'error',
      error: error.message
    };
  }
}

// Add memory health check endpoint
const handleMemoryHealthCheck = async (req, res) => {
  try {
    const { validateMemoryContext } = require('../utils/memory_extractor');
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ 
        error: 'User ID required for memory health check' 
      });
    }

    const healthStatus = await validateMemoryContext(userId);

    res.json({
      userId,
      memoryHealthy: true,
      timestamp: new Date().toISOString(),
      message: 'Memory context is healthy'
    });

  } catch (error) {
    console.error(`🚨 Memory health check failed:`, error);

    res.status(500).json({
      userId: req.params.userId,
      memoryHealthy: false,
      error: error.message,
      timestamp: new Date().toISOString(),
      message: 'Memory context corruption detected'
    });
  }
};


// Add route for memory health check
router.get('/memory-health/:userId', handleMemoryHealthCheck);

// Export both router and functions
module.exports = router;
module.exports.handleAIQuery = handleAIQuery;
module.exports.initializeControllers = initializeControllers;
module.exports.handleDeploymentRequest = handleDeploymentRequest;
module.exports.handleDatabaseOperation = handleDatabaseOperation;
module.exports.handleDeepCodeAnalysis = handleDeepCodeAnalysis;
module.exports.handleInfrastructureManagement = handleInfrastructureManagement;
module.exports.handleMemoryHealthCheck = handleMemoryHealthCheck;