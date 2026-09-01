import './wall.css';
import { createBackend } from '../backend';
import type { TanzakuPost } from '../types';
import { renderDecor } from './decor';
import { BG_SLOTS_PER_ROPE, BG_ROPES, FG_ROPES, FG_SLOTS_PER_ROPE } from './layout';
import { StarField } from './stars';
import { WallManager } from './wallManager';

const FETCH_LIMIT = 120;
const RECONCILE_INTERVAL_MS = 45_000; // Realtime切断時の取りこぼし対策

const FG_CAPACITY = FG_ROPES.length * FG_SLOTS_PER_ROPE;
const BG_CAPACITY = BG_ROPES.length * BG_SLOTS_PER_ROPE;

function $<T extends HTMLElement>(selector: string): T {
  const el = document.querySelector<T>(selector);
  if (!el) throw new Error(`element not found: ${selector}`);
  return el;
}

const starsCanvas = $<HTMLCanvasElement>('#stars');
const decorSvg = document.querySelector<SVGSVGElement>('#decor');
if (!decorSvg) throw new Error('element not found: #decor');
const hintEl = $<HTMLParagraphElement>('#hint');

const backend = createBackend();
const wall = new WallManager($('#layer-fg'), $('#layer-bg'));
const stars = new StarField(starsCanvas);

renderDecor(decorSvg);

let totalCount = 0;
const seenIds = new Set<string>();
let latestCreatedAt = '';

function refreshUi(): void {
  hintEl.hidden = totalCount > 0;
  stars.setLiveliness(totalCount);
}

function noteSeen(post: TanzakuPost): void {
  seenIds.add(post.id);
  if (post.createdAt > latestCreatedAt) latestCreatedAt = post.createdAt;
}

function handleInsert(post: TanzakuPost, animate: 'drop' | 'soft'): void {
  if (wall.has(post.id)) return;
  if (!seenIds.has(post.id)) totalCount += 1;
  noteSeen(post);
  wall.add(post, { animate });
  refreshUi();
}

function handleRemove(id: string): void {
  if (seenIds.delete(id)) totalCount = Math.max(0, totalCount - 1);
  wall.remove(id);
  refreshUi();
}

async function initialLoad(): Promise<void> {
  const { posts, total } = await backend.fetchVisiblePosts(FETCH_LIMIT); // 新しい順
  totalCount = total;
  posts.forEach(noteSeen);

  // 新しい16枚を手前に、続く20枚を奥に。古いものから順に置いていく。
  const fgPosts = posts.slice(0, FG_CAPACITY).reverse();
  const bgPosts = posts.slice(FG_CAPACITY, FG_CAPACITY + BG_CAPACITY).reverse();

  bgPosts.forEach((post, i) => {
    wall.add(post, { layer: 'bg', animate: 'soft', delayMs: i * 70 });
  });
  fgPosts.forEach((post, i) => {
    wall.add(post, { layer: 'fg', animate: 'soft', delayMs: bgPosts.length * 70 + i * 110 });
  });
  refreshUi();
}

/** Realtimeの取りこぼしを定期的に補正する */
async function reconcile(): Promise<void> {
  try {
    const { posts, total } = await backend.fetchVisiblePosts(FETCH_LIMIT);
    totalCount = total;

    const fetchedIds = new Set(posts.map((p) => p.id));

    // 見逃した新規投稿を追加
    for (const post of [...posts].reverse()) {
      if (!wall.has(post.id) && post.createdAt > latestCreatedAt) {
        handleInsert(post, 'drop');
      }
    }

    // 非表示化・削除された投稿を撤去。
    // 取得件数が上限に達している場合、古い投稿は取得範囲外の可能性があるため撤去しない
    // (その場合の非表示反映は Realtime イベント側で行われる)。
    if (posts.length < FETCH_LIMIT) {
      for (const id of [...seenIds]) {
        if (!fetchedIds.has(id) && wall.has(id)) handleRemove(id);
      }
    }
    refreshUi();
  } catch (err) {
    console.warn('[tanzaku] reconcile failed:', err);
  }
}

backend.subscribe({
  onInsert: (post) => handleInsert(post, 'drop'),
  onRemove: (id) => handleRemove(id),
});

void initialLoad();
window.setInterval(() => void reconcile(), RECONCILE_INTERVAL_MS);

// リサイズ時は装飾と星空を描き直す
let resizeTimer = 0;
window.addEventListener('resize', () => {
  window.clearTimeout(resizeTimer);
  resizeTimer = window.setTimeout(() => {
    renderDecor(decorSvg);
    stars.resize();
  }, 150);
});

// プロジェクター運用向け: ダブルクリックでフルスクリーン切り替え
document.addEventListener('dblclick', () => {
  if (document.fullscreenElement) void document.exitFullscreen();
  else void document.documentElement.requestFullscreen();
});

// ローカルデモモード用: コンソールから window.addDemoPost(枚数) でサンプル投稿を追加できる
if (backend.mode === 'local') {
  const samples: Array<[string, string]> = [
    ['家族みんなが健康でありますように', 'ゆい'],
    ['ライブのチケットが当たりますように', ''],
    ['文化祭が大成功しますように', '実行委員'],
    ['世界が平和になりますように', ''],
    ['推しに会えますように', 'あかり'],
    ['テストで満点がとれますように', 'そうた'],
    ['宝くじが当たりますように', ''],
    ['来年も家族で七夕ができますように', 'じいじ'],
    ['サッカーが上手くなりますように', 'れん'],
    ['おいしいものをたくさん食べたい', ''],
    ['ずっと友だちでいられますように', 'みお & はな'],
    ['プログラマーになれますように', 'K'],
  ];
  const colors = ['red', 'blue', 'yellow', 'purple', 'green', 'white'] as const;
  (window as unknown as Record<string, unknown>).addDemoPost = async (count = 1) => {
    for (let i = 0; i < count; i++) {
      const [wishText, displayName] = samples[Math.floor(Math.random() * samples.length)];
      await backend.submitPost({
        wishText,
        displayName,
        isAnonymous: displayName === '' && Math.random() < 0.5,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
      const { posts } = await backend.fetchVisiblePosts(1);
      if (posts[0]) handleInsert(posts[0], 'drop');
      if (count > 1) await new Promise((r) => setTimeout(r, 400));
    }
  };
  console.info('[tanzaku] デモ投稿: addDemoPost(5) をコンソールで実行してください');
}
