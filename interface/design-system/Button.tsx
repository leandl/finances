import { ButtonHTMLAttributes } from "react";
import { cx } from "./cx";
import styles from "./Button.module.css";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "primary" | "danger";
  block?: boolean;
  /** Mostra um spinner e desabilita o botão (evita clique duplo). */
  loading?: boolean;
};

export function Button({
  variant = "default",
  block = false,
  type = "button",
  loading = false,
  disabled,
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cx(
        styles.button,
        variant !== "default" && styles[variant],
        block && styles.block,
        className,
      )}
      {...rest}
    >
      {children}
      {loading && <span className={styles.spinner} aria-hidden="true" />}
    </button>
  );
}
