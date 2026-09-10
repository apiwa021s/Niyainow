/** Extract the structured API message used by client-side admin forms. */
export async function responseMessage(response: Response) {
  const body = await response.json().catch(() => null) as {
    error?: { message?: string; fields?: Record<string, string[]> };
  } | null;
  const fieldMessage = body?.error?.fields ? Object.values(body.error.fields).flat()[0] : undefined;
  return fieldMessage || body?.error?.message || `Request failed (${response.status})`;
}
