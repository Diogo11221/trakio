/**
 * Small local food table (per 100 g, Portuguese food composition values,
 * rounded) and a parser for what people type: "2 ovos, 150 g de frango e
 * arroz". Stands in for backend-ai until meal recognition runs on the server.
 */

export type Food = {
  id: string;
  name: string;
  /** Lower-case words that point to this food (singular and plural). */
  aliases: string[];
  per100: { kcal: number; protein: number; carbs: number; fat: number };
  /** Grams in one "unit" ("2 ovos", "1 banana") and in a default portion. */
  unitGrams: number;
  portionGrams: number;
};

const f = (
  id: string,
  name: string,
  aliases: string[],
  kcal: number,
  protein: number,
  carbs: number,
  fat: number,
  unitGrams: number,
  portionGrams = unitGrams,
): Food => ({ id, name, aliases, per100: { kcal, protein, carbs, fat }, unitGrams, portionGrams });

export const foods: Food[] = [
  f('frango', 'Frango grelhado', ['frango', 'peito de frango', 'galinha'], 165, 31, 0, 3.6, 150),
  f('peru', 'Peru grelhado', ['peru'], 150, 30, 0, 2, 150),
  f('vaca', 'Carne de vaca', ['vaca', 'bife', 'carne'], 220, 26, 0, 13, 150),
  f('porco', 'Lombo de porco', ['porco', 'lombo'], 190, 28, 0, 8, 150),
  f('salmao', 'Salmão', ['salmão', 'salmao'], 208, 20, 0, 13, 150),
  f('atum', 'Atum em lata', ['atum'], 116, 26, 0, 1, 80),
  f('bacalhau', 'Bacalhau cozido', ['bacalhau'], 105, 23, 0, 1, 180),
  f('pescada', 'Pescada', ['pescada', 'peixe'], 90, 19, 0, 1.3, 180),
  f('ovo', 'Ovo', ['ovo', 'ovos'], 143, 12.6, 0.7, 9.5, 55),
  f('claras', 'Claras de ovo', ['clara', 'claras'], 52, 11, 0.7, 0.2, 33, 100),
  f('arroz', 'Arroz branco', ['arroz'], 130, 2.7, 28, 0.3, 150),
  f('massa', 'Massa cozida', ['massa', 'esparguete', 'macarrão', 'macarrao'], 158, 5.8, 31, 0.9, 180),
  f('batata', 'Batata cozida', ['batata', 'batatas'], 87, 1.9, 20, 0.1, 150, 200),
  f('batata-doce', 'Batata-doce', ['batata-doce', 'batata doce'], 90, 2, 21, 0.2, 150, 200),
  f('pao', 'Pão', ['pão', 'pao', 'papo-seco', 'carcaça', 'carcaca'], 265, 9, 49, 3.2, 50),
  f('torrada', 'Torrada', ['torrada', 'torradas', 'tosta', 'tostas'], 400, 12, 75, 5, 15, 30),
  f('aveia', 'Flocos de aveia', ['aveia', 'flocos de aveia', 'papas de aveia'], 380, 13, 60, 7, 40),
  f('iogurte-grego', 'Iogurte grego', ['iogurte grego', 'grego'], 97, 9, 4, 5, 125),
  f('iogurte', 'Iogurte natural', ['iogurte', 'iogurtes'], 61, 3.5, 4.7, 3.3, 125),
  f('skyr', 'Skyr', ['skyr'], 63, 11, 4, 0.2, 150),
  f('leite', 'Leite meio-gordo', ['leite'], 47, 3.3, 4.8, 1.6, 250),
  f('queijo', 'Queijo flamengo', ['queijo'], 350, 26, 0, 27, 20, 40),
  f('queijo-fresco', 'Queijo fresco', ['queijo fresco', 'requeijão', 'requeijao'], 160, 11, 3, 11, 60),
  f('fiambre', 'Fiambre de peru', ['fiambre'], 105, 18, 2, 2.5, 20, 40),
  f('banana', 'Banana', ['banana', 'bananas'], 89, 1.1, 23, 0.3, 120),
  f('maca', 'Maçã', ['maçã', 'maca', 'maçãs', 'macas'], 52, 0.3, 14, 0.2, 150),
  f('laranja', 'Laranja', ['laranja', 'laranjas'], 47, 0.9, 12, 0.1, 160),
  f('morangos', 'Morangos', ['morango', 'morangos'], 32, 0.7, 7.7, 0.3, 12, 150),
  f('frutos-vermelhos', 'Frutos vermelhos', ['frutos vermelhos', 'mirtilos'], 50, 0.8, 11, 0.4, 100),
  f('salada', 'Salada', ['salada', 'alface', 'legumes', 'brócolos', 'brocolos'], 25, 1.5, 4, 0.3, 100),
  f('azeite', 'Azeite', ['azeite'], 884, 0, 0, 100, 10),
  f('manteiga-amendoim', 'Manteiga de amendoim', ['manteiga de amendoim', 'amendoim'], 590, 25, 20, 50, 15, 20),
  f('manteiga', 'Manteiga', ['manteiga'], 717, 0.9, 0.1, 81, 10),
  f('frutos-secos', 'Frutos secos', ['nozes', 'amêndoas', 'amendoas', 'frutos secos', 'cajus'], 600, 18, 15, 52, 30),
  f('feijao', 'Feijão cozido', ['feijão', 'feijao', 'grão', 'grao', 'lentilhas'], 125, 8, 20, 0.6, 150),
  f('whey', 'Proteína em pó', ['whey', 'proteína', 'proteina', 'batido de proteína', 'batido'], 380, 78, 8, 5, 30),
  f('chocolate', 'Chocolate negro', ['chocolate'], 550, 7, 45, 38, 10, 20),
  f('pizza', 'Pizza', ['pizza'], 266, 11, 33, 10, 110, 330),
  f('hamburguer', 'Hambúrguer', ['hambúrguer', 'hamburguer'], 250, 17, 0, 20, 120),
  f('sopa', 'Sopa de legumes', ['sopa'], 40, 1.5, 6, 1, 300),
  f('cafe', 'Café', ['café', 'cafe', 'bica', 'expresso'], 2, 0.1, 0, 0, 30),
  f('sumo', 'Sumo de laranja', ['sumo'], 45, 0.7, 10, 0.2, 250),
  f('cerveja', 'Cerveja', ['cerveja', 'imperial', 'fino'], 43, 0.5, 3.6, 0, 330),
];

export type FoodItem = {
  id: string;
  name: string;
  grams: number;
  /** Per-gram values so the grams can be edited after parsing. */
  per: { kcal: number; protein: number; carbs: number; fat: number };
};

export function itemFrom(food: Food, grams: number): FoodItem {
  const p = food.per100;
  return {
    id: food.id,
    name: food.name,
    grams,
    per: { kcal: p.kcal / 100, protein: p.protein / 100, carbs: p.carbs / 100, fat: p.fat / 100 },
  };
}

export function totals(items: FoodItem[]): { kcal: number; protein: number; carbs: number; fat: number } {
  const sum = (key: keyof FoodItem['per']) => Math.round(items.reduce((s, i) => s + i.grams * i.per[key], 0));
  return { kcal: sum('kcal'), protein: sum('protein'), carbs: sum('carbs'), fat: sum('fat') };
}

const NUMBER_WORDS: Record<string, number> = {
  um: 1, uma: 1, dois: 2, duas: 2, três: 3, tres: 3, quatro: 4, cinco: 5, seis: 6, meio: 0.5, meia: 0.5,
};

function normalise(text: string): string {
  return text.toLowerCase().replace(/\s+/g, ' ').trim();
}

/** Longest alias first so "iogurte grego" wins over "iogurte". */
const aliasIndex = foods
  .flatMap((food) => food.aliases.map((alias) => ({ alias, food })))
  .sort((a, b) => b.alias.length - a.alias.length);

/**
 * "2 ovos, 150 g de frango e arroz com azeite" →
 * Ovo 110 g, Frango 150 g, Arroz 150 g, Azeite 10 g. Unknown pieces are returned too.
 */
export function parseMeal(text: string): { items: FoodItem[]; unknown: string[] } {
  const parts = normalise(text)
    .split(/,|;|\+|\be\b|\bcom\b|\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  const items: FoodItem[] = [];
  const unknown: string[] = [];

  for (const part of parts) {
    const match = aliasIndex.find(({ alias }) => new RegExp(`(^|\\W)${alias}(\\W|$)`).test(part));
    if (!match) {
      unknown.push(part);
      continue;
    }
    const { food } = match;
    const grams = /(\d+(?:[.,]\d+)?)\s*(g|gr|gramas|ml)\b/.exec(part);
    const kilos = /(\d+(?:[.,]\d+)?)\s*(kg|l|litro|litros)\b/.exec(part);
    const count = /^(\d+(?:[.,]\d+)?)\s/.exec(part) ?? null;
    const word = part.split(' ')[0] ?? '';
    let amount = food.portionGrams;
    if (grams) amount = Number(grams[1]!.replace(',', '.'));
    else if (kilos) amount = Number(kilos[1]!.replace(',', '.')) * 1000;
    else if (count) amount = Number(count[1]!.replace(',', '.')) * food.unitGrams;
    else if (NUMBER_WORDS[word] !== undefined) amount = NUMBER_WORDS[word]! * food.unitGrams;

    const index = items.findIndex((i) => i.id === food.id);
    if (index >= 0) items[index] = { ...items[index]!, grams: items[index]!.grams + Math.round(amount) };
    else items.push(itemFrom(food, Math.round(amount)));
  }
  return { items, unknown };
}
