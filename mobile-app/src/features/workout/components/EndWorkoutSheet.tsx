import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Sheet } from '@/components/Sheet';
import { fonts } from '@/theme/tokens';

type EndWorkoutSheetProps = {
  visible: boolean;
  doneSets: number;
  totalSets: number;
  onClose: () => void;
  onFinish: () => void;
  onLeave: () => void;
};

/** Back during a workout: keep going (primary), finish and see the summary, or leave and resume later. */
export function EndWorkoutSheet({ visible, doneSets, totalSets, onClose, onFinish, onLeave }: EndWorkoutSheetProps) {
  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      accessibilityLabel="Sair do treino"
      header={
        <View style={styles.header}>
          <AppText variant="heading">Sair do treino?</AppText>
          <AppText variant="label" tone="muted" style={styles.body}>
            Fizeste {doneSets} de {totalSets} séries. Podes terminar agora e ver o resumo, ou sair e continuar mais
            tarde.
          </AppText>
        </View>
      }
    >
      <Button label="Continuar a treinar" height={54} onPress={onClose} />
      <Button label="Terminar treino" variant="outline" height={50} onPress={onFinish} haptic="press" />
      <Button label="Sair e continuar depois" variant="ghost" height={44} onPress={onLeave} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  header: { gap: 6 },
  body: { fontFamily: fonts.ui, lineHeight: 20 },
});
