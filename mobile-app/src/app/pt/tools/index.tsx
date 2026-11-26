import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { SectionLabel } from '@/components/Surface';
import { ToolGrid } from '@/features/tools/components';
import { clientBody } from '@/features/tools/data';
import { StudentPicker } from '@/features/tools/StudentPicker';
import { useTrainer } from '@/features/pt/store';
import { useStudent } from '@/features/pt/useStudent';
import { ToolScreen } from '@/features/tools/ToolScreen';

/** PT · Ferramentas: calculadoras com os dados de um aluno. */
export default function TrainerTools() {
  const params = useLocalSearchParams<{ student?: string }>();
  const { students } = useTrainer();
  const [student, setStudent] = useState<string | null>(params.student ?? students[0]?.id ?? null);
  const { body } = useStudent(student ?? undefined);

  return (
    <ToolScreen
      title="Ferramentas"
      description="Calcula com as últimas medidas de cada aluno e envia-lhe o resultado pelo chat."
      top={
        <View style={styles.top}>
          <SectionLabel>Para quem?</SectionLabel>
          <StudentPicker students={students} value={student} onChange={setStudent} />
        </View>
      }
    >
      <ToolGrid
        body={body ?? clientBody}
        onOpen={(id) => router.push({ pathname: '/pt/tools/[id]', params: student ? { id, student } : { id } })}
      />
    </ToolScreen>
  );
}

const styles = StyleSheet.create({
  top: { gap: 10 },
});
