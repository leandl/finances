/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
exports.shorthands = undefined;

/**
 * Ledger = o ANO de uma conta (ex: 2026).
 * Uma conta tem vários ledgers (um por ano).
 * Unicidade (account_id, year) garantida por constraint; existência da conta: checada na aplicação.
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.up = (pgm) => {
  pgm.createTable("accounting_ledgers", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("gen_random_uuid()"),
    },

    account_id: {
      type: "uuid",
      notNull: true,
    },

    // Ex: 2026
    year: {
      type: "smallint",
      notNull: true,
    },

    // Saldo do ano em centavos (R$1.00 = 100)
    value: {
      type: "integer",
      notNull: true,
      default: 0,
    },

    // Why timestamp with timezone? https://justatheory.com/2012/04/postgres-use-timestamptz/
    created_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("timezone('utc', now())"),
    },

    updated_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("timezone('utc', now())"),
    },
  });

  pgm.addConstraint(
    "accounting_ledgers",
    "accounting_ledgers_account_year_unique",
    { unique: ["account_id", "year"] },
  );
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = false;
