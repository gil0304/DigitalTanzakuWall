import type { TanzakuPost } from '../types';
import {
  BG_ROPES,
  BG_SLOTS_PER_ROPE,
  FG_ROPES,
  FG_SLOTS_PER_ROPE,
  makeSlots,
  type Slot,
} from './layout';

// 手前(fg)のスロットが埋まったら、いちばん古い短冊を奥(bg)へ送る。
// 奥も埋まったら、いちばん古いものからフェードアウトして退場する。

type Layer = 'fg' | 'bg';
type EnterAnimation = 'drop' | 'soft' | 'none';

interface Entry {
  post: TanzakuPost;
  el: HTMLElement;
  layer: Layer;
  slotIndex: number;
}

interface AddOptions {
  layer?: Layer;
  animate?: EnterAnimation;
  delayMs?: number;
}

const REMOVE_FADE_MS = 750;

function wishLengthClass(text: string): string {
  const len = [...text].length;
  if (len <= 8) return 'len-s';
  if (len <= 16) return 'len-m';
  if (len <= 26) return 'len-l';
  return 'len-xl';
}

export class WallManager {
  private readonly fgSlots: Slot[];
  private readonly bgSlots: Slot[];
  private readonly fgOccupants: (string | null)[];
  private readonly bgOccupants: (string | null)[];
  private readonly entries = new Map<string, Entry>();
  private fgOrder: string[] = []; // 古い順
  private bgOrder: string[] = [];

  constructor(
    private readonly fgLayer: HTMLElement,
    private readonly bgLayer: HTMLElement,
  ) {
    this.fgSlots = makeSlots(FG_ROPES, FG_SLOTS_PER_ROPE);
    this.bgSlots = makeSlots(BG_ROPES, BG_SLOTS_PER_ROPE);
    this.fgOccupants = this.fgSlots.map(() => null);
    this.bgOccupants = this.bgSlots.map(() => null);
  }

  get displayedCount(): number {
    return this.entries.size;
  }

  has(id: string): boolean {
    return this.entries.has(id);
  }

  add(post: TanzakuPost, options: AddOptions = {}): void {
    if (this.entries.has(post.id)) return;
    const layer = options.layer ?? 'fg';
    const animate = options.animate ?? 'drop';

    if (layer === 'fg' && this.freeSlot('fg') === -1) this.demoteOldestFg();
    if (layer === 'bg' && this.freeSlot('bg') === -1) this.retireOldestBg();

    const slotIndex = this.freeSlot(layer);
    if (slotIndex === -1) return; // 起こらない想定

    const slots = layer === 'fg' ? this.fgSlots : this.bgSlots;
    const el = this.buildElement(post, layer, slots[slotIndex], animate, options.delayMs ?? 0);

    (layer === 'fg' ? this.fgOccupants : this.bgOccupants)[slotIndex] = post.id;
    (layer === 'fg' ? this.fgOrder : this.bgOrder).push(post.id);
    this.entries.set(post.id, { post, el, layer, slotIndex });
    (layer === 'fg' ? this.fgLayer : this.bgLayer).appendChild(el);
  }

  /** モデレーション等による強制削除 */
  remove(id: string): void {
    const entry = this.entries.get(id);
    if (!entry) return;
    this.releaseEntry(entry);
  }

  private freeSlot(layer: Layer): number {
    const occupants = layer === 'fg' ? this.fgOccupants : this.bgOccupants;
    const free: number[] = [];
    occupants.forEach((id, i) => {
      if (id === null) free.push(i);
    });
    if (free.length === 0) return -1;
    return free[Math.floor(Math.random() * free.length)];
  }

  private demoteOldestFg(): void {
    const id = this.fgOrder[0];
    const entry = id ? this.entries.get(id) : undefined;
    if (!entry) return;
    const post = entry.post;
    this.releaseEntry(entry);
    this.add(post, { layer: 'bg', animate: 'soft' });
  }

  private retireOldestBg(): void {
    const id = this.bgOrder[0];
    const entry = id ? this.entries.get(id) : undefined;
    if (!entry) return;
    this.releaseEntry(entry);
  }

  private releaseEntry(entry: Entry): void {
    const { post, el, layer, slotIndex } = entry;
    this.entries.delete(post.id);
    if (layer === 'fg') {
      this.fgOccupants[slotIndex] = null;
      this.fgOrder = this.fgOrder.filter((id) => id !== post.id);
    } else {
      this.bgOccupants[slotIndex] = null;
      this.bgOrder = this.bgOrder.filter((id) => id !== post.id);
    }
    el.classList.add('leaving');
    window.setTimeout(() => el.remove(), REMOVE_FADE_MS);
  }

  private buildElement(
    post: TanzakuPost,
    layer: Layer,
    slot: Slot,
    animate: EnterAnimation,
    delayMs: number,
  ): HTMLElement {
    const root = document.createElement('div');
    root.className = `tanzaku tz-${post.color}`;
    if (layer === 'bg') root.classList.add('is-bg');
    root.style.left = `${slot.x}%`;
    root.style.top = `${slot.y}%`;

    // 個体差のある揺れ
    root.style.setProperty('--sway', `${(1.4 + Math.random() * 2.1).toFixed(2)}deg`);
    root.style.setProperty('--sway-dur', `${(2.9 + Math.random() * 2.3).toFixed(2)}s`);
    root.style.setProperty('--sway-delay', `${(-Math.random() * 6).toFixed(2)}s`);

    if (animate === 'drop') {
      root.classList.add('drop-in');
      window.setTimeout(() => root.classList.remove('drop-in'), 2600);
    } else if (animate === 'soft') {
      root.classList.add('soft-in');
      root.style.setProperty('--in-delay', `${delayMs}ms`);
      window.setTimeout(() => root.classList.remove('soft-in'), 1400 + delayMs);
    }

    const swing = document.createElement('div');
    swing.className = 'swing';

    const string = document.createElement('div');
    string.className = 'string';

    const paper = document.createElement('div');
    paper.className = 'paper';

    const hole = document.createElement('div');
    hole.className = 'hole';

    const wish = document.createElement('div');
    wish.className = `wish ${wishLengthClass(post.wishText)}`;
    wish.textContent = post.wishText;

    paper.append(hole, wish);

    if (!post.isAnonymous) {
      const name = document.createElement('div');
      name.className = 'name';
      name.textContent = post.displayName || '匿名';
      paper.append(name);
    }

    swing.append(string, paper);
    root.append(swing);
    return root;
  }
}
