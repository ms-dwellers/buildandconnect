export class RequestBodyTooLarge extends Error {}

/** Bound streaming bodies as well as Content-Length; never trust the latter alone. */
export async function readRequestBody(
  request: Pick<Request, "headers" | "body">,
  maximumBytes = 32 * 1024,
): Promise<ArrayBuffer> {
  if (Number(request.headers.get("Content-Length")) > maximumBytes)
    throw new RequestBodyTooLarge();
  if (!request.body) return new ArrayBuffer(0);
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maximumBytes) {
        await reader.cancel();
        throw new RequestBodyTooLarge();
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes.buffer;
}
