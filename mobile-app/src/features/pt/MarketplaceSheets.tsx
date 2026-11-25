import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Checkbox } from '@/components/Checkbox';
import { Icon } from '@/components/Icon';
import { Sheet } from '@/components/Sheet';
import { haptics } from '@/lib/haptics';
import { colors, fonts } from '@/theme/tokens';

/** PT · Subscrição · ativar — price, billing day and card before paying. */
export function ActivateMarketplaceSheet({
  visible,
  onClose,
  onActivated,
}: {
  visible: boolean;
  onClose: () => void;
  onActivated: () => void;
}) {
  const [paying, setPaying] = useState(false);

  return (
    <Sheet
      visible={visible}
      onClose={paying ? () => undefined : onClose}
      accessibilityLabel="Aparecer no marketplace"
      header={
        <View style={styles.head}>
          <AppText variant="heading">Aparecer no marketplace</AppText>
          <AppText variant="label" tone="muted" style={styles.body}>
            Novos alunos de Lisboa e online podem encontrar-te e contratar-te pela app.
          </AppText>
        </View>
      }
    >
      <View style={styles.price}>
        <View style={styles.flex}>
          <AppText style={styles.priceTitle}>Subscrição mensal</AppText>
          <AppText variant="caption" tone="muted">
            Cobrada hoje e depois a cada dia 1
          </AppText>
        </View>
        <AppText style={styles.amount}>4,00 €</AppText>
      </View>
      <View style={styles.card}>
        <Icon name="card" size={22} />
        <View style={styles.flex}>
          <AppText variant="label">Cartão terminado em 4242</AppText>
          <AppText variant="caption" tone="muted">
            Pagamento seguro via Stripe
          </AppText>
        </View>
        <AppText variant="small" tone="muted" style={styles.medium}>
          Alterar
        </AppText>
      </View>
      {paying ? (
        <View style={styles.paying}>
          <ActivityIndicator color={colors.bg} />
        </View>
      ) : (
        <Button
          label="Confirmar e pagar 4 €/mês"
          height={54}
          onPress={() => {
            setPaying(true);
            // Stripe Billing isn't wired yet — simulate the round-trip.
            setTimeout(() => {
              setPaying(false);
              haptics.success();
              onActivated();
            }, 900);
          }}
        />
      )}
      <AppText variant="caption" tone="muted" style={styles.center}>
        Cancelas quando quiseres, sem multa. Recebes o recibo por email.
      </AppText>
    </Sheet>
  );
}

/** PT · Subscrição · cancelar — consequences, explicit acknowledgement, "Manter" first. */
export function CancelMarketplaceSheet({
  visible,
  students,
  onClose,
  onCancelled,
}: {
  visible: boolean;
  students: number;
  onClose: () => void;
  onCancelled: () => void;
}) {
  const [understood, setUnderstood] = useState(false);
  const consequences = [
    { text: 'Novos alunos deixam de te encontrar', keeps: false },
    { text: `Os teus ${students} alunos continuam contigo`, keeps: true },
    { text: 'Continuas a receber os pagamentos deles', keeps: true },
    { text: 'Podes voltar a ativar quando quiseres', keeps: true },
  ];
  const close = () => {
    setUnderstood(false);
    onClose();
  };

  return (
    <Sheet
      visible={visible}
      onClose={close}
      accessibilityLabel="Cancelar a subscrição"
      header={
        <View style={styles.head}>
          <AppText variant="heading">Cancelar a subscrição?</AppText>
          <AppText variant="label" tone="muted" style={styles.body}>
            Deixas de aparecer no marketplace a partir de 1 de dezembro.
          </AppText>
        </View>
      }
    >
      <View style={styles.list}>
        {consequences.map((c) => (
          <View key={c.text} style={styles.item}>
            <Icon name={c.keeps ? 'checkVolt' : 'close'} size={c.keeps ? 16 : 12} style={!c.keeps && styles.cross} />
            <AppText variant="label" style={styles.regular}>
              {c.text}
            </AppText>
          </View>
        ))}
      </View>
      <Checkbox
        checked={understood}
        onToggle={() => setUnderstood((v) => !v)}
        label="Percebi que deixo de estar visível no marketplace"
      />
      <Button label="Manter subscrição" height={54} onPress={close} />
      <Button
        label="Cancelar subscrição"
        variant="outline"
        height={54}
        disabled={!understood}
        onPress={() => {
          haptics.warning();
          setUnderstood(false);
          onCancelled();
        }}
      />
      <AppText variant="caption" tone="muted" style={styles.center}>
        O botão fica ativo depois de marcares a confirmação.
      </AppText>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  head: { gap: 6 },
  body: { fontFamily: fonts.ui, lineHeight: 20 },
  regular: { fontFamily: fonts.ui },
  medium: { fontFamily: fonts.uiMedium },
  center: { textAlign: 'center' },
  price: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surfaceRaised,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  priceTitle: { fontFamily: fonts.uiSemiBold, fontSize: 14, color: colors.text },
  amount: { fontFamily: fonts.monoMedium, fontSize: 18, color: colors.text },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    paddingLeft: 16,
    paddingRight: 14,
    paddingVertical: 12,
  },
  paying: { height: 54, borderRadius: 16, backgroundColor: colors.volt, alignItems: 'center', justifyContent: 'center' },
  list: { backgroundColor: colors.surfaceRaised, borderRadius: 16, padding: 14, gap: 10 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cross: { marginHorizontal: 2 },
});
