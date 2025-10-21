export function monthsBetween(startYYYYMM: string, endYYYYMM: string) {
  const [sy, sm] = startYYYYMM.split('-').map(Number);
  const [ey, em] = endYYYYMM.split('-').map(Number);
  if (Number.isNaN(sy) || Number.isNaN(sm) || Number.isNaN(ey) || Number.isNaN(em)) {
    return [];
  }
  const out: string[] = [];
  let y = sy;
  let m = sm;
  while (y < ey || (y === ey && m <= em)) {
    const month = String(m).padStart(2, '0');
    out.push(`${y}-${month}`);
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return out;
}
