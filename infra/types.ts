export type PartialUnknown<T> = T extends readonly (infer U)[]
  ? PartialUnknown<U>[]
  : T extends object
    ? {
        [K in keyof T]?: T[K] | PartialUnknown<T[K]>;
      }
    : T | unknown;
