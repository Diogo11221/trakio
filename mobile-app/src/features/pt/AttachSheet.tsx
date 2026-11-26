import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Icon, type IconName } from '@/components/Icon';
import { PressableScale } from '@/components/PressableScale';
import { Sheet } from '@/components/Sheet';
import { colors, fonts } from '@/theme/tokens';

export type Attachment = { kind: 'photo'; uri: string } | { kind: 'file'; uri: string; name: string; mimeType: string };

export type AttachSource = 'camera' | 'photos' | 'file';

type AttachSheetProps = {
  visible: boolean;
  onClose: () => void;
  onAttach: (attachment: Attachment) => void;
  /** Which options to offer. */
  sources?: AttachSource[];
};

/** PT · Mensagens · anexar — camera, photos, file or a workout card. */
export function AttachSheet({ visible, onClose, onAttach, sources }: AttachSheetProps) {
  const pick = async (source: AttachSource) => {
    if (source === 'file') {
      // Copied to the cache so the upload can read it.
      const result = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/jpeg', 'image/png'], copyToCacheDirectory: true });
      if (result.canceled) return;
      const file = result.assets[0];
      onAttach({ kind: 'file', uri: file.uri, name: file.name, mimeType: file.mimeType ?? 'application/pdf' });
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
        Fotos (JPEG ou PNG) e PDF até 10 MB.
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
