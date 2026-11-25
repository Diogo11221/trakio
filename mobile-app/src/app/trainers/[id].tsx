import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, ScrollView, Share, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { OptionCard } from '@/components/OptionCard';
import { Portrait } from '@/components/Portrait';
import { Reveal } from '@/components/Screen';
import { Sheet } from '@/components/Sheet';
import { Card, IconButton, SectionLabel } from '@/components/Surface';
import { trainers, type Package, type Trainer } from '@/features/marketplace/data';
import { haptics } from '@/lib/haptics';
import { colors, fonts, pagePadding } from '@/theme/tokens';

function priceLabel(pkg: Package) {
  return pkg.period === 'mês' ? `${pkg.price} €/mês` : `${pkg.price} €`;
}

/** Cliente · Perfil do PT e contratar. */
export default function TrainerProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const trainer = trainers.find((t) => t.id === id) ?? trainers[0];
  const [packageId, setPackageId] = useState(trainer.packages[0].id);
  const [confirming, setConfirming] = useState(false);
  const selected = trainer.packages.find((p) => p.id === packageId) ?? trainer.packages[0];

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 4, paddingBottom: 160 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.top}>
          <IconButton icon="chevronLeft" onPress={() => router.back()} accessibilityLabel="Voltar" />
          <IconButton
            icon="share"
            iconSize={16}
            accessibilityLabel="Partilhar perfil"
            onPress={() => Share.share({ message: `${trainer.name} no Trakio — ${trainer.specialties}` })}
          />
        </View>

        <Reveal index={0} style={styles.header}>
          <Portrait person={trainer.id} size={76} />
          <View style={styles.flex}>
            <View style={styles.nameRow}>
              <AppText style={styles.name}>{trainer.name}</AppText>
              {trainer.verified ? <Icon name="verified" size={14} /> : null}
            </View>
            <AppText variant="label" tone="muted" style={styles.regular}>
              {trainer.specialties}
            </AppText>
            <View style={styles.ratingRow}>
              <Icon name="starFilled" size={12} />
              <AppText variant="caption" tone="muted">
                {trainer.rating} ({trainer.reviews}) · {trainer.where}
              </AppText>
            </View>
          </View>
        </Reveal>

        <Reveal index={1}>
          <Card radius={16} style={styles.stats}>
            <Stat value={String(trainer.stats.students)} label="alunos ativos" mono />
            <View style={styles.divider} />
            <Stat value={trainer.stats.adherence} label="aderência média" mono />
            <View style={styles.divider} />
            <Stat value={trainer.stats.response} label="tempo de resposta" />
          </Card>
        </Reveal>

        <Reveal index={2}>
          <AppText variant="label" tone="muted" style={styles.bio}>
            {trainer.bio}
          </AppText>
        </Reveal>

        <Reveal index={3}>
          <SectionLabel>Pacotes</SectionLabel>
        </Reveal>

        <View style={styles.packages}>
          {trainer.packages.map((pkg, i) => (
            <Reveal key={pkg.id} index={4 + i}>
              <OptionCard
                compact
                title={pkg.name}
                description={pkg.description}
                selected={pkg.id === packageId}
                onPress={() => setPackageId(pkg.id)}
                trailing={
                  <View style={styles.priceRow}>
                    <AppText style={styles.price}>{pkg.price}€</AppText>
                    <AppText variant="overline" tone="muted" style={styles.regular}>
                      {pkg.period === 'mês' ? '/mês' : 'avulso'}
                    </AppText>
                  </View>
                }
              />
            </Reveal>
          ))}
        </View>
      </ScrollView>

      <LinearGradient
        colors={['rgba(11,12,14,0)', colors.bg, colors.bg]}
        locations={[0, 0.25, 1]}
        style={[styles.bottom, { paddingBottom: insets.bottom + 10 }]}
      >
        <Button label={`Contratar · ${priceLabel(selected)}`} height={54} onPress={() => setConfirming(true)} />
        <View style={styles.secure}>
          <Icon name="lock" size={12} />
          <AppText variant="overline" tone="muted" style={styles.regular}>
            Pagamento seguro via Stripe · cancela quando quiseres
          </AppText>
        </View>
      </LinearGradient>

      <HireSheet
        visible={confirming}
        trainer={trainer}
        pkg={selected}
        onClose={() => setConfirming(false)}
        onHired={() => {
          setConfirming(false);
          router.back();
        }}
      />
    </View>
  );
}

function Stat({ value, label, mono = false }: { value: string; label: string; mono?: boolean }) {
  return (
    <View style={styles.stat}>
      <AppText style={mono ? styles.statMono : styles.statText}>{value}</AppText>
      <AppText variant="overline" tone="muted" style={styles.regular}>
        {label}
      </AppText>
    </View>
  );
}

/** Explicit payment confirmation — package, price, card and billing date before anything is charged. */
function HireSheet({
  visible,
  trainer,
  pkg,
  onClose,
  onHired,
}: {
  visible: boolean;
  trainer: Trainer;
  pkg: Package;
  onClose: () => void;
  onHired: () => void;
}) {
  const [paying, setPaying] = useState(false);
  const recurring = pkg.period === 'mês';

  return (
    <Sheet
      visible={visible}
      onClose={paying ? () => undefined : onClose}
      accessibilityLabel="Confirmar contratação"
      header={
        <View style={styles.sheetHeader}>
          <Portrait person={trainer.id} size={44} />
          <View style={styles.flex}>
            <AppText variant="subheading">{pkg.name}</AppText>
            <AppText variant="small" tone="muted">
              com {trainer.name}
            </AppText>
          </View>
        </View>
      }
    >
      <View style={styles.summary}>
        <View style={styles.flex}>
          <AppText variant="label">Cartão terminado em 4242</AppText>
          <AppText variant="caption" tone="muted">
            {recurring ? 'Cobrado hoje e depois a cada dia 24' : 'Cobrado hoje, uma vez'}
          </AppText>
        </View>
        <AppText style={styles.amount}>{priceLabel(pkg)}</AppText>
      </View>
      {paying ? (
        <View style={styles.paying}>
          <ActivityIndicator color={colors.bg} />
        </View>
      ) : (
        <Button
          label={`Confirmar e pagar ${priceLabel(pkg)}`}
          height={54}
          onPress={() => {
            setPaying(true);
            // Stripe Connect isn't wired yet — simulate the round-trip.
            setTimeout(() => {
              setPaying(false);
              haptics.success();
              onHired();
            }, 900);
          }}
        />
      )}
      <AppText variant="caption" tone="muted" style={styles.center}>
        {recurring ? 'Cancelas quando quiseres, sem multa. ' : ''}Pagamento seguro via Stripe.
      </AppText>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: pagePadding, gap: 18 },
  flex: { flex: 1, gap: 4 },
  regular: { fontFamily: fonts.ui },
  center: { textAlign: 'center' },
  top: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: -8 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { fontFamily: fonts.display, fontSize: 24, letterSpacing: -0.48, color: colors.text },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  stats: { flexDirection: 'row' },
  stat: { flex: 1, alignItems: 'center', gap: 2, paddingVertical: 12 },
  statMono: { fontFamily: fonts.monoMedium, fontSize: 17, color: colors.text },
  statText: { fontFamily: fonts.uiMedium, fontSize: 13, color: colors.text, lineHeight: 22 },
  divider: { width: 1, backgroundColor: colors.border },
  bio: { fontFamily: fonts.ui, lineHeight: 21 },
  packages: { gap: 8 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 3 },
  price: { fontFamily: fonts.monoMedium, fontSize: 15, color: colors.text },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingTop: 24, paddingHorizontal: pagePadding, gap: 10 },
  secure: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  amount: { fontFamily: fonts.monoMedium, fontSize: 15, color: colors.text },
  paying: { height: 54, borderRadius: 16, backgroundColor: colors.volt, alignItems: 'center', justifyContent: 'center' },
});
