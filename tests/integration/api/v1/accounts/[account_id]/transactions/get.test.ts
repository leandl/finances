import webserver from "@/infra/webserver";
import orchestrator from "tests/orchestrator";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

function getTransactions(accountId: string, query: string, token?: string) {
  return fetch(
    `${webserver.origin}/api/v1/accounts/${accountId}/transactions${query}`,
    { headers: token ? { Cookie: `session_id=${token}` } : {} },
  );
}

describe("GET /api/v1/accounts/[account_id]/transactions", () => {
  describe("Anonymous user", () => {
    test("Listing transactions", async () => {
      const response = await getTransactions(
        "e67be663-c904-41d5-9bc9-11d353d45499",
        "?year=2026&month=3",
      );

      expect(response.status).toBe(403);
      expect(await response.json()).toEqual({
        name: "ForbiddenError",
        message: "Você não possui permissão para executar esta ação.",
        action:
          'Verifique se o seu usuário possui a feature "read:transaction"',
        status_code: 403,
      });
    });
  });

  describe("Default user", () => {
    test("Only lists the month's transactions, ordered by date", async () => {
      const { user, session } = await orchestrator.createAuthenticatedUser();
      const { user: otherUser } = await orchestrator.createAuthenticatedUser();
      const createdAccount = await orchestrator.createAccount(user.id);
      const otherAccount = await orchestrator.createAccount(otherUser.id);

      const day20 = await orchestrator.createTransaction(createdAccount.id, {
        occurred_on: "2026-03-20",
        description: "Dia 20",
      });
      const day5Outbound = await orchestrator.createTransaction(
        createdAccount.id,
        { type: "outbound", occurred_on: "2026-03-05", description: "Dia 5 A" },
      );
      const day5Inbound = await orchestrator.createTransaction(
        createdAccount.id,
        { occurred_on: "2026-03-05", description: "Dia 5 B" },
      );
      const lastDay = await orchestrator.createTransaction(createdAccount.id, {
        occurred_on: "2026-03-31",
        description: "Último dia",
      });

      // Fora do mês / da conta / removida
      await orchestrator.createTransaction(createdAccount.id, {
        occurred_on: "2026-04-01",
      });
      await orchestrator.createTransaction(createdAccount.id, {
        occurred_on: "2026-02-28",
      });
      await orchestrator.createTransaction(createdAccount.id, {
        occurred_on: "2025-03-10",
      });
      await orchestrator.createTransaction(otherAccount.id, {
        occurred_on: "2026-03-10",
      });
      const removed = await orchestrator.createTransaction(createdAccount.id, {
        occurred_on: "2026-03-10",
      });
      await fetch(
        `${webserver.origin}/api/v1/accounts/${createdAccount.id}/transactions/${removed.id}`,
        {
          method: "DELETE",
          headers: { Cookie: `session_id=${session.token}` },
        },
      );

      const response = await getTransactions(
        createdAccount.id,
        "?year=2026&month=3",
        session.token,
      );

      expect(response.status).toBe(200);
      const responseBody = await response.json();

      expect(responseBody.map((item: { id: string }) => item.id)).toEqual([
        day5Outbound.id,
        day5Inbound.id,
        day20.id,
        lastDay.id,
      ]);

      expect(responseBody[0]).toEqual({
        id: day5Outbound.id,
        account_id: createdAccount.id,
        type: "outbound",
        value: day5Outbound.value,
        description: "Dia 5 A",
        occurred_on: "2026-03-05",
        created_at: day5Outbound.created_at.toISOString(),
        updated_at: day5Outbound.updated_at.toISOString(),
      });
    });

    test("Month without transactions", async () => {
      const { user, session } = await orchestrator.createAuthenticatedUser();
      const createdAccount = await orchestrator.createAccount(user.id);

      const response = await getTransactions(
        createdAccount.id,
        "?year=2026&month=12",
        session.token,
      );

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual([]);
    });

    test.each([
      ["without query", ""],
      ["without `month`", "?year=2026"],
      ["without `year`", "?month=3"],
      ["`month` equal to 0", "?year=2026&month=0"],
      ["`month` equal to 13", "?year=2026&month=13"],
      ["non numeric `month`", "?year=2026&month=abc"],
      ["non numeric `year`", "?year=abc&month=3"],
    ])("With %s", async (_label, query) => {
      const { user, session } = await orchestrator.createAuthenticatedUser();
      const createdAccount = await orchestrator.createAccount(user.id);

      const response = await getTransactions(
        createdAccount.id,
        query,
        session.token,
      );

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        name: "ValidationError",
        message: "O ano ou o mês informado é inválido.",
        action: "Informe `year` (ex: 2026) e `month` (1 a 12) na query string.",
        status_code: 400,
      });
    });

    test("With nonexistent account", async () => {
      const { session } = await orchestrator.createAuthenticatedUser();

      const response = await getTransactions(
        "e67be663-c904-41d5-9bc9-11d353d45499",
        "?year=2026&month=3",
        session.token,
      );

      expect(response.status).toBe(404);
      expect((await response.json()).name).toBe("NotFoundError");
    });

    test("With another user's account", async () => {
      const { session } = await orchestrator.createAuthenticatedUser();
      const { user: otherUser } = await orchestrator.createAuthenticatedUser();
      const otherAccount = await orchestrator.createAccount(otherUser.id);

      const response = await getTransactions(
        otherAccount.id,
        "?year=2026&month=3",
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
