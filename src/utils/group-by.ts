/** Groups `items` by `key`, mapping each to `value`; preserves input order. */
export function groupBy<T, K, V = T>(
  items: readonly T[],
  key: (item: T) => K,
  value: (item: T) => V = (item) => item as unknown as V,
): Map<K, V[]> {
  const map = new Map<K, V[]>();
  for (const item of items) {
    const k = key(item);
    const list = map.get(k);
    if (list) {
      list.push(value(item));
    } else {
      map.set(k, [value(item)]);
    }
  }
  return map;
}
