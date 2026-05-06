import { supabase } from '@/integrations/supabase/client';

const SESSION_KEY = 'mc_session_id';

function getSessionId(): string {
  try {
    let id = localStorage.getItem(SESSION_KEY);
    if (!id) {
      id = `s_${crypto.randomUUID()}`;
      localStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return `s_anon_${Date.now()}`;
  }
}

export async function track(eventName: string, props: Record<string, unknown> = {}) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const row: Record<string, unknown> = {
      session_id: getSessionId(),
      event_name: eventName,
      event_props: props,
      page_path: typeof window !== 'undefined' ? window.location.pathname : null,
    };
    if (user?.id) row.user_id = user.id;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    void (supabase.from('analytics_events') as any).insert(row);
  } catch (e) {
    console.warn('[analytics] failed', eventName, e);
  }
}