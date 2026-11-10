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

function patchTransaction(
  accountId: string,
  transactionId: string,
  body: unknown,
  token?: string,
) {
  return fetch(
    `${webserver.origin}/api/v1/accounts/${accountId}/transactions/${transactionId}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Cookie: `session_id=${token}` }),
      },
      body: JSON.stringify(body),
    },
  );
}

describe("PATCH /api/v1/accounts/[account_id]/transactions/[transaction_id]", () => {
  describe("Anonymous user", () => {
    test("Editing a transaction", async () => {
      const response = await patchTransaction(
        "e67be663-c904-41d5-9bc9-11d353d45499",
        "e67be663-c904-41d5-9bc9-11d353d45499",
        { description: "Nova" },
      );

      expect(response.status).toBe(403);
      expect(await response.json()).toEqual({
        name: "ForbiddenError",
        message: "Você não possui permissão para executar esta ação.",
        action:
          'Verifique se o seu usuário possui a feature "update:transaction"',
        status_code: 403,
      });
    });
  });

  describe("Default user", () => {
    test("With valid `description`", async () => {
      const { user, session } = await orchestrator.createAuthenticatedUser();
      const createdAccount = await orchestrator.createAccount(user.id);
      const createdTransaction = await orchestrator.createTransaction(
        createdAccount.id,
        { type: "outbound", value: 4200, description: "Antiga" },
      );

      const response = await patchTransaction(
        createdAccount.id,
        createdTransaction.id,
        { description: "  Nova descrição  " },
        session.token,
      );

      expect(response.status).toBe(200);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        id: createdTransaction.id,
        account_id: createdAccount.id,
        type: "outbound",
        value: 4200,
        description: "Nova descrição",
        occurred_on: createdTransaction.occurred_on,
        created_at: createdTransaction.created_at.toISOString(),
        updated_at: responseBody.updated_at,
      });
      expect(responseBody.updated_at > responseBody.created_at).toBe(true);

      // Saldos não mudam ao editar a descrição
      expect(await orchestrator.getAccountBalances(createdAccount.id)).toEqual([
        { year: 2026, month: 3, year_value: -4200, month_value: -4200 },
      ]);
    });

    test.each<[string, unknown, string]>([
      ["without `description`", {}, "A descrição da transação é obrigatória."],
      [
        "blank `description`",
        { description: "   " },
        "A descrição da transação é obrigatória.",
      ],
      [
        "`description` longer than the limit",
        { description: "a".repeat(101) },
        "A descrição deve ter no máximo 100 caracteres.",
      ],
    ])("With %s", async (_label, body, message) => {
      const { user, session } = await orchestrator.createAuthenticatedUser();
      const createdAccount = await orchestrator.createAccount(user.id);
      const createdTransaction = await orchestrator.createTransaction(
        createdAccount.id,
      );

      const response = await patchTransaction(
        createdAccount.id,
        createdTransaction.id,
        body,
        session.token,
      );

      expect(response.status).toBe(400);
      const responseBody = await response.json();
      expect(responseBody.name).toBe("ValidationError");
      expect(responseBody.message).toBe(message);
    });

    test("With nonexistent transaction", async () => {
      const { user, session } = await orchestrator.createAuthenticatedUser();
      const createdAccount = await orchestrator.createAccount(user.id);

      const response = await patchTransaction(
        createdAccount.id,
        "e67be663-c904-41d5-9bc9-11d353d45499",
        { description: "Nova" },
        session.token,
      );

      expect(response.status).toBe(404);
      expect(await response.json()).toEqual(NOT_FOUND_BODY);
    });

    test("With invalid id", async () => {
      const { user, session } = await orchestrator.createAuthenticatedUser();
      const createdAccount = await orchestrator.createAccount(user.id);

      const response = await patchTransaction(
        createdAccount.id,
        "not-a-uuid",
        { description: "Nova" },
        session.token,
      );

      expect(response.status).toBe(404);
      expect(await response.json()).toEqual(NOT_FOUND_BODY);
    });

    test("With deleted transaction", async () => {
      const { user, session } = await orchestrator.createAuthenticatedUser();
      const createdAccount = await orchestrator.createAccount(user.id);
      const createdTransaction = await orchestrator.createTransaction(
        createdAccount.id,
      );

      await fetch(
        `${webserver.origin}/api/v1/accounts/${createdAccount.id}/transactions/${createdTransaction.id}`,
        {
          method: "DELETE",
          headers: { Cookie: `session_id=${session.token}` },
        },
      );

      const response = await patchTransaction(
        createdAccount.id,
        createdTransaction.id,
        { description: "Nova" },
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
        { description: "Original" },
      );

      const response = await patchTransaction(
        ownAccount.id,
        createdTransaction.id,
        { description: "Invadida" },
        session.token,
      );

      expect(response.status).toBe(404);
      expect(await response.json()).toEqual(NOT_FOUND_BODY);
    });

    test("With another user's account", async () => {
      const { session } = await orchestrator.createAuthenticatedUser();
      const { user: otherUser } = await orchestrator.createAuthenticatedUser();
      const otherAccount = await orchestrator.createAccount(otherUser.id);
      const otherTransaction = await orchestrator.createTransaction(
        otherAccount.id,
      );

      const response = await patchTransaction(
        otherAccount.id,
        otherTransaction.id,
        { description: "Invadida" },
        session.token,
      );

      expect(response.status).toBe(403);
      expect(await response.json()).toEqual({
        name: "ForbiddenError",
        message: "Você não possui permissão para acessar esta conta.",
        action: "Verifique se a conta pertence ao seu usuário.",
        status_code: 403,
      });
    });
  });
});
