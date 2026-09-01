import { BG_ROPES, FG_ROPES, ropeYAt, type RopeDef } from './layout';

// 夜空に浮かぶ笹のシルエットと飾り紐をSVGで描画する。
// 画面サイズに合わせてピクセル座標で生成し、リサイズ時に再描画する。

const STALK_COLOR = '#16402b';
const STALK_NODE_COLOR = '#1e5238';
const LEAF_COLOR = '#1b4e33';
const LEAF_BACK_COLOR = '#10301f';
const ROPE_FG_COLOR = '#d9c88f';
const ROPE_BG_COLOR = '#b7a86f';

function ropePath(rope: RopeDef, w: number, h: number): string {
  const points: string[] = [];
  const steps = 32;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = t * w;
    const y = (ropeYAt(rope, t) / 100) * h;
    points.push(`${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`);
  }
  return points.join(' ');
}

function leaf(x: number, y: number, len: number, angle: number, color: string, opacity: number): string {
  const wd = len * 0.16;
  const d = `M0 0 C ${len * 0.25} ${-wd}, ${len * 0.72} ${-wd * 0.7}, ${len} 0 C ${len * 0.72} ${wd * 0.7}, ${len * 0.25} ${wd}, 0 0 Z`;
  return `<path d="${d}" transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${angle})" fill="${color}" opacity="${opacity}"/>`;
}

function leafCluster(
  x: number,
  y: number,
  baseAngle: number,
  scale: number,
  seed: number,
): string {
  const parts: string[] = [];
  const angles = [-26, -8, 12, 30];
  angles.forEach((a, i) => {
    const len = (46 + ((seed * 7 + i * 13) % 22)) * scale;
    // 奥のひと回り大きい葉で深みを出す
    parts.push(leaf(x, y, len * 1.15, baseAngle + a + 4, LEAF_BACK_COLOR, 0.8));
    parts.push(leaf(x, y, len, baseAngle + a, LEAF_COLOR, 0.92));
  });
  return parts.join('');
}

function bambooStalk(
  baseX: number,
  w: number,
  h: number,
  lean: number,
  seed: number,
): string {
  const parts: string[] = [];
  const segments = 7;
  const segLen = (h * 1.04) / segments;
  const width = Math.max(13, Math.min(24, w * 0.012));

  for (let i = 0; i < segments; i++) {
    const yBottom = h - i * segLen;
    const x = baseX + lean * i;
    parts.push(
      `<rect x="${(x - width / 2).toFixed(1)}" y="${(yBottom - segLen + 3).toFixed(1)}" width="${width.toFixed(1)}" height="${(segLen - 4).toFixed(1)}" rx="${(width / 2.4).toFixed(1)}" fill="${STALK_COLOR}"/>`,
    );
    // 節
    parts.push(
      `<rect x="${(x - width / 2 - 1.5).toFixed(1)}" y="${(yBottom - segLen + 1).toFixed(1)}" width="${(width + 3).toFixed(1)}" height="3" rx="1.5" fill="${STALK_NODE_COLOR}"/>`,
    );
    // 節ごとに葉を生やす(下の方は葉なし)
    if (i >= 2) {
      const side = i % 2 === 0 ? 1 : -1;
      const angle = side > 0 ? 18 + i * 4 : 162 - i * 4;
      parts.push(
        leafCluster(x + (side * width) / 2, yBottom - segLen + 6, angle, 0.9 + (i % 3) * 0.18, seed + i),
      );
    }
  }
  return parts.join('');
}

/** 画面上部の角から垂れる笹の葉(フレームとしての飾り) */
function cornerFronds(w: number): string {
  const parts: string[] = [];
  // 左上
  parts.push(leafCluster(w * 0.1, -6, 62, 1.5, 3));
  parts.push(leafCluster(w * 0.2, -12, 78, 1.2, 8));
  // 右上
  parts.push(leafCluster(w * 0.9, -6, 118, 1.5, 5));
  parts.push(leafCluster(w * 0.8, -12, 102, 1.2, 11));
  return parts.join('');
}

export function renderDecor(svg: SVGSVGElement): void {
  const w = window.innerWidth;
  const h = window.innerHeight;
  svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  svg.setAttribute('width', String(w));
  svg.setAttribute('height', String(h));

  const parts: string[] = [];

  // 奥のロープ(かすかに見える)
  for (const rope of BG_ROPES) {
    parts.push(
      `<path d="${ropePath(rope, w, h)}" fill="none" stroke="${ROPE_BG_COLOR}" stroke-width="1" opacity="0.22"/>`,
    );
  }
  // 手前のロープ
  for (const rope of FG_ROPES) {
    parts.push(
      `<path d="${ropePath(rope, w, h)}" fill="none" stroke="${ROPE_FG_COLOR}" stroke-width="1.8" opacity="0.5"/>`,
    );
  }

  // 両端の笹
  parts.push(bambooStalk(w * 0.028, w, h, 2.4, 1));
  parts.push(bambooStalk(w * 0.972, w, h, -2.8, 9));
  parts.push(cornerFronds(w));

  svg.innerHTML = parts.join('');
}
