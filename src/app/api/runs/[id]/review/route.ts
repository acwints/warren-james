import { NextResponse } from "next/server";
import { z } from "zod";
import { apiErrorResponse } from "@/server/api/errors";
import { requireGoogleSession } from "@/server/auth/google";
import { updateReviewItemStatus } from "@/server/repositories/run-store";

const reviewUpdateSchema = z.object({
  itemId: z.string().min(1),
  status: z.enum(["needs-review", "approved", "blocked"]),
});

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { response } = await requireGoogleSession();

    if (response) {
      return response;
    }

    const { id } = await context.params;
    const body = reviewUpdateSchema.parse(await request.json());
    const run = updateReviewItemStatus(id, body.itemId, body.status);

    return NextResponse.json({ run });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
