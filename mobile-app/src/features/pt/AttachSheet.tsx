import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Icon, type IconName } from '@/components/Icon';
import { PressableScale } from '@/components/PressableScale';
import { Sheet } from '@/components/Sheet';
import { colors, fonts } from '@/theme/tokens';

export type Attachment =
  | { kind: 'photo'; uri: string }
  | { kind: 'file'; name: string; meta: string }
  | { kind: 'workout'; title: string; detail: string };

export type AttachSource = 'camera' | 'photos' | 'file' | 'workout';

type AttachSheetProps = {
  visible: boolean;
  onClose: () => void;
  onAttach: (attachment: Attachment) => void;
  /** Which options to offer (students can't send workout cards). */
  sources?: AttachSource[];
};

function sizeLabel(bytes: number | undefined): string {
  if (!bytes) return '';
  return bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} MB` : `${Math.round(bytes / 1024)} KB`;
}

/** PT · Mensagens · anexar — camera, photos, file or a workout card. */
export function AttachSheet({ visible, onClose, onAttach, sources }: AttachSheetProps) {
  const pick = async (source: AttachSource) => {
    if (source === 'workout') {
      onAttach({ kind: 'workout', title: 'Treino B · Costas', detail: '6 exercícios · ~50 min · toca para abrir' });
      return;
    }
    if (source === 'file') {
      const result = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/*'], copyToCacheDirectory: false });
      if (result.canceled) return;
      const file = result.assets[0];
      const type = file.mimeType?.includes('pdf') ? 'PDF' : 'Imagem';
      onAttach({ kind: 'file', name: file.name, meta: [type, sizeLabel(file.size)].filter(Boolean).join(' · ') });
      return;
    }
    if (source === 'camera') {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) return;
    }
    const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.8 };
    const result =
      source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
    if (result.canceled) return;
    onAttach({ kind: 'photo', uri: result.assets[0].uri });
  };

  const allOptions: { id: AttachSource; label: string; icon: IconName }[] = [
    { id: 'camera', label: 'Câmara', icon: 'attachCamera' },
    { id: 'photos', label: 'Fotografias', icon: 'attachPhotos' },
    { id: 'file', label: 'Ficheiro', icon: 'attachFile' },
    { id: 'workout', label: 'Treino', icon: 'attachWorkout' },
  ];

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      accessibilityLabel="Enviar anexo"
      header={<AppText variant="subheading">Enviar</AppText>}
    >
      <View style={styles.options}>
        {allOptions.filter((o) => !sources || sources.includes(o.id)).map((option) => (
          <PressableScale
            key={option.id}
            wrapperStyle={styles.flex}
            style={styles.option}
            onPress={() => {
              onClose();
              // Let the sheet slide away before the system picker slides up.
              setTimeout(() => pick(option.id).catch(() => undefined), 320);
            }}
            accessibilityRole="button"
            accessibilityLabel={option.label}
          >
            <Icon name={option.icon} size={26} />
            <AppText style={styles.label}>{option.label}</AppText>
          </PressableScale>
        ))}
      </View>
      <AppText variant="caption" tone="muted" style={styles.note}>
        Fotos, vídeos curtos e PDF até 25 MB. O aluno recebe uma notificação.
      </AppText>
      <Button label="Cancelar" variant="outline" height={50} onPress={onClose} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  options: { flexDirection: 'row', gap: 10 },
  option: {
    alignItems: 'center',
    gap: 8,
    paddingTop: 16,
    paddingBottom: 14,
    borderRadius: 16,
    backgroundColor: colors.surfaceRaised,
  },
  label: { fontFamily: fonts.uiMedium, fontSize: 12, color: colors.text },
  note: { textAlign: 'center' },
});
