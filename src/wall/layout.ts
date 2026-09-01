// 短冊を吊るすロープ(笹の間に渡した飾り紐)の定義。
// 座標はすべて画面に対する % で扱い、装飾SVGとスロット配置で共有する。

export interface RopeDef {
  /** ロープ両端の高さ(画面高に対する%) */
  y0: number;
  /** 中央のたわみ量(%) */
  sag: number;
}

export interface Slot {
  /** 画面幅に対する % */
  x: number;
  /** 画面高に対する %(ロープ上の吊り下げ位置) */
  y: number;
}

export const FG_ROPES: RopeDef[] = [
  { y0: 11, sag: 7 },
  { y0: 42, sag: 7 },
];

export const BG_ROPES: RopeDef[] = [
  { y0: 5, sag: 4 },
  { y0: 30, sag: 5 },
];

export const FG_SLOTS_PER_ROPE = 8;
export const BG_SLOTS_PER_ROPE = 10;

/** ロープ上の高さ(t: 0〜1 の水平位置) */
export function ropeYAt(rope: RopeDef, t: number): number {
  return rope.y0 + rope.sag * 4 * t * (1 - t);
}

/** 決定的な擬似乱数(リロードしても同じ配置になるように) */
function jitter(seed: number): number {
  const v = Math.sin(seed * 12.9898) * 43758.5453;
  return v - Math.floor(v); // 0〜1
}

export function makeSlots(ropes: RopeDef[], perRope: number): Slot[] {
  const slots: Slot[] = [];
  ropes.forEach((rope, ropeIndex) => {
    const start = 0.05 + (ropeIndex % 2) * 0.04;
    const span = 0.86;
    for (let i = 0; i < perRope; i++) {
      const base = start + (span * i) / (perRope - 1);
      const t = base + (jitter(ropeIndex * 100 + i) - 0.5) * 0.03;
      slots.push({ x: t * 100, y: ropeYAt(rope, t) });
    }
  });
  return slots;
}
