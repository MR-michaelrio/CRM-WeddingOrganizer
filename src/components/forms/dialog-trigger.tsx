"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { NewClientDialog } from "./new-client-dialog";
import { NewTaskDialog } from "./new-task-dialog";
import { NewVendorDialog } from "./new-vendor-dialog";
import { NewCrewDialog } from "./new-crew-dialog";
import { NewItemDialog } from "./new-item-dialog";
import { NewPaymentDialog } from "./new-payment-dialog";
import { UploadDesignDialog } from "./upload-design-dialog";
import { NewWorkbookDialog } from "./new-workbook-dialog";

type Kind =
  | "client"
  | "task"
  | "vendor"
  | "crew"
  | "item"
  | "payment"
  | "design"
  | "workbook";

type Props = {
  kind: Kind;
  label?: string;
  variant?: "primary" | "secondary";
  onSuccess?: () => void;
};

const defaultLabels: Record<Kind, string> = {
  client: "New Client",
  task: "New Task",
  vendor: "Add Vendor",
  crew: "Add Crew",
  item: "Add Item",
  payment: "Record Payment",
  design: "Upload Design",
  workbook: "New Workbook",
};

export function DialogTrigger({ kind, label, variant = "primary", onSuccess }: Props) {
  const [open, setOpen] = useState(false);
  const cls = variant === "primary" ? "btn btn-primary" : "btn btn-secondary";

  const handleClose = () => setOpen(false);
  const handleSuccess = () => {
    onSuccess?.();
    setOpen(false);
  };

  return (
    <>
      <button className={cls} onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        {label ?? defaultLabels[kind]}
      </button>

      {kind === "client" && (
        <NewClientDialog open={open} onClose={handleClose} onSuccess={handleSuccess} />
      )}
      {kind === "task" && (
        <NewTaskDialog open={open} onClose={handleClose} onSuccess={handleSuccess} />
      )}
      {kind === "vendor" && (
        <NewVendorDialog open={open} onClose={handleClose} onSuccess={handleSuccess} />
      )}
      {kind === "crew" && (
        <NewCrewDialog open={open} onClose={handleClose} onSuccess={handleSuccess} />
      )}
      {kind === "item" && (
        <NewItemDialog open={open} onClose={handleClose} onSuccess={handleSuccess} />
      )}
      {kind === "payment" && (
        <NewPaymentDialog open={open} onClose={handleClose} onSuccess={handleSuccess} />
      )}
      {kind === "design" && (
        <UploadDesignDialog open={open} onClose={handleClose} onSuccess={handleSuccess} />
      )}
      {kind === "workbook" && (
        <NewWorkbookDialog open={open} onClose={handleClose} onSuccess={handleSuccess} />
      )}
    </>
  );
}
