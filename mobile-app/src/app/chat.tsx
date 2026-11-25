import { Redirect, router } from 'expo-router';
import { useEffect } from 'react';

import { Portrait } from '@/components/Portrait';
import { ChatView } from '@/features/chat/ChatView';
import { useAuth } from '@/state/auth';
import { useChat } from '@/state/chat';

/**
 * Cliente · Conversa com o PT. Same thread the PT sees in Mensagens — with the
 * demo accounts, Miguel and Rita read each other's messages on this phone.
 */
export default function ClientChat() {
  const { threads, clientThreadId, trainerName, send, markRead } = useChat();
  const { state } = useAuth();
  const thread = clientThreadId ? threads[clientThreadId] : undefined;
  const unread = thread ? thread.messages.length - thread.studentRead : 0;

  useEffect(() => {
    if (clientThreadId && unread > 0) markRead(clientThreadId, 'student');
  }, [clientThreadId, markRead, unread]);

  if (state.status === 'loading') return null;
  if (!clientThreadId || !trainerName) return <Redirect href="/trainers" />;

  return (
    <ChatView
      messages={thread?.messages ?? []}
      mine="student"
      avatar={<Portrait person={trainerName.id} size={36} />}
      name={trainerName.name}
      subtitle="Personal Trainer · responde normalmente no mesmo dia"
      onOpenProfile={() => router.push({ pathname: '/trainers/[id]', params: { id: trainerName.id } })}
      onSend={(message) => send(clientThreadId, message, 'student')}
      attach={['camera', 'photos', 'file']}
    />
  );
}
