package com.trakio.core.common;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;

import org.junit.jupiter.api.Test;

/** Same numbers as the app's calculators (mobile-app/src/features/tools/calc.ts). */
class FormulasTest {

    @Test
    void oneRepMaxAveragesEpleyAndBrzycki() {
        assertThat(Formulas.oneRepMax(100, 1)).isEqualTo(100);
        // Epley 126.67, Brzycki 124.14 → 125.40
        assertThat(Formulas.oneRepMax(100, 8)).isCloseTo(125.40, within(0.01));
    }

    @Test
    void caloriesAndMacrosMatchTheApp() {
        double maintenance = Formulas.restingCalories(true, 78, 178, 29) * Formulas.activityFactor("MODERATE");
        int kcal = Formulas.caloriesForGoal(maintenance, "GAIN");
        assertThat(kcal).isEqualTo(2990);
        int[] macros = Formulas.macros(kcal, 78, "GAIN");
        assertThat(macros).containsExactly(140, 421, 83);
    }
}
