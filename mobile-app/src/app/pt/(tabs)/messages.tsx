import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { AppText } from '@/components/AppText';
import { Icon } from '@/components/Icon';
import { Avatar } from '@/components/Avatar';
import { PressableScale } from '@/components/PressableScale';
import { Reveal, Screen } from '@/components/Screen';
import { lastMessagePreview } from '@/features/pt/data';
import { apiUrl } from '@/lib/api';
import { refreshAll } from '@/lib/refresh';
import { useChat } from '@/state/chat';
import { layoutGlide } from '@/theme/motion';
import { colors, fonts } from '@/theme/tokens';

/** PT · Mensagens. */
export default function Messages() {
  const { list: conversations } = useChat();
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const list = conversations.filter((c) => !q || c.other.name.toLowerCase().includes(q));

  return (
    <Screen gap={16} onRefresh={refreshAll}>
      <Reveal index={0}>
        <AppText variant="title">Mensagens</AppText>
      </Reveal>

      <Reveal index={1} style={styles.search}>
        <Icon name="search" size={16} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Procurar conversa"
          placeholderTextColor={colors.textMuted}
          selectionColor={colors.volt}
          keyboardAppearance="dark"
          style={styles.searchInput}
          accessibilityLabel="Procurar conversa"
        />
      </Reveal>

      <Reveal index={2}>
        {list.length === 0 ? (
          <AppText variant="small" tone="muted">
            As conversas aparecem quando um aluno te contrata.
          </AppText>
        ) : null}
        {list.map((conversation) => {
          const unread = conversation.unread > 0;
          return (
            <Animated.View key={conversation.id} layout={layoutGlide}>
              <PressableScale
                onPress={() => router.push({ pathname: '/pt/chat/[id]', params: { id: conversation.id } })}
                pressedScale={0.985}
                accessibilityLabel={`${conversation.other.name}${unread ? `, ${conversation.unread} por ler` : ''}`}
              >
                <View style={styles.row}>
                  <Avatar photoUri={conversation.other.photoUrl ? apiUrl(conversation.other.photoUrl) : null} size={48} name={conversation.other.name} />
                  <View style={styles.flex}>
                    <View style={styles.line}>
                      <AppText style={[styles.name, unread && styles.nameUnread]}>{conversation.other.name}</AppText>
                      <AppText variant="caption" tone={unread ? 'volt' : 'muted'}>
                        {conversation.last?.time ?? ''}
                      </AppText>
                    </View>
                    <View style={styles.line}>
                      <AppText
                        variant="small"
                        tone={unread ? 'default' : 'muted'}
                        numberOfLines={1}
                        style={styles.preview}
                      >
                        {lastMessagePreview(conversation.last)}
                      </AppText>
                      {unread ? (
                        <View style={styles.badge}>
                          <AppText style={styles.badgeText}>{conversation.unread}</AppText>
                        </View>
                      ) : null}
                    </View>
                  </View>
                </View>
              </PressableScale>
            </Animated.View>
          );
        })}
      </Reveal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 3 },
  search: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 14,
  },
  searchInput: { flex: 1, height: '100%', fontFamily: fonts.ui, fontSize: 14, color: colors.text },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  line: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  name: { fontFamily: fonts.uiMedium, fontSize: 15, color: colors.text },
  nameUnread: { fontFamily: fonts.uiSemiBold },
  preview: { flex: 1 },
  badge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.volt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontFamily: fonts.uiSemiBold, fontSize: 11, color: colors.bg },
});
