import { handleApiRequest } from "@/server/api-handler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(request: Request) {
  return handleApiRequest(request);
}

export function POST(request: Request) {
  return handleApiRequest(request);
}

export function PATCH(request: Request) {
  return handleApiRequest(request);
}

export function DELETE(request: Request) {
  return handleApiRequest(request);
}
