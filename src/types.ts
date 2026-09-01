export const TANZAKU_COLORS = ['red', 'blue', 'yellow', 'purple', 'green', 'white'] as const;

export type TanzakuColor = (typeof TANZAKU_COLORS)[number];

export function randomColor(): TanzakuColor {
  return TANZAKU_COLORS[Math.floor(Math.random() * TANZAKU_COLORS.length)];
}

export interface TanzakuPost {
  id: string;
  wishText: string;
  displayName: string;
  isAnonymous: boolean;
  color: TanzakuColor;
  isVisible: boolean;
  createdAt: string;
}

export interface NewPostInput {
  wishText: string;
  displayName: string;
  isAnonymous: boolean;
  color: TanzakuColor;
}

export interface BackendHandlers {
  onInsert(post: TanzakuPost): void;
  onRemove(id: string): void;
}

export interface Backend {
  readonly mode: 'supabase' | 'local';
  submitPost(input: NewPostInput): Promise<void>;
  /** 表示対象の投稿を新しい順に取得する。total は全体の件数。 */
  fetchVisiblePosts(limit: number): Promise<{ posts: TanzakuPost[]; total: number }>;
  subscribe(handlers: BackendHandlers): () => void;
}
