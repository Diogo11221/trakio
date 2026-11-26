import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Share, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { OptionCard } from '@/components/OptionCard';
import { Avatar } from '@/components/Avatar';
import { Reveal } from '@/components/Screen';
import { Sheet } from '@/components/Sheet';
import { Card, IconButton, SectionLabel } from '@/components/Surface';
import { useTrainer, type Package, type Trainer } from '@/features/marketplace/data';
import { ApiError, api } from '@/lib/api';
import type { CheckoutDto } from '@/lib/apiTypes';
import * as WebBrowser from 'expo-web-browser';
import { haptics } from '@/lib/haptics';
import { useAuth } from '@/state/auth';
import { colors, fonts, pagePadding } from '@/theme/tokens';

function priceLabel(pkg: Package) {
  return pkg.period === 'mês' ? `${pkg.price} €/mês` : `${pkg.price} €`;
}

/** Cliente · Perfil do PT e contratar. */
export default function TrainerProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { trainer, missing } = useTrainer(id);
  const [packageId, setPackageId] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const { refresh } = useAuth();

  if (!trainer) {
    return (
      <View style={[styles.root, styles.loading, { paddingTop: insets.top + 4 }]}>
        <View style={styles.top}>
          <IconButton icon="chevronLeft" onPress={() => router.back()} accessibilityLabel="Voltar" />
        </View>
        {missing ? (
          <AppText variant="label" tone="muted" style={styles.center}>
            Este PT já não está disponível no marketplace.
          </AppText>
        ) : (
          <ActivityIndicator color={colors.volt} />
        )}
      </View>
    );
  }
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
          <Avatar photoUri={trainer.photoUri} size={76} name={trainer.name} />
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
                {trainer.rating ? `${trainer.rating} (${trainer.reviews})` : 'Sem avaliações'} · {trainer.where}
              </AppText>
            </View>
          </View>
        </Reveal>

        <Reveal index={1}>
          <Card radius={16} style={styles.stats}>
            <Stat value={String(trainer.students)} label="alunos ativos" mono />
            <View style={styles.divider} />
            <Stat value={trainer.rating ?? '—'} label="avaliação média" mono />
            <View style={styles.divider} />
            <Stat value={String(trainer.reviews)} label="avaliações" mono />
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
                selected={pkg.id === selected?.id}
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
        <Button
          label={selected ? `Contratar · ${priceLabel(selected)}` : 'Sem pacotes disponíveis'}
          height={54}
          disabled={!selected}
          onPress={() => setConfirming(true)}
        />
        <View style={styles.secure}>
          <Icon name="lock" size={12} />
          <AppText variant="overline" tone="muted" style={styles.regular}>
            Pagamento seguro via Stripe · cancela quando quiseres
          </AppText>
        </View>
      </LinearGradient>

      {selected ? (
        <HireSheet
          visible={confirming}
          trainer={trainer}
          pkg={selected}
          onClose={() => setConfirming(false)}
          onHired={async () => {
            setConfirming(false);
            // The link to the PT exists only once the payment is confirmed on the server.
            const account = await refresh();
            if (account?.profile?.kind === 'client' && account.profile.trainer) router.replace('/chat');
            else Alert.alert('Pagamento por concluir', 'Quando o pagamento for confirmado, a conversa com o PT abre aqui.');
          }}
        />
      ) : null}
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
          <Avatar photoUri={trainer.photoUri} size={44} name={trainer.name} />
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
          <AppText variant="label">Pagamento com cartão (Stripe)</AppText>
          <AppText variant="caption" tone="muted">
            {recurring ? 'Cobrado hoje · cobre o próximo mês' : 'Cobrado hoje, uma vez'}
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
          onPress={async () => {
            setPaying(true);
            try {
              const checkout = await api.post<CheckoutDto>(`/api/v1/trainers/${trainer.id}/hire`, { packageId: pkg.id });
              if (checkout.status === 'pending' && checkout.url) await WebBrowser.openBrowserAsync(checkout.url);
              haptics.success();
              onHired();
            } catch (e) {
              Alert.alert('Não foi possível contratar', e instanceof ApiError ? e.message : 'Tenta outra vez.');
            } finally {
              setPaying(false);
            }
          }}
        />
      )}
      <AppText variant="caption" tone="muted" style={styles.center}>
        {recurring ? 'Sem fidelização: decides todos os meses. ' : ''}Pagamento seguro via Stripe.
      </AppText>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  loading: { paddingHorizontal: pagePadding, gap: 40 },
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
