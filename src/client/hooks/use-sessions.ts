import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/client/lib/api";
import type {
  CreateSessionInput,
  UpdateSessionInput,
  CreateStepInput,
  UpdateStepInput,
} from "@/shared/schemas";

const KEYS = {
  all: ["sessions"] as const,
  today: ["sessions", "today"] as const,
  one: (id: number) => ["sessions", id] as const,
};

export function useSessions() {
  return useQuery({ queryKey: KEYS.all, queryFn: api.listSessions });
}

export function useTodaySession() {
  return useQuery({ queryKey: KEYS.today, queryFn: api.todaySession });
}

export function useSessionByDate(date: string) {
  return useQuery({
    queryKey: ["sessions", "by-date", date],
    queryFn: () => api.sessionByDate(date),
  });
}

function useInvalidateAll() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ["sessions"] });
  };
}

export function useUpdateSession() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (vars: { id: number; input: UpdateSessionInput }) =>
      api.updateSession(vars.id, vars.input),
    onSuccess: invalidate,
  });
}

export function useDeleteSession() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (id: number) => api.deleteSession(id),
    onSuccess: invalidate,
  });
}

export function useAddStep() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (vars: { sessionId: number; input: CreateStepInput }) =>
      api.addStep(vars.sessionId, vars.input),
    onSuccess: invalidate,
  });
}

export function useUpdateStep() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (vars: { id: number; input: UpdateStepInput }) =>
      api.updateStep(vars.id, vars.input),
    onSuccess: invalidate,
  });
}

export function useDeleteStep() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (id: number) => api.deleteStep(id),
    onSuccess: invalidate,
  });
}

export function useAddTodayStep() {
  const invalidate = useInvalidateAll();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateStepInput) => api.addTodayStep(input),
    onSuccess: (session) => {
      // Update the today cache with the returned session so the UI immediately
      // has a real session id for subsequent step additions.
      qc.setQueryData(KEYS.today, session);
      invalidate();
    },
  });
}

export function useAddStepByDate() {
  const invalidate = useInvalidateAll();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { date: string; input: CreateStepInput }) =>
      api.addStepByDate(vars.date, vars.input),
    onSuccess: (session, vars) => {
      qc.setQueryData(["sessions", "by-date", vars.date], session);
      invalidate();
    },
  });
}

export function useImportCsv() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (file: File) => api.importCsv(file),
    onSuccess: invalidate,
  });
}

export function useWipe() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: () => api.wipe(),
    onSuccess: invalidate,
  });
}

// Unused import workaround to satisfy verbatimModuleSyntax type-only imports.
export type { CreateSessionInput };
