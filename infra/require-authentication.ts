import type { GetServerSidePropsContext, NextApiResponse } from "next";
import controller from "@/infra/controller";
import { NotFoundError, UnauthorizedError } from "@/infra/errors";
import authorization from "@/models/authorization";
import { features } from "@/models/feature";
import session from "@/models/session";
import user from "@/models/user";

export type AuthenticatedUser = {
  id: string;
  username: string;
  email: string;
  features: string[];
  created_at: string;
  updated_at: string;
};

type AuthResult =
  | { user: AuthenticatedUser; redirect?: never }
  | { user?: never; redirect: { destination: string; permanent: false } };

export async function requireAuthentication(
  context: GetServerSidePropsContext,
): Promise<AuthResult> {
  const redirect = {
    destination: `/login?redirect=${encodeURIComponent(context.resolvedUrl)}`,
    permanent: false as const,
  };

  const sessionToken = context.req.cookies.session_id;
  if (!sessionToken) return { redirect };

  try {
    const sessionObject = await session.findOneValidByToken(sessionToken);
    const userObject = await user.findOneById(sessionObject.user_id);

    if (!authorization.can(userObject, features.READ.SESSION)) {
      return { redirect };
    }

    // filterOutput devolve datas como string, então é serializável pelo Next
    const secureUser = authorization.filterOutput(
      userObject,
      features.READ.USER.SELF,
      userObject,
    ) as AuthenticatedUser;

    return { user: secureUser };
  } catch (error) {
    if (error instanceof UnauthorizedError || error instanceof NotFoundError) {
      controller.clearSessionCookie(context.res as NextApiResponse);
      return { redirect };
    }
    throw error;
  }
}
