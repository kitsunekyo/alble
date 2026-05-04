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
