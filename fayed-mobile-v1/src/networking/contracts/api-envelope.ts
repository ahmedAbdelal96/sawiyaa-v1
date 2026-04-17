export type ApiEnvelope<T> = {
  success: boolean;
  data: T;
  message?: string;
};

export function unwrapApiData<T>(response: ApiEnvelope<T> | T): T {
  if (typeof response === "object" && response !== null && "data" in response) {
    return response.data;
  }

  return response as T;
}

