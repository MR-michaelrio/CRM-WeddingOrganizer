export type CalendarEventDTO = {
  id: number;
  title: string;
  type: "meeting" | "wedding" | "sangjit" | "survey" | "loading" | "bongkar";
  startAt: string;
  endAt: string | null;
  location: string | null;
  notes: string | null;
  meetLink: string | null;
  clientId: number | null;
  client?: { id: number; names: string } | null;
};
