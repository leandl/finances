import webserver from "@/infra/webserver";
import orchestrator from "tests/orchestrator";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("GET /api/v1/accounts", () => {
  describe("Anonymous user", () => {
    test("Listing accounts", async () => {
      const response = await fetch(`${webserver.origin}/api/v1/accounts`);

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
    test("Without accounts", async () => {
      const { session } = await orchestrator.createAuthenticatedUser();

      const response = await fetch(`${webserver.origin}/api/v1/accounts`, {
        headers: { Cookie: `session_id=${session.token}` },
      });

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual([]);
    });

    test("Only lists own accounts, in creation order", async () => {
      const { user, session } = await orchestrator.createAuthenticatedUser();
      const { user: otherUser } = await orchestrator.createAuthenticatedUser();

      const accountA = await orchestrator.createAccount(user.id, "Conta A");
      const accountB = await orchestrator.createAccount(user.id, "Conta B");
      await orchestrator.createAccount(otherUser.id, "Conta de outro");

      const response = await fetch(`${webserver.origin}/api/v1/accounts`, {
        headers: { Cookie: `session_id=${session.token}` },
      });

      expect(response.status).toBe(200);
      const responseBody = await response.json();

      expect(responseBody).toEqual([
        {
          id: accountA.id,
          name: "Conta A",
          user_id: user.id,
          created_at: accountA.created_at.toISOString(),
          updated_at: accountA.updated_at.toISOString(),
        },
        {
          id: accountB.id,
          name: "Conta B",
          user_id: user.id,
          created_at: accountB.created_at.toISOString(),
          updated_at: accountB.updated_at.toISOString(),
        },
      ]);
    });

    test("Does not list deleted accounts", async () => {
      const { user, session } = await orchestrator.createAuthenticatedUser();
      const keptAccount = await orchestrator.createAccount(user.id, "Mantida");
      const removedAccount = await orchestrator.createAccount(
        user.id,
        "Removida",
      );

      const deleteResponse = await fetch(
        `${webserver.origin}/api/v1/accounts/${removedAccount.id}`,
        {
          method: "DELETE",
          headers: { Cookie: `session_id=${session.token}` },
        },
      );
      expect(deleteResponse.status).toBe(200);

      const response = await fetch(`${webserver.origin}/api/v1/accounts`, {
        headers: { Cookie: `session_id=${session.token}` },
      });

      expect(response.status).toBe(200);
      const responseBody = await response.json();
      expect(responseBody).toHaveLength(1);
      expect(responseBody[0].id).toBe(keptAccount.id);
    });
  });
});
