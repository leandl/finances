/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
exports.shorthands = undefined;

/**
 * Record = uma transação. Um sub ledger (mês) tem várias transações.
 * Sinal do valor vem de `type`; value > 0 e existência do sub ledger: checados na aplicação.
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.up = (pgm) => {
  pgm.createType("accounting_record_type", ["inbound", "outbound"]);

  pgm.createTable("accounting_records", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("gen_random_uuid()"),
    },

    accounting_sub_ledger_id: {
      type: "uuid",
      notNull: true,
    },

    // Redundante (sub ledger -> ledger -> account), mas evita joins nas consultas
    account_id: {
      type: "uuid",
      notNull: true,
    },

    type: {
      type: "accounting_record_type",
      notNull: true,
    },

    // R$1.00 = 100
    value: {
      type: "integer",
      notNull: true,
      check: "value > 0",
    },

    description: {
      type: "varchar(100)",
      notNull: true,
    },

    // Dia em que a transação aconteceu (diferente de created_at)
    occurred_on: {
      type: "date",
      notNull: true,
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

    deleted_at: {
      type: "timestamptz",
      notNull: false,
    },
  });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = false;
