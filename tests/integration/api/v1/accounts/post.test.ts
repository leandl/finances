import webserver from "@/infra/webserver";
import account from "@/models/account";
import orchestrator from "tests/orchestrator";
import { version as uuidVersion } from "uuid";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

function postAccount(body: unknown, token?: string) {
  return fetch(`${webserver.origin}/api/v1/accounts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token && { Cookie: `session_id=${token}` }),
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/v1/accounts", () => {
  describe("Anonymous user", () => {
    test("Creating an account", async () => {
      const response = await postAccount({ name: "Carteira" });

      expect(response.status).toBe(403);
      expect(await response.json()).toEqual({
        name: "ForbiddenError",
        message: "Você não possui permissão para executar esta ação.",
        action: 'Verifique se o seu usuário possui a feature "create:account"',
        status_code: 403,
      });
    });
  });

  describe("Default user", () => {
    test("With valid data", async () => {
      const { user, session } = await orchestrator.createAuthenticatedUser();

      const response = await postAccount(
        { name: "  Carteira  " },
        session.token,
      );

      expect(response.status).toBe(201);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        id: responseBody.id,
        name: "Carteira",
        user_id: user.id,
        created_at: responseBody.created_at,
        updated_at: responseBody.updated_at,
      });

      expect(uuidVersion(responseBody.id)).toBe(4);
      expect(Date.parse(responseBody.created_at)).not.toBeNaN();
      expect(Date.parse(responseBody.updated_at)).not.toBeNaN();

      const accountInDatabase = await account.findOneById(responseBody.id);
      expect(accountInDatabase.name).toBe("Carteira");
    });

    test("Without `name`", async () => {
      const { session } = await orchestrator.createAuthenticatedUser();

      const response = await postAccount({}, session.token);

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        name: "ValidationError",
        message: "O nome da conta é obrigatório.",
        action: "Informe o nome da conta no campo `name`.",
        status_code: 400,
      });
    });

    test("With blank `name`", async () => {
      const { session } = await orchestrator.createAuthenticatedUser();

      const response = await postAccount({ name: "   " }, session.token);

      expect(response.status).toBe(400);
      expect((await response.json()).message).toBe(
        "O nome da conta é obrigatório.",
      );
    });

    test("With `name` longer than the limit", async () => {
      const { session } = await orchestrator.createAuthenticatedUser();

      const response = await postAccount(
        { name: "a".repeat(account.NAME_MAX_LENGTH + 1) },
        session.token,
      );

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        name: "ValidationError",
        message: "O nome da conta deve ter no máximo 30 caracteres.",
        action: "Utilize um nome menor.",
        status_code: 400,
      });
    });

    test("With duplicated `name` (case insensitive)", async () => {
      const { session } = await orchestrator.createAuthenticatedUser();

      const response1 = await postAccount({ name: "Nubank" }, session.token);
      expect(response1.status).toBe(201);

      const response2 = await postAccount({ name: "nubank" }, session.token);
      expect(response2.status).toBe(400);
      expect(await response2.json()).toEqual({
        name: "ValidationError",
        message: "Você já possui uma conta com este nome.",
        action: "Utilize outro nome para realizar esta operação.",
        status_code: 400,
      });
    });

    test("With the same `name` used by another user", async () => {
      const { session: session1 } =
        await orchestrator.createAuthenticatedUser();
      const { session: session2 } =
        await orchestrator.createAuthenticatedUser();

      const response1 = await postAccount(
        { name: "Compartilhado" },
        session1.token,
      );
      const response2 = await postAccount(
        { name: "Compartilhado" },
        session2.token,
      );

      expect(response1.status).toBe(201);
      expect(response2.status).toBe(201);
    });
  });
});
