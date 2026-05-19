import { prisma } from "@/lib/prisma";
import { GET as getClients, POST as createClient } from "@/app/api/clients/route";
import { GET as getClientById, PATCH as patchClient, DELETE as deleteClient } from "@/app/api/clients/[id]/route";
import { GET as getWorkbook } from "@/app/api/workbooks/[clientId]/route";
import { POST as createSheet } from "@/app/api/workbooks/[clientId]/sheets/route";
import { PATCH as patchSheet, DELETE as deleteSheet } from "@/app/api/sheets/[id]/route";
import { GET as getTasks, POST as createTask } from "@/app/api/tasks/route";
import { PATCH as patchTask, DELETE as deleteTask } from "@/app/api/tasks/[id]/route";
import { GET as getVendors, POST as createVendor } from "@/app/api/vendors/route";
import { PATCH as patchVendor, DELETE as deleteVendor } from "@/app/api/vendors/[id]/route";
import { GET as getCrew, POST as createCrew } from "@/app/api/crew/route";
import { PATCH as patchCrew, DELETE as deleteCrew } from "@/app/api/crew/[id]/route";
import { GET as getPayments, POST as createPayment } from "@/app/api/payments/route";
import { GET as getInventory, POST as createInventory } from "@/app/api/inventory/route";
import { GET as getDesigns, POST as createDesign } from "@/app/api/designs/route";
import { GET as getDashboard } from "@/app/api/dashboard/route";
import { GET as getReports } from "@/app/api/reports/route";

const BASE_URL = "http://localhost";

function req(method: string, body?: unknown) {
  const headers = new Headers();
  const opts: RequestInit = { method, headers };
  if (body !== undefined) {
    headers.set("content-type", "application/json");
    opts.body = JSON.stringify(body);
  }
  return new Request(`${BASE_URL}/api`, opts);
}

async function responseData(res: Response) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

async function apiCall<T>(handler: (req: Request, ctx?: any) => Promise<Response>, body?: unknown, params?: Record<string, string>) {
  const response = await handler(req(body ? "POST" : "GET", body), params ? { params } : undefined);
  const data = await responseData(response);
  return { response, data } as { response: Response; data: T };
}

async function test() {
  console.log("Starting API route tests...");

  const createdIds: {
    clientId?: number;
    sheetId?: number;
    taskId?: number;
    vendorId?: number;
    crewId?: number;
    paymentId?: number;
    inventoryId?: number;
    designId?: number;
  } = {};

  try {
    const clientsRes = await getClients(req("GET"));
    assert(clientsRes.status === 200, "/api/clients GET failed");
    const clients = await responseData(clientsRes);
    assert(Array.isArray(clients), "/api/clients GET did not return an array");
    console.log("PASS: /api/clients GET");

    const clientPayload = {
      names: "Test Couple",
      eventType: "Wedding",
      eventDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      venue: "Test Venue",
      package: "Premium",
      contractValue: 120000000,
      notes: "API test client",
    };
    const createClientRes = await createClient(req("POST", clientPayload));
    assert(createClientRes.status === 201, "/api/clients POST failed");
    const createdClient = await responseData(createClientRes);
    assert(typeof createdClient.id === "number", "Created client missing id");
    createdIds.clientId = createdClient.id;
    console.log("PASS: /api/clients POST", createdClient.id);

    const clientByIdRes = await getClientById(req("GET"), { params: { id: String(createdIds.clientId) } });
    assert(clientByIdRes.status === 200, "/api/clients/[id] GET failed");
    const clientById = await responseData(clientByIdRes);
    assert(clientById.id === createdIds.clientId, "Client id mismatch");
    assert(Array.isArray(clientById.workbook?.sheets), "Client workbook sheets not present");
    console.log("PASS: /api/clients/[id] GET");

    const workbookRes = await getWorkbook(req("GET"), { params: { clientId: String(createdIds.clientId) } });
    assert(workbookRes.status === 200, "/api/workbooks/[clientId] GET failed");
    const workbook = await responseData(workbookRes);
    assert(workbook.clientId === createdIds.clientId, "Workbook clientId mismatch");
    assert(Array.isArray(workbook.sheets), "Workbook sheets missing");
    console.log("PASS: /api/workbooks/[clientId] GET");

    const sheetPayload = {
      name: "API Test Sheet",
      columns: ["A", "B", "C"],
      rows: [{ A: "1", B: "2", C: "3" }],
    };
    const sheetRes = await createSheet(req("POST", sheetPayload), { params: { clientId: String(createdIds.clientId) } });
    assert(sheetRes.status === 201, "/api/workbooks/[clientId]/sheets POST failed");
    const createdSheet = await responseData(sheetRes);
    assert(typeof createdSheet.id === "number", "Created sheet missing id");
    createdIds.sheetId = createdSheet.id;
    console.log("PASS: /api/workbooks/[clientId]/sheets POST");

    const patchSheetRes = await patchSheet(req("PATCH", { name: "Updated API Test Sheet" }), { params: { id: String(createdIds.sheetId) } });
    assert(patchSheetRes.status === 200, "/api/sheets/[id] PATCH failed");
    const patchedSheet = await responseData(patchSheetRes);
    assert(patchedSheet.name === "Updated API Test Sheet", "Sheet update did not apply");
    console.log("PASS: /api/sheets/[id] PATCH");

    const deleteSheetRes = await deleteSheet(req("DELETE"), { params: { id: String(createdIds.sheetId) } });
    assert(deleteSheetRes.status === 200, "/api/sheets/[id] DELETE failed");
    console.log("PASS: /api/sheets/[id] DELETE");
    delete createdIds.sheetId;

    const tasksRes = await getTasks(req("GET"));
    assert(tasksRes.status === 200, "/api/tasks GET failed");
    assert(Array.isArray(await responseData(tasksRes)), "/api/tasks GET did not return an array");
    console.log("PASS: /api/tasks GET");

    const taskPayload = {
      title: "API Test Task",
      category: "Testing",
      status: "todo",
      priority: "high",
      dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      assignee: "QA",
      notes: "Task created by API test",
      clientId: createdIds.clientId,
    };
    const createTaskRes = await createTask(req("POST", taskPayload));
    assert(createTaskRes.status === 201, "/api/tasks POST failed");
    const createdTask = await responseData(createTaskRes);
    assert(typeof createdTask.id === "number", "Created task missing id");
    createdIds.taskId = createdTask.id;
    console.log("PASS: /api/tasks POST");

    const patchTaskRes = await patchTask(req("PATCH", { status: "done" }), { params: { id: String(createdIds.taskId) } });
    assert(patchTaskRes.status === 200, "/api/tasks/[id] PATCH failed");
    const patchedTask = await responseData(patchTaskRes);
    assert(patchedTask.status === "done", "Task update did not apply");
    console.log("PASS: /api/tasks/[id] PATCH");

    const deleteTaskRes = await deleteTask(req("DELETE"), { params: { id: String(createdIds.taskId) } });
    assert(deleteTaskRes.status === 200, "/api/tasks/[id] DELETE failed");
    console.log("PASS: /api/tasks/[id] DELETE");
    delete createdIds.taskId;

    const vendorsRes = await getVendors(req("GET"));
    assert(vendorsRes.status === 200, "/api/vendors GET failed");
    assert(Array.isArray(await responseData(vendorsRes)), "/api/vendors GET did not return an array");
    console.log("PASS: /api/vendors GET");

    const vendorPayload = {
      name: "API Test Vendor",
      category: "Catering",
      contact: "vendor@example.com",
      phone: "081234567890",
      email: "vendor@test.local",
      portfolio: "https://example.com",
      notes: "Created via API test",
    };
    const createVendorRes = await createVendor(req("POST", vendorPayload));
    assert(createVendorRes.status === 201, "/api/vendors POST failed");
    const createdVendor = await responseData(createVendorRes);
    assert(typeof createdVendor.id === "number", "Created vendor missing id");
    createdIds.vendorId = createdVendor.id;
    console.log("PASS: /api/vendors POST");

    const patchVendorRes = await patchVendor(req("PATCH", { contact: "updated-contact@example.com" }), {
      params: { id: String(createdIds.vendorId) },
    });
    assert(patchVendorRes.status === 200, "/api/vendors/[id] PATCH failed");
    console.log("PASS: /api/vendors/[id] PATCH");

    const deleteVendorRes = await deleteVendor(req("DELETE"), { params: { id: String(createdIds.vendorId) } });
    assert(deleteVendorRes.status === 200, "/api/vendors/[id] DELETE failed");
    console.log("PASS: /api/vendors/[id] DELETE");
    delete createdIds.vendorId;

    const crewRes = await getCrew(req("GET"));
    assert(crewRes.status === 200, "/api/crew GET failed");
    assert(Array.isArray(await responseData(crewRes)), "/api/crew GET did not return an array");
    console.log("PASS: /api/crew GET");

    const crewPayload = {
      name: "API Test Crew",
      role: "Photographer",
      status: "available",
      phone: "081298765432",
      email: "crew@test.local",
      defaultFee: 500000,
    };
    const createCrewRes = await createCrew(req("POST", crewPayload));
    assert(createCrewRes.status === 201, "/api/crew POST failed");
    const createdCrew = await responseData(createCrewRes);
    assert(typeof createdCrew.id === "number", "Created crew missing id");
    createdIds.crewId = createdCrew.id;
    console.log("PASS: /api/crew POST");

    const patchCrewRes = await patchCrew(req("PATCH", { status: "scheduled" }), { params: { id: String(createdIds.crewId) } });
    assert(patchCrewRes.status === 200, "/api/crew/[id] PATCH failed");
    console.log("PASS: /api/crew/[id] PATCH");

    const deleteCrewRes = await deleteCrew(req("DELETE"), { params: { id: String(createdIds.crewId) } });
    assert(deleteCrewRes.status === 200, "/api/crew/[id] DELETE failed");
    console.log("PASS: /api/crew/[id] DELETE");
    delete createdIds.crewId;

    const paymentsRes = await getPayments(req("GET"));
    assert(paymentsRes.status === 200, "/api/payments GET failed");
    assert(Array.isArray(await responseData(paymentsRes)), "/api/payments GET did not return an array");
    console.log("PASS: /api/payments GET");

    const paymentPayload = {
      clientId: createdIds.clientId,
      type: "dp",
      method: "transfer",
      amount: 50000000,
      paymentDate: new Date().toISOString(),
      reference: "API-TEST-001",
      notes: "Payment created by API test",
    };
    const createPaymentRes = await createPayment(req("POST", paymentPayload));
    assert(createPaymentRes.status === 201, "/api/payments POST failed");
    const createdPayment = await responseData(createPaymentRes);
    assert(typeof createdPayment.id === "number", "Created payment missing id");
    createdIds.paymentId = createdPayment.id;
    console.log("PASS: /api/payments POST");

    const inventoryRes = await getInventory(req("GET"));
    assert(inventoryRes.status === 200, "/api/inventory GET failed");
    assert(Array.isArray(await responseData(inventoryRes)), "/api/inventory GET did not return an array");
    console.log("PASS: /api/inventory GET");

    const inventoryPayload = {
      name: "API Test Inventory",
      category: "Lighting",
      quantity: 5,
      available: 5,
      unit: "pcs",
      condition: "Good",
      location: "Warehouse 1",
      notes: "Created by API test",
    };
    const createInventoryRes = await createInventory(req("POST", inventoryPayload));
    assert(createInventoryRes.status === 201, "/api/inventory POST failed");
    const createdInventory = await responseData(createInventoryRes);
    assert(typeof createdInventory.id === "number", "Created inventory missing id");
    createdIds.inventoryId = createdInventory.id;
    console.log("PASS: /api/inventory POST");

    const designsRes = await getDesigns(req("GET"));
    assert(designsRes.status === 200, "/api/designs GET failed");
    assert(Array.isArray(await responseData(designsRes)), "/api/designs GET did not return an array");
    console.log("PASS: /api/designs GET");

    const designPayload = {
      name: "API Test Design",
      category: "Backdrop",
      status: "pending",
      thumbnail: "🎨",
      notes: "Created by API test",
      clientId: createdIds.clientId,
    };
    const createDesignRes = await createDesign(req("POST", designPayload));
    assert(createDesignRes.status === 201, "/api/designs POST failed");
    const createdDesign = await responseData(createDesignRes);
    assert(typeof createdDesign.id === "number", "Created design missing id");
    createdIds.designId = createdDesign.id;
    console.log("PASS: /api/designs POST");

    const dashboardRes = await getDashboard(req("GET"));
    assert(dashboardRes.status === 200, "/api/dashboard GET failed");
    const dashboardData = await responseData(dashboardRes);
    assert(dashboardData?.stats, "/api/dashboard GET missing stats");
    console.log("PASS: /api/dashboard GET");

    const reportsRes = await getReports(req("GET"));
    assert(reportsRes.status === 200, "/api/reports GET failed");
    const reportsData = await responseData(reportsRes);
    assert(reportsData?.stats, "/api/reports GET missing stats");
    console.log("PASS: /api/reports GET");

    // Cleanup created resources that do not have DELETE routes
    if (createdIds.paymentId) {
      await prisma.payment.delete({ where: { id: createdIds.paymentId } });
      delete createdIds.paymentId;
    }
    if (createdIds.inventoryId) {
      await prisma.inventoryItem.delete({ where: { id: createdIds.inventoryId } });
      delete createdIds.inventoryId;
    }
    if (createdIds.designId) {
      await prisma.design.delete({ where: { id: createdIds.designId } });
      delete createdIds.designId;
    }

    // Update client and then delete it
    if (createdIds.clientId) {
      const patchClientRes = await patchClient(req("PATCH", { notes: "Updated by API test" }), {
        params: { id: String(createdIds.clientId) },
      });
      assert(patchClientRes.status === 200, "/api/clients/[id] PATCH failed");
      console.log("PASS: /api/clients/[id] PATCH");

      const deleteClientRes = await deleteClient(req("DELETE"), {
        params: { id: String(createdIds.clientId) },
      });
      assert(deleteClientRes.status === 200, "/api/clients/[id] DELETE failed");
      console.log("PASS: /api/clients/[id] DELETE");
      delete createdIds.clientId;
    }

    console.log("All API route tests completed successfully.");
  } catch (error) {
    console.error("ERROR:", error);
    throw error;
  } finally {
    if (createdIds.clientId) {
      await prisma.client.delete({ where: { id: createdIds.clientId } }).catch(() => undefined);
    }
    if (createdIds.paymentId) {
      await prisma.payment.delete({ where: { id: createdIds.paymentId } }).catch(() => undefined);
    }
    if (createdIds.inventoryId) {
      await prisma.inventoryItem.delete({ where: { id: createdIds.inventoryId } }).catch(() => undefined);
    }
    if (createdIds.designId) {
      await prisma.design.delete({ where: { id: createdIds.designId } }).catch(() => undefined);
    }
    await prisma.$disconnect();
  }
}

void test();
