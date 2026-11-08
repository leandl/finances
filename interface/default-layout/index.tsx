import Head from "next/head";
import { Header, PageLayout, Text } from "@/interface/design-system";

type DefaultLayoutProps = {
  children: React.ReactNode;
  contentWidth?: "full" | "medium" | "small";
  metadata?: {
    title?: string;
    description?: string;
  };
};

export function DefaultLayout({
  children,
  metadata,
  contentWidth,
}: DefaultLayoutProps) {
  const title = metadata?.title ? `${metadata.title} · Finances` : "Finances";
  const currentYear = new Date().getFullYear();

  return (
    <>
      <Head>
        <title>{title}</title>
        {metadata?.description && (
          <meta name="description" content={metadata.description} />
        )}
      </Head>
      <Header>
        <Header.Item full>
          <Header.Link href="/">Finances</Header.Link>
        </Header.Item>
        <Header.Item>
          <Header.Link href="/login">Login</Header.Link>
        </Header.Item>
        <Header.Item>
          <Header.Link href="/cadastro">Cadastrar</Header.Link>
        </Header.Item>
      </Header>
      <PageLayout>
        <PageLayout.Content width={contentWidth}>{children}</PageLayout.Content>
        <PageLayout.Footer>
          <Text size="small">© {currentYear} My Finances.</Text>
        </PageLayout.Footer>
      </PageLayout>
    </>
  );
}
