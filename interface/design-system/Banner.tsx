import { HTMLAttributes, ReactNode } from "react";
import { cx } from "./cx";
import styles from "./Banner.module.css";

type BannerProps = {
  variant?: "info" | "success" | "warning" | "critical";
  layout?: "default" | "compact";
  /** Atalhos para quando não precisar de composição */
  title?: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
};

function BannerRoot({
  variant = "info",
  layout = "default",
  title,
  description,
  children,
}: BannerProps) {
  return (
    <div
      role={variant === "critical" ? "alert" : "status"}
      className={cx(styles.banner, styles[variant], styles[layout])}
    >
      {title && <BannerTitle>{title}</BannerTitle>}
      {description && <BannerDescription>{description}</BannerDescription>}
      {children}
    </div>
  );
}

function BannerTitle({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cx(styles.title, className)} {...rest} />;
}

function BannerDescription({
  className,
  ...rest
}: HTMLAttributes<HTMLDivElement>) {
  return <div className={cx(styles.description, className)} {...rest} />;
}

export const Banner = Object.assign(BannerRoot, {
  Title: BannerTitle,
  Description: BannerDescription,
});
