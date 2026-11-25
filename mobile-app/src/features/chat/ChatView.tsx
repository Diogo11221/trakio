import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useRef, useState, type ComponentRef, type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { Icon } from '@/components/Icon';
import { PressableScale } from '@/components/PressableScale';
import { IconButton } from '@/components/Surface';
import { AttachSheet, type AttachSource, type Attachment } from '@/features/pt/AttachSheet';
import type { ChatMessage } from '@/features/pt/data';
import { formatTimeOfDay } from '@/lib/format';
import { haptics } from '@/lib/haptics';
import { enterRise } from '@/theme/motion';
import { colors, fonts, pagePadding } from '@/theme/tokens';

export type ChatViewProps = {
  messages: ChatMessage[];
  /** Which side of the thread is "me": the PT writes as 'me', the student as 'student'. */
  mine: 'me' | 'student';
  avatar: ReactNode;
  name: string;
  subtitle: string;
  onOpenProfile?: () => void;
  onSend: (message: ChatMessage) => void;
  attach: AttachSource[];
};

/** A conversation between a PT and a student, from either side. */
export function ChatView({ messages, mine, avatar, name, subtitle, onOpenProfile, onSend, attach }: ChatViewProps) {
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState('');
  const [attachOpen, setAttachOpen] = useState(false);
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  // Messages that were already on screen don't animate in; new ones do.
  const [initialCount] = useState(messages.length);

  const send = (message: ChatMessage) => {
    haptics.tap();
    onSend(message);
    setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 60);
  };

  const sendText = () => {
    const text = draft.trim();
    if (!text) return;
    setDraft('');
    const now = new Date();
    send({ id: `m-${now.getTime()}`, from: mine, kind: 'text', text, time: formatTimeOfDay(now) });
  };

  const sendAttachment = (attachment: Attachment) => {
    const now = new Date();
    const base = { id: `m-${now.getTime()}`, time: formatTimeOfDay(now) };
    if (attachment.kind === 'photo') send({ ...base, from: mine, kind: 'photo', uri: attachment.uri });
    else if (attachment.kind === 'file') send({ ...base, from: mine, kind: 'file', name: attachment.name, meta: attachment.meta });
    else send({ ...base, from: 'system', kind: 'workout', title: attachment.title, detail: attachment.detail });
  };

  const canSend = draft.trim().length > 0;
  const sendStyle = useAnimatedStyle(() => ({
    opacity: withTiming(canSend ? 1 : 0.4, { duration: 160 }),
    transform: [{ scale: withTiming(canSend ? 1 : 0.9, { duration: 160 }) }],
  }));

  const other = name.split(' ')[0] ?? name;

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <IconButton icon="chevronLeft" onPress={() => router.back()} accessibilityLabel="Voltar" />
        <PressableScale
          onPress={onOpenProfile}
          disabled={!onOpenProfile}
          style={styles.who}
          accessibilityLabel={onOpenProfile ? `Ver perfil de ${name}` : name}
        >
          {avatar}
          <View>
            <AppText style={styles.name}>{name}</AppText>
            <AppText variant="caption" tone="muted">
              {subtitle}
            </AppText>
          </View>
        </PressableScale>
      </View>

      <ScrollView
        ref={scroll}
        contentContainerStyle={styles.thread}
        onContentSizeChange={(_, h) => {
          if (h > 0 && initialCount === messages.length) {
            scroll.current?.scrollToEnd({ animated: false });
          }
        }}
        keyboardDismissMode="interactive"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.day}>
          <AppText variant="overline" tone="muted">
            Hoje
          </AppText>
        </View>
        {messages.length === 0 ? (
          <AppText variant="small" tone="muted" style={styles.empty}>
            Ainda não há mensagens. Diz olá a {other}.
          </AppText>
        ) : null}
        {messages.map((message, i) => (
          <Animated.View key={message.id} entering={i >= initialCount ? enterRise(0) : undefined}>
            <Message message={message} other={other} mine={message.from === mine} />
          </Animated.View>
        ))}
      </ScrollView>

      <View style={[styles.composer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <View style={styles.input}>
          <IconButton icon="plus" size={36} iconSize={16} onPress={() => setAttachOpen(true)} accessibilityLabel="Anexar" />
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Escreve uma mensagem"
            placeholderTextColor={colors.textMuted}
            selectionColor={colors.volt}
            keyboardAppearance="dark"
            multiline
            style={styles.inputText}
            accessibilityLabel="Mensagem"
          />
          <PressableScale
            onPress={sendText}
            disabled={!canSend}
            haptic={null}
            pressedScale={0.88}
            accessibilityRole="button"
            accessibilityLabel="Enviar"
          >
            <Animated.View style={[styles.send, sendStyle]}>
              <Icon name="send" size={16} />
            </Animated.View>
          </PressableScale>
        </View>
      </View>

      <AttachSheet visible={attachOpen} onClose={() => setAttachOpen(false)} onAttach={sendAttachment} sources={attach} />
    </KeyboardAvoidingView>
  );
}

function Message({ message, other, mine }: { message: ChatMessage; other: string; mine: boolean }) {
  if (message.kind === 'workout') {
    return (
      <View style={styles.workout}>
        <View style={styles.workoutIcon}>
          <Icon name="checkVolt" size={16} />
        </View>
        <View style={styles.flex}>
          <AppText style={styles.workoutTitle}>{message.title}</AppText>
          <AppText variant="caption" tone="muted">
            {message.detail}
          </AppText>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.messageWrap, mine ? styles.right : styles.left]}>
      {message.kind === 'text' ? (
        <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
          <AppText style={[styles.text, mine && { color: colors.bg }]}>{message.text}</AppText>
        </View>
      ) : message.kind === 'photo' ? (
        <View style={[styles.photoBubble, mine ? styles.bubbleMineShape : styles.bubbleTheirsShape]}>
          <Image
            source={message.uri ? { uri: message.uri } : require('@/assets/figma/photo-lunch.jpg')}
            style={styles.photo}
            contentFit="cover"
            accessibilityLabel={mine ? 'Foto enviada' : `Foto de ${other}`}
          />
          {message.caption ? <AppText style={styles.caption}>{message.caption}</AppText> : null}
        </View>
      ) : (
        <View style={[styles.file, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
          <View style={styles.fileIcon}>
            <Icon name="file" size={20} tint={mine ? undefined : colors.text} />
          </View>
          <View>
            <AppText style={[styles.fileName, !mine && { color: colors.text }]}>{message.name}</AppText>
            <AppText style={[styles.fileMeta, !mine && { color: colors.textMuted }]}>{message.meta} · toca para abrir</AppText>
          </View>
        </View>
      )}
      <AppText style={styles.time}>{message.time}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1, gap: 2 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: pagePadding,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  who: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  empty: { textAlign: 'center', marginTop: 24 },
  name: { fontFamily: fonts.uiSemiBold, fontSize: 15, color: colors.text },
  thread: { paddingHorizontal: pagePadding, paddingTop: 16, paddingBottom: 16, gap: 12 },
  day: { alignSelf: 'center', backgroundColor: colors.surface, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 3 },
  workout: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  workoutIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  workoutTitle: { fontFamily: fonts.uiSemiBold, fontSize: 14, color: colors.text },
  messageWrap: { gap: 4, maxWidth: '82%' },
  left: { alignSelf: 'flex-start', alignItems: 'flex-start' },
  right: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  bubble: { paddingHorizontal: 14, paddingVertical: 10 },
  bubbleMine: {
    backgroundColor: colors.volt,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 6,
  },
  bubbleTheirs: {
    backgroundColor: colors.surfaceRaised,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 18,
  },
  bubbleMineShape: { borderTopLeftRadius: 18, borderTopRightRadius: 18, borderBottomLeftRadius: 18, borderBottomRightRadius: 6 },
  bubbleTheirsShape: { borderTopLeftRadius: 18, borderTopRightRadius: 18, borderBottomLeftRadius: 6, borderBottomRightRadius: 18 },
  text: { fontFamily: fonts.ui, fontSize: 14, lineHeight: 20, color: colors.text },
  photoBubble: { backgroundColor: colors.surfaceRaised, paddingTop: 6, paddingHorizontal: 6, paddingBottom: 6, gap: 8 },
  photo: { width: 200, height: 140, borderRadius: 14 },
  caption: { fontFamily: fonts.ui, fontSize: 14, color: colors.text, paddingHorizontal: 8, paddingBottom: 4 },
  file: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingLeft: 10, paddingRight: 16, paddingVertical: 10 },
  fileIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(11,12,14,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileName: { fontFamily: fonts.uiSemiBold, fontSize: 13, color: colors.bg },
  fileMeta: { fontFamily: fonts.ui, fontSize: 11, color: colors.bg },
  time: { fontFamily: fonts.mono, fontSize: 10, color: colors.textMuted },
  composer: { paddingHorizontal: 16, paddingTop: 8 },
  input: {
    minHeight: 50,
    borderRadius: 25,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 6,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  inputText: {
    flex: 1,
    minHeight: 36,
    maxHeight: 110,
    paddingTop: 9,
    paddingBottom: 9,
    fontFamily: fonts.ui,
    fontSize: 14,
    color: colors.text,
  },
  send: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.volt,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
