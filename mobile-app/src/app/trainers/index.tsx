import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { AppText } from '@/components/AppText';
import { Chip } from '@/components/Chip';
import { Icon } from '@/components/Icon';
import { Portrait } from '@/components/Portrait';
import { PressableScale } from '@/components/PressableScale';
import { Reveal, Screen } from '@/components/Screen';
import { IconButton } from '@/components/Surface';
import { cities, specialties, trainers, type City, type Specialty, type Trainer } from '@/features/marketplace/data';
import { layoutGlide } from '@/theme/motion';
import { colors, fonts, pagePadding } from '@/theme/tokens';

/** Cliente · Encontrar PT. */
export default function FindTrainer() {
  const [query, setQuery] = useState('');
  const [city, setCity] = useState<City>('Lisboa');
  const [focus, setFocus] = useState<Specialty | null>('Hipertrofia');

  const q = query.trim().toLowerCase();
  const results = trainers
    .filter((t) => t.cities.includes(city) || t.cities.includes('Online'))
    .filter((t) => !q || t.name.toLowerCase().includes(q) || t.specialties.toLowerCase().includes(q))
    // Specialty ranks matches first ("Relevância") rather than hiding everyone else.
    .sort((a, b) => Number(focus ? b.tags.includes(focus) : 0) - Number(focus ? a.tags.includes(focus) : 0));

  return (
    <Screen gap={16}>
      <Reveal index={0} style={styles.header}>
        <IconButton icon="chevronLeft" onPress={() => router.back()} accessibilityLabel="Voltar" />
        <AppText variant="title" style={styles.title}>
          Encontrar PT
        </AppText>
      </Reveal>

      <Reveal index={1} style={styles.search}>
        <Icon name="search" size={16} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Nome ou especialidade"
          placeholderTextColor={colors.textMuted}
          selectionColor={colors.volt}
          keyboardAppearance="dark"
          style={styles.searchInput}
          returnKeyType="search"
          accessibilityLabel="Pesquisar PT"
        />
      </Reveal>

      <Reveal index={2}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
          style={styles.bleed}
        >
          {cities.map((c) => (
            <Chip key={c} label={c} selected={city === c} onPress={() => setCity(c)} />
          ))}
        </ScrollView>
      </Reveal>
      <Reveal index={3} style={styles.chipsRow}>
        {specialties.map((s) => (
          <Chip
            key={s}
            label={s}
            kind="outline"
            selected={focus === s}
            onPress={() => setFocus(focus === s ? null : s)}
          />
        ))}
      </Reveal>

      <Reveal index={4} style={styles.resultsBar}>
        <AppText variant="overline" tone="muted">
          {results.length} PTs em {city}
        </AppText>
        <View style={styles.sort}>
          <AppText variant="caption" tone="muted" style={styles.sortText}>
            Relevância
          </AppText>
          <Icon name="chevronDown" size={12} />
        </View>
      </Reveal>

      <View style={styles.list}>
        {results.map((trainer, i) => (
          <Animated.View
            key={trainer.id}
            layout={layoutGlide}
            entering={FadeIn.delay(300 + i * 60)}
            exiting={FadeOut.duration(150)}
          >
            <TrainerCard trainer={trainer} />
          </Animated.View>
        ))}
        {results.length === 0 ? (
          <AppText variant="small" tone="muted" style={styles.empty}>
            Nenhum PT encontrado. Experimenta outra cidade ou pesquisa.
          </AppText>
        ) : null}
      </View>
    </Screen>
  );
}

function TrainerCard({ trainer }: { trainer: Trainer }) {
  return (
    <PressableScale
      onPress={() => router.push({ pathname: '/trainers/[id]', params: { id: trainer.id } })}
      pressedScale={0.98}
      accessibilityLabel={`${trainer.name}, ${trainer.specialties}, desde ${trainer.fromPrice} euros por mês`}
      style={styles.card}
    >
      <Portrait person={trainer.id} size={52} />
      <View style={styles.flex}>
        <View style={styles.nameRow}>
          <AppText style={styles.name}>{trainer.name}</AppText>
          {trainer.verified ? <Icon name="verified" size={14} /> : null}
        </View>
        <AppText variant="small" tone="muted">
          {trainer.specialties}
        </AppText>
        <View style={styles.ratingRow}>
          <Icon name="starFilled" size={12} />
          <AppText variant="caption" tone="muted">
            {trainer.rating} ({trainer.reviews}) · {trainer.where}
          </AppText>
        </View>
      </View>
      <View style={styles.price}>
        <AppText variant="overline" tone="muted" style={styles.priceFrom}>
          desde
        </AppText>
        <View style={styles.priceRow}>
          <AppText style={styles.priceValue}>{trainer.fromPrice}€</AppText>
          <AppText variant="overline" tone="muted" style={styles.priceFrom}>
            /mês
          </AppText>
        </View>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 3 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  title: { fontSize: 26, letterSpacing: -0.78 },
  search: {
    height: 46,
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
  bleed: { marginHorizontal: -pagePadding },
  chips: { gap: 8, paddingHorizontal: pagePadding },
  chipsRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  resultsBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sort: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  sortText: { fontFamily: fonts.uiMedium },
  list: { gap: 10 },
  empty: { textAlign: 'center', paddingVertical: 24 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    paddingLeft: 14,
    paddingRight: 16,
    paddingVertical: 14,
  },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { fontFamily: fonts.uiSemiBold, fontSize: 15, color: colors.text },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  price: { alignItems: 'flex-end' },
  priceFrom: { fontFamily: fonts.ui },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 2 },
  priceValue: { fontFamily: fonts.monoMedium, fontSize: 16, color: colors.text },
});
