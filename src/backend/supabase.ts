import { createClient } from '@supabase/supabase-js';
import type { Backend, BackendHandlers, NewPostInput, TanzakuPost } from '../types';

interface TanzakuRow {
  id: string;
  wish_text: string;
  display_name: string;
  is_anonymous: boolean;
  color: string;
  is_visible: boolean;
  created_at: string;
}

function rowToPost(row: TanzakuRow): TanzakuPost {
  return {
    id: row.id,
    wishText: row.wish_text,
    displayName: row.display_name ?? '',
    isAnonymous: row.is_anonymous,
    color: row.color as TanzakuPost['color'],
    isVisible: row.is_visible,
    createdAt: row.created_at,
  };
}

export function createSupabaseBackend(url: string, anonKey: string): Backend {
  const client = createClient(url, anonKey);
  const TABLE = 'tanzaku_posts';

  return {
    mode: 'supabase',

    async submitPost(input: NewPostInput): Promise<void> {
      const { error } = await client.from(TABLE).insert({
        wish_text: input.wishText,
        display_name: input.displayName,
        is_anonymous: input.isAnonymous,
        color: input.color,
        is_visible: true,
      });
      if (error) throw new Error(`投稿の保存に失敗しました: ${error.message}`);
    },

    async fetchVisiblePosts(limit: number) {
      const { data, count, error } = await client
        .from(TABLE)
        .select('*', { count: 'exact' })
        .eq('is_visible', true)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw new Error(`投稿の取得に失敗しました: ${error.message}`);
      return {
        posts: (data as TanzakuRow[]).map(rowToPost),
        total: count ?? data.length,
      };
    },

    subscribe(handlers: BackendHandlers): () => void {
      const channel = client
        .channel('tanzaku_posts_changes')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: TABLE },
          (payload) => {
            const post = rowToPost(payload.new as TanzakuRow);
            if (post.isVisible) handlers.onInsert(post);
          },
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: TABLE },
          (payload) => {
            const post = rowToPost(payload.new as TanzakuRow);
            if (post.isVisible) handlers.onInsert(post);
            else handlers.onRemove(post.id);
          },
        )
        .on(
          'postgres_changes',
          { event: 'DELETE', schema: 'public', table: TABLE },
          (payload) => {
            const id = (payload.old as Partial<TanzakuRow>)?.id;
            if (id) handlers.onRemove(id);
          },
        )
        .subscribe();
      return () => {
        void client.removeChannel(channel);
      };
    },
  };
}
