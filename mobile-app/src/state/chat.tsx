import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react';

import type { Person } from '@/components/Portrait';
import { conversations as seedConversations, type ChatMessage } from '@/features/pt/data';
import { isRecord, usePersistentState } from '@/lib/persist';
import { useAuth } from '@/state/auth';
import { formatTimeOfDay } from '@/lib/format';

/**
 * PT ⇄ student conversations, shared by every account on this phone — so the
 * demo accounts (Rita and Miguel) really talk to each other until
 * backend-core has messaging. Messages are stored from the PT's side:
 * 'me' = PT, 'student' = student, 'system' = workout cards.
 */
export type Thread = {
  messages: ChatMessage[];
  updatedAt: number;
  /** How many messages each side has seen (unread = the rest from the other side). */
  trainerRead: number;
  studentRead: number;
};

type Threads = Record<string, Thread>;

const KEY = 'trakio.data.shared.chat.v1';

function seed(): Threads {
  const threads: Threads = {};
  const now = Date.now();
  seedConversations.forEach((c, i) => {
    threads[c.id] = {
      messages: c.messages,
      updatedAt: now - i * 3600 * 1000,
      trainerRead: c.messages.length - c.unread,
      studentRead: c.messages.length,
    };
  });
  return threads;
}

function parseThreads(raw: unknown): Threads | null {
  if (!isRecord(raw)) return null;
  const threads: Threads = {};
  for (const [id, value] of Object.entries(raw)) {
    if (isRecord(value) && Array.isArray(value.messages)) threads[id] = value as Thread;
  }
  return threads;
}

export type TrainerName = { id: Person; name: string; first: string; to: string; article: string };

export function unreadFor(thread: Thread | undefined, side: 'trainer' | 'student'): number {
  if (!thread) return 0;
  const seen = side === 'trainer' ? thread.trainerRead : thread.studentRead;
  const fromOther = side === 'trainer' ? 'student' : 'me';
  return thread.messages.slice(seen).filter((m) => m.from === fromOther).length;
}

type ChatContextValue = {
  threads: Threads;
  send: (threadId: string, message: ChatMessage, side: 'trainer' | 'student') => void;
  markRead: (threadId: string, side: 'trainer' | 'student') => void;
  /** Signed-in student's conversation with their PT (null when training alone). */
  clientThreadId: string | null;
  /** "Rita" / "à Rita" / "a Rita" for the student's PT. */
  trainerName: TrainerName | null;
  /** Student → PT, e.g. the workout summary card. */
  sendToTrainer: (content: { kind: 'text'; text: string } | { kind: 'workout'; title: string; detail: string }) => void;
};

const ChatContext = createContext<ChatContextValue | null>(null);

export function ChatProvider({ children }: { children: ReactNode }) {
  const { account } = useAuth();
  const [threads, setThreads] = usePersistentState(KEY, seed, parseThreads);

  const profile = account?.profile?.kind === 'client' ? account.profile : null;
  const link = profile?.coached ? profile.trainer : null;
  const clientThreadId = link ? (profile?.demoPerson ?? `client:${account?.id ?? ''}`) : null;
  const trainerName = useMemo<TrainerName | null>(() => {
    if (!link) return null;
    const first = link.name.split(' ')[0] ?? link.name;
    return { id: link.id, name: link.name, first, to: `${link.article === 'a' ? 'à' : 'ao'} ${first}`, article: `${link.article} ${first}` };
  }, [link]);

  const send = useCallback(
    (threadId: string, message: ChatMessage, side: 'trainer' | 'student') =>
      setThreads((all) => {
        const thread = all[threadId] ?? { messages: [], updatedAt: 0, trainerRead: 0, studentRead: 0 };
        const messages = [...thread.messages, message];
        // Writing to a thread means you've read everything in it.
        const mine = side === 'trainer' ? { trainerRead: messages.length } : { studentRead: messages.length };
        return { ...all, [threadId]: { ...thread, ...mine, messages, updatedAt: Date.now() } };
      }),
    [setThreads],
  );

  const value = useMemo<ChatContextValue>(
    () => ({
      threads,
      send,
      markRead: (threadId, side) =>
        setThreads((all) => {
          const thread = all[threadId];
          if (!thread) return all;
          const key = side === 'trainer' ? 'trainerRead' : 'studentRead';
          if (thread[key] === thread.messages.length) return all;
          return { ...all, [threadId]: { ...thread, [key]: thread.messages.length } };
        }),
      clientThreadId,
      trainerName,
      sendToTrainer: (content) => {
        if (!clientThreadId) return;
        const now = new Date();
        const base = { id: `m-${now.getTime()}`, time: formatTimeOfDay(now) };
        send(
          clientThreadId,
          content.kind === 'text'
            ? { ...base, from: 'student', kind: 'text', text: content.text }
            : { ...base, from: 'system', kind: 'workout', title: content.title, detail: content.detail },
          'student',
        );
      },
    }),
    [clientThreadId, send, setThreads, threads, trainerName],
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat(): ChatContextValue {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChat must be used inside <ChatProvider>');
  return ctx;
}
