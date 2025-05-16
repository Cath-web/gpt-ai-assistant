/*
import express from 'express';
import { handleEvents, printPrompts } from '../app/index.js';
import config from '../config/index.js';
import { validateLineSignature } from '../middleware/index.js';
import storage from '../storage/index.js';
import { fetchVersion, getVersion } from '../utils/index.js';

const app = express();

app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf.toString();
  },
}));

app.get('/', async (req, res) => {
  if (config.APP_URL) {
    res.redirect(config.APP_URL);
    return;
  }
  const currentVersion = getVersion();
  const latestVersion = await fetchVersion();
  res.status(200).send({ status: 'OK', currentVersion, latestVersion });
});

app.post(config.APP_WEBHOOK_PATH, validateLineSignature, async (req, res) => {
  try {
    await storage.initialize();
    await handleEvents(req.body.events);
    res.sendStatus(200);
  } catch (err) {
    console.error(err.message);
    res.sendStatus(500);
  }
  if (config.APP_DEBUG) printPrompts();
});

if (config.APP_PORT) {
  app.listen(config.APP_PORT);
}
*/

import { Client, middleware } from '@line/bot-sdk';
import fetch from 'node-fetch';

// LINE Bot 設定
const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

const client = new Client(config);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
  }

  try {
    // 驗證 LINE 請求，處理事件
    await middleware(config)(req, res, async () => {
      const events = req.body.events;

      for (const event of events) {
        if (event.type === 'message' && event.message.type === 'text') {
          const userText = event.message.text;
          const gptReply = await getGPTReply(userText);

          await client.replyMessage(event.replyToken, {
            type: 'text',
            text: gptReply,
          });
        }
      }

      res.status(200).end();
    });
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(500).end(); // 回傳 500 給 LINE
  }
}

// 呼叫 OpenAI GPT API 取得回覆
async function getGPTReply(userText) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4', // 或改成 gpt-3.5-turbo
      messages: [{ role: 'user', content: userText }],
    }),
  });

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '抱歉，我暫時無法回覆你。';
}
