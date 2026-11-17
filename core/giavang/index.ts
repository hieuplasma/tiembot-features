import { defineFeature } from '@tiembot/runtime';
import { fetchGoldPrices } from './doji';

// /giavang. Dữ liệu chung cho mọi bot nên cache trong process (docs/08): nhiều bot, một lần gọi DOJI.
const CACHE_MS = 5 * 60_000;
let cache: { at: number; text: string } | null = null;
let inflight: Promise<string> | null = null;

async function goldPrices(): Promise<string> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.text;
  inflight ??= fetchGoldPrices()
    .then((text) => {
      cache = { at: Date.now(), text };
      return text;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

export default defineFeature({
  key: 'giavang',
  name: 'Giá vàng',
  commands: [{ command: 'giavang', description: 'Xem giá vàng DOJI' }],
  setup(composer, deps) {
    composer.command('giavang', async (ctx) => {
      try {
        await ctx.reply(await goldPrices());
      } catch (error) {
        deps.log.warn('Không lấy được giá vàng', error);
        await ctx.reply('Tiệm chưa lấy được giá vàng lúc này, bạn thử lại sau nhé.');
      }
    });
  },
});
