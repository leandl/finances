import { ForbiddenError } from "@/infra/errors";
import account from "@/models/account";
import authorization from "@/models/authorization";
import { Feature } from "@/models/feature";
import { User } from "@/models/user";
import { NextApiRequestWithContext } from "@/types/infra/next";

export async function requireAccountAccess(
  request: NextApiRequestWithContext,
  feature: Feature,
) {
  const userTryingToAccess = request.context?.user as User;
  const accountId = request.query.account_id as string;

  const accountFound = await account.findOneById(accountId);

  if (!authorization.can(userTryingToAccess, feature, accountFound)) {
    throw new ForbiddenError({
      message: "Você não possui permissão para acessar esta conta.",
      action: "Verifique se a conta pertence ao seu usuário.",
    });
  }

  return accountFound;
}
