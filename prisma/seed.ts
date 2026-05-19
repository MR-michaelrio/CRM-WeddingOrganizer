import { PrismaClient } from "@prisma/client";
import {
  DAFTAR_BAKI_COLUMNS,
  SANGJIT_RUNDOWN_COLUMNS,
  buildDaftarBakiRows,
  buildSangjitRundownRows,
} from "../src/lib/templates/sangjit-rundown";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database…");

  // Clean slate (foreign keys will cascade)
  await prisma.activity.deleteMany();
  await prisma.design.deleteMany();
  await prisma.crewAssignment.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.task.deleteMany();
  await prisma.sheet.deleteMany();
  await prisma.workbook.deleteMany();
  await prisma.client.deleteMany();
  await prisma.user.deleteMany();
  await prisma.vendor.deleteMany();
  await prisma.crew.deleteMany();
  await prisma.inventoryItem.deleteMany();

  // ---- Users ----
  const sarah = await prisma.user.create({
    data: { name: "Sarah Chen", email: "sarah@wopremium.com", role: "admin" },
  });
  const linda = await prisma.user.create({
    data: { name: "Linda Tan", email: "linda@wopremium.com", role: "admin" },
  });
  const david = await prisma.user.create({
    data: { name: "David Wong", email: "david@wopremium.com", role: "admin" },
  });

  // ---- Clients ----
  const clientSeed = [
    {
      names: "Michael & Felicia",
      email: "michael.tan@email.com",
      phone: "0812-3456-7890",
      eventType: "Sangjit",
      eventDate: new Date("2026-05-18"),
      venue: "Grand Ballroom Hotel Mulia",
      package: "Premium",
      contractValue: 85_000_000,
      status: "active",
      eventStatus: "confirmed",
      progress: 85,
      picId: sarah.id,
    },
    {
      names: "Kevin & Cindy",
      email: "kevin.lim@email.com",
      phone: "0813-4567-8901",
      eventType: "Wedding",
      eventDate: new Date("2026-05-22"),
      venue: "The Ritz-Carlton Pacific Place",
      package: "Luxury",
      contractValue: 120_000_000,
      status: "active",
      eventStatus: "confirmed",
      progress: 72,
      picId: linda.id,
    },
    {
      names: "Jonathan & Grace",
      email: "jonathan@email.com",
      phone: "0814-5678-9012",
      eventType: "Wedding + Sangjit",
      eventDate: new Date("2026-05-25"),
      venue: "Shangri-La Hotel Jakarta",
      package: "Premium",
      contractValue: 95_000_000,
      status: "active",
      eventStatus: "pending",
      progress: 45,
      picId: sarah.id,
    },
    {
      names: "William & Michelle",
      email: "william.wu@email.com",
      phone: "0815-6789-0123",
      eventType: "Wedding",
      eventDate: new Date("2026-05-28"),
      venue: "Fairmont Jakarta",
      package: "Standard",
      contractValue: 65_000_000,
      status: "active",
      eventStatus: "confirmed",
      progress: 30,
      picId: david.id,
    },
    {
      names: "Steven & Jessica",
      email: "steven@email.com",
      phone: "0816-7890-1234",
      eventType: "Engagement",
      eventDate: new Date("2026-06-05"),
      venue: "Raffles Jakarta",
      package: "Standard",
      contractValue: 45_000_000,
      status: "active",
      eventStatus: "inquiry",
      progress: 15,
      picId: linda.id,
    },
    {
      names: "Daniel & Michelle",
      eventType: "Tea Pai",
      eventDate: new Date("2026-06-10"),
      venue: "Grand Hyatt",
      package: "Premium",
      contractValue: 70_000_000,
      status: "active",
      eventStatus: "confirmed",
      progress: 60,
      picId: sarah.id,
    },
    {
      names: "Andrew & Stella",
      eventType: "Sangjit",
      eventDate: new Date("2026-06-15"),
      venue: "Mandarin Oriental",
      package: "Premium",
      contractValue: 80_000_000,
      status: "planning",
      eventStatus: "confirmed",
      progress: 20,
      picId: david.id,
    },
    {
      names: "Jason & Emily",
      eventType: "Wedding",
      eventDate: new Date("2026-04-20"),
      venue: "Four Seasons",
      package: "Luxury",
      contractValue: 135_000_000,
      status: "completed",
      eventStatus: "confirmed",
      progress: 100,
      picId: linda.id,
    },
  ];

  const clients = await Promise.all(
    clientSeed.map((c) => prisma.client.create({ data: c }))
  );

  // ---- Workbooks & Sheets ----
  for (const client of clients) {
    const isSangjit =
      client.eventType === "Sangjit" || client.eventType === "Wedding + Sangjit";

    const wb = await prisma.workbook.create({
      data: {
        clientId: client.id,
        template: isSangjit ? "sangjit" : "wedding-ballroom",
      },
    });

    const sheets = buildSheetsForClient(isSangjit);
    await Promise.all(
      sheets.map((s, idx) =>
        prisma.sheet.create({
          data: { ...s, workbookId: wb.id, position: idx },
        })
      )
    );
  }

  // ---- Tasks ----
  const m1 = clients[0]!;
  const k1 = clients[1]!;
  const j1 = clients[2]!;
  const w1 = clients[3]!;

  await prisma.task.createMany({
    data: [
      {
        title: "Konfirmasi vendor catering",
        category: "Vendor",
        status: "todo",
        priority: "high",
        dueDate: new Date("2026-05-16"),
        clientId: m1.id,
      },
      {
        title: "Survey lighting setup",
        category: "Decoration",
        status: "todo",
        priority: "medium",
        dueDate: new Date("2026-05-17"),
        clientId: k1.id,
      },
      {
        title: "Follow up pembayaran pelunasan",
        category: "Administration",
        status: "todo",
        priority: "high",
        dueDate: new Date("2026-05-18"),
        clientId: j1.id,
      },
      {
        title: "Koordinasi dekorasi backdrop",
        category: "Decoration",
        status: "in_progress",
        priority: "medium",
        dueDate: new Date("2026-05-16"),
        assignee: "Budi",
        clientId: m1.id,
      },
      {
        title: "Finalisasi rundown acara",
        category: "Wedding",
        status: "in_progress",
        priority: "medium",
        dueDate: new Date("2026-05-19"),
        assignee: "Sarah",
        clientId: k1.id,
      },
      {
        title: "Design seat plan",
        category: "Decoration",
        status: "in_progress",
        priority: "medium",
        dueDate: new Date("2026-05-20"),
        assignee: "Linda",
        clientId: w1.id,
      },
      {
        title: "Review design backdrop",
        category: "Decoration",
        status: "review",
        priority: "medium",
        assignee: "Sarah",
        clientId: m1.id,
      },
      {
        title: "Approval menu makanan",
        category: "Vendor",
        status: "review",
        priority: "medium",
        assignee: "Linda",
        clientId: k1.id,
      },
      {
        title: "Contract signed",
        category: "Administration",
        status: "done",
        priority: "high",
        clientId: m1.id,
      },
      {
        title: "DP payment received",
        category: "Administration",
        status: "done",
        priority: "medium",
        clientId: k1.id,
      },
      {
        title: "Venue booked",
        category: "Administration",
        status: "done",
        priority: "medium",
        clientId: j1.id,
      },
    ],
  });

  // ---- Vendors ----
  await prisma.vendor.createMany({
    data: [
      {
        name: "Grand Catering Services",
        category: "Catering",
        contact: "Ibu Rina",
        phone: "0812-1111-2222",
        rating: 4.8,
        projects: 24,
      },
      {
        name: "Elite MUA Team",
        category: "Make Up Artist",
        contact: "Sandra",
        phone: "0813-2222-3333",
        rating: 4.9,
        projects: 18,
      },
      {
        name: "LuxLight Productions",
        category: "Lighting & Sound",
        contact: "Budi",
        phone: "0814-3333-4444",
        rating: 4.7,
        projects: 32,
      },
      {
        name: "Bloom & Blossom",
        category: "Florist",
        contact: "Maya",
        phone: "0815-4444-5555",
        rating: 4.9,
        projects: 28,
      },
      {
        name: "Pro Documentation",
        category: "Photography",
        contact: "Anton",
        phone: "0816-5555-6666",
        rating: 4.8,
        projects: 45,
      },
      {
        name: "Sweet Dreams Cake",
        category: "Wedding Cake",
        contact: "Lisa",
        phone: "0817-6666-7777",
        rating: 4.6,
        projects: 22,
      },
    ],
  });

  // ---- Crew ----
  await prisma.crew.createMany({
    data: [
      {
        name: "Budi Santoso",
        role: "Decoration Lead",
        phone: "0812-1111-1111",
        email: "budi@email.com",
        status: "available",
        rating: 4.8,
        projects: 45,
        defaultFee: 750_000,
      },
      {
        name: "Andi Wijaya",
        role: "Lighting Technician",
        phone: "0813-2222-2222",
        email: "andi@email.com",
        status: "scheduled",
        rating: 4.7,
        projects: 38,
        defaultFee: 600_000,
      },
      {
        name: "Siti Nurhaliza",
        role: "Event Coordinator",
        phone: "0814-3333-3333",
        email: "siti@email.com",
        status: "scheduled",
        rating: 4.9,
        projects: 52,
        defaultFee: 1_000_000,
      },
      {
        name: "Tommy Lim",
        role: "Setup Crew",
        phone: "0815-4444-4444",
        email: "tommy@email.com",
        status: "available",
        rating: 4.6,
        projects: 32,
        defaultFee: 450_000,
      },
      {
        name: "Linda Tan",
        role: "Event Coordinator",
        phone: "0816-5555-5555",
        email: "linda@email.com",
        status: "scheduled",
        rating: 4.8,
        projects: 48,
        defaultFee: 1_000_000,
      },
      {
        name: "David Wong",
        role: "Technical Manager",
        phone: "0817-6666-6666",
        email: "david@email.com",
        status: "available",
        rating: 4.9,
        projects: 55,
        defaultFee: 1_200_000,
      },
    ],
  });

  // ---- Payments ----
  await prisma.payment.createMany({
    data: [
      {
        clientId: m1.id,
        type: "dp",
        amount: 42_500_000,
        method: "transfer",
        paymentDate: new Date("2026-03-15"),
        reference: "INV-2026-001",
      },
      {
        clientId: k1.id,
        type: "dp",
        amount: 60_000_000,
        method: "transfer",
        paymentDate: new Date("2026-02-20"),
        reference: "INV-2026-002",
      },
      {
        clientId: k1.id,
        type: "final",
        amount: 60_000_000,
        method: "transfer",
        paymentDate: new Date("2026-04-15"),
        reference: "INV-2026-003",
      },
      {
        clientId: j1.id,
        type: "dp",
        amount: 28_500_000,
        method: "transfer",
        paymentDate: new Date("2026-03-25"),
        reference: "INV-2026-004",
      },
      {
        clientId: w1.id,
        type: "dp",
        amount: 19_500_000,
        method: "transfer",
        paymentDate: new Date("2026-04-01"),
        reference: "INV-2026-005",
      },
    ],
  });

  // ---- Inventory ----
  await prisma.inventoryItem.createMany({
    data: [
      {
        name: "Gold Chiavari Chairs",
        category: "Furniture",
        quantity: 200,
        available: 180,
        unit: "pcs",
        condition: "Good",
        location: "Warehouse A — Rack 1",
      },
      {
        name: "Round Tables (Ø 180cm)",
        category: "Furniture",
        quantity: 30,
        available: 28,
        unit: "pcs",
        condition: "Good",
        location: "Warehouse A — Rack 2",
      },
      {
        name: "LED Uplighting",
        category: "Lighting",
        quantity: 50,
        available: 45,
        unit: "units",
        condition: "Excellent",
        location: "Warehouse B — Rack 3",
      },
      {
        name: "White Drapery Panels",
        category: "Decoration",
        quantity: 100,
        available: 85,
        unit: "panels",
        condition: "Good",
        location: "Warehouse A — Rack 5",
      },
      {
        name: "Crystal Centerpiece",
        category: "Decoration",
        quantity: 40,
        available: 35,
        unit: "sets",
        condition: "Excellent",
        location: "Warehouse B — Rack 1",
      },
      {
        name: "Backdrop Frame 4x3m",
        category: "Structure",
        quantity: 8,
        available: 6,
        unit: "pcs",
        condition: "Good",
        location: "Warehouse A — Bay 4",
      },
    ],
  });

  // ---- Designs ----
  await prisma.design.createMany({
    data: [
      {
        name: "Backdrop Design",
        category: "Backdrop",
        status: "approved",
        thumbnail: "🎨",
        clientId: m1.id,
        uploadedAt: new Date("2026-05-12"),
      },
      {
        name: "Seat Plan Layout",
        category: "Seat Plan",
        status: "pending",
        thumbnail: "📐",
        clientId: m1.id,
        uploadedAt: new Date("2026-05-13"),
      },
      {
        name: "Invitation Card",
        category: "Invitation",
        status: "revision",
        thumbnail: "💌",
        clientId: k1.id,
        uploadedAt: new Date("2026-05-10"),
      },
      {
        name: "Table Setting Mockup",
        category: "Stage",
        status: "approved",
        thumbnail: "🍽️",
        clientId: k1.id,
        uploadedAt: new Date("2026-05-14"),
      },
      {
        name: "Stage Decoration",
        category: "Stage",
        status: "pending",
        thumbnail: "✨",
        clientId: j1.id,
        uploadedAt: new Date("2026-05-11"),
      },
      {
        name: "Photo Booth Design",
        category: "Photobooth",
        status: "approved",
        thumbnail: "📸",
        clientId: w1.id,
        uploadedAt: new Date("2026-05-09"),
      },
    ],
  });

  // ---- Activity feed ----
  await prisma.activity.createMany({
    data: [
      {
        type: "payment",
        text: "Pembayaran DP diterima dari Michael & Felicia",
        icon: "💰",
        createdAt: new Date(Date.now() - 2 * 3600_000),
      },
      {
        type: "task",
        text: "Checklist dekorasi selesai untuk event Kevin & Cindy",
        icon: "✓",
        createdAt: new Date(Date.now() - 3 * 3600_000),
      },
      {
        type: "vendor",
        text: "Vendor MUA dikonfirmasi untuk 18 Mei",
        icon: "👤",
        createdAt: new Date(Date.now() - 5 * 3600_000),
      },
      {
        type: "design",
        text: "Design backdrop diupload untuk approval",
        icon: "🎨",
        createdAt: new Date(Date.now() - 1 * 86400_000),
      },
      {
        type: "meeting",
        text: "Survey venue di Grand Ballroom selesai",
        icon: "📍",
        createdAt: new Date(Date.now() - 1 * 86400_000 - 3600_000),
      },
    ],
  });

  console.log("✅ Seed complete:");
  const counts = await Promise.all([
    prisma.client.count(),
    prisma.workbook.count(),
    prisma.sheet.count(),
    prisma.task.count(),
    prisma.vendor.count(),
    prisma.crew.count(),
    prisma.payment.count(),
    prisma.inventoryItem.count(),
    prisma.design.count(),
    prisma.activity.count(),
  ]);
  console.log({
    clients: counts[0],
    workbooks: counts[1],
    sheets: counts[2],
    tasks: counts[3],
    vendors: counts[4],
    crew: counts[5],
    payments: counts[6],
    inventory: counts[7],
    designs: counts[8],
    activities: counts[9],
  });
}

type SheetSeed = {
  slug: string;
  name: string;
  columns: string[];
  rows: Record<string, string>[];
};

function buildSheetsForClient(isSangjit: boolean): SheetSeed[] {
  const weddingRundown: SheetSeed = {
    slug: "wedding-rundown",
    name: "Wedding Rundown",
    columns: [
      "Start Time",
      "End Time",
      "Duration",
      "Susunan Acara",
      "PIC",
      "Location",
      "Notes",
      "Status",
    ],
    rows: [
      {
        "Start Time": "06:00",
        "End Time": "08:00",
        Duration: "2h",
        "Susunan Acara": "Crew arrival & setup preparation",
        PIC: "Tommy",
        Location: "Venue",
        Notes: "",
        Status: "Pending",
      },
      {
        "Start Time": "08:00",
        "End Time": "10:00",
        Duration: "2h",
        "Susunan Acara": "Decoration setup start",
        PIC: "Budi",
        Location: "Main Hall",
        Notes: "",
        Status: "Pending",
      },
      {
        "Start Time": "10:00",
        "End Time": "12:00",
        Duration: "2h",
        "Susunan Acara": "Lighting & sound check",
        PIC: "Andi",
        Location: "Stage",
        Notes: "",
        Status: "Pending",
      },
      {
        "Start Time": "12:00",
        "End Time": "14:00",
        Duration: "2h",
        "Susunan Acara": "Vendor arrival & briefing",
        PIC: "Sarah",
        Location: "Backstage",
        Notes: "",
        Status: "Pending",
      },
      {
        "Start Time": "16:00",
        "End Time": "18:00",
        Duration: "2h",
        "Susunan Acara": "Guest reception",
        PIC: "Linda",
        Location: "Lobby",
        Notes: "",
        Status: "Pending",
      },
    ],
  };

  const sangjitRundown: SheetSeed = {
    slug: "sangjit-rundown",
    name: "Sangjit Rundown",
    columns: [...SANGJIT_RUNDOWN_COLUMNS],
    rows: buildSangjitRundownRows(),
  };

  const daftarBaki: SheetSeed = {
    slug: "daftar-baki",
    name: "Daftar Baki",
    columns: [...DAFTAR_BAKI_COLUMNS],
    rows: buildDaftarBakiRows(),
  };

  const vendorList: SheetSeed = {
    slug: "vendor-list",
    name: "Vendor List",
    columns: [
      "Vendor Type",
      "Vendor Name",
      "Contact Person",
      "Phone",
      "Price",
      "Status",
      "Notes",
    ],
    rows: [
      {
        "Vendor Type": "Catering",
        "Vendor Name": "Grand Catering",
        "Contact Person": "Ibu Rina",
        Phone: "0812-1111-2222",
        Price: "Rp 25.000.000",
        Status: "Confirmed",
        Notes: "",
      },
      {
        "Vendor Type": "MUA",
        "Vendor Name": "Elite MUA Team",
        "Contact Person": "Sandra",
        Phone: "0813-2222-3333",
        Price: "Rp 15.000.000",
        Status: "Confirmed",
        Notes: "",
      },
      {
        "Vendor Type": "Lighting",
        "Vendor Name": "LuxLight Productions",
        "Contact Person": "Budi",
        Phone: "0814-3333-4444",
        Price: "Rp 12.000.000",
        Status: "Pending",
        Notes: "",
      },
    ],
  };

  const finance: SheetSeed = {
    slug: "finance",
    name: "Finance",
    columns: ["Category", "Item", "Budget", "Actual", "Difference", "Status", "Notes"],
    rows: [
      {
        Category: "Decoration",
        Item: "Backdrop & Stage",
        Budget: "Rp 20.000.000",
        Actual: "",
        Difference: "",
        Status: "Planned",
        Notes: "",
      },
      {
        Category: "Catering",
        Item: "Food & Beverage",
        Budget: "Rp 25.000.000",
        Actual: "",
        Difference: "",
        Status: "Planned",
        Notes: "",
      },
      {
        Category: "Photography",
        Item: "Documentation",
        Budget: "Rp 18.000.000",
        Actual: "",
        Difference: "",
        Status: "Planned",
        Notes: "",
      },
    ],
  };

  const checklist: SheetSeed = {
    slug: "checklist",
    name: "Checklist",
    columns: ["Task", "Category", "Due Date", "PIC", "Status", "Notes"],
    rows: [
      {
        Task: "Tanda tangan kontrak",
        Category: "Administration",
        "Due Date": "2026-04-01",
        PIC: "Sarah",
        Status: "Done",
        Notes: "",
      },
      {
        Task: "Konfirmasi venue",
        Category: "Administration",
        "Due Date": "2026-04-10",
        PIC: "Sarah",
        Status: "Done",
        Notes: "",
      },
      {
        Task: "Final fitting MUA",
        Category: "Wedding",
        "Due Date": "2026-05-10",
        PIC: "Linda",
        Status: "In Progress",
        Notes: "",
      },
    ],
  };

  return isSangjit
    ? [sangjitRundown, daftarBaki, weddingRundown, vendorList, finance, checklist]
    : [weddingRundown, vendorList, finance, checklist];
}

main()
  .catch((err) => {
    console.error("❌ Seed failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
