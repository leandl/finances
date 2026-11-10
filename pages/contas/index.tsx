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
import { requireAuthentication } from "@/infra/require-authentication";
import { OutputFromHandler } from "@/models/authorization";
import { features } from "@/models/feature";

type Account = OutputFromHandler<typeof features.READ.ACCOUNT>;

const ACCOUNT_NAME_MAX_LENGTH = 30;
const CONNECTION_ERROR_MESSAGE =
  "Houve uma falha de conexão com o servidor. Tente novamente mais tarde.";

export const getServerSideProps: GetServerSideProps = async (context) => {
  const auth = await requireAuthentication(context);

  if (!auth.user) {
    return { redirect: auth.redirect };
  }

  return { props: {} };
};

async function parseErrorResponse(response: Response) {
  const body = await response.json().catch(() => null);

  if (body?.message) {
    return `${body.message} ${body.action ?? ""}`.trim();
  }

  return "Ocorreu um erro inesperado. Tente novamente mais tarde.";
}

async function fetchAccounts(key: string): Promise<Account[]> {
  const response = await fetch(key);

  if (!response.ok) {
    throw new Error(await parseErrorResponse(response));
  }

  return response.json();
}

export default function AccountsPage() {
  const { data, error, isLoading, mutate } = useSWR<Account[], Error>(
    "/api/v1/accounts",
    fetchAccounts,
  );
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  return (
    <DefaultLayout contentWidth="medium" metadata={{ title: "Contas" }}>
      <Stack gap="spacious">
        <Stack direction="horizontal">
          <Stack.Item grow>
            <Heading as="h1">Contas</Heading>
          </Stack.Item>
          <Button variant="primary" onClick={() => setIsCreateOpen(true)}>
            Nova conta
          </Button>
        </Stack>

        <AccountList
          accounts={data}
          isLoading={isLoading}
          error={error}
          onRemoved={() => mutate()}
        />
      </Stack>

      <CreateAccountModal
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={() => mutate()}
      />
    </DefaultLayout>
  );
}

type CreateAccountModalProps = {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
};

function CreateAccountModal({
  open,
  onClose,
  onCreated,
}: CreateAccountModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  function handleClose() {
    setErrorMessage("");
    onClose();
  }

  async function handleSubmit(formData: FormData) {
    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const response = await fetch("/api/v1/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: formData.get("name") }),
      });

      if (response.status === 201) {
        onCreated();
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
      title="Nova conta"
      open={open}
      onClose={handleClose}
      onSubmit={handleSubmit}
      okText="Criar conta"
      loading={isSubmitting}
    >
      <Stack gap="normal">
        {errorMessage && (
          <Banner variant="critical">
            <Banner.Title>Não foi possível criar a conta.</Banner.Title>
            <Banner.Description>{errorMessage}</Banner.Description>
          </Banner>
        )}

        <FormControl>
          <FormControl.Label>Nome da conta</FormControl.Label>
          <TextInput
            name="name"
            type="text"
            block
            required
            maxLength={ACCOUNT_NAME_MAX_LENGTH}
            placeholder="Ex.: Carteira, Nubank..."
          />
        </FormControl>
      </Stack>
    </FormModal>
  );
}

type AccountListProps = {
  accounts?: Account[];
  isLoading: boolean;
  error?: Error;
  onRemoved: () => void;
};

function AccountList({
  accounts,
  isLoading,
  error,
  onRemoved,
}: AccountListProps) {
  const [accountToRemove, setAccountToRemove] = useState<Account | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const [removeError, setRemoveError] = useState("");

  async function handleConfirmRemove() {
    if (!accountToRemove) return;

    setIsRemoving(true);
    setRemoveError("");

    try {
      const response = await fetch(`/api/v1/accounts/${accountToRemove.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        setRemoveError(await parseErrorResponse(response));
      } else {
        onRemoved();
      }
    } catch {
      setRemoveError(CONNECTION_ERROR_MESSAGE);
    } finally {
      setIsRemoving(false);
      setAccountToRemove(null);
    }
  }

  if (error) {
    return (
      <Banner variant="critical">
        <Banner.Title>Não foi possível carregar as contas.</Banner.Title>
        <Banner.Description>{error.message}</Banner.Description>
      </Banner>
    );
  }

  if (isLoading || !accounts) {
    return <Text muted>Carregando contas...</Text>;
  }

  return (
    <Stack>
      {removeError && (
        <Banner variant="critical">
          <Banner.Title>Não foi possível remover a conta.</Banner.Title>
          <Banner.Description>{removeError}</Banner.Description>
        </Banner>
      )}

      {accounts.length === 0 && (
        <Text muted>Você ainda não possui contas cadastradas.</Text>
      )}

      {accounts.map((account) => (
        <Card key={account.id}>
          <Card.Heading>Conta</Card.Heading>
          <Card.Description>
            <a href={`/contas/${account.id}`}>{account.name}</a>
          </Card.Description>
          <Card.Metadata>
            Criada em {new Date(account.created_at).toLocaleDateString("pt-BR")}
          </Card.Metadata>
          <div>
            <Button
              variant="danger"
              onClick={() => setAccountToRemove(account)}
            >
              Remover
            </Button>
          </div>
        </Card>
      ))}

      <ConfirmModal
        open={accountToRemove !== null}
        title="Remover conta"
        okText="Remover"
        danger
        loading={isRemoving}
        onConfirm={handleConfirmRemove}
        onCancel={() => setAccountToRemove(null)}
      >
        Deseja realmente remover a conta{" "}
        <strong>{accountToRemove?.name}</strong>?
      </ConfirmModal>
    </Stack>
  );
}
