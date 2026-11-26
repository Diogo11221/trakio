import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { SectionLabel } from '@/components/Surface';
import { ToolGrid } from '@/features/tools/components';
import { clientBody } from '@/features/tools/data';
import { StudentPicker, useMeasuredStudents } from '@/features/tools/StudentPicker';
import { ToolScreen } from '@/features/tools/ToolScreen';

/** PT · Ferramentas: calculadoras com os dados de um aluno. */
export default function TrainerTools() {
  const params = useLocalSearchParams<{ student?: string }>();
  const measuredStudents = useMeasuredStudents();
  const initial = measuredStudents.find((s) => s.id === params.student)?.id ?? measuredStudents[0]?.id ?? 'miguel';
  const [student, setStudent] = useState<string>(initial);
  const selected = measuredStudents.find((s) => s.id === student);

  return (
    <ToolScreen
      title="Ferramentas"
      description="Calcula com as últimas medidas de cada aluno e envia-lhe o resultado pelo chat."
      top={
        <View style={styles.top}>
          <SectionLabel>Para quem?</SectionLabel>
          <StudentPicker value={student} onChange={setStudent} />
        </View>
      }
    >
      <ToolGrid
        body={selected?.body ?? clientBody}
        onOpen={(id) => router.push({ pathname: '/pt/tools/[id]', params: { id, student } })}
      />
    </ToolScreen>
  );
}

const styles = StyleSheet.create({
  top: { gap: 10 },
});
