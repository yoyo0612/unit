// 動作確認用のプレイヤー役。チャットを 1 件送り、ボットの応答を表示して終了する。
// 使い方: node test-client.js [メッセージを書いたファイル]
const fs = require('fs');
const mineflayer = require('mineflayer');

// メッセージは UTF-8 のファイルから読む（Windows の引数渡しで日本語が崩れるため）
const message = fs.readFileSync(process.argv[2] || 'message.txt', 'utf8').trim();
const client = mineflayer.createBot({ host: '127.0.0.1', port: 25565, version: '26.1.2', username: 'Tester' });

client.once('spawn', () => {
  setTimeout(() => client.chat(message), 1500);
  setTimeout(() => { console.log('[test] timeout, exiting'); process.exit(0); }, 120000);
});
client.on('chat', (user, msg) => {
  if (user === 'Tester') return;
  console.log(`[test] <${user}> ${msg}`);
});
client.on('kicked', (r) => { console.log('[test] kicked', r); process.exit(1); });
client.on('error', (e) => console.log('[test] error', e.message));
