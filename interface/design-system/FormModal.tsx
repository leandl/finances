import { FormEvent, ReactNode, useId } from "react";
import { Modal } from "./Modal";

type FormModalProps = {
  title: string;
  open: boolean;
  onClose: () => void;
  onSubmit: (formData: FormData) => void;
  children: ReactNode;
  okText?: string;
  cancelText?: string;
  centered?: boolean;
  loading?: boolean;
};

export function FormModal({
  title,
  open,
  onClose,
  onSubmit,
  children,
  okText = "Salvar",
  cancelText = "Cancelar",
  centered,
  loading,
}: FormModalProps) {
  const formId = useId();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;

    onSubmit(new FormData(event.currentTarget));
  }

  return (
    <Modal
      open={open}
      title={title}
      onCancel={onClose}
      okFormId={formId}
      okText={okText}
      cancelText={cancelText}
      centered={centered}
      loading={loading}
    >
      <form id={formId} onSubmit={handleSubmit}>
        {children}
      </form>
    </Modal>
  );
}
