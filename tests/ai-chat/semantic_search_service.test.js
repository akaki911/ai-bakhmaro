const test = require('node:test');
const assert = require('node:assert/strict');

process.env.EMBEDDINGS_DIMENSIONS = process.env.EMBEDDINGS_DIMENSIONS || '32';
process.env.EMBEDDINGS_MODEL = process.env.EMBEDDINGS_MODEL || 'unit-test-georgian';

const embeddingsService = require('../../ai-service/services/embeddings_service');
const { SemanticSearchService } = require('../../ai-service/services/semantic_search_service');

async function buildServiceWithChunks(chunks) {
  const service = new SemanticSearchService();
  service.knowledgeBase = {
    chunks,
    totalChunks: chunks.length,
    embeddingDimensions: embeddingsService.dimensions,
    embeddingModel: embeddingsService.model,
  };
  service.isLoaded = true;
  return service;
}

test('Georgian გადახდა query surfaces გადასახადი chunk first', async () => {
  const paymentGuide = 'გადახდა და ანგარიშის გადამოწმება: გადახდის ისტორია, სტატუსი და დავალიანება.';
  const weatherGuide = 'ამინდის პროგნოზი ბათუმის რეგიონში. ტემპერატურა, ნალექი და ქარი.';

  const [paymentEmbedding, weatherEmbedding] = await Promise.all([
    embeddingsService.generateEmbedding(paymentGuide),
    embeddingsService.generateEmbedding(weatherGuide),
  ]);

  const service = await buildServiceWithChunks([
    { id: 'payments', embedding: paymentEmbedding.embedding, text: paymentGuide, source: 'kb/payments.md' },
    { id: 'weather', embedding: weatherEmbedding.embedding, text: weatherGuide, source: 'kb/weather.md' },
  ]);

  const results = await service.findSimilarChunks('როგორ გადავამოწმო ჩემი გადახდა?', 2);
  assert.equal(results[0].id, 'payments');
  assert.ok(results[0].similarity > results[1].similarity, 'payment chunk must be most similar');
  assert.ok(results[0].snippet.includes('გადახდა'), 'snippet should echo payment context');
});

test('Banking balance query matches საბანკო ჩანაწერი chunk', async () => {
  const balanceGuide = 'საბანკო ანგარიშის შენარჩუნება და ბალანსის შემოწმება ონლაინ ბანკში.';
  const supportGuide = 'კლიენტთა მხარდაჭერა და ჩატის დახმარება კვირის დღეებში.';

  const [balanceEmbedding, supportEmbedding] = await Promise.all([
    embeddingsService.generateEmbedding(balanceGuide),
    embeddingsService.generateEmbedding(supportGuide),
  ]);

  const service = await buildServiceWithChunks([
    { id: 'balance', embedding: balanceEmbedding.embedding, text: balanceGuide, source: 'kb/balance.md' },
    { id: 'support', embedding: supportEmbedding.embedding, text: supportGuide, source: 'kb/support.md' },
  ]);

  const results = await service.findSimilarChunks('როგორ ვნახო საბანკო ბალანსი?', 2);
  assert.equal(results[0].id, 'balance');
  assert.ok(results[0].similarity > results[1].similarity, 'balance chunk must outrank support info');
});
