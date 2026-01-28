export function createId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createInviteCode() {
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${Date.now().toString(36)}${random}`.toUpperCase();
}

export function formatMoney(amount: number, currency: string) {
  const value = amount.toFixed(2);
  return `${currency} ${value}`;
}

export function parseAmount(value: string) {
  const cleaned = value.replace(/[^0-9.,-]/g, '');
  const hasComma = cleaned.includes(',');
  const hasDot = cleaned.includes('.');
  let normalized = cleaned;

  if (hasComma && hasDot) {
    const lastComma = cleaned.lastIndexOf(',');
    const lastDot = cleaned.lastIndexOf('.');
    const decimalIndex = Math.max(lastComma, lastDot);
    const integerPart = cleaned.slice(0, decimalIndex).replace(/[.,]/g, '');
    const decimalPart = cleaned.slice(decimalIndex + 1);
    normalized = `${integerPart}.${decimalPart}`;
  } else if (hasComma || hasDot) {
    const sep = hasComma ? ',' : '.';
    const parts = cleaned.split(sep);
    if (parts.length > 2) {
      normalized = parts.join('');
    } else if (parts.length === 2) {
      const [intPart, decPart] = parts;
      if (decPart.length > 0 && decPart.length <= 2) {
        normalized = `${intPart}.${decPart}`;
      } else {
        normalized = `${intPart}${decPart}`;
      }
    }
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}
