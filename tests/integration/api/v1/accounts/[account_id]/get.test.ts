import webserver from "@/infra/webserver";
import orchestrator from "tests/orchestrator";
import { version as uuidVersion } from "uuid";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

const NOT_FOUND_BODY = {
  name: "NotFoundError",
  message: "A conta informada não foi encontrada no sistema.",
  action: "Verifique se o id da conta está correto.",
  status_code: 404,
};

describe("GET /api/v1/accounts/[account_id]", () => {
  describe("Anonymous user", () => {
    test("Retrieving an account", async () => {
      const response = await fetch(
        `${webserver.origin}/api/v1/accounts/e67be663-c904-41d5-9bc9-11d353d45499`,
      );

      expect(response.status).toBe(403);
      expect(await response.json()).toEqual({
        name: "ForbiddenError",
        message: "Você não possui permissão para executar esta ação.",
        action: 'Verifique se o seu usuário possui a feature "read:account"',
        status_code: 403,
      });
    });
  });

  describe("Default user", () => {
    test("With own account", async () => {
      const { user, session } = await orchestrator.createAuthenticatedUser();
      const createdAccount = await orchestrator.createAccount(
        user.id,
        "Minha conta",
      );

      const response = await fetch(
        `${webserver.origin}/api/v1/accounts/${createdAccount.id}`,
        { headers: { Cookie: `session_id=${session.token}` } },
      );

      expect(response.status).toBe(200);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        id: createdAccount.id,
        name: "Minha conta",
        user_id: user.id,
        created_at: createdAccount.created_at.toISOString(),
        updated_at: createdAccount.updated_at.toISOString(),
      });
      expect(uuidVersion(responseBody.id)).toBe(4);
    });

    test("With nonexistent account", async () => {
      const { session } = await orchestrator.createAuthenticatedUser();

      const response = await fetch(
        `${webserver.origin}/api/v1/accounts/e67be663-c904-41d5-9bc9-11d353d45499`,
        { headers: { Cookie: `session_id=${session.token}` } },
      );

      expect(response.status).toBe(404);
      expect(await response.json()).toEqual(NOT_FOUND_BODY);
    });

    test("With invalid id", async () => {
      const { session } = await orchestrator.createAuthenticatedUser();

      const response = await fetch(
        `${webserver.origin}/api/v1/accounts/not-a-uuid`,
        { headers: { Cookie: `session_id=${session.token}` } },
      );

      expect(response.status).toBe(404);
      expect(await response.json()).toEqual(NOT_FOUND_BODY);
    });

    test("With another user's account", async () => {
      const { session } = await orchestrator.createAuthenticatedUser();
      const { user: otherUser } = await orchestrator.createAuthenticatedUser();
      const otherAccount = await orchestrator.createAccount(otherUser.id);

      const response = await fetch(
        `${webserver.origin}/api/v1/accounts/${otherAccount.id}`,
        { headers: { Cookie: `session_id=${session.token}` } },
      );

      expect(response.status).toBe(403);
      expect(await response.json()).toEqual({
        name: "ForbiddenError",
        message: "Você não possui permissão para acessar esta conta.",
        action: "Verifique se a conta pertence ao seu usuário.",
        status_code: 403,
      });
    });

    test("With deleted account", async () => {
      const { user, session } = await orchestrator.createAuthenticatedUser();
      const createdAccount = await orchestrator.createAccount(user.id);

      await fetch(`${webserver.origin}/api/v1/accounts/${createdAccount.id}`, {
        method: "DELETE",
        headers: { Cookie: `session_id=${session.token}` },
      });

      const response = await fetch(
        `${webserver.origin}/api/v1/accounts/${createdAccount.id}`,
        { headers: { Cookie: `session_id=${session.token}` } },
      );

      expect(response.status).toBe(404);
      expect(await response.json()).toEqual(NOT_FOUND_BODY);
    });
  });
});
