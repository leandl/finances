import { Banner } from "@/interface/design-system";
import { DefaultLayout } from "@/interface/default-layout";

export default function ConfirmRegisterPage() {
  return (
    <DefaultLayout
      contentWidth="small"
      metadata={{
        title: "Confirme seu e-mail",
      }}
    >
      <Banner
        variant="warning"
        title="Falta só uma etapa!"
        description="Abra o e-mail enviado pelo Finances e clique no link de confirmação."
      />
    </DefaultLayout>
  );
}
