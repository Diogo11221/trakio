import { Redirect, router } from 'expo-router';

import { Avatar } from '@/components/Avatar';
import { ChatView } from '@/features/chat/ChatView';
import { useAuth } from '@/state/auth';
import { useChat, useConversation } from '@/state/chat';

/** Cliente · Conversa com o PT — the same thread the PT sees in Mensagens. */
export default function ClientChat() {
  const { clientThreadId, trainerName, threads } = useChat();
  const { state } = useAuth();
  const { messages, send } = useConversation(clientThreadId);

  if (state.status === 'loading') return null;
  if (!clientThreadId || !trainerName) return <Redirect href="/trainers" />;

  return (
    <ChatView
      messages={messages}
      mine="student"
      avatar={<Avatar photoUri={trainerName.photoUri} size={36} name={trainerName.name} />}
      name={trainerName.name}
      subtitle="Personal Trainer · responde normalmente no mesmo dia"
      onOpenProfile={() => router.push({ pathname: '/trainers/[id]', params: { id: trainerName.id } })}
      onSend={send}
      attach={['camera', 'photos', 'file']}
      canSend={threads[clientThreadId]?.canSend ?? true}
    />
  );
}
