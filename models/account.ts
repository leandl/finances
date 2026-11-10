import { validate as validateUuid } from "uuid";
import database from "@/infra/database";
import { NotFoundError, ValidationError } from "@/infra/errors";
import { PartialUnknown } from "@/infra/types";

const NAME_MAX_LENGTH = 30;

export type Account = {
  id: string;
  name: string;
  user_id: string;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
};

export type AccountBalance = {
  year: number;
  month: number;
  year_value: number; // saldo do ano em centavos
  month_value: number; // saldo do mês em centavos
};

export type AccountInputDTO = {
  name: string;
};

function validateName(name: unknown): string {
  if (typeof name !== "string" || name.trim().length === 0) {
    throw new ValidationError({
      message: "O nome da conta é obrigatório.",
      action: "Informe o nome da conta no campo `name`.",
    });
  }

  const trimmedName = name.trim();

  if (trimmedName.length > NAME_MAX_LENGTH) {
    throw new ValidationError({
      message: `O nome da conta deve ter no máximo ${NAME_MAX_LENGTH} caracteres.`,
      action: "Utilize um nome menor.",
    });
  }

  return trimmedName;
}

async function validateUniqueName(
  userId: string,
  name: string,
  ignoreAccountId: string | null = null,
) {
  const results = await database.query({
    text: `
    SELECT
      id
    FROM
      accounts
    WHERE
      user_id = $1 AND
      deleted_at IS NULL AND
      LOWER(name) = LOWER($2) AND
      ($3::uuid IS NULL OR id <> $3::uuid)
    LIMIT
      1
    ;`,
    values: [userId, name, ignoreAccountId],
  });

  if (results.rowCount > 0) {
    throw new ValidationError({
      message: "Você já possui uma conta com este nome.",
      action: "Utilize outro nome para realizar esta operação.",
    });
  }
}

function accountNotFound() {
  return new NotFoundError({
    message: "A conta informada não foi encontrada no sistema.",
    action: "Verifique se o id da conta está correto.",
  });
}

async function create(
  userId: string,
  input?: PartialUnknown<AccountInputDTO>,
): Promise<Account> {
  const name = validateName(input?.name);
  await validateUniqueName(userId, name);

  const results = await database.query({
    text: `
    INSERT INTO
      accounts (name, user_id)
    VALUES
      ($1, $2)
    RETURNING
      *
    ;`,
    values: [name, userId],
  });

  return results.rows[0];
}

async function findAllByUserId(userId: string): Promise<Account[]> {
  const results = await database.query({
    text: `
    SELECT
      *
    FROM
      accounts
    WHERE
      user_id = $1 AND
      deleted_at IS NULL
    ORDER BY
      created_at ASC
    ;`,
    values: [userId],
  });

  return results.rows;
}

async function findOneById(id: string): Promise<Account> {
  if (!validateUuid(id)) {
    throw accountNotFound();
  }

  const results = await database.query({
    text: `
    SELECT
      *
    FROM
      accounts
    WHERE
      id = $1 AND
      deleted_at IS NULL
    LIMIT
      1
    ;`,
    values: [id],
  });

  if (results.rowCount === 0) {
    throw accountNotFound();
  }

  return results.rows[0];
}

async function updateName(
  id: string,
  input?: PartialUnknown<AccountInputDTO>,
): Promise<Account> {
  const currentAccount = await findOneById(id);
  const name = validateName(input?.name);
  await validateUniqueName(currentAccount.user_id, name, currentAccount.id);

  const results = await database.query({
    text: `
    UPDATE
      accounts
    SET
      name = $2,
      updated_at = timezone('utc', now())
    WHERE
      id = $1
    RETURNING
      *
    ;`,
    values: [id, name],
  });

  return results.rows[0];
}

async function remove(id: string): Promise<Account> {
  const results = await database.query({
    text: `
    UPDATE
      accounts
    SET
      deleted_at = timezone('utc', now()),
      updated_at = timezone('utc', now())
    WHERE
      id = $1 AND
      deleted_at IS NULL
    RETURNING
      *
    ;`,
    values: [id],
  });

  if (results.rowCount === 0) {
    throw accountNotFound();
  }

  return results.rows[0];
}

async function getBalances(accountId: string): Promise<AccountBalance[]> {
  const results = await database.query({
    text: `
    SELECT
      l.year,
      s.month,
      l.value AS year_value,
      s.value AS month_value
    FROM
      accounting_ledgers l
      JOIN accounting_sub_ledgers s ON s.accounting_ledger_id = l.id
    WHERE
      l.account_id = $1
    ORDER BY
      l.year ASC,
      s.month ASC
    ;`,
    values: [accountId],
  });

  return results.rows;
}

const account = {
  create,
  findAllByUserId,
  findOneById,
  updateName,
  remove,
  getBalances,
  NAME_MAX_LENGTH,
};

export default account;
