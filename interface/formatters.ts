const MAX_VALUE_IN_CENTS = 2_147_483_647;

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function formatCurrency(cents: number) {
  return currencyFormatter.format(cents / 100);
}

/** "2026-03-15" -> "15/03/2026" (sem passar por Date, evita problemas de timezone) */
export function formatDate(isoDate: string) {
  const [year, month, day] = isoDate.split("-");
  return `${day}/${month}/${year}`;
}

/**
 * Converte o texto digitado em centavos.
 * Aceita "10", "10,5", "10,50", "1.234,56", "R$ 10,50" e "10.50".
 * Retorna null se for inválido, zero ou acima do limite da API.
 */
export function parseCurrencyToCents(input: string): number | null {
  const normalized = input.replace(/R\$|\s/g, "");

  const brazilian = /^(\d{1,3}(?:\.\d{3})+|\d+)(?:,(\d{1,2}))?$/.exec(
    normalized,
  );
  const dotDecimal = /^(\d+)\.(\d{1,2})$/.exec(normalized);
  const match = brazilian ?? dotDecimal;

  if (!match) {
    return null;
  }

  const units = Number(match[1].replace(/\./g, ""));
  const cents = Number((match[2] ?? "").padEnd(2, "0"));
  const total = units * 100 + cents;

  return total > 0 && total <= MAX_VALUE_IN_CENTS ? total : null;
}
