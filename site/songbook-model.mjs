export function normalizeSongbookState(allIds, saved = {}) {
  const known = new Set(allIds);
  const removed = [...new Set(saved.removed ?? [])].filter((id) => known.has(id));
  const removedSet = new Set(removed);
  const savedOrder = [...new Set(saved.order ?? [])].filter((id) => known.has(id) && !removedSet.has(id));
  const missing = allIds.filter((id) => !removedSet.has(id) && !savedOrder.includes(id));
  return { order: [...savedOrder, ...missing], removed };
}

export function moveSketch(order, id, direction) {
  const next = [...order];
  const from = next.indexOf(id);
  const to = from + direction;
  if (from < 0 || to < 0 || to >= next.length) return next;
  [next[from], next[to]] = [next[to], next[from]];
  return next;
}

export function removeSketch(state, id) {
  return {
    order: state.order.filter((item) => item !== id),
    removed: [...new Set([...state.removed, id])]
  };
}
