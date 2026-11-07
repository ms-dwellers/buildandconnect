export function GET() {
  return Response.json(
    { status: "ok", service: "buildandconnect" },
    { headers: { "Cache-Control": "no-store" } },
  );
}
