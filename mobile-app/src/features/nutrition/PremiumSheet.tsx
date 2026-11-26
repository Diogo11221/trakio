import { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { Sheet } from '@/components/Sheet';
import { Pill } from '@/components/Surface';
import { ApiError } from '@/lib/api';
import { haptics } from '@/lib/haptics';
import { useSettings } from '@/state/settings';
import { colors, fonts } from '@/theme/tokens';

const perks = [
  'Registo por foto, voz ou texto',
  'Pré-visualização editável antes de gravar',
  'O teu PT vê o diário completo',
];

type PremiumSheetProps = {
  visible: boolean;
  onClose: () => void;
  onActivated: () => void;
};

/**
 * Cliente · Ativar Premium. Paying is always an explicit confirmation with
 * price, card and billing date on screen — never a switch.
 */
export function PremiumSheet({ visible, onClose, onActivated }: PremiumSheetProps) {
  const [paying, setPaying] = useState(false);

  const { buyPremium } = useSettings();

  const confirm = async () => {
    setPaying(true);
    try {
      // Stripe Checkout opens in the browser; the server confirms the payment.
      const active = await buyPremium();
      setPaying(false);
      if (active) {
        haptics.success();
        onActivated();
      } else {
        Alert.alert('Pagamento por concluir', 'Quando o pagamento for confirmado, o Premium fica ativo.');
      }
    } catch (e) {
      setPaying(false);
      Alert.alert('Não foi possível pagar', e instanceof ApiError ? e.message : 'Tenta outra vez.');
    }
  };

  return (
    <Sheet
      visible={visible}
      onClose={paying ? () => undefined : onClose}
      accessibilityLabel="Ativar Premium"
      header={
        <View style={styles.header}>
          <Pill label="Premium" tone="volt" />
          <AppText variant="heading">Registo de refeições com IA</AppText>
          <AppText variant="label" tone="muted" style={styles.lead}>
            Fotografa, fala ou escreve o que comeste. A IA calcula os macros e tu confirmas.
          </AppText>
        </View>
      }
    >
      <View style={styles.perks}>
        {perks.map((perk) => (
          <View key={perk} style={styles.perk}>
            <Icon name="checkVolt" size={16} />
            <AppText variant="label" style={styles.perkText}>
              {perk}
            </AppText>
          </View>
        ))}
      </View>

      <View style={styles.price}>
        <View style={styles.flex}>
          <AppText variant="label">Pagamento com cartão (Stripe)</AppText>
          <AppText variant="caption" tone="muted">
            Cobrado hoje e depois todos os meses neste dia
          </AppText>
        </View>
        <AppText style={styles.amount}>4,99 €/mês</AppText>
      </View>

      {paying ? (
        <View style={styles.paying}>
          <ActivityIndicator color={colors.bg} />
        </View>
      ) : (
        <Button label="Confirmar e pagar 4,99 €/mês" height={54} onPress={confirm} />
      )}
      <AppText variant="caption" tone="muted" style={styles.footnote}>
        Cancelas quando quiseres, sem multa. Pagamento seguro via Stripe.
      </AppText>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  header: { gap: 6 },
  lead: { fontFamily: fonts.ui, lineHeight: 20 },
  perks: { backgroundColor: colors.surfaceRaised, borderRadius: 16, padding: 14, gap: 10 },
  perk: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  perkText: { fontFamily: fonts.ui },
  price: {
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
  paying: {
    height: 54,
    borderRadius: 16,
    backgroundColor: colors.volt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footnote: { textAlign: 'center' },
});
