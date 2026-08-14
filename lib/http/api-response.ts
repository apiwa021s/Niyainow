import { NextResponse } from "next/server";
import type { ZodType } from "zod";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function parseJson<T>(request: Request, schema: ZodType<T>): Promise<T> {
  let input: unknown;
  try {
    input = await request.json();
  } catch {
    throw new ApiError(400, "INVALID_JSON", "คำขอไม่ใช่ JSON ที่ถูกต้อง");
  }

  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    throw new ApiError(400, "VALIDATION_ERROR", "ข้อมูลที่ส่งมาไม่ถูกต้อง");
  }
  return parsed.data;
}

export function apiErrorResponse(error: unknown) {
  if (error instanceof ApiError) {
    return NextResponse.json({ error: { code: error.code, message: error.message } }, { status: error.status });
  }

  return NextResponse.json(
    { error: { code: "INTERNAL_ERROR", message: "ระบบไม่สามารถดำเนินการได้ในขณะนี้" } },
    { status: 500 },
  );
}
