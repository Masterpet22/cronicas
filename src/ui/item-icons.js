export function itemIcon(item) {
  if (item.image) return `<img src="${item.image}" alt="" decoding="async">`;
  const path = item.category === "appearance" ? 'M8 3 3 6 1 11l4 2 2-4v12h10V9l2 4 4-2-2-5-5-3-4 3Z'
    : item.id === "axe" ? 'm8 22 8-19m-5 4c-4-3-7-1-8 3 4 3 7 3 10 1m2-5c4 1 6 3 6 7-4 1-7 0-9-2'
      : item.category === "weapons" ? 'm5 19 9-9m-5 8-3-3m6-3 2-8 6-2-2 6-6 4M3 21l3-3'
        : item.category === "consumables" ? 'M9 3h6m-5 0v5l-5 7a4 4 0 0 0 3 6h8a4 4 0 0 0 3-6l-5-7V3M6 15h12M12 12v6m-3-3h6'
          : item.category === "scrolls" ? 'M6 3h12v17H6zm0 0a3 3 0 0 0-3 3v2h3m12 12a3 3 0 0 0 3-3v-2h-3M9 8h6m-6 4h6m-6 4h4'
            : 'm12 2 8 10-8 10-8-10Zm0 5v10m-4-5h8';
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${path}"/></svg>`;
}
export const bagIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M8 5V4a4 4 0 0 1 8 0v1M5 9a7 7 0 0 1 14 0v12H5Zm0 4h14M9 10h6m-5 7h4"/></svg>';
