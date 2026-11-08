import { useEffect, useState } from "react";

import { DefaultLayout } from "@/interface/default-layout";
import { Banner } from "@primer/react";

import { useRouter } from "next/router";

enum ActivationStatus {
  LOADING = "LOADING",
  SUCCESS = "SUCCESS",
  FAILURE = "FAILURE",
}

export default function ActivateUserPage() {
  const router = useRouter();
  const [activationStatus, setActivationStatus] = useState<ActivationStatus>(
    ActivationStatus.LOADING,
  );
  const [errorMessage, setErrorMessage] = useState("");

  const activationTokenId = router.query.activationTokenId as string;

  useEffect(() => {
    if (!activationTokenId) {
      return;
    }

    async function sendActivationToken(activationTokenId: string) {
      try {
        const response = await fetch(
          `/api/v1/activations/${activationTokenId}`,
          {
            method: "PATCH",
          },
        );

        if (response.status === 200) {
          setActivationStatus(ActivationStatus.SUCCESS);
          return;
        }

        const activationReponseBody = await response.json();

        setErrorMessage(
          `${activationReponseBody.message} ${activationReponseBody.action}`,
        );
        setActivationStatus(ActivationStatus.FAILURE);
      } catch {
        setErrorMessage(
          "Houve uma falha de conexão com o servidor. Tente novamente mais tarde.",
        );
        setActivationStatus(ActivationStatus.FAILURE);
      }
    }

    sendActivationToken(activationTokenId);
  }, [activationTokenId]);

  return (
    <DefaultLayout
      contentWidth="small"
      metadata={{
        title: "Ativar cadastro",
      }}
    >
      {activationStatus === ActivationStatus.LOADING && (
        <Banner variant="info">
          <Banner.Title>Verificando token...</Banner.Title>
        </Banner>
      )}

      {activationStatus === ActivationStatus.SUCCESS && (
        <Banner variant="success">
          <Banner.Title>Cadastro ativado com sucesso</Banner.Title>
          <Banner.Description>
            Sua conta está ativa e você já ṕde{" "}
            <a href="/login">fazer o login</a>.
          </Banner.Description>
        </Banner>
      )}

      {activationStatus === ActivationStatus.FAILURE && (
        <Banner variant="critical">
          <Banner.Title>Não foi possível ativar seu cadastro.</Banner.Title>
          <Banner.Description>{errorMessage}</Banner.Description>
        </Banner>
      )}
    </DefaultLayout>
  );
}
