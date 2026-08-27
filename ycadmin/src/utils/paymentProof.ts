export function resolvePaymentProofUrl(payment: {
  proofFileUrl?: string | null;
  proofUrl?: string | null;
} | null | undefined): string | null {
  if (!payment) return null;
  const url = payment.proofFileUrl || payment.proofUrl || "";
  return typeof url === "string" && url.trim() ? url.trim() : null;
}

export function resolvePaymentProofUrls(payment: {
  proofFileUrl?: string | null;
  proofUrl?: string | null;
  proofUrls?: string[] | null;
} | null | undefined): string[] {
  if (!payment) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  const push = (raw: unknown) => {
    if (typeof raw !== "string") return;
    const trimmed = raw.trim();
    if (!trimmed || seen.has(trimmed)) return;
    seen.add(trimmed);
    out.push(trimmed);
  };

  const primary = resolvePaymentProofUrl(payment);
  if (primary) push(primary);

  const list = payment.proofUrls;
  if (Array.isArray(list)) {
    list.forEach(push);
  }

  return out;
}

export function formatProofDisplayUrl(
  url: string | null | undefined,
  apiBaseUrl: string,
): string {
  if (!url || typeof url !== "string") return "";
  if (
    url.startsWith("http://") ||
    url.startsWith("https://") ||
    url.startsWith("blob:") ||
    url.startsWith("data:")
  ) {
    return url;
  }
  const serverBase = String(apiBaseUrl || "").replace(/\/api$/, "");
  return `${serverBase}${url.startsWith("/") ? "" : "/"}${url}`;
}

export function isProofUploadPersisted(response: {
  success?: boolean;
  payment?: {
    proofFileUrl?: string | null;
    proofUrl?: string | null;
    proofUrls?: string[] | null;
  } | null;
  proof_url?: string | null;
  proof_urls?: string[] | null;
} | null | undefined): boolean {
  if (!response?.success) return false;
  return Boolean(
    resolvePaymentProofUrl(response.payment) ||
      (Array.isArray(response.payment?.proofUrls) &&
        response.payment.proofUrls.length > 0) ||
      response.proof_url ||
      (Array.isArray(response.proof_urls) && response.proof_urls.length > 0),
  );
}
