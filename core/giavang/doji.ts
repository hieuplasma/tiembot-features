import { createDecipheriv } from 'node:crypto';

// Giá vàng DOJI. banggia.doji.vn mã hóa dữ liệu trả về (AES-256-CBC, 16 byte đầu là IV);
// khóa lấy từ bundle JS của trang (chunk-MGKSBPRZ.js, class Z0._k / decrypt()).

const API_URL = 'https://banggia.doji.vn/api/TablePrice/GetTablePrice';
const AES_KEY = Buffer.from('7a4b8c3d1e9f2a5b6c0d4e8f3a7b1c5d9e2f6a0b4c8d3e7f1a5b9c2d6e0f4a8b', 'hex');

interface DojiRow {
  type: string;
  materialName: string;
  priceDojiBuyIn: string;
  priceDojiSellOut: string;
}

export function decryptDoji(base64: string): DojiRow[] {
  const buf = Buffer.from(base64, 'base64');
  const decipher = createDecipheriv('aes-256-cbc', AES_KEY, buf.subarray(0, 16));
  const plain = Buffer.concat([decipher.update(buf.subarray(16)), decipher.final()]).toString('utf8');
  return JSON.parse(plain) as DojiRow[];
}

export async function fetchGoldPrices(): Promise<string> {
  const res = await fetch(API_URL, { signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`DOJI trả về HTTP ${res.status}`);
  const body = (await res.json()) as { data?: string };
  if (!body.data) throw new Error('DOJI trả về dữ liệu rỗng');
  const lines = decryptDoji(body.data)
    .filter((row) => row.type === 'G')
    .map((row) => `${row.materialName}: Mua ${row.priceDojiBuyIn}, Bán ${row.priceDojiSellOut}`);
  if (!lines.length) throw new Error('DOJI không có dòng giá vàng nào');
  const time = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
  return `💰 Giá vàng DOJI ${time}:\n\n${lines.join('\n')}`;
}
