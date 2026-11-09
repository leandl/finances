import { RunMigration } from "node-pg-migrate/dist/migration";
import { UserActivationToken } from "./activation";
import { availableFeatures, Feature, features } from "./feature";
import { Session } from "./session";
import { User } from "./user";
import { APIStatus } from "./status";
import { InternalServerError } from "@/infra/errors";
import { Account } from "./account";

export type UserWithFeatures = {
  features: Feature[];
};

function isAuthenticatedUser(user: User | UserWithFeatures): user is User {
  return "id" in user;
}

type InputPermissionResource<T> = {
  userSession: User | UserWithFeatures;
  data: T;
};

function isAccountOwner({
  userSession,
  data: account,
}: InputPermissionResource<Account>): boolean {
  return isAuthenticatedUser(userSession) && userSession.id === account.user_id;
}

const PermissionByFeature = {
  [features.UPDATE.USER.DEFAULT]: ({
    userSession,
    data: user,
  }: InputPermissionResource<User>) => {
    if (!isAuthenticatedUser(userSession)) return false;

    return (
      userSession.id === user.id ||
      userSession.features.includes(features.UPDATE.USER.OTHERS)
    );
  },

  [features.READ.ACCOUNT]: isAccountOwner,
  [features.UPDATE.ACCOUNT]: isAccountOwner,
  [features.DELETE.ACCOUNT]: isAccountOwner,
} as const;

type PermissionHandlers = typeof PermissionByFeature;
type FeatureWithCustomPermission = keyof PermissionHandlers;
type InputFromPermission<F extends FeatureWithCustomPermission> = Parameters<
  PermissionHandlers[F]
>[0];
type DataFromPermission<F extends FeatureWithCustomPermission> =
  InputFromPermission<F>["data"];
type PermissionData<F extends Feature> = F extends FeatureWithCustomPermission
  ? DataFromPermission<F>
  : void;

function can<F extends Feature>(
  userSession: User | UserWithFeatures,
  feature: F,
  resource?: PermissionData<F>,
): boolean {
  validateUser(userSession);
  validateFeature(feature);

  if (!userSession.features.includes(feature)) {
    return false;
  }

  if (feature in PermissionByFeature && resource) {
    const handler = PermissionByFeature[
      feature as FeatureWithCustomPermission
    ] as (data: InputFromPermission<FeatureWithCustomPermission>) => boolean;

    return handler({
      userSession,
      data: resource,
    } as InputFromPermission<FeatureWithCustomPermission>);
  }

  return true;
}

type InputResourceFilter<T> = {
  userSession: User | UserWithFeatures;
  data: T;
};

const ResourceFilterOutputByFeature = {
  [features.READ.USER.DEFAULT]: ({
    data: user,
  }: InputResourceFilter<User>) => ({
    id: user.id,
    username: user.username,
    features: user.features,
    created_at: user.created_at.toISOString(),
    updated_at: user.updated_at.toISOString(),
  }),

  [features.READ.USER.SELF]: ({
    userSession,
    data: user,
  }: InputResourceFilter<User>) => {
    if (isAuthenticatedUser(userSession) && userSession.id === user.id) {
      return {
        id: user.id,
        username: user.username,
        email: user.email,
        features: user.features,
        created_at: user.created_at.toISOString(),
        updated_at: user.updated_at.toISOString(),
      };
    }

    return {};
  },

  [features.READ.SESSION]: ({
    userSession,
    data: session,
  }: InputResourceFilter<Session>) => {
    if (
      isAuthenticatedUser(userSession) &&
      userSession.id === session.user_id
    ) {
      return {
        id: session.id,
        token: session.token,
        user_id: session.user_id,
        expires_at: session.expires_at,
        created_at: session.created_at.toISOString(),
        updated_at: session.updated_at.toISOString(),
      };
    }

    return {};
  },

  [features.READ.ACTIVATION_TOKEN]: ({
    data: token,
  }: InputResourceFilter<UserActivationToken>) => ({
    id: token.id,
    user_id: token.user_id,
    expires_at: token.expires_at,
    used_at: token.used_at,
    created_at: token.created_at.toISOString(),
    updated_at: token.updated_at.toISOString(),
  }),

  [features.READ.MIGRATION]: ({
    data: migrations,
  }: InputResourceFilter<RunMigration[]>) =>
    migrations.map((migration) => ({
      path: migration.path,
      name: migration.name,
      timestamp: migration.timestamp,
    })),

  [features.READ.STATUS.DEFAULT]: ({
    userSession,
    data: status,
  }: InputResourceFilter<APIStatus>) => ({
    updated_at: status.updated_at,
    dependencies: {
      database: {
        max_connections: status.dependencies.database.max_connections,
        opened_connections: status.dependencies.database.opened_connections,
        ...(can(userSession, features.READ.STATUS.ALL) && {
          version: status.dependencies.database.version,
        }),
      },
    },
  }),

  [features.READ.ACCOUNT]: ({
    data: account,
  }: InputResourceFilter<Account>) => ({
    id: account.id,
    name: account.name,
    user_id: account.user_id,
    created_at: account.created_at.toISOString(),
    updated_at: account.updated_at.toISOString(),
  }),
} as const;

type Handlers = typeof ResourceFilterOutputByFeature;
export type FeatureWithOutput = keyof Handlers;
type InputFromHandler<F extends FeatureWithOutput> = Parameters<Handlers[F]>[0];
type DataFromHandler<F extends FeatureWithOutput> = InputFromHandler<F>["data"];
export type OutputFromHandler<F extends FeatureWithOutput> = ReturnType<
  Handlers[F]
>;

function filterOutput<F extends FeatureWithOutput>(
  userSession: User | UserWithFeatures,
  feature: F,
  data: DataFromHandler<F>,
): OutputFromHandler<F> {
  validateUser(userSession);
  validateFeature(feature);
  validateResource(data);

  const handler = ResourceFilterOutputByFeature[feature] as (
    data: InputFromHandler<F>,
  ) => OutputFromHandler<F>;

  return handler({
    userSession,
    data,
  } as InputFromHandler<F>);
}

function validateUser(user: User | UserWithFeatures) {
  if (!user || !user.features) {
    throw new InternalServerError({
      cause: "É necessário fornecer `user` no model `authorization`.",
    });
  }
}

function validateFeature(feature: Feature) {
  if (!feature || !availableFeatures.includes(feature)) {
    throw new InternalServerError({
      cause:
        "É necessário fornecer uma `feature` conhecida no model `authorization`.",
    });
  }
}

function validateResource(resource: unknown) {
  if (!resource) {
    throw new InternalServerError({
      cause:
        "É necessário fornecer um `resource` em `authorization.filterOutput()`.",
    });
  }
}

const authorization = {
  can,
  filterOutput,
};

export default authorization;
