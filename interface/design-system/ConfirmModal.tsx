import { ReactNode } from "react";
import { Modal } from "./Modal";

type ConfirmModalProps = {
  open: boolean;
  title: string;
  children: ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
  okText?: string;
  cancelText?: string;
  /** Usa o estilo "danger" no botão de confirmação (ações destrutivas). */
  danger?: boolean;
  centered?: boolean;
  loading?: boolean;
};

export function ConfirmModal({
  open,
  title,
  children,
  onConfirm,
  onCancel,
  okText = "Confirmar",
  cancelText = "Cancelar",
  danger = false,
  centered = true,
  loading,
}: ConfirmModalProps) {
  return (
    <Modal
      open={open}
      title={title}
      onOk={onConfirm}
      onCancel={onCancel}
      okText={okText}
      cancelText={cancelText}
      okVariant={danger ? "danger" : "primary"}
      centered={centered}
      loading={loading}
    >
      {children}
    </Modal>
  );
}
