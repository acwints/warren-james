import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { IntegrationHttpError } from "@/server/integrations/http";

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
  }
}

export function apiErrorResponse(error: unknown) {
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: "Validation failed",
        issues: error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      },
      { status: 400 },
    );
  }

  if (error instanceof SyntaxError) {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  if (error instanceof NotFoundError) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  if (error instanceof Error && error.message.startsWith("Workflow run not found")) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  if (error instanceof IntegrationHttpError) {
    return NextResponse.json(
      {
        error: error.message,
        provider: error.provider,
        upstreamStatus: error.status,
      },
      { status: 502 },
    );
  }

  return NextResponse.json(
    { error: error instanceof Error ? error.message : "Unexpected server error" },
    { status: 500 },
  );
}
