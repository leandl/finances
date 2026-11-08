import Head from "next/head";
import { PageLayout, Header, Text } from "@primer/react";

import styles from "./index.module.css";

const contentWidthClasses = {
  small: styles.smallContent,
} as const;

type PageLayoutContentWidth = "full" | "medium";

type CustomContentWidth = keyof typeof contentWidthClasses;

type DefaultLayoutProps = {
  children: React.ReactNode;
  contentWidth?: PageLayoutContentWidth | CustomContentWidth;
  metadata?: {
    title?: string;
    description?: string;
  };
};

function isCustomContentWidth(
  contentWidth: DefaultLayoutProps["contentWidth"],
): contentWidth is CustomContentWidth {
  return contentWidth !== undefined && contentWidth in contentWidthClasses;
}

export function DefaultLayout({
  children,
  metadata,
  contentWidth,
}: DefaultLayoutProps) {
  const title = metadata?.title ? `${metadata.title} · Finances` : "Finances";
  const currentYear = new Date().getFullYear();

  let extraContentClassName: string | undefined;
  let pageLayoutContentWidth: PageLayoutContentWidth | undefined;

  if (isCustomContentWidth(contentWidth)) {
    extraContentClassName = contentWidthClasses[contentWidth];
  } else {
    pageLayoutContentWidth = contentWidth;
  }

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
        <PageLayout.Content
          className={extraContentClassName}
          width={pageLayoutContentWidth}
        >
          {children}
        </PageLayout.Content>
        <PageLayout.Footer divider="line">
          <Text size="small">© {currentYear} Clone Finances.</Text>
        </PageLayout.Footer>
      </PageLayout>
    </>
  );
}
