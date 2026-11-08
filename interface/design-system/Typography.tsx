import { HTMLAttributes } from "react";
import { cx } from "./cx";
import styles from "./Typography.module.css";

type HeadingTag = "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
type HeadingVariant = "large" | "medium" | "small";

const defaultVariantByTag: Record<HeadingTag, HeadingVariant> = {
  h1: "large",
  h2: "medium",
  h3: "small",
  h4: "small",
  h5: "small",
  h6: "small",
};

type HeadingProps = HTMLAttributes<HTMLHeadingElement> & {
  as?: HeadingTag;
  variant?: HeadingVariant;
};

export function Heading({
  as: Tag = "h2",
  variant,
  className,
  ...rest
}: HeadingProps) {
  return (
    <Tag
      className={cx(
        styles.heading,
        styles[variant ?? defaultVariantByTag[Tag]],
        className,
      )}
      {...rest}
    />
  );
}

type TextProps = HTMLAttributes<HTMLSpanElement> & {
  size?: "small" | "medium";
  muted?: boolean;
};

export function Text({
  size = "medium",
  muted = false,
  className,
  ...rest
}: TextProps) {
  return (
    <span
      className={cx(
        size === "small" && styles.small,
        muted && styles.muted,
        className,
      )}
      {...rest}
    />
  );
}
