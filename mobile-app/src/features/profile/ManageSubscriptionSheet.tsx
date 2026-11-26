import { useEffect, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Checkbox } from '@/components/Checkbox';
import { Sheet } from '@/components/Sheet';
import { Pill } from '@/components/Surface';
import { ApiError, api } from '@/lib/api';
import type { SubscriptionDto } from '@/lib/apiTypes';
import { haptics } from '@/lib/haptics';
import { useSettings } from '@/state/settings';
import { colors, fonts } from '@/theme/tokens';

type Props = {
  visible: boolean;
  onClose: () => void;
  onCancelled: () => void;
};

/**
 * Cancelling a paid plan: consequences first, an explicit acknowledgement,
 * and "Manter" as the primary action — never a single switch.
 */
const longDate = new Intl.DateTimeFormat('pt-PT', { day: 'numeric', month: 'long' });

export function ManageSubscriptionSheet({ visible, onClose, onCancelled }: Props) {
  const [understood, setUnderstood] = useState(false);
  const [busy, setBusy] = useState(false);
  const [subscription, setSubscription] = useState<SubscriptionDto | null>(null);
  const { cancelPremium } = useSettings();

  useEffect(() => {
    if (!visible) return;
    api
      .get<SubscriptionDto[]>('/api/v1/me/subscriptions')
      .then((list) => setSubscription(list.find((s) => s.kind === 'premium') ?? null))
      .catch(() => undefined);
  }, [visible]);

  const end = subscription?.currentPeriodEnd ? longDate.format(new Date(subscription.currentPeriodEnd)) : 'ao fim do mês pago';
  const ending = subscription?.cancelAtPeriodEnd ?? false;

  const close = () => {
    setUnderstood(false);
    onClose();
  };

  return (
    <Sheet
      visible={visible}
      onClose={close}
      accessibilityLabel="Gerir subscrição"
      header={
        <View style={styles.header}>
          <Pill label={ending ? `Premium · até ${end}` : 'Premium · ativo'} tone="volt" />
          <AppText variant="heading">Gerir subscrição</AppText>
          <AppText variant="label" tone="muted" style={styles.body}>
            {ending ? `Cancelada: o Premium termina a ${end}.` : `4,99 €/mês · próxima cobrança a ${end}.`}
          </AppText>
        </View>
      }
    >
      <View style={styles.box}>
        <AppText variant="label">Se cancelares</AppText>
        <AppText variant="small" tone="muted" style={styles.body}>
          Manténs o Premium até {end}. Depois deixas de poder registar refeições com IA; o teu diário fica guardado.
        </AppText>
      </View>

      <Checkbox
        checked={understood}
        onToggle={() => setUnderstood((v) => !v)}
        label="Percebo que perco o registo com IA no fim do período."
      />

      <Button label="Manter Premium" height={54} onPress={close} />
      <Button
        label="Cancelar subscrição"
        variant="outline"
        height={50}
        disabled={!understood || busy || ending}
        onPress={async () => {
          haptics.warning();
          setBusy(true);
          try {
            await cancelPremium();
            setUnderstood(false);
            onCancelled();
          } catch (e) {
            Alert.alert('Não foi possível cancelar', e instanceof ApiError ? e.message : 'Tenta outra vez.');
          } finally {
            setBusy(false);
          }
        }}
      />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  header: { gap: 6 },
  body: { fontFamily: fonts.ui, lineHeight: 20 },
  box: { backgroundColor: colors.surfaceRaised, borderRadius: 16, padding: 14, gap: 6 },
});
