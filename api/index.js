import { Client, middleware } from '@line/bot-sdk';
import fetch from 'node-fetch';

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
    res.status(403).end();
  }
}

async function getGPTReply(userText) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4',
      messages: [{ role: 'user', content: userText }],
    }),
  });

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '抱歉，我暫時無法回應你的問題。';
}
