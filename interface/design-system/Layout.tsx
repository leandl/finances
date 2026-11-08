import { AnchorHTMLAttributes, HTMLAttributes, ReactNode } from "react";
import { cx } from "./cx";
import styles from "./Layout.module.css";

/* Header */

function HeaderRoot({ children }: { children: ReactNode }) {
  return (
    <header className={styles.header}>
      <nav className={styles.nav}>{children}</nav>
    </header>
  );
}

function HeaderItem({
  full = false,
  className,
  ...rest
}: HTMLAttributes<HTMLDivElement> & { full?: boolean }) {
  return (
    <div
      className={cx(styles.headerItem, full && styles.full, className)}
      {...rest}
    />
  );
}

function HeaderLink({
  className,
  ...rest
}: AnchorHTMLAttributes<HTMLAnchorElement>) {
  return <a className={cx(styles.headerLink, className)} {...rest} />;
}

export const Header = Object.assign(HeaderRoot, {
  Item: HeaderItem,
  Link: HeaderLink,
});

/* PageLayout */

function PageLayoutRoot({ children }: { children: ReactNode }) {
  return <div className={styles.page}>{children}</div>;
}

type ContentWidth = "full" | "medium" | "small";

function PageLayoutContent({
  width = "full",
  className,
  ...rest
}: HTMLAttributes<HTMLElement> & { width?: ContentWidth }) {
  return (
    <main
      className={cx(styles.content, styles[`width-${width}`], className)}
      {...rest}
    />
  );
}

function PageLayoutFooter({ className, ...rest }: HTMLAttributes<HTMLElement>) {
  return <footer className={cx(styles.footer, className)} {...rest} />;
}

export const PageLayout = Object.assign(PageLayoutRoot, {
  Content: PageLayoutContent,
  Footer: PageLayoutFooter,
});
