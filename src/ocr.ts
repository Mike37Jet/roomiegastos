import { createId } from './utils';

export type ParsedItem = { id: string; name: string; amount: number };

/**
 * Very simple parser: split text lines and pick the last number on each line as price.
 */
export function parseReceiptText(lines: string[]): ParsedItem[] {
  const items: ParsedItem[] = [];
  const amountRegex = /(-?\d+[.,]\d{2})/;

  lines
    .join('\n')
    .split(/\n+/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .forEach((line) => {
      const match = line.match(amountRegex);
      if (!match) return;
      const amount = Number(match[1].replace(',', '.'));
      if (!Number.isFinite(amount)) return;
      const name = line.replace(match[1], '').trim() || 'Item';
      items.push({
        id: createId(),
        name,
        amount,
      });
    });

  return items;
}
