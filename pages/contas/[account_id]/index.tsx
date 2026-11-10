import { useState } from "react";
import type { GetServerSideProps } from "next";
import useSWR from "swr";
import { DefaultLayout } from "@/interface/default-layout";
import {
  Banner,
  Button,
  Card,
  ConfirmModal,
  FormControl,
  FormModal,
  Heading,
  Stack,
  Text,
  TextInput,
} from "@/interface/design-system";
import {
  CONNECTION_ERROR_MESSAGE,
  parseErrorResponse,
} from "@/interface/api-errors";
import {
  formatCurrency,
  formatDate,
  parseCurrencyToCents,
} from "@/interface/formatters";
import { NotFoundError } from "@/infra/errors";
import { requireAuthentication } from "@/infra/require-authentication";
import account from "@/models/account";
import { OutputFromHandler } from "@/models/authorization";
import { features } from "@/models/feature";
import type { TransactionType } from "@/models/transaction";

type Transaction = OutputFromHandler<typeof features.READ.TRANSACTION>;

type PageProps = {
  accountId: string;
  accountName: string;
};

const DESCRIPTION_MAX_LENGTH = 100;

export const getServerSideProps: GetServerSideProps<PageProps> = async (
  context,
) => {
  const auth = await requireAuthentication(context);

  if (!auth.user) {
    return { redirect: auth.redirect };
  }

  try {
    const accountFound = await account.findOneById(
      context.params?.account_id as string,
    );

    // Conta de outro usuário se comporta como inexistente (não vaza que existe)
    if (accountFound.user_id !== auth.user.id) {
      return { notFound: true };
    }

    return {
      props: { accountId: accountFound.id, accountName: accountFound.name },
    };
  } catch (error) {
    if (error instanceof NotFoundError) {
      return { notFound: true };
    }

    throw error;
  }
};

/* Período (ano/mês exibido) */

type Period = { year: number; month: number };

function getCurrentPeriod(): Period {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

function shiftPeriod({ year, month }: Period, delta: number): Period {
  const date = new Date(year, month - 1 + delta, 1);
  return { year: date.getFullYear(), month: date.getMonth() + 1 };
}

function formatPeriod({ year, month }: Period) {
  return new Date(year, month - 1, 1).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

/** Hoje, se estiver vendo o mês atual; senão, dia 1 do mês exibido. */
function getDefaultDate({ year, month }: Period) {
  const current = getCurrentPeriod();
  const isCurrentMonth = year === current.year && month === current.month;
  const day = isCurrentMonth ? new Date().getDate() : 1;

  return `${year}-${pad(month)}-${pad(day)}`;
}

function sumTransactions(transactions: Transaction[]) {
  let inbound = 0;
  let outbound = 0;

  for (const transaction of transactions) {
    if (transaction.type === "inbound") {
      inbound += transaction.value;
    } else {
      outbound += transaction.value;
    }
  }

  return { inbound, outbound, balance: inbound - outbound };
}

async function fetchTransactions(key: string): Promise<Transaction[]> {
  const response = await fetch(key);

  if (!response.ok) {
    throw new Error(await parseErrorResponse(response));
  }

  return response.json();
}

/* Página */

export default function TransactionsPage({
  accountId,
  accountName,
}: PageProps) {
  const [period, setPeriod] = useState(getCurrentPeriod);
  const [createType, setCreateType] = useState<TransactionType | null>(null);
  const [transactionToEdit, setTransactionToEdit] =
    useState<Transaction | null>(null);

  const { data, error, isLoading, mutate } = useSWR<Transaction[], Error>(
    `/api/v1/accounts/${accountId}/transactions?year=${period.year}&month=${period.month}`,
    fetchTransactions,
  );

  const totals = sumTransactions(data ?? []);

  function handleCreated(created: Transaction) {
    // Se a transação foi para outro mês, navega até ele.
    const [year, month] = created.occurred_on.split("-").map(Number);
    setPeriod({ year, month });
    mutate();
  }

  return (
    <DefaultLayout
      contentWidth="medium"
      metadata={{ title: `${accountName} · Transações` }}
    >
      <Stack gap="spacious">
        <Stack gap="condensed">
          <Text size="small" muted>
            <a href="/contas">← Contas</a>
          </Text>
          <Heading as="h1">{accountName}</Heading>
        </Stack>

        <Stack direction="horizontal" gap="condensed">
          <Button variant="primary" onClick={() => setCreateType("inbound")}>
            Nova entrada
          </Button>
          <Button onClick={() => setCreateType("outbound")}>Nova saída</Button>
        </Stack>

        <Stack>
          <Stack direction="horizontal">
            <Button
              aria-label="Mês anterior"
              onClick={() => setPeriod(shiftPeriod(period, -1))}
            >
              ‹
            </Button>
            <Stack.Item grow>
              <Heading
                as="h2"
                variant="small"
                style={{ textAlign: "center", textTransform: "capitalize" }}
              >
                {formatPeriod(period)}
              </Heading>
            </Stack.Item>
            <Button
              aria-label="Próximo mês"
              onClick={() => setPeriod(shiftPeriod(period, 1))}
            >
              ›
            </Button>
          </Stack>

          <Stack direction="responsive">
            <Stack.Item grow>
              <Card>
                <Card.Heading>Entradas</Card.Heading>
                <Card.Description style={{ color: "var(--ds-color-income)" }}>
                  {formatCurrency(totals.inbound)}
                </Card.Description>
              </Card>
            </Stack.Item>
            <Stack.Item grow>
              <Card>
                <Card.Heading>Saídas</Card.Heading>
                <Card.Description style={{ color: "var(--ds-color-expense)" }}>
                  {formatCurrency(totals.outbound)}
                </Card.Description>
              </Card>
            </Stack.Item>
            <Stack.Item grow>
              <Card>
                <Card.Heading>Saldo do mês</Card.Heading>
                <Card.Description>
                  {formatCurrency(totals.balance)}
                </Card.Description>
              </Card>
            </Stack.Item>
          </Stack>
        </Stack>

        <TransactionList
          accountId={accountId}
          transactions={data}
          isLoading={isLoading}
          error={error}
          onEdit={setTransactionToEdit}
          onRemoved={() => mutate()}
        />
      </Stack>

      <CreateTransactionModal
        accountId={accountId}
        type={createType}
        defaultDate={getDefaultDate(period)}
        onClose={() => setCreateType(null)}
        onCreated={handleCreated}
      />

      <EditDescriptionModal
        accountId={accountId}
        transaction={transactionToEdit}
        onClose={() => setTransactionToEdit(null)}
        onUpdated={() => mutate()}
      />
    </DefaultLayout>
  );
}

/* Criar */

type CreateTransactionModalProps = {
  accountId: string;
  type: TransactionType | null;
  defaultDate: string;
  onClose: () => void;
  onCreated: (transaction: Transaction) => void;
};

function CreateTransactionModal({
  accountId,
  type,
  defaultDate,
  onClose,
  onCreated,
}: CreateTransactionModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  function handleClose() {
    setErrorMessage("");
    onClose();
  }

  async function handleSubmit(formData: FormData) {
    const value = parseCurrencyToCents(String(formData.get("value") ?? ""));

    if (value === null) {
      setErrorMessage("Informe um valor válido maior que zero, ex.: 10,50.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const response = await fetch(
        `/api/v1/accounts/${accountId}/transactions`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type,
            value,
            description: formData.get("description"),
            occurred_on: formData.get("occurred_on"),
          }),
        },
      );

      if (response.status === 201) {
        onCreated(await response.json());
        handleClose();
        return;
      }

      setErrorMessage(await parseErrorResponse(response));
    } catch {
      setErrorMessage(CONNECTION_ERROR_MESSAGE);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <FormModal
      title={type === "inbound" ? "Nova entrada" : "Nova saída"}
      open={type !== null}
      onClose={handleClose}
      onSubmit={handleSubmit}
      okText="Adicionar"
      loading={isSubmitting}
    >
      <Stack gap="normal">
        {errorMessage && (
          <Banner variant="critical">
            <Banner.Title>Não foi possível criar a transação.</Banner.Title>
            <Banner.Description>{errorMessage}</Banner.Description>
          </Banner>
        )}

        <FormControl>
          <FormControl.Label>Valor (R$)</FormControl.Label>
          <TextInput
            name="value"
            type="text"
            inputMode="decimal"
            block
            required
            placeholder="0,00"
          />
        </FormControl>

        <FormControl>
          <FormControl.Label>Descrição</FormControl.Label>
          <TextInput
            name="description"
            type="text"
            block
            required
            maxLength={DESCRIPTION_MAX_LENGTH}
            placeholder="Ex.: Mercado, Salário..."
          />
        </FormControl>

        <FormControl>
          <FormControl.Label>Data</FormControl.Label>
          <TextInput
            name="occurred_on"
            type="date"
            block
            required
            defaultValue={defaultDate}
          />
        </FormControl>
      </Stack>
    </FormModal>
  );
}

/* Editar descrição */

type EditDescriptionModalProps = {
  accountId: string;
  transaction: Transaction | null;
  onClose: () => void;
  onUpdated: () => void;
};

function EditDescriptionModal({
  accountId,
  transaction,
  onClose,
  onUpdated,
}: EditDescriptionModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  function handleClose() {
    setErrorMessage("");
    onClose();
  }

  async function handleSubmit(formData: FormData) {
    if (!transaction) return;

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const response = await fetch(
        `/api/v1/accounts/${accountId}/transactions/${transaction.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ description: formData.get("description") }),
        },
      );

      if (response.status === 200) {
        onUpdated();
        handleClose();
        return;
      }

      setErrorMessage(await parseErrorResponse(response));
    } catch {
      setErrorMessage(CONNECTION_ERROR_MESSAGE);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <FormModal
      title="Editar descrição"
      open={transaction !== null}
      onClose={handleClose}
      onSubmit={handleSubmit}
      okText="Salvar"
      loading={isSubmitting}
    >
      <Stack gap="normal">
        {errorMessage && (
          <Banner variant="critical">
            <Banner.Title>Não foi possível editar a transação.</Banner.Title>
            <Banner.Description>{errorMessage}</Banner.Description>
          </Banner>
        )}

        <FormControl>
          <FormControl.Label>Descrição</FormControl.Label>
          <TextInput
            name="description"
            type="text"
            block
            required
            maxLength={DESCRIPTION_MAX_LENGTH}
            defaultValue={transaction?.description}
          />
        </FormControl>
      </Stack>
    </FormModal>
  );
}

/* Lista + remover */

type TransactionListProps = {
  accountId: string;
  transactions?: Transaction[];
  isLoading: boolean;
  error?: Error;
  onEdit: (transaction: Transaction) => void;
  onRemoved: () => void;
};

function TransactionList({
  accountId,
  transactions,
  isLoading,
  error,
  onEdit,
  onRemoved,
}: TransactionListProps) {
  const [transactionToRemove, setTransactionToRemove] =
    useState<Transaction | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const [removeError, setRemoveError] = useState("");

  async function handleConfirmRemove() {
    if (!transactionToRemove) return;

    setIsRemoving(true);
    setRemoveError("");

    try {
      const response = await fetch(
        `/api/v1/accounts/${accountId}/transactions/${transactionToRemove.id}`,
        { method: "DELETE" },
      );

      if (!response.ok) {
        setRemoveError(await parseErrorResponse(response));
      } else {
        onRemoved();
      }
    } catch {
      setRemoveError(CONNECTION_ERROR_MESSAGE);
    } finally {
      setIsRemoving(false);
      setTransactionToRemove(null);
    }
  }

  if (error) {
    return (
      <Banner variant="critical">
        <Banner.Title>Não foi possível carregar as transações.</Banner.Title>
        <Banner.Description>{error.message}</Banner.Description>
      </Banner>
    );
  }

  if (isLoading || !transactions) {
    return <Text muted>Carregando transações...</Text>;
  }

  return (
    <Stack>
      {removeError && (
        <Banner variant="critical">
          <Banner.Title>Não foi possível remover a transação.</Banner.Title>
          <Banner.Description>{removeError}</Banner.Description>
        </Banner>
      )}

      {transactions.length === 0 && (
        <Text muted>Nenhuma transação neste mês.</Text>
      )}

      {transactions.map((transaction) => {
        const isInbound = transaction.type === "inbound";

        return (
          <Card key={transaction.id}>
            <Card.Heading>
              {formatDate(transaction.occurred_on)} ·{" "}
              {isInbound ? "Entrada" : "Saída"}
            </Card.Heading>
            <Card.Description
              style={{
                color: isInbound
                  ? "var(--ds-color-income)"
                  : "var(--ds-color-expense)",
              }}
            >
              {isInbound ? "+" : "−"} {formatCurrency(transaction.value)}
            </Card.Description>
            <Text>{transaction.description}</Text>
            <Stack direction="horizontal" gap="condensed">
              <Button onClick={() => onEdit(transaction)}>
                Editar descrição
              </Button>
              <Button
                variant="danger"
                onClick={() => setTransactionToRemove(transaction)}
              >
                Remover
              </Button>
            </Stack>
          </Card>
        );
      })}

      <ConfirmModal
        open={transactionToRemove !== null}
        title="Remover transação"
        okText="Remover"
        danger
        loading={isRemoving}
        onConfirm={handleConfirmRemove}
        onCancel={() => setTransactionToRemove(null)}
      >
        Deseja realmente remover a transação{" "}
        <strong>{transactionToRemove?.description}</strong>?
      </ConfirmModal>
    </Stack>
  );
}
