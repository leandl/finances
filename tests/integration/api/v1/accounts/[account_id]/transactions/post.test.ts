import webserver from "@/infra/webserver";
import orchestrator from "tests/orchestrator";
import { version as uuidVersion } from "uuid";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

const VALID_BODY = {
  type: "inbound",
  value: 1050,
  description: "Salário",
  occurred_on: "2026-03-15",
};

function postTransaction(accountId: string, body: unknown, token?: string) {
  return fetch(
    `${webserver.origin}/api/v1/accounts/${accountId}/transactions`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Cookie: `session_id=${token}` }),
      },
      body: JSON.stringify(body),
    },
  );
}

describe("POST /api/v1/accounts/[account_id]/transactions", () => {
  describe("Anonymous user", () => {
    test("Creating a transaction", async () => {
      const response = await postTransaction(
        "e67be663-c904-41d5-9bc9-11d353d45499",
        VALID_BODY,
      );

      expect(response.status).toBe(403);
      expect(await response.json()).toEqual({
        name: "ForbiddenError",
        message: "Você não possui permissão para executar esta ação.",
        action:
          'Verifique se o seu usuário possui a feature "create:transaction"',
        status_code: 403,
      });
    });
  });

  describe("Default user", () => {
    test("With valid data", async () => {
      const { user, session } = await orchestrator.createAuthenticatedUser();
      const createdAccount = await orchestrator.createAccount(user.id);

      const response = await postTransaction(
        createdAccount.id,
        { ...VALID_BODY, description: "  Salário  " },
        session.token,
      );

      expect(response.status).toBe(201);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        id: responseBody.id,
        account_id: createdAccount.id,
        type: "inbound",
        value: 1050,
        description: "Salário",
        occurred_on: "2026-03-15",
        created_at: responseBody.created_at,
        updated_at: responseBody.updated_at,
      });

      expect(uuidVersion(responseBody.id)).toBe(4);
      expect(Date.parse(responseBody.created_at)).not.toBeNaN();
      expect(Date.parse(responseBody.updated_at)).not.toBeNaN();

      expect(await orchestrator.getAccountBalances(createdAccount.id)).toEqual([
        { year: 2026, month: 3, year_value: 1050, month_value: 1050 },
      ]);
    });

    test("Accumulating balances across months and years", async () => {
      const { user, session } = await orchestrator.createAuthenticatedUser();
      const createdAccount = await orchestrator.createAccount(user.id);

      const bodies = [
        { type: "inbound", value: 10000, occurred_on: "2026-03-10" },
        { type: "outbound", value: 2500, occurred_on: "2026-03-20" },
        { type: "inbound", value: 700, occurred_on: "2026-04-01" },
        { type: "inbound", value: 100, occurred_on: "2027-01-05" },
      ];

      for (const body of bodies) {
        const response = await postTransaction(
          createdAccount.id,
          { ...body, description: "Teste" },
          session.token,
        );
        expect(response.status).toBe(201);
      }

      expect(await orchestrator.getAccountBalances(createdAccount.id)).toEqual([
        { year: 2026, month: 3, year_value: 8200, month_value: 7500 },
        { year: 2026, month: 4, year_value: 8200, month_value: 700 },
        { year: 2027, month: 1, year_value: 100, month_value: 100 },
      ]);
    });

    test.each<[string, Record<string, unknown>, string]>([
      ["invalid `type`", { type: "other" }, "O tipo da transação é inválido."],
      [
        "without `type`",
        { type: undefined },
        "O tipo da transação é inválido.",
      ],
      [
        "`value` equal to zero",
        { value: 0 },
        "O valor da transação é inválido.",
      ],
      ["negative `value`", { value: -10 }, "O valor da transação é inválido."],
      ["decimal `value`", { value: 10.5 }, "O valor da transação é inválido."],
      ["string `value`", { value: "100" }, "O valor da transação é inválido."],
      [
        "`value` above the limit",
        { value: 2_147_483_648 },
        "O valor da transação é inválido.",
      ],
      [
        "without `description`",
        { description: undefined },
        "A descrição da transação é obrigatória.",
      ],
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
      [
        "impossible `occurred_on`",
        { occurred_on: "2026-02-30" },
        "A data da transação é inválida.",
      ],
      [
        "`occurred_on` in the wrong format",
        { occurred_on: "15/03/2026" },
        "A data da transação é inválida.",
      ],
      [
        "without `occurred_on`",
        { occurred_on: undefined },
        "A data da transação é inválida.",
      ],
    ])("With %s", async (_label, override, message) => {
      const { user, session } = await orchestrator.createAuthenticatedUser();
      const createdAccount = await orchestrator.createAccount(user.id);

      const response = await postTransaction(
        createdAccount.id,
        { ...VALID_BODY, ...override },
        session.token,
      );

      expect(response.status).toBe(400);
      const responseBody = await response.json();
      expect(responseBody.name).toBe("ValidationError");
      expect(responseBody.message).toBe(message);

      expect(await orchestrator.getAccountBalances(createdAccount.id)).toEqual(
        [],
      );
    });

    test("With nonexistent account", async () => {
      const { session } = await orchestrator.createAuthenticatedUser();

      const response = await postTransaction(
        "e67be663-c904-41d5-9bc9-11d353d45499",
        VALID_BODY,
        session.token,
      );

      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({
        name: "NotFoundError",
        message: "A conta informada não foi encontrada no sistema.",
        action: "Verifique se o id da conta está correto.",
        status_code: 404,
      });
    });

    test("With another user's account", async () => {
      const { session } = await orchestrator.createAuthenticatedUser();
      const { user: otherUser } = await orchestrator.createAuthenticatedUser();
      const otherAccount = await orchestrator.createAccount(otherUser.id);

      const response = await postTransaction(
        otherAccount.id,
        VALID_BODY,
        session.token,
      );

      expect(response.status).toBe(403);
      expect(await response.json()).toEqual({
        name: "ForbiddenError",
        message: "Você não possui permissão para acessar esta conta.",
        action: "Verifique se a conta pertence ao seu usuário.",
        status_code: 403,
      });

      expect(await orchestrator.getAccountBalances(otherAccount.id)).toEqual(
        [],
      );
    });
  });
});
