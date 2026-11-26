import { router, useLocalSearchParams } from 'expo-router';

import { Avatar } from '@/components/Avatar';
import { ChatView } from '@/features/chat/ChatView';
import { useTrainer } from '@/features/pt/store';
import { apiUrl } from '@/lib/api';
import { useChat, useConversation } from '@/state/chat';

/** PT · Mensagens · conversa (+ anexar). `id` is the conversation id. */
export default function Chat() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { threads } = useChat();
  const { students } = useTrainer();
  const thread = threads[id];
  const { messages, send } = useConversation(id ?? null);
  const student = students.find((s) => s.conversationId === id);
  const name = thread?.other.name ?? student?.name ?? '';

  return (
    <ChatView
      messages={messages}
      mine="me"
      avatar={<Avatar photoUri={thread?.other.photoUrl ? apiUrl(thread.other.photoUrl) : null} size={36} name={name} />}
      name={name}
      subtitle={student ? `${student.goal} · semana ${student.week} de ${student.weeks}` : 'Antigo aluno'}
      onOpenProfile={student ? () => router.push({ pathname: '/pt/student/[id]', params: { id: student.id } }) : undefined}
      onSend={send}
      attach={['camera', 'photos', 'file']}
      canSend={thread?.canSend ?? true}
    />
  );
}
