export const features = {
  READ: {
    ACTIVATION_TOKEN: "read:activation_token",
    SESSION: "read:session",
    USER: {
      DEFAULT: "read:user",
      SELF: "create:user:self",
    },
    MIGRATION: "read:migration",
    STATUS: {
      DEFAULT: "read:status",
      ALL: "read:status:all",
    },
    ACCOUNT: "read:account",
    TRANSACTION: "read:transaction",
  },

  CREATE: {
    SESSION: "create:session",
    USER: "create:user",
    MIGRATION: "create:migration",
    ACCOUNT: "create:account",
    TRANSACTION: "create:transaction",
  },

  UPDATE: {
    USER: {
      DEFAULT: "update:user",
      OTHERS: "update:user:others",
    },
    ACCOUNT: "update:account",
    TRANSACTION: "update:transaction",
  },

  DELETE: {
    ACCOUNT: "delete:account",
    TRANSACTION: "delete:transaction",
  },
} as const;

type DeepValue<T> = T extends string
  ? T
  : T extends Record<string, unknown>
    ? DeepValue<T[keyof T]>
    : never;

export type Feature = DeepValue<typeof features>;

function extractFeatures(obj: unknown): Feature[] {
  if (typeof obj === "string") {
    return [obj] as Feature[];
  }

  if (typeof obj === "object" && obj !== null) {
    return Object.values(obj).flatMap(extractFeatures);
  }

  return [];
}

export const availableFeatures = extractFeatures(features);

export const defaultUserFeatures: readonly Feature[] = Object.freeze([
  features.CREATE.SESSION,
  features.READ.SESSION,
  features.UPDATE.USER.DEFAULT,
  features.READ.STATUS.DEFAULT,

  features.READ.ACCOUNT,
  features.CREATE.ACCOUNT,
  features.UPDATE.ACCOUNT,
  features.DELETE.ACCOUNT,

  features.READ.TRANSACTION,
  features.CREATE.TRANSACTION,
  features.UPDATE.TRANSACTION,
  features.DELETE.TRANSACTION,
]);
