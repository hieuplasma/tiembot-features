import { defineFeature } from '@tiembot/runtime';

// Feature cơ bản, bot nào cũng có (docs/02): /start, /help, /myid.
export default defineFeature({
  key: 'basic',
  name: 'Cơ bản',
  commands: [
    { command: 'start', description: 'Bắt đầu' },
    { command: 'help', description: 'Xem các lệnh' },
    { command: 'myid', description: 'Xem user id / chat id' },
  ],
  setup(composer, deps) {
    composer.command('start', (ctx) => ctx.reply(`Chào bạn! Mình là ${deps.bot.name}.\nGõ /help để xem các lệnh.`));

    composer.command('help', (ctx) => {
      const lines = deps.listCommands(ctx).map((c) => `/${c.command} - ${c.description}`);
      return ctx.reply(lines.length ? `Các lệnh bạn dùng được:\n${lines.join('\n')}` : 'Bot chưa có lệnh nào.');
    });

    composer.command('myid', (ctx) => ctx.reply(`User id: ${ctx.from?.id ?? '?'}\nChat id: ${ctx.chat.id}`));
  },
});
