// Mineflayer ボット。プレイヤーのチャットを local llama-server（OpenAI 互換 API）に渡し、
// tool calling で返ってきた行動（歩く・ジャンプ・掘る・チャット返信）を実行する。
//
// 起動: node bot.js [ユーザー名]   （先に scripts\start-minecraft-server.ps1 でサーバーを起動しておく）

const mineflayer = require('mineflayer');

const SERVER = { host: '127.0.0.1', port: 25565, version: '26.1.2' };
const LLM_URL = 'http://127.0.0.1:8080/v1/chat/completions';
const USERNAME = process.argv[2] || 'LLMBot';
const MAX_ROUNDS = 5;        // 1 回のチャットに対する LLM 往復の上限
const DIG_RANGE = 4;         // dig で掘れる距離（ブロック）

const SYSTEM_PROMPT = `あなたは Minecraft 内で動くボットです。プレイヤーのチャットに応答し、必要な行動はツールで実行してください。
- 行動（歩く、ジャンプ、掘る、止まる）は必ずツールを使う。文章で「歩きました」と書くだけでは何も起きない。
- プレイヤーへの返事は say ツールで送る。
- 1 回の返答で使うツールは最小限にする。行動が終わったら say で結果を伝えて終える。
- 返事は短く、日本語で。`;

const TOOLS = [
  fn('say', 'プレイヤーへチャットで返事をする', { text: { type: 'string' } }, ['text']),
  fn('walk', '指定の方向へ指定秒数だけ歩く（1〜5 秒）', {
    direction: { type: 'string', enum: ['forward', 'back', 'left', 'right'] },
    seconds: { type: 'number' },
  }, ['direction', 'seconds']),
  fn('jump', 'その場でジャンプする', {}, []),
  fn('dig', `目の前（${DIG_RANGE} ブロック以内）の最も近いブロックを掘る`, {}, []),
  fn('stop', '歩行などの移動をすべて止める', {}, []),
];

function fn(name, description, properties, required) {
  return { type: 'function', function: { name, description, parameters: { type: 'object', properties, required } } };
}

const bot = mineflayer.createBot({ ...SERVER, username: USERNAME });
let busy = false;
const pending = [];

bot.once('spawn', () => {
  console.log(`[bot] spawned as ${bot.username} at ${fmtPos(bot.entity.position)}`);
});

bot.on('kicked', (reason) => console.log('[bot] kicked:', reason));
bot.on('error', (err) => console.log('[bot] error:', err.message));
bot.on('end', () => console.log('[bot] disconnected'));

bot.on('chat', (username, message) => {
  if (username === bot.username) return;
  pending.push({ username, message });
  drain();
});

async function drain() {
  if (busy) return;
  busy = true;
  while (pending.length > 0) {
    const job = pending.shift();
    try {
      await handleChat(job.username, job.message);
    } catch (err) {
      console.log('[bot] handler error:', err.message);
    }
  }
  busy = false;
}

async function handleChat(username, message) {
  console.log(`[chat] <${username}> ${message}`);
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: `${stateSummary()}\nプレイヤー ${username} のチャット: ${message}` },
  ];

  let spoke = false; // say ツールで返事済みなら、最終の本文を二重に送らない

  for (let round = 0; round < MAX_ROUNDS; round++) {
    const reply = await callLLM(messages);
    console.log('[llm]', JSON.stringify({ content: reply.content, tools: (reply.tool_calls || []).map((c) => c.function.name) }));
    messages.push(reply);
    if (!reply.tool_calls || reply.tool_calls.length === 0) {
      if (reply.content && !spoke) await say(reply.content.trim());
      return;
    }
    for (const call of reply.tool_calls) {
      const args = parseArgs(call.function.arguments);
      console.log(`[tool] ${call.function.name}`, JSON.stringify(args));
      if (call.function.name === 'say') spoke = true;
      const result = await runTool(call.function.name, args);
      messages.push({ role: 'tool', tool_call_id: call.id, content: result });
    }
  }
  console.log('[bot] reached max rounds');
}

async function callLLM(messages) {
  const res = await fetch(LLM_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'local',
      messages,
      tools: TOOLS,
      tool_choice: 'auto',
      max_tokens: 512,
      chat_template_kwargs: { enable_thinking: false },
    }),
  });
  if (!res.ok) throw new Error(`LLM HTTP ${res.status}`);
  const json = await res.json();
  return json.choices[0].message;
}

async function runTool(name, args) {
  switch (name) {
    case 'say':
      await say(String(args.text ?? ''));
      return 'ok';
    case 'walk': {
      const seconds = Math.min(Math.max(Number(args.seconds) || 1, 1), 5);
      const control = { forward: 'forward', back: 'back', left: 'left', right: 'right' }[args.direction] || 'forward';
      bot.setControlState(control, true);
      await sleep(seconds * 1000);
      bot.setControlState(control, false);
      return `${args.direction} へ ${seconds} 秒歩いた。現在位置 ${fmtPos(bot.entity.position)}`;
    }
    case 'jump':
      bot.setControlState('jump', true);
      await sleep(400);
      bot.setControlState('jump', false);
      return 'jumped';
    case 'dig': {
      const block = bot.findBlock({
        matching: (b) => b && b.name !== 'air' && b.diggable,
        maxDistance: DIG_RANGE,
      });
      if (!block) return '掘れるブロックが近くにない';
      try {
        await bot.dig(block);
        return `${block.name} を掘った`;
      } catch (err) {
        return `掘れなかった: ${err.message}`;
      }
    }
    case 'stop':
      for (const c of ['forward', 'back', 'left', 'right', 'jump', 'sprint']) bot.setControlState(c, false);
      return 'stopped';
    default:
      return `未知のツール: ${name}`;
  }
}

function stateSummary() {
  const pos = bot.entity ? fmtPos(bot.entity.position) : '不明';
  const players = Object.keys(bot.players).filter((n) => n !== bot.username);
  return `[状態] 位置 ${pos} / 体力 ${bot.health ?? '?'} / 近くのプレイヤー: ${players.join(', ') || 'なし'}`;
}

function say(text) {
  if (!text) return;
  // チャットは長すぎると切られるので分割して送る
  for (let i = 0; i < text.length; i += 200) bot.chat(text.slice(i, i + 200));
}

function parseArgs(raw) {
  try { return JSON.parse(raw || '{}'); } catch { return {}; }
}

function fmtPos(p) {
  return `(${Math.round(p.x)}, ${Math.round(p.y)}, ${Math.round(p.z)})`;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
