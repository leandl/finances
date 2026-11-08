import { HTMLAttributes } from "react";
import { cx } from "./cx";
import styles from "./Card.module.css";

function CardRoot({ className, ...rest }: HTMLAttributes<HTMLElement>) {
  return <article className={cx(styles.card, className)} {...rest} />;
}

function CardHeading({
  className,
  ...rest
}: HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cx(styles.heading, className)} {...rest} />;
}

function CardDescription({
  className,
  ...rest
}: HTMLAttributes<HTMLDivElement>) {
  return <div className={cx(styles.description, className)} {...rest} />;
}

function CardMetadata({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cx(styles.metadata, className)} {...rest} />;
}

export const Card = Object.assign(CardRoot, {
  Heading: CardHeading,
  Description: CardDescription,
  Metadata: CardMetadata,
});
