/**
 * rpe.js — RPE の読み替え
 *
 * RPE（Rate of Perceived Exertion）は「あと何回挙げられたか」の裏返しで、
 *   RPE = 10 − 余力レップ数
 * と定義されている。RPE 8 なら、あと2回は挙げられた状態。
 *
 * 数字だけ出されても意味が分からないので、
 *   ・その値が「あと何回」なのか
 *   ・次にどうすべきか（上げる／適正／限界）
 * を必ず添える。筋肥大で狙うのは RPE 7〜9（余力1〜3回）。
 */

/** 選択肢。MAX は 1レップの測定で、重量ではなく成否を記録する */
export const RPE_OPTIONS = [
  { value: '',     label: '—',   note: '' },
  { value: '6',    label: '6',   note: 'あと4回' },
  { value: '6.5',  label: '6.5', note: '' },
  { value: '7',    label: '7',   note: 'あと3回' },
  { value: '7.5',  label: '7.5', note: '' },
  { value: '8',    label: '8',   note: 'あと2回' },
  { value: '8.5',  label: '8.5', note: '' },
  { value: '9',    label: '9',   note: 'あと1回' },
  { value: '9.5',  label: '9.5', note: '' },
  { value: '10',   label: '10',  note: '限界' },
  { value: 'MAX',  label: 'MAX', note: '1回だけの測定' }
];

/** その RPE が何を意味するか。表示しないときは null */
export function rpeHint(value) {
  if (value === 'MAX') return { tone: 'max', label: 'MAX', note: '1レップの測定' };
  const v = Number(value);
  if (!Number.isFinite(v) || !value) return null;
  const left = Math.max(0, 10 - v);
  const reps = left >= 1 ? `あと${left % 1 ? left.toFixed(1) : left}回` : '限界';
  if (v <= 7)  return { tone: 'up',  label: '上げる', note: `${reps}の余力。次は重量を足せます` };
  if (v <= 9)  return { tone: 'ok',  label: '適正',   note: `${reps}の余力。筋肥大はこのあたり` };
  return { tone: 'limit', label: '限界', note: 'これ以上は挙がらなかった状態' };
}

/** セット行の横に出す短いラベル。すべての値には付けない */
export function rpeChip(value) {
  const h = rpeHint(value);
  if (!h) return '';
  return `<span class="ll-rpe ll-rpe--${h.tone}" title="${h.note}">${h.label}</span>`;
}

/** MAX のときのレップは回数ではなく成否 */
export const isMaxSet = (s) => String(s?.rpe) === 'MAX';
