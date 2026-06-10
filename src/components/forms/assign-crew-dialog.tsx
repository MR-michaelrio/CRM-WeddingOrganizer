"use client";

import { Dialog } from "@/components/ui/dialog";
import { CrewAssignmentPanel } from "@/components/forms/crew-assignment-panel";
import { formatDateID } from "@/lib/format";
import type { ClientDTO } from "@/lib/types";

type Props = {
  open: boolean;
  onClose: () => void;
  client: ClientDTO;
};

export function AssignCrewDialog({ open, onClose, client }: Props) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={`Assign Crew · ${client.names}`}
      description={`${client.eventType} · ${formatDateID(client.eventDate)}`}
      size="lg"
      footer={
        <button onClick={onClose} className="btn btn-primary">
          Done
        </button>
      }
    >
      <CrewAssignmentPanel clientId={client.id} />
    </Dialog>
  );
}
