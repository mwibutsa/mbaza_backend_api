/**
 * Type declarations for @gradio/client.
 *
 * The @gradio/client package does not ship resolvable TypeScript declarations
 * in all environments. This file provides the minimal type surface we use.
 */
declare module '@gradio/client' {
  interface PredictResult {
    data: unknown[];
  }

  interface GradioClient {
    predict(
      endpoint: string,
      params: Record<string, unknown>,
    ): Promise<PredictResult>;
  }

  export class Client {
    static connect(url: string): Promise<GradioClient>;
  }
}
