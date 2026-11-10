import { validate as validateUuid } from "uuid";
import database from "@/infra/database";
import { NotFoundError, ValidationError } from "@/infra/errors";
import { PartialUnknown } from "@/infra/types";

const DESCRIPTION_MAX_LENGTH = 100;
const MAX_VALUE_IN_CENTS = 2_147_483_647; // limite do `integer` do Postgres
const MIN_YEAR = 1900;
const TRANSACTION_TYPES = ["inbound", "outbound"] as const;

export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export type Transaction = {
  id: string;
  accounting_sub_ledger_id: string;
  account_id: string;
  type: TransactionType;
  value: number;
  description: string;
  occurred_on: string; // YYYY-MM-DD
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
};

export type TransactionCreateDTO = {
  type: TransactionType;
  value: number;
  description: string;
  occurred_on: string; // YYYY-MM-DD
};

export type TransactionUpdateDTO = {
  description: string;
};

export type TransactionMonthQuery = {
  year: number;
  month: number;
};

// `occurred_on` é `date`: o to_char evita o pg converter para Date (timezone).
const COLUMNS = `
  id,
  accounting_sub_ledger_id,
  account_id,
  type,
  value,
  description,
  to_char(occurred_on, 'YYYY-MM-DD') AS occurred_on,
  created_at,
  updated_at,
  deleted_at`;

function transactionNotFound() {
  return new NotFoundError({
    message: "A transação informada não foi encontrada no sistema.",
    action: "Verifique se o id da transação está correto.",
  });
}

function signedValue(type: TransactionType, value: number) {
  return type === "inbound" ? value : -value;
}

/* Validações (rodam ANTES de abrir a transação do banco, pois
   `database.transaction` converte qualquer erro que não seja NotFoundError
   em ServiceError 503). */

function validateType(type: unknown): TransactionType {
  if (!TRANSACTION_TYPES.includes(type as TransactionType)) {
    throw new ValidationError({
      message: "O tipo da transação é inválido.",
      action: "Informe `type` como `inbound` ou `outbound`.",
    });
  }

  return type as TransactionType;
}

function validateValue(value: unknown): number {
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value <= 0 ||
    value > MAX_VALUE_IN_CENTS
  ) {
    throw new ValidationError({
      message: "O valor da transação é inválido.",
      action: `Informe \`value\` como um inteiro positivo em centavos (máximo ${MAX_VALUE_IN_CENTS}).`,
    });
  }

  return value;
}

function validateDescription(description: unknown): string {
  if (typeof description !== "string" || description.trim().length === 0) {
    throw new ValidationError({
      message: "A descrição da transação é obrigatória.",
      action: "Informe a descrição no campo `description`.",
    });
  }

  const trimmedDescription = description.trim();

  if (trimmedDescription.length > DESCRIPTION_MAX_LENGTH) {
    throw new ValidationError({
      message: `A descrição deve ter no máximo ${DESCRIPTION_MAX_LENGTH} caracteres.`,
      action: "Utilize uma descrição menor.",
    });
  }

  return trimmedDescription;
}

function validateOccurredOn(value: PartialUnknown<string>) {
  const match =
    typeof value === "string" ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(value) : null;

  if (match) {
    const [, year, month, day] = match.map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));

    const isRealDate =
      year >= MIN_YEAR &&
      date.getUTCFullYear() === year &&
      date.getUTCMonth() === month - 1 &&
      date.getUTCDate() === day;

    if (isRealDate) {
      return { occurredOn: value as string, year, month };
    }
  }

  throw new ValidationError({
    message: "A data da transação é inválida.",
    action: "Informe `occurred_on` no formato YYYY-MM-DD com uma data real.",
  });
}

function parseIntegerParam(value: unknown): number {
  return typeof value === "string" && /^\d+$/.test(value) ? Number(value) : NaN;
}

function validateMonthQuery(query?: PartialUnknown<TransactionMonthQuery>) {
  const year = parseIntegerParam(query?.year);
  const month = parseIntegerParam(query?.month);

  if (!(year >= MIN_YEAR && year <= 9999) || !(month >= 1 && month <= 12)) {
    throw new ValidationError({
      message: "O ano ou o mês informado é inválido.",
      action: "Informe `year` (ex: 2026) e `month` (1 a 12) na query string.",
    });
  }

  return { year, month };
}

/* Operações */

async function create(
  accountId: string,
  input?: PartialUnknown<TransactionCreateDTO>,
): Promise<Transaction> {
  const type = validateType(input?.type);
  const value = validateValue(input?.value);
  const description = validateDescription(input?.description);
  const { occurredOn, year, month } = validateOccurredOn(input?.occurred_on);

  const delta = signedValue(type, value);

  return database.transaction(async (client) => {
    // Upsert atômico: cria o ledger (ano) se não existir e já soma o delta.
    const ledgerResult = await client.query({
      text: `
      INSERT INTO
        accounting_ledgers (account_id, year, value)
      VALUES
        ($1, $2, $3)
      ON CONFLICT
        (account_id, year)
      DO UPDATE SET
        value = accounting_ledgers.value + EXCLUDED.value,
        updated_at = timezone('utc', now())
      RETURNING
        id
      ;`,
      values: [accountId, year, delta],
    });

    // Idem para o sub ledger (mês).
    const subLedgerResult = await client.query({
      text: `
      INSERT INTO
        accounting_sub_ledgers (accounting_ledger_id, month, value)
      VALUES
        ($1, $2, $3)
      ON CONFLICT
        (accounting_ledger_id, month)
      DO UPDATE SET
        value = accounting_sub_ledgers.value + EXCLUDED.value,
        updated_at = timezone('utc', now())
      RETURNING
        id
      ;`,
      values: [ledgerResult.rows[0].id, month, delta],
    });

    const recordResult = await client.query({
      text: `
      INSERT INTO
        accounting_records
          (accounting_sub_ledger_id, account_id, type, value, description, occurred_on)
      VALUES
        ($1, $2, $3, $4, $5, $6)
      RETURNING
        ${COLUMNS}
      ;`,
      values: [
        subLedgerResult.rows[0].id,
        accountId,
        type,
        value,
        description,
        occurredOn,
      ],
    });

    return recordResult.rows[0];
  });
}

async function findAllByMonth(
  accountId: string,
  query?: PartialUnknown<TransactionMonthQuery>,
): Promise<Transaction[]> {
  const { year, month } = validateMonthQuery(query);

  const results = await database.query({
    text: `
    SELECT
      ${COLUMNS}
    FROM
      accounting_records
    WHERE
      account_id = $1 AND
      deleted_at IS NULL AND
      occurred_on >= make_date($2::int, $3::int, 1) AND
      occurred_on < make_date($2::int, $3::int, 1) + interval '1 month'
    ORDER BY
      occurred_on ASC,
      created_at ASC
    ;`,
    values: [accountId, year, month],
  });

  return results.rows;
}

async function updateDescription(
  accountId: string,
  id: string,
  input?: PartialUnknown<TransactionUpdateDTO>,
): Promise<Transaction> {
  if (!validateUuid(id)) {
    throw transactionNotFound();
  }

  const description = validateDescription(input?.description);

  const results = await database.query({
    text: `
    UPDATE
      accounting_records
    SET
      description = $3,
      updated_at = timezone('utc', now())
    WHERE
      id = $1 AND
      account_id = $2 AND
      deleted_at IS NULL
    RETURNING
      ${COLUMNS}
    ;`,
    values: [id, accountId, description],
  });

  if (results.rows.length === 0) {
    throw transactionNotFound();
  }

  return results.rows[0];
}

async function remove(accountId: string, id: string): Promise<Transaction> {
  if (!validateUuid(id)) {
    throw transactionNotFound();
  }

  return database.transaction(async (client) => {
    // Soft delete. O `deleted_at IS NULL` garante que não estorna duas vezes.
    const recordResult = await client.query({
      text: `
      UPDATE
        accounting_records
      SET
        deleted_at = timezone('utc', now()),
        updated_at = timezone('utc', now())
      WHERE
        id = $1 AND
        account_id = $2 AND
        deleted_at IS NULL
      RETURNING
        ${COLUMNS}
      ;`,
      values: [id, accountId],
    });

    if (recordResult.rows.length === 0) {
      throw transactionNotFound();
    }

    const removed: Transaction = recordResult.rows[0];
    const delta = signedValue(removed.type, removed.value);

    // Estorna o valor do sub ledger (mês) e do ledger (ano).
    const subLedgerResult = await client.query({
      text: `
      UPDATE
        accounting_sub_ledgers
      SET
        value = value - $2::integer,
        updated_at = timezone('utc', now())
      WHERE
        id = $1
      RETURNING
        accounting_ledger_id
      ;`,
      values: [removed.accounting_sub_ledger_id, delta],
    });

    await client.query({
      text: `
      UPDATE
        accounting_ledgers
      SET
        value = value - $2::integer,
        updated_at = timezone('utc', now())
      WHERE
        id = $1
      ;`,
      values: [subLedgerResult.rows[0].accounting_ledger_id, delta],
    });

    return removed;
  });
}

const transaction = {
  create,
  findAllByMonth,
  updateDescription,
  remove,
  DESCRIPTION_MAX_LENGTH,
};

export default transaction;
