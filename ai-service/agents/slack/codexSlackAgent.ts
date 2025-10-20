import type { Application, Request, Response } from 'express';
import express from 'express';
import bodyParser from 'body-parser';
import crypto from 'crypto';
import { WebClient } from '@slack/web-api';
import admin from 'firebase-admin';

import codexAgent from '../codex_agent';

type SlackEventType = 'app_mention' | string;

interface SlackEvent {
  type: SlackEventType;
  text?: string;
  channel?: string;
  user?: string;
  ts?: string;
  thread_ts?: string;
}

interface SlackEventRequestBody {
  type?: 'url_verification' | 'event_callback' | string;
  token?: string;
  challenge?: string;
  event?: SlackEvent;
  event_id?: string;
  team_id?: string;
}

interface RawBodyRequest extends Request {
  rawBody?: Buffer;
}

type GenerateCodeFn = (prompt: string) => Promise<string | { text?: string } | null | undefined>;

type CodexAgentLike = {
  generateCode?: GenerateCodeFn;
  generate?: (payload: Record<string, unknown>) => Promise<unknown>;
};

const isSlackEnabled = (): boolean => process.env.CODEX_SLACK_ENABLED === 'true';

const createSlackClient = (): WebClient | null => {
  const token = process.env.SLACK_BOT_TOKEN;
  if (!token) {
    console.warn('[CodexSlackAgent] SLACK_BOT_TOKEN not configured; Slack integration disabled.');
    return null;
  }
  return new WebClient(token);
};

const verifySlackRequest = (req: RawBodyRequest, signingSecret?: string): boolean => {
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

const extractPrompt = (text?: string): string => {
  if (!text) {
    return '';
  }

  return text
    .replace(/<@[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const runCodexPrompt = async (prompt: string): Promise<string> => {
  const agent = codexAgent as CodexAgentLike;

  if (agent.generateCode && typeof agent.generateCode === 'function') {
    const result = await agent.generateCode(prompt);
    if (typeof result === 'string') {
      return result;
    }
    if (result && typeof result === 'object' && typeof (result as { text?: unknown }).text === 'string') {
      return (result as { text: string }).text;
    }
  }

  if (agent.generate && typeof agent.generate === 'function') {
    const response = await agent.generate({
      command: 'chat',
      message: prompt,
      metadata: { origin: 'slack' },
    });

    if (typeof response === 'string') {
      return response;
    }

    if (response && typeof response === 'object' && typeof (response as { text?: unknown }).text === 'string') {
      return (response as { text: string }).text;
    }

    return JSON.stringify(response);
  }

  throw new Error('Codex agent is missing generateCode/generate methods.');
};

const logSlackInteraction = async (payload: {
  userId?: string;
  channel?: string;
  input: string;
  response: string;
}): Promise<void> => {
  if (!(global as { isFirebaseAvailable?: boolean }).isFirebaseAvailable) {
    return;
  }

  try {
    const db = admin.firestore?.();
    if (!db) {
      return;
    }

    await db.collection('CodexSlackLogs').add({
      userId: payload.userId || null,
      channel: payload.channel || null,
      input: payload.input,
      response: payload.response,
      timestamp: admin.firestore.Timestamp.now(),
    });
  } catch (error) {
    console.warn('[CodexSlackAgent] Failed to log Slack interaction:', error);
  }
};

const handleAppMention = async (
  slackClient: WebClient,
  event: SlackEvent,
): Promise<void> => {
  const prompt = extractPrompt(event.text);
  if (!prompt) {
    return;
  }

  try {
    const output = await runCodexPrompt(prompt);
    const reply = output && output.trim().length > 0 ? output.trim() : 'I did not generate a response.';

    await slackClient.chat.postMessage({
      channel: event.channel as string,
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
        channel: event.channel as string,
        text: 'Sorry, I was unable to process that request.',
        thread_ts: event.thread_ts || event.ts,
      });
    } catch (postError) {
      console.error('[CodexSlackAgent] Failed to notify Slack about the error:', postError);
    }
  }
};

let isRegistered = false;

export const registerCodexSlackAgent = (app: Application): void => {
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
      verify: (req: Request, _res, buf: Buffer) => {
        (req as RawBodyRequest).rawBody = Buffer.from(buf);
      },
    }),
  );

  router.post('/events', async (req: Request, res: Response) => {
    const slackReq = req as RawBodyRequest;

    if (!verifySlackRequest(slackReq, signingSecret)) {
      return res.status(401).json({ ok: false, error: 'Invalid Slack signature' });
    }

    const body = slackReq.body as SlackEventRequestBody;

    if (body?.type === 'url_verification' && typeof body.challenge === 'string') {
      return res.status(200).send(body.challenge);
    }

    if (body?.type !== 'event_callback' || !body.event) {
      return res.status(200).json({ ok: true });
    }

    if (body.event.type !== 'app_mention') {
      return res.status(200).json({ ok: true });
    }

    res.status(200).json({ ok: true });

    setImmediate(() => {
      handleAppMention(slackClient, body.event as SlackEvent).catch((error) => {
        console.error('[CodexSlackAgent] Unexpected error handling Slack mention:', error);
      });
    });

    return undefined;
  });

  app.use('/api/slack', router);
  isRegistered = true;
  console.log('[CodexSlackAgent] Slack events endpoint registered at /api/slack/events');
};

export default registerCodexSlackAgent;
