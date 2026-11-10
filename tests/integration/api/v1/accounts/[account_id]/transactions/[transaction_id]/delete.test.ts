import database from "@/infra/database";
import webserver from "@/infra/webserver";
import orchestrator from "tests/orchestrator";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

const NOT_FOUND_BODY = {
  name: "NotFoundError",
  message: "A transação informada não foi encontrada no sistema.",
  action: "Verifique se o id da transação está correto.",
  status_code: 404,
};

function deleteTransaction(
  accountId: string,
  transactionId: string,
  token?: string,
) {
  return fetch(
    `${webserver.origin}/api/v1/accounts/${accountId}/transactions/${transactionId}`,
    {
      method: "DELETE",
      headers: token ? { Cookie: `session_id=${token}` } : {},
    },
  );
}

describe("DELETE /api/v1/accounts/[account_id]/transactions/[transaction_id]", () => {
  describe("Anonymous user", () => {
    test("Removing a transaction", async () => {
      const response = await deleteTransaction(
        "e67be663-c904-41d5-9bc9-11d353d45499",
        "e67be663-c904-41d5-9bc9-11d353d45499",
      );

      expect(response.status).toBe(403);
      expect(await response.json()).toEqual({
        name: "ForbiddenError",
        message: "Você não possui permissão para executar esta ação.",
        action:
          'Verifique se o seu usuário possui a feature "delete:transaction"',
        status_code: 403,
      });
    });
  });

  describe("Default user", () => {
    test("With own transaction", async () => {
      const { user, session } = await orchestrator.createAuthenticatedUser();
      const createdAccount = await orchestrator.createAccount(user.id);
      const createdTransaction = await orchestrator.createTransaction(
        createdAccount.id,
        { type: "outbound", value: 4200, description: "Remover" },
      );

      const response = await deleteTransaction(
        createdAccount.id,
        createdTransaction.id,
        session.token,
      );

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({
        id: createdTransaction.id,
        account_id: createdAccount.id,
        type: "outbound",
        value: 4200,
        description: "Remover",
        occurred_on: createdTransaction.occurred_on,
        created_at: createdTransaction.created_at.toISOString(),
        updated_at: expect.any(String),
      });

      // Soft delete: a linha continua no banco
      const results = await database.query({
        text: "SELECT deleted_at FROM accounting_records WHERE id = $1;",
        values: [createdTransaction.id],
      });
      expect(results.rowCount).toBe(1);
      expect(results.rows[0].deleted_at).not.toBeNull();
    });

    test("Reverting the balances", async () => {
      const { user, session } = await orchestrator.createAuthenticatedUser();
      const createdAccount = await orchestrator.createAccount(user.id);

      const inbound = await orchestrator.createTransaction(createdAccount.id, {
        type: "inbound",
        value: 10000,
      });
      const outbound = await orchestrator.createTransaction(createdAccount.id, {
        type: "outbound",
        value: 2500,
      });
      const nextMonth = await orchestrator.createTransaction(
        createdAccount.id,
        { type: "inbound", value: 700, occurred_on: "2026-04-01" },
      );

      expect(await orchestrator.getAccountBalances(createdAccount.id)).toEqual([
        { year: 2026, month: 3, year_value: 8200, month_value: 7500 },
        { year: 2026, month: 4, year_value: 8200, month_value: 700 },
      ]);

      await deleteTransaction(createdAccount.id, outbound.id, session.token);
      expect(await orchestrator.getAccountBalances(createdAccount.id)).toEqual([
        { year: 2026, month: 3, year_value: 10700, month_value: 10000 },
        { year: 2026, month: 4, year_value: 10700, month_value: 700 },
      ]);

      await deleteTransaction(createdAccount.id, inbound.id, session.token);
      await deleteTransaction(createdAccount.id, nextMonth.id, session.token);
      expect(await orchestrator.getAccountBalances(createdAccount.id)).toEqual([
        { year: 2026, month: 3, year_value: 0, month_value: 0 },
        { year: 2026, month: 4, year_value: 0, month_value: 0 },
      ]);
    });

    test("With already deleted transaction", async () => {
      const { user, session } = await orchestrator.createAuthenticatedUser();
      const createdAccount = await orchestrator.createAccount(user.id);
      const createdTransaction = await orchestrator.createTransaction(
        createdAccount.id,
        { type: "inbound", value: 1000 },
      );

      const response1 = await deleteTransaction(
        createdAccount.id,
        createdTransaction.id,
        session.token,
      );
      expect(response1.status).toBe(200);

      const response2 = await deleteTransaction(
        createdAccount.id,
        createdTransaction.id,
        session.token,
      );
      expect(response2.status).toBe(404);
      expect(await response2.json()).toEqual(NOT_FOUND_BODY);

      // Não estorna duas vezes
      expect(await orchestrator.getAccountBalances(createdAccount.id)).toEqual([
        { year: 2026, month: 3, year_value: 0, month_value: 0 },
      ]);
    });

    test("With nonexistent transaction", async () => {
      const { user, session } = await orchestrator.createAuthenticatedUser();
      const createdAccount = await orchestrator.createAccount(user.id);

      const response = await deleteTransaction(
        createdAccount.id,
        "e67be663-c904-41d5-9bc9-11d353d45499",
        session.token,
      );

      expect(response.status).toBe(404);
      expect(await response.json()).toEqual(NOT_FOUND_BODY);
    });

    test("With invalid id", async () => {
      const { user, session } = await orchestrator.createAuthenticatedUser();
      const createdAccount = await orchestrator.createAccount(user.id);

      const response = await deleteTransaction(
        createdAccount.id,
        "not-a-uuid",
        session.token,
      );

      expect(response.status).toBe(404);
      expect(await response.json()).toEqual(NOT_FOUND_BODY);
    });

    test("With a transaction that belongs to another account", async () => {
      const { user, session } = await orchestrator.createAuthenticatedUser();
      const ownAccount = await orchestrator.createAccount(user.id);
      const anotherOwnAccount = await orchestrator.createAccount(user.id);
      const createdTransaction = await orchestrator.createTransaction(
        anotherOwnAccount.id,
        { type: "inbound", value: 1000 },
      );

      const response = await deleteTransaction(
        ownAccount.id,
        createdTransaction.id,
        session.token,
      );

      expect(response.status).toBe(404);
      expect(await response.json()).toEqual(NOT_FOUND_BODY);

      expect(
        await orchestrator.getAccountBalances(anotherOwnAccount.id),
      ).toEqual([
        { year: 2026, month: 3, year_value: 1000, month_value: 1000 },
      ]);
    });

    test("With another user's account", async () => {
      const { session } = await orchestrator.createAuthenticatedUser();
      const { user: otherUser } = await orchestrator.createAuthenticatedUser();
      const otherAccount = await orchestrator.createAccount(otherUser.id);
      const otherTransaction = await orchestrator.createTransaction(
        otherAccount.id,
        { type: "inbound", value: 1000 },
      );

      const response = await deleteTransaction(
        otherAccount.id,
        otherTransaction.id,
        session.token,
      );

      expect(response.status).toBe(403);
      expect(await response.json()).toEqual({
        name: "ForbiddenError",
        message: "Você não possui permissão para acessar esta conta.",
        action: "Verifique se a conta pertence ao seu usuário.",
        status_code: 403,
      });

      expect(await orchestrator.getAccountBalances(otherAccount.id)).toEqual([
        { year: 2026, month: 3, year_value: 1000, month_value: 1000 },
      ]);
    });
  });
});
