import database from "@/infra/database";
import webserver from "@/infra/webserver";
import account from "@/models/account";
import orchestrator from "tests/orchestrator";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

function deleteAccount(accountId: string, token?: string) {
  return fetch(`${webserver.origin}/api/v1/accounts/${accountId}`, {
    method: "DELETE",
    headers: token ? { Cookie: `session_id=${token}` } : {},
  });
}

describe("DELETE /api/v1/accounts/[account_id]", () => {
  describe("Anonymous user", () => {
    test("Removing an account", async () => {
      const response = await deleteAccount(
        "e67be663-c904-41d5-9bc9-11d353d45499",
      );

      expect(response.status).toBe(403);
      expect(await response.json()).toEqual({
        name: "ForbiddenError",
        message: "Você não possui permissão para executar esta ação.",
        action: 'Verifique se o seu usuário possui a feature "delete:account"',
        status_code: 403,
      });
    });
  });

  describe("Default user", () => {
    test("With own account", async () => {
      const { user, session } = await orchestrator.createAuthenticatedUser();
      const createdAccount = await orchestrator.createAccount(
        user.id,
        "Remover",
      );

      const response = await deleteAccount(createdAccount.id, session.token);

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({
        id: createdAccount.id,
        name: "Remover",
        user_id: user.id,
        created_at: createdAccount.created_at.toISOString(),
        updated_at: expect.any(String),
      });

      const results = await database.query({
        text: "SELECT deleted_at FROM accounts WHERE id = $1;",
        values: [createdAccount.id],
      });
      expect(results.rowCount).toBe(1);
      expect(results.rows[0].deleted_at).not.toBeNull();

      // Double check
      const doubleCheckResponse = await fetch(
        `${webserver.origin}/api/v1/accounts/${createdAccount.id}`,
        { headers: { Cookie: `session_id=${session.token}` } },
      );
      expect(doubleCheckResponse.status).toBe(404);
    });

    test("With already deleted account", async () => {
      const { user, session } = await orchestrator.createAuthenticatedUser();
      const createdAccount = await orchestrator.createAccount(user.id);

      const response1 = await deleteAccount(createdAccount.id, session.token);
      expect(response1.status).toBe(200);

      const response2 = await deleteAccount(createdAccount.id, session.token);
      expect(response2.status).toBe(404);
      expect((await response2.json()).name).toBe("NotFoundError");
    });

    test("Reusing the `name` of a deleted account", async () => {
      const { user, session } = await orchestrator.createAuthenticatedUser();
      const createdAccount = await orchestrator.createAccount(user.id, "Reuso");

      await deleteAccount(createdAccount.id, session.token);

      const response = await fetch(`${webserver.origin}/api/v1/accounts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `session_id=${session.token}`,
        },
        body: JSON.stringify({ name: "Reuso" }),
      });

      expect(response.status).toBe(201);
    });

    test("With nonexistent account", async () => {
      const { session } = await orchestrator.createAuthenticatedUser();

      const response = await deleteAccount(
        "e67be663-c904-41d5-9bc9-11d353d45499",
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

      const response = await deleteAccount(otherAccount.id, session.token);

      expect(response.status).toBe(403);
      expect(await response.json()).toEqual({
        name: "ForbiddenError",
        message: "Você não possui permissão para acessar esta conta.",
        action: "Verifique se a conta pertence ao seu usuário.",
        status_code: 403,
      });

      const stillExists = await account.findOneById(otherAccount.id);
      expect(stillExists.id).toBe(otherAccount.id);
    });
  });
});
