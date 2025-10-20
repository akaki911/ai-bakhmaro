const express = require('express');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const { WebClient } = require('@slack/web-api');
const admin = require('firebase-admin');

const codexAgent = require('../codex_agent');

const isSlackEnabled = () => process.env.CODEX_SLACK_ENABLED === 'true';

const createSlackClient = () => {
  const token = process.env.SLACK_BOT_TOKEN;
  if (!token) {
    console.warn('[CodexSlackAgent] SLACK_BOT_TOKEN not configured; Slack integration disabled.');
    return null;
  }
  return new WebClient(token);
};

const verifySlackRequest = (req, signingSecret) => {
  if (!signingSecret) {
    return true;
  }

  const signature = req.headers['x-slack-signature'];
  const timestamp = req.headers['x-slack-request-timestamp'];

  if (typeof signature !== 'string' || typeof timestamp !== 'string') {
    return false;
  }

  const fiveMinutesAgo = Math.floor(Date.now() / 1000) - 60 * 5;
  if (Number(timestamp) < fiveMinutesAgo) {
    return false;
  }

  const rawBody = req.rawBody ? req.rawBody.toString('utf8') : '';
  const baseString = `v0:${timestamp}:${rawBody}`;
  const hmac = crypto.createHmac('sha256', signingSecret);
  hmac.update(baseString);
  const computedSignature = `v0=${hmac.digest('hex')}`;

  try {
    return crypto.timingSafeEqual(Buffer.from(signature, 'utf8'), Buffer.from(computedSignature, 'utf8'));
  } catch (error) {
    console.warn('[CodexSlackAgent] timingSafeEqual failed:', error);
    return false;
  }
};

const extractPrompt = (text) => {
  if (!text) {
    return '';
  }

  return text
    .replace(/<@[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const runCodexPrompt = async (prompt) => {
  const agent = codexAgent || {};

  if (typeof agent.generateCode === 'function') {
    const result = await agent.generateCode(prompt);
    if (typeof result === 'string') {
      return result;
    }
    if (result && typeof result === 'object' && typeof result.text === 'string') {
      return result.text;
    }
  }

  if (typeof agent.generate === 'function') {
    const response = await agent.generate({
      command: 'chat',
      message: prompt,
      metadata: { origin: 'slack' },
    });

    if (typeof response === 'string') {
      return response;
    }

    if (response && typeof response === 'object' && typeof response.text === 'string') {
      return response.text;
    }

    return JSON.stringify(response);
  }

  throw new Error('Codex agent is missing generateCode/generate methods.');
};

const logSlackInteraction = async ({ userId, channel, input, response }) => {
  if (!(global && global.isFirebaseAvailable)) {
    return;
  }

  try {
    const db = admin.firestore && admin.firestore();
    if (!db) {
      return;
    }

    await db.collection('CodexSlackLogs').add({
      userId: userId || null,
      channel: channel || null,
      input,
      response,
      timestamp: admin.firestore.Timestamp.now(),
    });
  } catch (error) {
    console.warn('[CodexSlackAgent] Failed to log Slack interaction:', error);
  }
};

const handleAppMention = async (slackClient, event) => {
  const prompt = extractPrompt(event && event.text);
  if (!prompt) {
    return;
  }

  try {
    const output = await runCodexPrompt(prompt);
    const reply = output && output.trim().length > 0 ? output.trim() : 'I did not generate a response.';

    await slackClient.chat.postMessage({
      channel: event.channel,
      text: reply,
      thread_ts: event.thread_ts || event.ts,
    });

    await logSlackInteraction({
      userId: event.user,
      channel: event.channel,
      input: prompt,
      response: reply,
    });
  } catch (error) {
    console.error('[CodexSlackAgent] Failed to handle app_mention event:', error);
    try {
      await slackClient.chat.postMessage({
        channel: event.channel,
        text: 'Sorry, I was unable to process that request.',
        thread_ts: event.thread_ts || event.ts,
      });
    } catch (postError) {
      console.error('[CodexSlackAgent] Failed to notify Slack about the error:', postError);
    }
  }
};

let isRegistered = false;

const registerCodexSlackAgent = (app) => {
  if (!app) {
    throw new Error('registerCodexSlackAgent requires a valid Express application instance.');
  }

  if (isRegistered) {
    return;
  }

  if (!isSlackEnabled()) {
    console.log('[CodexSlackAgent] CODEX_SLACK_ENABLED is not true; Slack integration skipped.');
    return;
  }

  const slackClient = createSlackClient();
  if (!slackClient) {
    return;
  }

  const signingSecret = process.env.SLACK_SIGNING_SECRET;
  const router = express.Router();

  router.use(
    bodyParser.json({
      verify: (req, _res, buf) => {
        req.rawBody = Buffer.from(buf);
      },
    }),
  );

  router.post('/events', async (req, res) => {
    if (!verifySlackRequest(req, signingSecret)) {
      return res.status(401).json({ ok: false, error: 'Invalid Slack signature' });
    }

    const body = req.body || {};

    if (body.type === 'url_verification' && typeof body.challenge === 'string') {
      return res.status(200).send(body.challenge);
    }

    if (body.type !== 'event_callback' || !body.event) {
      return res.status(200).json({ ok: true });
    }

    if (body.event.type !== 'app_mention') {
      return res.status(200).json({ ok: true });
    }

    res.status(200).json({ ok: true });

    setImmediate(() => {
      handleAppMention(slackClient, body.event).catch((error) => {
        console.error('[CodexSlackAgent] Unexpected error handling Slack mention:', error);
      });
    });

    return undefined;
  });

  app.use('/api/slack', router);
  isRegistered = true;
  console.log('[CodexSlackAgent] Slack events endpoint registered at /api/slack/events');
};

module.exports = registerCodexSlackAgent;
module.exports.registerCodexSlackAgent = registerCodexSlackAgent;
