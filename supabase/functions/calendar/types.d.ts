interface GoogleErrorResponse {
  error: {
    message: string;
    errors?: Array<{
      reason?: string;
      domain?: string;
      extendedHelp?: string;
    }>;
    code?: string;
    status?: string;
    details?: any;
  };
}

interface Headers {
  entries(): IterableIterator<[string, string]>;
  get(name: string): string | null;
}

declare global {
  interface Error {
    shouldRefresh?: boolean;
  }
}

export { GoogleErrorResponse, Headers };