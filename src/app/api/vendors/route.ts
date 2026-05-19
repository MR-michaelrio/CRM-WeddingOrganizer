import { prisma } from "@/lib/prisma";
import { created, ok, parseJson, serverError } from "@/lib/api-helpers";

type CreateVendorBody = {
  name: string;
  category: string;
  contact?: string;
  phone?: string;
  email?: string;
  portfolio?: string;
  notes?: string;
};

export async function GET() {
  try {
    const vendors = await prisma.vendor.findMany({ orderBy: { name: "asc" } });
    return ok(vendors);
  } catch (err) {
    return serverError(err);
  }
}

export async function POST(req: Request) {
  try {
    const body = await parseJson<CreateVendorBody>(req);
    const vendor = await prisma.vendor.create({ data: body });
    return created(vendor);
  } catch (err) {
    return serverError(err);
  }
}
