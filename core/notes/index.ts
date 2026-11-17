import { defineFeature, ownerOnly, type BotContext, type ScopedCollection } from '@tiembot/runtime';
import { InlineKeyboard } from 'grammy';

// Ghi chú nhanh cho chủ bot.
//   /note <nội dung>   lưu ghi chú; /note không kèm gì thì bot hỏi lại, trả lời tin đó là được
//   /notes [từ khóa]   xem 10 ghi chú mới nhất, hoặc tìm (không cần gõ dấu); nút 🗑 để xóa
// Dữ liệu: bot_data.notes_items { bot_id, no, text, search, created_at }.

const COLLECTION = 'notes_items';
const PROMPT = '📝 Ghi gì? (trả lời tin này)';
const LIST_LIMIT = 10;
const SEARCH_LIMIT = 20;
const PREVIEW_CHARS = 300;
const MAX_TEXT = 3900;

interface Note {
  no: number;
  text: string;
  search: string;
  created_at: Date;
}

/** Bỏ dấu để "dau nhot" tìm ra "dầu nhớt". */
export function normalize(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function formatTime(d: Date): string {
  return d.toLocaleString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function notes(ctx: BotContext): ScopedCollection<Note> {
  return ctx.store.collection<Note>(COLLECTION);
}

async function saveNote(ctx: BotContext, raw: string) {
  const text = raw.trim();
  const no = await ctx.store.nextSeq('notes');
  await notes(ctx).insertOne({ no, text, search: normalize(text), created_at: new Date() });
  await ctx.reply(`📝 Đã lưu ghi chú #${no}. Xem lại: /notes`);
}

async function render(ctx: BotContext, query?: string) {
  const col = notes(ctx);
  const filter = query ? { search: { $regex: escapeRegex(normalize(query)) } } : {};
  const total = await col.countDocuments(filter);
  if (total === 0) {
    return {
      text: query ? `🔍 Không có ghi chú nào chứa "${query}".` : '📝 Chưa có ghi chú nào.\nGõ /note <nội dung> để ghi.',
    };
  }
  const limit = query ? SEARCH_LIMIT : LIST_LIMIT;
  const items = await col.find(filter, { sort: { no: -1 }, limit });
  let text = query ? `🔍 ${total} ghi chú chứa "${query}":` : `📝 Ghi chú (${total}), mới nhất trước:`;
  const keyboard = new InlineKeyboard();
  let shown = 0;
  for (const n of items) {
    const body = n.text.length > PREVIEW_CHARS ? `${n.text.slice(0, PREVIEW_CHARS)}…` : n.text;
    const block = `\n\n#${n.no} · ${formatTime(n.created_at)}\n${body}`;
    if (text.length + block.length > MAX_TEXT) break;
    text += block;
    keyboard.text(`🗑 #${n.no}`, `notes:del:${n.no}`);
    if (++shown % 5 === 0) keyboard.row();
  }
  if (total > shown) text += `\n\n… và ${total - shown} ghi chú cũ hơn`;
  return { text, reply_markup: keyboard };
}

export default defineFeature({
  key: 'notes',
  name: 'Ghi chú',
  commands: [
    { command: 'note', description: 'Ghi chú nhanh, vd /note mua dầu nhớt', ownerOnly: true },
    { command: 'notes', description: 'Xem / tìm ghi chú, vd /notes dau nhot', ownerOnly: true },
  ],
  setup(composer, deps) {
    // Tạo index ở nền; DB chưa sẵn sàng thì chỉ cảnh báo, lệnh vẫn chạy được khi DB có lại.
    for (const [keys, options] of [
      [{ no: 1 }, { unique: true }],
      [{ created_at: -1 }, {}],
    ] as const) {
      deps.store
        .collection(COLLECTION)
        .createIndex(keys, options)
        .catch((error) => deps.log.warn('Chưa tạo được index notes_items', error));
    }

    composer.command(
      'note',
      ownerOnly(async (ctx) => {
        const text = ctx.match.trim();
        if (text) return saveNote(ctx, text);
        await ctx.reply(PROMPT, { reply_markup: { force_reply: true, input_field_placeholder: 'Nội dung ghi chú' } });
      }),
    );

    // Trả lời câu hỏi "Ghi gì?" của bot.
    composer.filter(
      (ctx) =>
        ctx.isOwner &&
        !!ctx.message?.text &&
        !ctx.message.text.startsWith('/') &&
        ctx.message.reply_to_message?.from?.id === ctx.me.id &&
        ctx.message.reply_to_message.text === PROMPT,
      (ctx) => saveNote(ctx, ctx.message!.text!),
    );

    composer.command(
      'notes',
      ownerOnly(async (ctx) => {
        const { text, reply_markup } = await render(ctx, ctx.match.trim() || undefined);
        await ctx.reply(text, { reply_markup });
      }),
    );

    composer.callbackQuery(
      /^notes:del:(\d+)$/,
      ownerOnly(async (ctx) => {
        const no = Number(ctx.match[1]);
        const { deletedCount } = await notes(ctx).deleteOne({ no });
        await ctx.answerCallbackQuery({ text: deletedCount ? `Đã xóa #${no}` : `Ghi chú #${no} không còn` });
        const { text, reply_markup } = await render(ctx);
        await ctx.editMessageText(text, { reply_markup }).catch(() => undefined);
      }),
    );
  },
});
