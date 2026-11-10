import { NextApiRequest, NextApiResponse } from "next";
import { createRouter } from "next-connect";
import controller from "@/infra/controller";

import authorization from "@/models/authorization";
import { features } from "@/models/feature";
import transaction from "@/models/transaction";
import { User } from "@/models/user";
import { NextApiRequestWithContext } from "@/types/infra/next";
import { requireAccountAccess } from "@/infra/require-access";

export default createRouter<NextApiRequest, NextApiResponse>()
  .use(controller.injectAnonymousOrUser)
  .patch(controller.canRequest(features.UPDATE.TRANSACTION), patchHandler)
  .delete(controller.canRequest(features.DELETE.TRANSACTION), deleteHandler)
  .handler(controller.errorHandlers);

async function patchHandler(
  request: NextApiRequestWithContext,
  response: NextApiResponse,
) {
  const userTryingToPatch = request.context?.user as User;
  const accountFound = await requireAccountAccess(
    request,
    features.UPDATE.TRANSACTION,
  );

  const updatedTransaction = await transaction.updateDescription(
    accountFound.id,
    request.query.transaction_id as string,
    request.body,
  );

  const secureOutputValues = authorization.filterOutput(
    userTryingToPatch,
    features.READ.TRANSACTION,
    updatedTransaction,
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
    features.DELETE.TRANSACTION,
  );

  const removedTransaction = await transaction.remove(
    accountFound.id,
    request.query.transaction_id as string,
  );

  const secureOutputValues = authorization.filterOutput(
    userTryingToDelete,
    features.READ.TRANSACTION,
    removedTransaction,
  );

  return response.status(200).json(secureOutputValues);
}
