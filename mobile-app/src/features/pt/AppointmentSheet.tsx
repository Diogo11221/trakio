import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { Sheet } from '@/components/Sheet';
import { TextField } from '@/components/TextField';
import { useTrainer } from '@/features/pt/store';
import { Stepper } from '@/features/workout/components/Stepper';
import { ApiError } from '@/lib/api';
import { haptics } from '@/lib/haptics';

const dayName = new Intl.DateTimeFormat('pt-PT', { weekday: 'short', day: 'numeric', month: 'short' });

function at(dayOffset: number, minutes: number): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + dayOffset);
  d.setMinutes(minutes);
  return d;
}

/** PT · Início · Marcar sessão — with a student or on its own (an assessment slot). */
export function AppointmentSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { students, addAppointment } = useTrainer();
  const [studentId, setStudentId] = useState<string | null>(null);
  const [dayOffset, setDayOffset] = useState(0);
  const [minutes, setMinutes] = useState(18 * 60);
  const [duration, setDuration] = useState(60);
  const [online, setOnline] = useState(false);
  const [title, setTitle] = useState('Sessão de treino');
  const [place, setPlace] = useState('');
  const [saving, setSaving] = useState(false);

  const when = at(dayOffset, minutes);
  const label = `${dayOffset === 0 ? 'Hoje' : dayOffset === 1 ? 'Amanhã' : dayName.format(when).replace('.', '')}`;
  const time = `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

  const save = async () => {
    if (!title.trim() || saving) return;
    setSaving(true);
    try {
      await addAppointment({ clientId: studentId, startsAt: when, durationMinutes: duration, title: title.trim(), place: place.trim(), online });
      haptics.success();
      onClose();
    } catch (e) {
      Alert.alert('Não foi possível marcar', e instanceof ApiError ? e.message : 'Tenta outra vez.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet visible={visible} onClose={onClose} accessibilityLabel="Marcar sessão" header={<AppText variant="heading">Marcar sessão</AppText>}>
      <AppText variant="small" tone="muted">
        Com quem
      </AppText>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        <Chip label="Sem aluno" selected={studentId === null} onPress={() => setStudentId(null)} />
        {students.map((s) => (
          <Chip key={s.id} label={s.name} selected={studentId === s.id} onPress={() => setStudentId(s.id)} />
        ))}
      </ScrollView>
      <View style={styles.row}>
        <View style={styles.flex}>
          <AppText variant="small" tone="muted">
            Dia
          </AppText>
          <Stepper value={label} unit="" onStep={(d) => setDayOffset((o) => Math.min(60, Math.max(0, o + d)))} accessibilityLabel="Dia" />
        </View>
        <View style={styles.flex}>
          <AppText variant="small" tone="muted">
            Hora
          </AppText>
          <Stepper value={time} unit="" onStep={(d) => setMinutes((m) => Math.min(22 * 60, Math.max(6 * 60, m + d * 15)))} accessibilityLabel="Hora" />
        </View>
      </View>
      <View style={styles.chipsWrap}>
        {[30, 45, 60, 90].map((m) => (
          <Chip key={m} label={`${m} min`} selected={duration === m} onPress={() => setDuration(m)} />
        ))}
        <Chip label="Presencial" selected={!online} onPress={() => setOnline(false)} />
        <Chip label="Online" selected={online} onPress={() => setOnline(true)} />
      </View>
      <TextField label="O quê" value={title} onChangeText={setTitle} maxLength={120} />
      {!online ? <TextField label="Onde" value={place} onChangeText={setPlace} placeholder="Ginásio, parque…" maxLength={120} /> : null}
      <Button label={saving ? 'A marcar…' : `Marcar · ${label}, ${time}`} height={54} disabled={saving || !title.trim()} onPress={save} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  chips: { gap: 8 },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  row: { flexDirection: 'row', gap: 12 },
  flex: { flex: 1, gap: 6 },
});
