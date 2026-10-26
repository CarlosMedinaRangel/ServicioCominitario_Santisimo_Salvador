/**
 * Utility type that extracts all data properties from a TypeORM entity,
 * stripping out entity lifecycle hooks and methods (e.g., @BeforeInsert),
 * recursively handling related entities while preserving primitives, Dates, and Buffers.
 *
 * This enables the use of TypeScript's `satisfies` operator to enforce
 * strict, compile-time schema adherence without losing literal inference
 * or masking missing columns with blind `as Entity` casts.
 */
export type EntityData<T> = {
  [K in keyof T as T[K] extends (...args: any[]) => any ? never : K]:
    T[K] extends (infer U)[]
      ? EntityData<U>[]
      : T[K] extends Date | Buffer
        ? T[K]
        : T[K] extends object
          ? EntityData<T[K]>
          : T[K];
};
