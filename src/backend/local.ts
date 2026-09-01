import type { Backend, BackendHandlers, NewPostInput, TanzakuPost } from '../types';

// Supabase 未設定時のデモ用バックエンド。
// localStorage に保存し、BroadcastChannel で同一ブラウザ内の別タブ(/wall)へ通知する。
const STORAGE_KEY = 'tanzaku-local-posts';
const CHANNEL_NAME = 'tanzaku-local-channel';

type ChannelMessage =
  | { type: 'insert'; post: TanzakuPost }
  | { type: 'remove'; id: string };

function readPosts(): TanzakuPost[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as TanzakuPost[]) : [];
  } catch {
    return [];
  }
}

function writePosts(posts: TanzakuPost[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(posts.slice(-300)));
}

export function createLocalBackend(): Backend {
  const channel = new BroadcastChannel(CHANNEL_NAME);

  return {
    mode: 'local',

    async submitPost(input: NewPostInput): Promise<void> {
      const post: TanzakuPost = {
        id: crypto.randomUUID(),
        wishText: input.wishText,
        displayName: input.displayName,
        isAnonymous: input.isAnonymous,
        color: input.color,
        isVisible: true,
        createdAt: new Date().toISOString(),
      };
      const posts = readPosts();
      posts.push(post);
      writePosts(posts);
      channel.postMessage({ type: 'insert', post } satisfies ChannelMessage);
    },

    async fetchVisiblePosts(limit: number) {
      const visible = readPosts().filter((p) => p.isVisible && p.wishText.trim() !== '');
      visible.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      return { posts: visible.slice(0, limit), total: visible.length };
    },

    subscribe(handlers: BackendHandlers): () => void {
      const onMessage = (event: MessageEvent<ChannelMessage>) => {
        const msg = event.data;
        if (msg.type === 'insert') handlers.onInsert(msg.post);
        else if (msg.type === 'remove') handlers.onRemove(msg.id);
      };
      channel.addEventListener('message', onMessage);
      return () => channel.removeEventListener('message', onMessage);
    },
  };
}
