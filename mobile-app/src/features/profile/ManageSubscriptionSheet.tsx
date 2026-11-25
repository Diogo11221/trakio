import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Checkbox } from '@/components/Checkbox';
import { Sheet } from '@/components/Sheet';
import { Pill } from '@/components/Surface';
import { haptics } from '@/lib/haptics';
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
export function ManageSubscriptionSheet({ visible, onClose, onCancelled }: Props) {
  const [understood, setUnderstood] = useState(false);

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
          <Pill label="Premium · ativo" tone="volt" />
          <AppText variant="heading">Gerir subscrição</AppText>
          <AppText variant="label" tone="muted" style={styles.body}>
            4,99 €/mês · próxima cobrança a 24 de dezembro no cartão terminado em 4242.
          </AppText>
        </View>
      }
    >
      <View style={styles.box}>
        <AppText variant="label">Se cancelares</AppText>
        <AppText variant="small" tone="muted" style={styles.body}>
          Manténs o Premium até 24 de dezembro. Depois deixas de poder registar refeições com IA; o teu diário fica
          guardado.
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
        disabled={!understood}
        onPress={() => {
          haptics.warning();
          setUnderstood(false);
          onCancelled();
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
