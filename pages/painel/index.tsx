import { useState } from "react";
import type { GetServerSideProps } from "next";
import { useRouter } from "next/router";
import { DefaultLayout } from "@/interface/default-layout";
import { Button, Heading, Stack, Text } from "@/interface/design-system";
import {
  AuthenticatedUser,
  requireAuthentication,
} from "@/infra/require-authentication";

type PainelProps = { user: AuthenticatedUser };

export const getServerSideProps: GetServerSideProps<PainelProps> = async (
  context,
) => {
  const auth = await requireAuthentication(context);

  if (!auth.user) {
    return { redirect: auth.redirect };
  }

  return { props: { user: auth.user } };
};

export default function PainelPage({ user }: PainelProps) {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function handleLogout() {
    setIsLoggingOut(true);
    try {
      await fetch("/api/v1/sessions", { method: "DELETE" });
    } finally {
      await router.push("/login");
    }
  }

  return (
    <DefaultLayout contentWidth="medium" metadata={{ title: "Painel" }}>
      <Stack gap="spacious">
        <Heading as="h1">Olá, {user.username}!</Heading>
        <Text muted>Você está logado como {user.email}.</Text>
        <Stack.Item>
          <Button onClick={handleLogout} disabled={isLoggingOut}>
            {isLoggingOut ? "Saindo..." : "Sair"}
          </Button>
        </Stack.Item>
      </Stack>
    </DefaultLayout>
  );
}
