import {
  MouseEvent,
  ReactNode,
  SyntheticEvent,
  useEffect,
  useId,
  useRef,
} from "react";
import { Button } from "./Button";
import { cx } from "./cx";
import styles from "./Modal.module.css";

export type ModalProps = {
  open: boolean;
  title: string;
  children: ReactNode;
  onCancel: () => void;
  /** Ignorado quando `okFormId` é informado (o botão faz submit do form). */
  onOk?: () => void;
  /** Id de um <form> a ser submetido pelo botão de confirmação. */
  okFormId?: string;
  okText?: string;
  cancelText?: string;
  okVariant?: "primary" | "danger";
  centered?: boolean;
  /** Desabilita os botões e impede fechar (Esc / clique fora) enquanto true. */
  loading?: boolean;
};

export function Modal({
  open,
  title,
  children,
  onCancel,
  onOk,
  okFormId,
  okText = "OK",
  cancelText = "Cancelar",
  okVariant = "primary",
  centered = false,
  loading = false,
}: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  // Esc: quem controla o fechamento é a prop `open`, não o navegador.
  function handleCancel(event: SyntheticEvent<HTMLDialogElement>) {
    event.preventDefault();
    if (!loading) onCancel();
  }

  // O <dialog> não tem padding, então clicar nele mesmo = clicar no backdrop.
  function handleClick(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === event.currentTarget && !loading) onCancel();
  }

  return (
    <dialog
      ref={dialogRef}
      className={cx(styles.dialog, centered && styles.centered)}
      aria-labelledby={titleId}
      onCancel={handleCancel}
      onClick={handleClick}
    >
      {open && (
        <div className={styles.panel}>
          <header className={styles.header}>
            <h2 id={titleId} className={styles.title}>
              {title}
            </h2>
          </header>

          <div className={styles.body}>{children}</div>

          <footer className={styles.footer}>
            <Button onClick={onCancel} disabled={loading}>
              {cancelText}
            </Button>
            <Button
              variant={okVariant}
              type={okFormId ? "submit" : "button"}
              form={okFormId}
              onClick={okFormId ? undefined : onOk}
              loading={loading}
            >
              {okText}
            </Button>
          </footer>
        </div>
      )}
    </dialog>
  );
}
