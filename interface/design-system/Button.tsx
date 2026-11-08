import { ButtonHTMLAttributes } from "react";
import { cx } from "./cx";
import styles from "./Button.module.css";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "primary" | "danger";
  block?: boolean;
};

export function Button({
  variant = "default",
  block = false,
  type = "button",
  className,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cx(
        styles.button,
        variant !== "default" && styles[variant],
        block && styles.block,
        className,
      )}
      {...rest}
    />
  );
}
