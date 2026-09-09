import { NextResponse } from "next/server";

import { adminApiError, parseAdminMutation } from "@/app/api/admin/_shared";
import { ApiError } from "@/lib/http/api-response";
import { logger } from "@/lib/logger";
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
          let settled = false;
          let lastStage = "CONNECTING";
          const logContext = {
            route: "/api/admin/translation/workspaces",
            importSourceId: input.importSourceId,
            targetLanguage: input.targetLanguage,
            regenerate: input.regenerate,
            requestId: request.headers.get("x-vercel-id") ?? request.headers.get("x-request-id") ?? undefined,
          };
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
            if (!settled) logger.warn("AI profile progress stream disconnected", { ...logContext, lastStage });
            open = false;
            clearInterval(heartbeat);
          }, { once: true });
          void createTranslationWorkspace(input, (stage) => {
            lastStage = stage.stage;
            send({ type: "stage", ...stage });
          })
            .then((workspace) => send({ type: "complete", workspace: { id: workspace.id } }))
            .catch((error: unknown) => {
              logger.error("AI profile pipeline failed", { ...logContext, lastStage, error });
              send({
                type: "error",
                error: {
                  code: error instanceof ApiError ? error.code : "AI_PROFILE_FAILED",
                  message: error instanceof Error ? error.message : "สร้าง AI Profile ไม่สำเร็จ",
                },
              });
            })
            .finally(() => {
              settled = true;
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
