import { SubmitEvent, useState } from "react";
import { useRouter } from "next/router";
import {
  Banner,
  Button,
  FormControl,
  Heading,
  Stack,
  Text,
  TextInput,
} from "@/interface/design-system";
import { DefaultLayout } from "@/interface/default-layout";

export default function LoginPage() {
  return (
    <DefaultLayout
      contentWidth="small"
      metadata={{
        title: "Login",
        description: "Acesse sua conta no Finances.",
      }}
    >
      <Stack gap="spacious">
        <Heading as="h1">Login</Heading>
        <LoginForm />
        <Text size="small" muted>
          Ainda não tem conta? <a href="/cadastro">Cadastre-se</a>.
        </Text>
      </Stack>
    </DefaultLayout>
  );
}

function getSafeRedirect(value: string | string[] | undefined): string {
  if (
    typeof value === "string" &&
    value.startsWith("/") &&
    !value.startsWith("//")
  ) {
    return value;
  }

  return "/contas";
}

function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const response = await fetch("/api/v1/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (response.status === 201) {
        await router.push(getSafeRedirect(router.query.redirect));
        return;
      }

      const responseBody = await response.json();
      setErrorMessage(`${responseBody.message} ${responseBody.action}`);
    } catch {
      setErrorMessage(
        "Houve uma falha de conexão com o servidor. Tente novamente mais tarde.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Stack gap="normal">
        {errorMessage && (
          <Banner variant="critical">
            <Banner.Title>Não foi possível fazer o login.</Banner.Title>
            <Banner.Description>{errorMessage}</Banner.Description>
          </Banner>
        )}

        <FormControl>
          <FormControl.Label>Email</FormControl.Label>
          <TextInput
            type="email"
            autoComplete="email"
            required
            block
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </FormControl>

        <FormControl>
          <FormControl.Label>Senha</FormControl.Label>
          <TextInput
            type="password"
            autoComplete="current-password"
            required
            block
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </FormControl>

        <Stack.Item>
          <Button variant="primary" type="submit" loading={isSubmitting}>
            {isSubmitting ? "Entrando..." : "Entrar"}
          </Button>
        </Stack.Item>
      </Stack>
    </form>
  );
}
