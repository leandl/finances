import { HTMLAttributes } from "react";
import { cx } from "./cx";
import styles from "./Stack.module.css";

type StackProps = HTMLAttributes<HTMLDivElement> & {
  gap?: "condensed" | "normal" | "spacious";
  /** "responsive": vertical no mobile, horizontal a partir de 48rem */
  direction?: "vertical" | "horizontal" | "responsive";
};

function StackRoot({
  gap = "normal",
  direction = "vertical",
  className,
  ...rest
}: StackProps) {
  return (
    <div
      className={cx(styles.stack, styles[gap], styles[direction], className)}
      {...rest}
    />
  );
}

type StackItemProps = HTMLAttributes<HTMLDivElement> & { grow?: boolean };

function StackItem({ grow = false, className, ...rest }: StackItemProps) {
  return <div className={cx(grow && styles.grow, className)} {...rest} />;
}

export const Stack = Object.assign(StackRoot, { Item: StackItem });
