import { NextApiRequest, NextApiResponse } from "next";
import { createRouter } from "next-connect";
import controller from "@/infra/controller";
import { ForbiddenError } from "@/infra/errors";
import account from "@/models/account";
import authorization from "@/models/authorization";
import { Feature, features } from "@/models/feature";
import { User } from "@/models/user";
import { NextApiRequestWithContext } from "@/types/infra/next";

export default createRouter<NextApiRequest, NextApiResponse>()
  .use(controller.injectAnonymousOrUser)
  .get(controller.canRequest(features.READ.ACCOUNT), getHandler)
  .patch(controller.canRequest(features.UPDATE.ACCOUNT), patchHandler)
  .delete(controller.canRequest(features.DELETE.ACCOUNT), deleteHandler)
  .handler(controller.errorHandlers);

async function findAuthorizedAccount(
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

async function getHandler(
  request: NextApiRequestWithContext,
  response: NextApiResponse,
) {
  const userTryingToGet = request.context?.user as User;
  const accountFound = await findAuthorizedAccount(
    request,
    features.READ.ACCOUNT,
  );

  const secureOutputValues = authorization.filterOutput(
    userTryingToGet,
    features.READ.ACCOUNT,
    accountFound,
  );

  return response.status(200).json(secureOutputValues);
}

async function patchHandler(
  request: NextApiRequestWithContext,
  response: NextApiResponse,
) {
  const userTryingToPatch = request.context?.user as User;
  const accountFound = await findAuthorizedAccount(
    request,
    features.UPDATE.ACCOUNT,
  );

  const updatedAccount = await account.updateName(
    accountFound.id,
    request.body,
  );

  const secureOutputValues = authorization.filterOutput(
    userTryingToPatch,
    features.READ.ACCOUNT,
    updatedAccount,
  );

  return response.status(200).json(secureOutputValues);
}

async function deleteHandler(
  request: NextApiRequestWithContext,
  response: NextApiResponse,
) {
  const userTryingToDelete = request.context?.user as User;
  const accountFound = await findAuthorizedAccount(
    request,
    features.DELETE.ACCOUNT,
  );

  const removedAccount = await account.remove(accountFound.id);

  const secureOutputValues = authorization.filterOutput(
    userTryingToDelete,
    features.READ.ACCOUNT,
    removedAccount,
  );

  return response.status(200).json(secureOutputValues);
}
