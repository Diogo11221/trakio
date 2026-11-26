import * as WebBrowser from 'expo-web-browser';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';

import type { ChatMessage } from '@/features/pt/data';
import { api, apiUrl, uploadFile } from '@/lib/api';
import type { ConversationDto, MessageDto, MessagesPageDto } from '@/lib/apiTypes';
import { formatTimeOfDay } from '@/lib/format';
import { registerRefresher } from '@/lib/refresh';
import { useAuth } from '@/state/auth';

/**
 * PT ⇄ student conversations on backend-core. Messages use the PT's point of view, as before:
 * 'me' = PT, 'student' = student, 'system' = workout cards. The list refreshes every 15 s and an
 * open conversation every 4 s (no push notifications yet).
 */
export type Thread = {
  id: string;
  other: ConversationDto['other'];
  last: ChatMessage | null;
  /** Last message the PT wrote, for "Hoje". */
  lastFromTrainer: ChatMessage | null;
  unread: number;
  canSend: boolean;
  updatedAt: number;
};

export type TrainerName = { id: string; name: string; first: string; to: string; article: string; photoUri: string | null };

export type Outgoing =
  | { kind: 'text'; text: string }
  | { kind: 'photo'; uri: string }
  | { kind: 'file'; uri: string; name: string; mimeType: string }
  | { kind: 'workout'; sessionId: string };

const dayFormat = new Intl.DateTimeFormat('pt-PT', { day: 'numeric', month: 'short' });

function when(iso: string): string {
  const date = new Date(iso);
  const today = new Date();
  const days = Math.round((new Date(today).setHours(0, 0, 0, 0) - new Date(date).setHours(0, 0, 0, 0)) / 86_400_000);
  if (days === 0) return formatTimeOfDay(date);
  if (days === 1) return 'Ontem';
  return dayFormat.format(date).replace('.', '');
}

function sizeLabel(bytes: number | undefined): string {
  if (!bytes) return 'PDF';
  return bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export function toChatMessage(m: MessageDto): ChatMessage {
  const id = String(m.id);
  const time = when(m.createdAt);
  const from = m.from === 'trainer' ? 'me' : 'student';
  switch (m.kind) {
    case 'workout':
      return { id, from: 'system', kind: 'workout', title: m.title ?? '', detail: m.detail ?? '', time };
    case 'photo':
      return { id, from, kind: 'photo', uri: m.fileUrl ? apiUrl(m.fileUrl) : null, caption: m.text, time };
    case 'file':
      return { id, from, kind: 'file', name: m.fileName ?? 'Ficheiro', meta: sizeLabel(m.fileSize), url: m.fileUrl ? apiUrl(m.fileUrl) : undefined, time };
    default:
      return { id, from, kind: 'text', text: m.text ?? '', time };
  }
}

function toThread(c: ConversationDto): Thread {
  const last = c.lastMessage ? toChatMessage(c.lastMessage) : null;
  return {
    id: c.id,
    other: c.other,
    last,
    lastFromTrainer: last && last.from === 'me' ? last : null,
    unread: c.unread,
    canSend: c.canSend,
    updatedAt: c.updatedAt ? Date.parse(c.updatedAt) : 0,
  };
}

async function postMessage(conversationId: string, outgoing: Outgoing): Promise<MessageDto> {
  const path = `/api/v1/conversations/${conversationId}/messages`;
  switch (outgoing.kind) {
    case 'text':
      return api.post<MessageDto>(path, { kind: 'text', text: outgoing.text });
    case 'workout':
      return api.post<MessageDto>(path, { kind: 'workout', sessionId: outgoing.sessionId });
    case 'photo': {
      const type = outgoing.uri.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
      const file = await uploadFile(outgoing.uri, 'chat', type === 'image/png' ? 'foto.png' : 'foto.jpg', type);
      return api.post<MessageDto>(path, { kind: 'photo', fileId: file.id });
    }
    case 'file': {
      const file = await uploadFile(outgoing.uri, 'chat', outgoing.name, outgoing.mimeType);
      return api.post<MessageDto>(path, { kind: 'file', fileId: file.id });
    }
  }
}

/** Opens a chat attachment (a PDF, say) in the browser through a 5-minute signed link. */
export async function openAttachment(url: string): Promise<void> {
  const id = url.split('/api/v1/files/')[1]?.split('?')[0];
  if (!id) return;
  const link = await api.post<{ url: string }>(`/api/v1/files/${id}/link`);
  await WebBrowser.openBrowserAsync(apiUrl(link.url));
}

type ChatContextValue = {
  threads: Record<string, Thread>;
  /** Newest first. */
  list: Thread[];
  unreadTotal: number;
  refresh: () => Promise<void>;
  /** Signed-in student's conversation with their PT (null when training alone). */
  clientThreadId: string | null;
  /** "Rita" / "à Rita" / "a Rita" for the student's PT. */
  trainerName: TrainerName | null;
  /** Student → PT, e.g. the workout summary card. */
  sendToTrainer: (content: { kind: 'text'; text: string } | { kind: 'workout'; sessionId: string }) => Promise<void>;
};

const ChatContext = createContext<ChatContextValue | null>(null);

export function ChatProvider({ children }: { children: ReactNode }) {
  const { account } = useAuth();
  const owner = account !== null && account.profile !== null ? account.id : null;
  const [state, setState] = useState<{ owner: string | null; threads: Record<string, Thread> }>({ owner: null, threads: {} });
  const threads = useMemo(() => (state.owner === owner ? state.threads : {}), [owner, state]);

  const refresh = useCallback(() => {
    if (!owner) return Promise.resolve();
    return api
      .get<ConversationDto[]>('/api/v1/conversations')
      .then((list) => setState({ owner, threads: Object.fromEntries(list.map((c) => [c.id, toThread(c)])) }));
  }, [owner]);

  useEffect(() => {
    if (!owner) return;
    refresh().catch(() => undefined);
    const timer = setInterval(() => {
      if (AppState.currentState === 'active') refresh().catch(() => undefined);
    }, 15_000);
    const off = registerRefresher(refresh);
    return () => {
      clearInterval(timer);
      off();
    };
  }, [owner, refresh]);

  const profile = account?.profile?.kind === 'client' ? account.profile : null;
  const link = profile?.trainer ?? null;
  const clientThreadId = link?.conversationId ?? null;
  const trainerName = useMemo<TrainerName | null>(() => {
    if (!link) return null;
    const first = link.name.split(' ')[0] ?? link.name;
    return {
      id: link.id,
      name: link.name,
      first,
      to: `${link.article === 'a' ? 'à' : 'ao'} ${first}`,
      article: `${link.article} ${first}`,
      photoUri: link.photoUri,
    };
  }, [link]);

  const value = useMemo<ChatContextValue>(() => {
    const list = Object.values(threads).sort((a, b) => b.updatedAt - a.updatedAt);
    return {
      threads,
      list,
      unreadTotal: list.reduce((n, t) => n + t.unread, 0),
      refresh,
      clientThreadId,
      trainerName,
      sendToTrainer: async (content) => {
        if (!clientThreadId) return;
        await postMessage(clientThreadId, content);
        await refresh().catch(() => undefined);
      },
    };
  }, [clientThreadId, refresh, threads, trainerName]);

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat(): ChatContextValue {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChat must be used inside <ChatProvider>');
  return ctx;
}

/** One open conversation: loads its messages, polls for new ones, sends and marks as read. */
export function useConversation(conversationId: string | null) {
  const { refresh } = useChat();
  // Tagged with the conversation, so switching threads never shows the previous one's messages.
  const [state, setState] = useState<{ id: string | null; messages: MessageDto[]; loaded: boolean }>({ id: null, messages: [], loaded: false });
  const current = state.id === conversationId ? state : { id: conversationId, messages: [] as MessageDto[], loaded: false };
  const lastId = useRef(0);

  const markRead = useCallback(
    (upTo: number) => {
      if (!conversationId || upTo <= 0) return;
      api.post(`/api/v1/conversations/${conversationId}/read`, { upTo }).then(() => refresh()).catch(() => undefined);
    },
    [conversationId, refresh],
  );

  const append = useCallback(
    (incoming: MessageDto[], loaded = true) => {
      setState((s) => {
        const existing = s.id === conversationId ? s.messages : [];
        const known = new Set(existing.map((m) => m.id));
        return {
          id: conversationId,
          messages: [...existing, ...incoming.filter((m) => !known.has(m.id))].sort((a, b) => a.id - b.id),
          loaded: loaded || (s.id === conversationId && s.loaded),
        };
      });
      if (incoming.length > 0) lastId.current = Math.max(lastId.current, ...incoming.map((m) => m.id));
    },
    [conversationId],
  );

  useEffect(() => {
    if (!conversationId) return;
    let alive = true;
    lastId.current = 0;
    const load = (initial: boolean) =>
      api
        .get<MessagesPageDto>(`/api/v1/conversations/${conversationId}/messages${initial ? '?limit=100' : `?after=${lastId.current}&limit=100`}`)
        .then((page) => {
          if (!alive) return;
          append(page.messages);
          if (page.messages.length > 0) markRead(lastId.current);
        });
    load(true).catch(() => alive && append([]));
    const timer = setInterval(() => {
      if (AppState.currentState === 'active') load(false).catch(() => undefined);
    }, 4_000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [append, conversationId, markRead]);

  const send = useCallback(
    async (outgoing: Outgoing) => {
      if (!conversationId) return;
      const saved = await postMessage(conversationId, outgoing);
      append([saved]);
      refresh().catch(() => undefined);
    },
    [append, conversationId, refresh],
  );

  const messages = useMemo(() => current.messages.map(toChatMessage), [current.messages]);
  return { messages, loaded: current.loaded, send };
}
