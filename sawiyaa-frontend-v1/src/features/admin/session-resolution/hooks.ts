"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { executeResolution, listResolutionCases, previewResolution } from "./api";
export function useResolutionCases() { return useQuery({ queryKey: ["admin", "session-resolution", "cases"], queryFn: listResolutionCases, staleTime: 15_000 }); }
export function useExecuteResolution() { const client = useQueryClient(); return useMutation({ mutationFn: ({ sessionId, body }: Parameters<typeof executeResolution> extends [string, infer B] ? { sessionId: string; body: B } : never) => executeResolution(sessionId, body), onSuccess: () => client.invalidateQueries({ queryKey: ["admin", "session-resolution"] }) }); }
export function usePreviewResolution() { return useMutation({ mutationFn: ({ sessionId, body }: Parameters<typeof previewResolution> extends [string, infer B] ? { sessionId: string; body: B } : never) => previewResolution(sessionId, body) }); }
