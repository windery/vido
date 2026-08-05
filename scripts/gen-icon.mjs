// vido 图标生成脚本（Terminal Purist）
// 用法：node scripts/gen-icon.mjs
// 输出：build/icon.png (1024)、build/icon.iconset、public/favicon.ico
//
// 设计语义（极简，2 个元素）：
//   圆角深色主体（CRT 终端底）
//   中央亮绿圆角方块 = vim 块状光标（vido 的 vim 一半）
//   方块内深色 V 对号 = 完成勾（vido 的 todo 一半，V 天然像 ✓）
//   vido = Vim + Todo，一个图形讲完
// macOS 图标规范：主体 824/1024 ≈ 80%，四周透明边距。
import zlib from 'node:zlib';
import fs from 'node:fs';

// ---------- PNG 编码 ----------
const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const t = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crc]);
}
function encodePNG(w, h, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8-bit RGBA
  const stride = w * 4 + 1;
  const raw = Buffer.alloc(stride * h);
  for (let y = 0; y < h; y++) {
    raw[y * stride] = 0; // filter None
    for (let x = 0; x < w * 4; x++) raw[y * stride + 1 + x] = rgba[y * w * 4 + x];
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---------- 盒式降采样 ----------
function downsample(src, sw, sh, dw, dh) {
  const out = new Uint8Array(dw * dh * 4);
  for (let y = 0; y < dh; y++) {
    const y0 = Math.floor(y * sh / dh), y1 = Math.max(y0 + 1, Math.floor((y + 1) * sh / dh));
    for (let x = 0; x < dw; x++) {
      const x0 = Math.floor(x * sw / dw), x1 = Math.max(x0 + 1, Math.floor((x + 1) * sw / dw));
      let r = 0, g = 0, b = 0, a = 0, n = 0;
      for (let sy = y0; sy < y1; sy++) for (let sx = x0; sx < x1; sx++) {
        const i = (sy * sw + sx) * 4;
        r += src[i]; g += src[i + 1]; b += src[i + 2]; a += src[i + 3]; n++;
      }
      const o = (y * dw + x) * 4;
      out[o] = r / n; out[o + 1] = g / n; out[o + 2] = b / n; out[o + 3] = a / n;
    }
  }
  return out;
}

// ---------- ICO 编码（内嵌 PNG） ----------
function encodeICO(sizes, pngOf) {
  const n = sizes.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(n, 4);
  const entries = [], datas = [];
  let offset = 6 + 16 * n;
  for (const s of sizes) {
    const png = pngOf(s);
    const e = Buffer.alloc(16);
    e[0] = s >= 256 ? 0 : s; e[1] = s >= 256 ? 0 : s;
    e.writeUInt16LE(1, 4); e.writeUInt16LE(32, 6);
    e.writeUInt32LE(png.length, 8); e.writeUInt32LE(offset, 12);
    entries.push(e); datas.push(png);
    offset += png.length;
  }
  return Buffer.concat([header, ...entries, ...datas]);
}

// ---------- 几何工具 ----------
const sd = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
function segDist(px0, py0, px1, py1, qx, qy) {
  const dx = px1 - px0, dy = py1 - py0;
  const len2 = dx * dx + dy * dy;
  let t = len2 === 0 ? 0 : ((qx - px0) * dx + (qy - py0) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(qx - (px0 + t * dx), qy - (py0 + t * dy));
}
function rrectSDF(x, y, cx, cy, hw, hh, r) {
  const qx = Math.abs(x - cx) - (hw - r);
  const qy = Math.abs(y - cy) - (hh - r);
  const ox = Math.max(qx, 0), oy = Math.max(qy, 0);
  return Math.hypot(ox, oy) + Math.min(Math.max(qx, qy), 0) - r;
}
const smooth = (edge0, edge1, v) => {
  const t = Math.max(0, Math.min(1, (v - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
};

// ---------- SDF 渲染 1024×1024 ----------
const W = 1024;
const PAD = 100;
const BODY = W - PAD * 2; // 824
const SCALE = BODY / 512;
const C = {
  bgTop: [14, 20, 17], bgBottom: [8, 10, 9],  // 黑绿渐变底（#0e1411 → #080a09）
  line: [89, 217, 138],  // 磷光绿：提醒事项列表线
  mark: [138, 240, 171], // 亮绿：圆点标记 + 删除线
};

// ---- 512 设计坐标（提醒事项：3 条细列表线，每条左端一个大圆点） ----
const LINE_X0 = 160, LINE_X1 = 350, LINE_H = 16;          // 线细（stroke 16，小尺寸仍可辨）
const lineCys = [176, 256, 336];                          // 3 条线的 y 中心（行距 80，透气）
const DOT_CX = 130, DOT_R = 20;                           // 圆点：与线左端留 10px 空隙（小图标不粘连）

const px = new Uint8Array(W * W * 4);
for (let y = 0; y < W; y++) {
  for (let x = 0; x < W; x++) {
    const o = (y * W + x) * 4;
    const dBody = rrectSDF(x, y, W / 2, W / 2, BODY / 2, BODY / 2, 185);
    const bodyA = 1 - smooth(-1, 1, dBody);
    if (bodyA <= 0) { px[o + 3] = 0; continue; }

    const p = [(x - PAD) / SCALE, (y - PAD) / SCALE];

    // 主体内背景渐变
    const fy = Math.max(0, Math.min(1, p[1] / 512));
    let r = C.bgTop[0] + (C.bgBottom[0] - C.bgTop[0]) * fy;
    let g = C.bgTop[1] + (C.bgBottom[1] - C.bgTop[1]) * fy;
    let b = C.bgTop[2] + (C.bgBottom[2] - C.bgTop[2]) * fy;

    // 4 条提醒事项列表线（磷光绿圆头横条）
    for (const cy of lineCys) {
      const dL = rrectSDF(p[0], p[1], (LINE_X0 + LINE_X1) / 2, cy, (LINE_X1 - LINE_X0) / 2, LINE_H / 2, LINE_H / 2);
      const cov = 1 - smooth(-1, 1, dL);
      if (cov > 0) { r = r * (1 - cov) + C.line[0] * cov; g = g * (1 - cov) + C.line[1] * cov; b = b * (1 - cov) + C.line[2] * cov; }
    }
    // 每条线左端的圆点（亮绿，todo 事项标记）
    for (const cy of lineCys) {
      const dc = sd(p, [DOT_CX, cy]);
      const cov = 1 - smooth(DOT_R - 1, DOT_R + 1, dc);
      if (cov > 0) { r = r * (1 - cov) + C.mark[0] * cov; g = g * (1 - cov) + C.mark[1] * cov; b = b * (1 - cov) + C.mark[2] * cov; }
    }

    px[o] = r; px[o + 1] = g; px[o + 2] = b; px[o + 3] = Math.round(255 * bodyA);
  }
}

// ---------- 输出 ----------
fs.mkdirSync('build', { recursive: true });
const png1024 = encodePNG(W, W, px);
fs.writeFileSync('build/icon.png', png1024);
console.log('build/icon.png 1024 已生成');

const icoSizes = [16, 32, 48, 64, 128, 256];
const pngOf = (s) => encodePNG(s, s, downsample(px, W, W, s, s));
fs.writeFileSync('public/favicon.ico', encodeICO(icoSizes, pngOf));
console.log('public/favicon.ico 已生成');

const iset = 'build/icon.iconset';
fs.rmSync(iset, { recursive: true, force: true });
fs.mkdirSync(iset, { recursive: true });
let cur = px, curW = W;
const all = {};
for (const s of [512, 256, 128, 64, 32, 16]) {
  cur = downsample(cur, curW, curW, curW / 2, curW / 2);
  curW = curW / 2;
  all[s] = cur;
  fs.writeFileSync(`${iset}/icon_${s}x${s}.png`, encodePNG(curW, curW, cur));
}
fs.writeFileSync(`${iset}/icon_512x512@2x.png`, png1024);
fs.writeFileSync(`${iset}/icon_256x256@2x.png`, encodePNG(512, 512, all[512]));
fs.writeFileSync(`${iset}/icon_128x128@2x.png`, encodePNG(256, 256, all[256]));
fs.writeFileSync(`${iset}/icon_64x64@2x.png`, encodePNG(128, 128, all[128]));
fs.writeFileSync(`${iset}/icon_32x32@2x.png`, encodePNG(64, 64, all[64]));
fs.writeFileSync(`${iset}/icon_16x16@2x.png`, encodePNG(32, 32, all[32]));
console.log('build/icon.iconset 已生成');
