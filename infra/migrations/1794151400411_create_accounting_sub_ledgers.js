/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
exports.shorthands = undefined;

/**
 * Sub ledger = o MÊS de um ledger (1 = janeiro ... 12 = dezembro).
 * Um ledger tem vários sub ledgers (até 12).
 * Unicidade (accounting_ledger_id, month) garantida por constraint; existência do ledger: checada na aplicação.
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.up = (pgm) => {
  pgm.createTable("accounting_sub_ledgers", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("gen_random_uuid()"),
    },

    accounting_ledger_id: {
      type: "uuid",
      notNull: true,
    },

    // 1 a 12
    month: {
      type: "smallint",
      notNull: true,
    },

    // Saldo do mês em centavos (R$1.00 = 100)
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
    "accounting_sub_ledgers",
    "accounting_sub_ledgers_ledger_month_unique",
    { unique: ["accounting_ledger_id", "month"] },
  );
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = false;
