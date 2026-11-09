import webserver from "@/infra/webserver";
import account from "@/models/account";
import orchestrator from "tests/orchestrator";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

function patchAccount(accountId: string, body: unknown, token?: string) {
  return fetch(`${webserver.origin}/api/v1/accounts/${accountId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(token && { Cookie: `session_id=${token}` }),
    },
    body: JSON.stringify(body),
  });
}

describe("PATCH /api/v1/accounts/[account_id]", () => {
  describe("Anonymous user", () => {
    test("Renaming an account", async () => {
      const response = await patchAccount(
        "e67be663-c904-41d5-9bc9-11d353d45499",
        { name: "Novo" },
      );

      expect(response.status).toBe(403);
      expect(await response.json()).toEqual({
        name: "ForbiddenError",
        message: "Você não possui permissão para executar esta ação.",
        action: 'Verifique se o seu usuário possui a feature "update:account"',
        status_code: 403,
      });
    });
  });

  describe("Default user", () => {
    test("With valid `name`", async () => {
      const { user, session } = await orchestrator.createAuthenticatedUser();
      const createdAccount = await orchestrator.createAccount(
        user.id,
        "Antigo",
      );

      const response = await patchAccount(
        createdAccount.id,
        { name: "Novo nome" },
        session.token,
      );

      expect(response.status).toBe(200);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        id: createdAccount.id,
        name: "Novo nome",
        user_id: user.id,
        created_at: createdAccount.created_at.toISOString(),
        updated_at: responseBody.updated_at,
      });
      expect(responseBody.updated_at > responseBody.created_at).toBe(true);

      const accountInDatabase = await account.findOneById(createdAccount.id);
      expect(accountInDatabase.name).toBe("Novo nome");
    });

    test("Changing only the case of its own `name`", async () => {
      const { user, session } = await orchestrator.createAuthenticatedUser();
      const createdAccount = await orchestrator.createAccount(user.id, "banco");

      const response = await patchAccount(
        createdAccount.id,
        { name: "Banco" },
        session.token,
      );

      expect(response.status).toBe(200);
      expect((await response.json()).name).toBe("Banco");
    });

    test("Without `name`", async () => {
      const { user, session } = await orchestrator.createAuthenticatedUser();
      const createdAccount = await orchestrator.createAccount(user.id);

      const response = await patchAccount(createdAccount.id, {}, session.token);

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        name: "ValidationError",
        message: "O nome da conta é obrigatório.",
        action: "Informe o nome da conta no campo `name`.",
        status_code: 400,
      });
    });

    test("With duplicated `name`", async () => {
      const { user, session } = await orchestrator.createAuthenticatedUser();
      await orchestrator.createAccount(user.id, "Existente");
      const accountToRename = await orchestrator.createAccount(
        user.id,
        "Outra",
      );

      const response = await patchAccount(
        accountToRename.id,
        { name: "existente" },
        session.token,
      );

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        name: "ValidationError",
        message: "Você já possui uma conta com este nome.",
        action: "Utilize outro nome para realizar esta operação.",
        status_code: 400,
      });
    });

    test("With nonexistent account", async () => {
      const { session } = await orchestrator.createAuthenticatedUser();

      const response = await patchAccount(
        "e67be663-c904-41d5-9bc9-11d353d45499",
        { name: "Novo" },
        session.token,
      );

      expect(response.status).toBe(404);
      expect((await response.json()).name).toBe("NotFoundError");
    });

    test("With another user's account", async () => {
      const { session } = await orchestrator.createAuthenticatedUser();
      const { user: otherUser } = await orchestrator.createAuthenticatedUser();
      const otherAccount = await orchestrator.createAccount(
        otherUser.id,
        "Do outro",
      );

      const response = await patchAccount(
        otherAccount.id,
        { name: "Invadida" },
        session.token,
      );

      expect(response.status).toBe(403);
      expect(await response.json()).toEqual({
        name: "ForbiddenError",
        message: "Você não possui permissão para acessar esta conta.",
        action: "Verifique se a conta pertence ao seu usuário.",
        status_code: 403,
      });

      const accountInDatabase = await account.findOneById(otherAccount.id);
      expect(accountInDatabase.name).toBe("Do outro");
    });

    test("With deleted account", async () => {
      const { user, session } = await orchestrator.createAuthenticatedUser();
      const createdAccount = await orchestrator.createAccount(user.id);

      await fetch(`${webserver.origin}/api/v1/accounts/${createdAccount.id}`, {
        method: "DELETE",
        headers: { Cookie: `session_id=${session.token}` },
      });

      const response = await patchAccount(
        createdAccount.id,
        { name: "Novo" },
        session.token,
      );

      expect(response.status).toBe(404);
      expect((await response.json()).name).toBe("NotFoundError");
    });
  });
});
