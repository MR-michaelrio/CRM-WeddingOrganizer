// Plain types matching API responses (no Decimal — Prisma Decimal is serialized as string in JSON)

export type ClientDTO = {
  id: number;
  names: string;
  email: string | null;
  phone: string | null;
  eventType: string;
  eventDate: string;
  venue: string | null;
  package: string | null;
  jenisBaki: string | null;
  contractValue: string | null;
  status: "planning" | "active" | "completed";
  eventStatus: "confirmed" | "pending" | "inquiry";
  progress: number;
  notes: string | null;
  galleryUrl: string | null;
  picId: number | null;
  pic?: { id: number; name: string } | null;
  createdAt: string;
  updatedAt: string;
};

export type SheetDTO = {
  id: number;
  workbookId: number;
  slug: string;
  name: string;
  position: number;
  columns: string[];
  rows: Record<string, string>[];
};

export type WorkbookDTO = {
  id: number;
  clientId: number;
  template: string | null;
  client: ClientDTO & { pic?: { name: string } | null };
  sheets: SheetDTO[];
};

export type TaskDTO = {
  id: number;
  title: string;
  category: string;
  status: "todo" | "in_progress" | "review" | "done";
  priority: "low" | "medium" | "high";
  dueDate: string | null;
  assignee: string | null;
  notes: string | null;
  clientId: number | null;
  client?: { id: number; names: string } | null;
};

export type VendorDTO = {
  id: number;
  name: string;
  category: string;
  contact: string | null;
  phone: string | null;
  email: string | null;
  portfolio: string | null;
  rating: number;
  projects: number;
  notes: string | null;
};

export type CrewAssignmentDTO = {
  id: number;
  crewId: number;
  clientId: number;
  role: string | null;
  fee: string | null;
  startTime: string | null;
  endTime: string | null;
  attendance: string;
  client: {
    id: number;
    names: string;
    eventType: string;
    eventDate: string;
    venue: string | null;
  };
};

export type CrewDTO = {
  id: number;
  name: string;
  role: string;
  phone: string | null;
  email: string | null;
  status: "available" | "scheduled" | "off_duty";
  defaultFee: string | null;
  rating: number;
  projects: number;
  assignments?: CrewAssignmentDTO[];
};

export type PaymentDTO = {
  id: number;
  clientId: number | null;
  client?: { id: number; names: string; contractValue: string | null } | null;
  type: string;
  method: string;
  amount: string;
  paymentDate: string;
  reference: string | null;
  notes: string | null;
};

export type InventoryItemDTO = {
  id: number;
  name: string;
  category: string;
  quantity: number;
  available: number;
  unit: string;
  condition: "Excellent" | "Good" | "Fair" | "NeedsRepair";
  location: string | null;
  notes: string | null;
};

export type DesignDTO = {
  id: number;
  name: string;
  category: string;
  status: "approved" | "pending" | "revision";
  thumbnail: string | null;
  fileUrl: string | null;
  notes: string | null;
  clientId: number | null;
  client?: { id: number; names: string } | null;
  uploadedAt: string;
};

export type ActivityDTO = {
  id: number;
  type: string;
  text: string;
  icon: string;
  createdAt: string;
};

export type DashboardDTO = {
  stats: {
    eventsThisMonth: number;
    monthlyRevenue: number;
    outstanding: number;
    taskProgress: number;
  };
  upcomingEvents: (ClientDTO & { pic?: { name: string } | null })[];
  activities: ActivityDTO[];
  crewSchedule: CrewDTO[];
};

export type ReportsDTO = {
  stats: {
    totalEvents: number;
    totalRevenue: number;
    avgValue: number;
    activeCrew: number;
  };
  monthlyRevenue: { month: string; value: number; events: number }[];
  eventTypes: { type: string; count: number }[];
  vendors: VendorDTO[];
  crew: CrewDTO[];
};
