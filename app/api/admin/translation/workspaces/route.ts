import { NextResponse } from "next/server";

import { adminApiError, parseAdminMutation } from "@/app/api/admin/_shared";
import { ApiError } from "@/lib/http/api-response";
import { createTranslationWorkspace, createTranslationWorkspaceSchema } from "@/services/translation-service";

export const maxDuration = 300;

export async function POST(request: Request) {
  try {
    const input = await parseAdminMutation(request, createTranslationWorkspaceSchema);
    if (request.headers.get("accept")?.includes("application/x-ndjson")) {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          let open = true;
          const send = (value: unknown) => {
            if (!open) return;
            try {
              controller.enqueue(encoder.encode(`${JSON.stringify(value)}\n`));
            } catch {
              open = false;
            }
          };
          send({ type: "stage", stage: "CONNECTING", label: "กำลังเตรียมข้อมูลและเชื่อมต่อ AI", modelName: "Automatic routing" });
          const heartbeat = setInterval(() => send({ type: "heartbeat", at: Date.now() }), 10_000);
          request.signal.addEventListener("abort", () => {
            open = false;
            clearInterval(heartbeat);
          }, { once: true });
          void createTranslationWorkspace(input, (stage) => send({ type: "stage", ...stage }))
            .then((workspace) => send({ type: "complete", workspace: { id: workspace.id } }))
            .catch((error: unknown) => send({
              type: "error",
              error: {
                code: error instanceof ApiError ? error.code : "AI_PROFILE_FAILED",
                message: error instanceof Error ? error.message : "สร้าง AI Profile ไม่สำเร็จ",
              },
            }))
            .finally(() => {
              clearInterval(heartbeat);
              if (open) controller.close();
              open = false;
            });
        },
      });
      return new Response(stream, {
        headers: {
          "cache-control": "private, no-store",
          "content-type": "application/x-ndjson; charset=utf-8",
          "x-accel-buffering": "no",
        },
      });
    }
    return NextResponse.json({ workspace: await createTranslationWorkspace(input) }, { status: 201 });
  } catch (error) {
    return adminApiError(error, request);
  }
}
