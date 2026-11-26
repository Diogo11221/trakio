import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';

import { ChatView } from '@/features/chat/ChatView';
import { useTrainer } from '@/features/pt/store';
import { StudentAvatar } from '@/features/pt/components';

/** PT · Mensagens · conversa (+ anexar). */
export default function Chat() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { conversations, sendMessage, markRead } = useTrainer();
  const conversation = conversations.find((c) => c.id === id) ?? conversations[0]!;

  useEffect(() => {
    if (conversation.unread > 0) markRead(conversation.id);
  }, [conversation.id, conversation.unread, markRead]);

  return (
    <ChatView
      messages={conversation.messages}
      mine="me"
      avatar={<StudentAvatar student={conversation} size={36} />}
      name={conversation.name}
      subtitle={conversation.subtitle}
      onOpenProfile={() => router.push({ pathname: '/pt/student/[id]', params: { id: conversation.id } })}
      onSend={(message) => sendMessage(conversation.id, message)}
      attach={['camera', 'photos', 'file', 'workout']}
    />
  );
}
