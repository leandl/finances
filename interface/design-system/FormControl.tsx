import {
  createContext,
  InputHTMLAttributes,
  LabelHTMLAttributes,
  ReactNode,
  useContext,
  useId,
} from "react";
import { cx } from "./cx";
import styles from "./FormControl.module.css";

const FormControlContext = createContext<{ id: string } | null>(null);

function FormControlRoot({ children }: { children: ReactNode }) {
  const id = useId();

  return (
    <FormControlContext.Provider value={{ id }}>
      <div className={styles.control}>{children}</div>
    </FormControlContext.Provider>
  );
}

function FormControlLabel({
  className,
  ...rest
}: LabelHTMLAttributes<HTMLLabelElement>) {
  const context = useContext(FormControlContext);

  return (
    <label
      htmlFor={context?.id}
      className={cx(styles.label, className)}
      {...rest}
    />
  );
}

export const FormControl = Object.assign(FormControlRoot, {
  Label: FormControlLabel,
});

type TextInputProps = InputHTMLAttributes<HTMLInputElement> & {
  block?: boolean;
};

export function TextInput({
  block = false,
  className,
  id,
  ...rest
}: TextInputProps) {
  const context = useContext(FormControlContext);

  return (
    <input
      id={id ?? context?.id}
      className={cx(styles.input, block && styles.block, className)}
      {...rest}
    />
  );
}
