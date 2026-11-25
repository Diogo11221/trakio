import { useEffect, type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { haptics } from '@/lib/haptics';
import { easeOut } from '@/theme/motion';
import { colors } from '@/theme/tokens';

type ReorderableListProps<T extends { id: string }> = {
  items: T[];
  renderItem: (item: T, index: number) => ReactNode;
  onReorder: (from: number, to: number) => void;
  style?: StyleProp<ViewStyle>;
};

/**
 * Long-press a row and drag it to a new place. Rows can have different (and
 * changing) heights — e.g. an exercise that expands to show its editor — so
 * every row is measured and the others glide out of the way.
 */
export function ReorderableList<T extends { id: string }>({ items, renderItem, onReorder, style }: ReorderableListProps<T>) {
  const ids = items.map((i) => i.id);
  const key = ids.join('|');
  const order = useSharedValue<string[]>(ids);
  const heights = useSharedValue<Record<string, number>>({});
  const dragging = useSharedValue<string | null>(null);

  useEffect(() => {
    order.set(key.split('|'));
  }, [key, order]);

  const containerStyle = useAnimatedStyle(() => {
    const h = heights.get();
    let total = 0;
    for (const id of order.get()) total += h[id] ?? 0;
    return { height: withTiming(total, { duration: 220, easing: easeOut }) };
  });

  return (
    <Animated.View style={[styles.container, style, containerStyle]}>
      {items.map((item, index) => (
        <Row
          key={item.id}
          id={item.id}
          order={order}
          heights={heights}
          dragging={dragging}
          onDrop={(from, to) => {
            if (from !== to) onReorder(from, to);
          }}
        >
          {renderItem(item, index)}
        </Row>
      ))}
    </Animated.View>
  );
}

function topOf(id: string, list: string[], h: Record<string, number>): number {
  'worklet';
  let y = 0;
  for (const other of list) {
    if (other === id) return y;
    y += h[other] ?? 0;
  }
  return y;
}

function Row({
  id,
  order,
  heights,
  dragging,
  onDrop,
  children,
}: {
  id: string;
  order: SharedValue<string[]>;
  heights: SharedValue<Record<string, number>>;
  dragging: SharedValue<string | null>;
  onDrop: (from: number, to: number) => void;
  children: ReactNode;
}) {
  const startTop = useSharedValue(0);
  const startIndex = useSharedValue(0);
  const dy = useSharedValue(0);
  const lift = useSharedValue(0);

  const pan = usePanGesture({
    activateAfterLongPress: 280,
    onActivate: () => {
      'worklet';
      const list = order.get();
      startIndex.set(list.indexOf(id));
      startTop.set(topOf(id, list, heights.get()));
      dy.set(0);
      dragging.set(id);
      lift.set(withTiming(1, { duration: 140 }));
      scheduleOnRN(haptics.press);
    },
    onUpdate: (e) => {
      'worklet';
      dy.set(e.translationY);
      const h = heights.get();
      const list = order.get();
      const myHeight = h[id] ?? 0;
      const center = startTop.get() + e.translationY + myHeight / 2;
      // Walk the other rows; drop before the first one whose middle is below our centre.
      const others = list.filter((o) => o !== id);
      let y = 0;
      let target = others.length;
      for (let i = 0; i < others.length; i++) {
        const oh = h[others[i]] ?? 0;
        if (center < y + oh / 2) {
          target = i;
          break;
        }
        y += oh;
      }
      if (list.indexOf(id) !== target) {
        const next = [...others];
        next.splice(target, 0, id);
        order.set(next);
        scheduleOnRN(haptics.tick);
      }
    },
    onFinalize: () => {
      'worklet';
      if (dragging.get() !== id) return;
      const to = order.get().indexOf(id);
      dragging.set(null);
      lift.set(withTiming(0, { duration: 180 }));
      scheduleOnRN(haptics.tap);
      scheduleOnRN(onDrop, startIndex.get(), to);
    },
  });

  const rowStyle = useAnimatedStyle(() => {
    const h = heights.get();
    const measured = h[id] !== undefined;
    const isDragging = dragging.get() === id;
    const top = isDragging
      ? startTop.get() + dy.get()
      : withTiming(topOf(id, order.get(), h), { duration: 220, easing: easeOut });
    return {
      opacity: measured ? 1 : 0,
      top,
      zIndex: isDragging ? 10 : 0,
      transform: [{ scale: 1 + lift.get() * 0.02 }],
      shadowOpacity: lift.get() * 0.45,
    };
  });

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[styles.row, rowStyle]}>
        <View
          onLayout={(e) => {
            const height = Math.round(e.nativeEvent.layout.height);
            heights.set({ ...heights.get(), [id]: height });
          }}
        >
          {children}
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: { position: 'relative' },
  row: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 18,
  },
});
