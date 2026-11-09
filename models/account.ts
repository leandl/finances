import { validate as validateUuid } from "uuid";
import database from "@/infra/database";
import { NotFoundError, ValidationError } from "@/infra/errors";

const NAME_MAX_LENGTH = 30;

export type Account = {
  id: string;
  name: string;
  user_id: string;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
};

export type AccountInputDTO = {
  name?: unknown;
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
  input?: AccountInputDTO,
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
  input?: AccountInputDTO,
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

const account = {
  create,
  findAllByUserId,
  findOneById,
  updateName,
  remove,
  NAME_MAX_LENGTH,
};

export default account;
