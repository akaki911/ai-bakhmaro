'use strict';

jest.mock('../core/intelligent_answering_engine', () => ({
  processMessage: jest.fn().mockResolvedValue({ success: true }),
}));

jest.mock('../middleware/response_sanitizer', () => ({
  sanitizeGuruloReply: jest.fn((text) => text),
}));

const aiChatRouter = require('../routes/ai_chat');
const { handleChatRequest } = aiChatRouter;

function createRequest(body = {}) {
  return {
    chatRequest: body,
    body,
    headers: {},
    chatRequestValidated: true,
  };
}

function invokeHandler(body) {
  return new Promise((resolve, reject) => {
    const req = createRequest(body);
    const res = {
      statusCode: 200,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(payload) {
        resolve({ statusCode: this.statusCode, payload });
        return this;
      },
    };

    Promise.resolve(handleChatRequest(req, res)).catch(reject);
  });
}

describe('Gurulo conversational flow (developer mode)', () => {
  test('Greeting yields developer-focused welcome', async () => {
    const { statusCode, payload } = await invokeHandler({ message: 'გამარჯობა' });

    expect(statusCode).toBe(200);
    expect(payload.success).toBe(true);
    expect(typeof payload.response).toBe('string');
    expect(payload.response.toLowerCase()).toContain('gurulo');
    expect(payload.metadata.intent).toBe('greeting');
  });

  test('Automation query returns readiness summary', async () => {
    const { statusCode, payload } = await invokeHandler({ message: 'როგორაა automation მდგომარეობა?' });

    expect(statusCode).toBe(200);
    expect(payload.metadata.intent).toBe('check_availability');
    const responseText = typeof payload.response === 'string' ? payload.response : payload.response?.plainText;
    expect(responseText).toContain('Automation Readiness');
  });
});
