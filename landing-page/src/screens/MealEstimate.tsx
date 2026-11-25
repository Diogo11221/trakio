import styles from './MealEstimate.module.css';

const items = [
  { name: 'Frango grelhado', qty: '160 g', kcal: '264' },
  { name: 'Arroz branco', qty: '150 g', kcal: '195' },
  { name: 'Salada + azeite', qty: '90 g', kcal: '60' },
] as const;

/** The AI's editable estimate — nothing is saved before "Confirmar e gravar". Authored at 390 pt. */
export function MealEstimate() {
  return (
    <>
      <div className={styles.items}>
        {items.map((item) => (
          <div key={item.name} className={styles.item}>
            <span>{item.name}</span>
            <span className={styles.itemRight}>
              <span className={`mono ${styles.qty}`}>{item.qty}</span>
              <span className={`mono ${styles.kcal}`}>{item.kcal}</span>
            </span>
          </div>
        ))}
      </div>
      <div className={styles.total}>
        <span className={styles.totalValue}>
          <span className="mono">519</span>
          <span className="mono">kcal</span>
        </span>
        <span className={styles.macros}>Proteína 54 g · Hidratos 44 g · Gordura 13 g</span>
      </div>
      <div className={styles.actions}>
        <span className={styles.edit}>Editar</span>
        <span className={styles.confirm}>Confirmar e gravar</span>
      </div>
    </>
  );
}
