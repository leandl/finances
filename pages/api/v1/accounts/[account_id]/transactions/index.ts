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
  .get(controller.canRequest(features.READ.TRANSACTION), getHandler)
  .post(controller.canRequest(features.CREATE.TRANSACTION), postHandler)
  .handler(controller.errorHandlers);

async function getHandler(
  request: NextApiRequestWithContext,
  response: NextApiResponse,
) {
  const userTryingToGet = request.context?.user as User;
  const accountFound = await requireAccountAccess(
    request,
    features.READ.TRANSACTION,
  );

  const transactions = await transaction.findAllByMonth(accountFound.id, {
    year: request.query.year,
    month: request.query.month,
  });

  const secureOutputValues = transactions.map((transactionFound) =>
    authorization.filterOutput(
      userTryingToGet,
      features.READ.TRANSACTION,
      transactionFound,
    ),
  );

  return response.status(200).json(secureOutputValues);
}

async function postHandler(
  request: NextApiRequestWithContext,
  response: NextApiResponse,
) {
  const userTryingToPost = request.context?.user as User;
  const accountFound = await requireAccountAccess(
    request,
    features.CREATE.TRANSACTION,
  );

  const newTransaction = await transaction.create(
    accountFound.id,
    request.body,
  );

  const secureOutputValues = authorization.filterOutput(
    userTryingToPost,
    features.READ.TRANSACTION,
    newTransaction,
  );

  return response.status(201).json(secureOutputValues);
}
