import { NextApiRequest, NextApiResponse } from "next";
import { createRouter } from "next-connect";
import controller from "@/infra/controller";
import account from "@/models/account";
import authorization from "@/models/authorization";
import { features } from "@/models/feature";
import { User } from "@/models/user";
import { NextApiRequestWithContext } from "@/types/infra/next";

export default createRouter<NextApiRequest, NextApiResponse>()
  .use(controller.injectAnonymousOrUser)
  .get(controller.canRequest(features.READ.ACCOUNT), getHandler)
  .post(controller.canRequest(features.CREATE.ACCOUNT), postHandler)
  .handler(controller.errorHandlers);

async function getHandler(
  request: NextApiRequestWithContext,
  response: NextApiResponse,
) {
  const userTryingToGet = request.context?.user as User;
  const accounts = await account.findAllByUserId(userTryingToGet.id);

  const secureOutputValues = accounts.map((accountFound) =>
    authorization.filterOutput(
      userTryingToGet,
      features.READ.ACCOUNT,
      accountFound,
    ),
  );

  return response.status(200).json(secureOutputValues);
}

async function postHandler(
  request: NextApiRequestWithContext,
  response: NextApiResponse,
) {
  const userTryingToPost = request.context?.user as User;
  const newAccount = await account.create(userTryingToPost.id, request.body);

  const secureOutputValues = authorization.filterOutput(
    userTryingToPost,
    features.READ.ACCOUNT,
    newAccount,
  );

  return response.status(201).json(secureOutputValues);
}
