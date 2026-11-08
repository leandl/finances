import { SubmitEvent, useState } from "react";
import {
  Banner,
  Button,
  FormControl,
  Heading,
  Stack,
  TextInput,
} from "@/interface/design-system";
import { DefaultLayout } from "@/interface/default-layout";

export default function RegisterPage() {
  return (
    <DefaultLayout
      contentWidth="small"
      metadata={{
        title: "Cadastro",
        description: "Crie sua conta de forma gratuida.",
      }}
    >
      <Stack gap="spacious">
        <Heading as="h1">Cadastro</Heading>
        <RegisterForm />
      </Stack>
    </DefaultLayout>
  );
}

function RegisterForm() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage("");

    const requestBody = {
      username,
      email,
      password,
    };

    try {
      const response = await fetch("/api/v1/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (response.status === 201) {
        location.href = "/cadastro/confirmar";
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
          <FormControl.Label>Nome de usuário</FormControl.Label>
          <TextInput
            type="text"
            block
            value={username}
            onChange={(event) => {
              setUsername(event.target.value);
            }}
          />
        </FormControl>

        <FormControl>
          <FormControl.Label>Email</FormControl.Label>
          <TextInput
            type="text"
            block
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
            }}
          />
        </FormControl>

        <FormControl>
          <FormControl.Label>Senha</FormControl.Label>
          <TextInput
            type="password"
            block
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
            }}
          />
        </FormControl>
        <Stack.Item>
          <Button variant="primary" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Criando cadastro..." : "Criar cadastro"}
          </Button>
        </Stack.Item>
      </Stack>
    </form>
  );
}
