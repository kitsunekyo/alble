import type {
  CreateSessionInput,
  UpdateSessionInput,
  CreateStepInput,
  UpdateStepInput,
  SessionDTO,
  StepDTO,
  CreateJournalEntryInput,
  UpdateJournalEntryInput,
  JournalEntryDTO,
} from "@/shared/schemas";

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    let detail: unknown = undefined;
    try {
      detail = await res.json();
    } catch {
      // ignore
    }
    const msg =
      (detail && typeof detail === "object" && "error" in detail && typeof detail.error === "string"
        ? detail.error
        : null) ?? `Request failed: ${res.status}`;
    throw new Error(msg);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const api = {
  listSessions: (params?: { limit?: number; offset?: number }) => {
    const qp = params ? new URLSearchParams() : undefined;
    if (params?.limit) qp!.set("limit", String(params.limit));
    if (params?.offset) qp!.set("offset", String(params.offset));
    const qs = qp ? `?${qp.toString()}` : "";
    return request<SessionDTO[]>(`/api/sessions${qs}`);
  },
  todaySession: () => request<SessionDTO | null>("/api/sessions/today"),
  addTodayStep: (input: CreateStepInput) =>
    request<SessionDTO>("/api/sessions/today/steps", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  sessionByDate: (date: string) => request<SessionDTO | null>(`/api/sessions/by-date/${date}`),
  addStepByDate: (date: string, input: CreateStepInput) =>
    request<SessionDTO>(`/api/sessions/by-date/${date}/steps`, {
      method: "POST",
      body: JSON.stringify(input),
    }),
  getSession: (id: number) => request<SessionDTO>(`/api/sessions/${id}`),
  createSession: (input: CreateSessionInput) =>
    request<SessionDTO>("/api/sessions", { method: "POST", body: JSON.stringify(input) }),
  updateSession: (id: number, input: UpdateSessionInput) =>
    request<SessionDTO>(`/api/sessions/${id}`, { method: "PATCH", body: JSON.stringify(input) }),
  deleteSession: (id: number) =>
    request<void>(`/api/sessions/${id}`, { method: "DELETE" }),
  addStep: (sessionId: number, input: CreateStepInput) =>
    request<StepDTO>(`/api/sessions/${sessionId}/steps`, {
      method: "POST",
      body: JSON.stringify(input),
    }),
  updateStep: (id: number, input: UpdateStepInput) =>
    request<StepDTO>(`/api/steps/${id}`, { method: "PATCH", body: JSON.stringify(input) }),
  deleteStep: (id: number) =>
    request<void>(`/api/steps/${id}`, { method: "DELETE" }),
  importCsv: (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return fetch("/api/import/csv", { method: "POST", body: fd }).then(async (res) => {
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Import failed");
      return res.json() as Promise<{ sessions: number; steps: number; skipped: number; parseErrors: { line: number; message: string }[] }>;
    });
  },
  wipe: () => request<void>("/api/wipe", { method: "POST" }),
  journal: {
    list: (params?: { days?: number; offset?: number }) => {
      const qp = params ? new URLSearchParams() : undefined;
      if (params?.days) qp!.set("days", String(params.days));
      if (params?.offset) qp!.set("offset", String(params.offset));
      const qs = qp ? `?${qp.toString()}` : "";
      return request<JournalEntryDTO[]>(`/api/journal${qs}`);
    },
    get: (id: number) => request<JournalEntryDTO>(`/api/journal/${id}`),
    create: (input: CreateJournalEntryInput) =>
      request<JournalEntryDTO>("/api/journal", { method: "POST", body: JSON.stringify(input) }),
    update: (id: number, input: UpdateJournalEntryInput) =>
      request<JournalEntryDTO>(`/api/journal/${id}`, { method: "PATCH", body: JSON.stringify(input) }),
    delete: (id: number) =>
      request<void>(`/api/journal/${id}`, { method: "DELETE" }),
  },
};
