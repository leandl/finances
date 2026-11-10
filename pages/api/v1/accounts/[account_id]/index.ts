import { NextApiRequest, NextApiResponse } from "next";
import { createRouter } from "next-connect";
import controller from "@/infra/controller";
import account from "@/models/account";
import authorization from "@/models/authorization";
import { User } from "@/models/user";
import { NextApiRequestWithContext } from "@/types/infra/next";
import { requireAccountAccess } from "@/infra/require-access";
import { features } from "@/models/feature";

export default createRouter<NextApiRequest, NextApiResponse>()
  .use(controller.injectAnonymousOrUser)
  .get(controller.canRequest(features.READ.ACCOUNT), getHandler)
  .patch(controller.canRequest(features.UPDATE.ACCOUNT), patchHandler)
  .delete(controller.canRequest(features.DELETE.ACCOUNT), deleteHandler)
  .handler(controller.errorHandlers);

async function getHandler(
  request: NextApiRequestWithContext,
  response: NextApiResponse,
) {
  const userTryingToGet = request.context?.user as User;
  const accountFound = await requireAccountAccess(
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
  const accountFound = await requireAccountAccess(
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
  const accountFound = await requireAccountAccess(
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
