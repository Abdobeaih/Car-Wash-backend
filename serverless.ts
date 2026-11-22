import { INestApplication } from '@nestjs/common';
import { createApp } from './src/bootstrap';

let cachedServer: any;
let lastInitError: Error | null = null;

async function getServer(): Promise<any> {
  if (!cachedServer) {
    try {
      const app: INestApplication = await createApp();
      await app.init();
      cachedServer = app.getHttpAdapter().getInstance();
      lastInitError = null;
    } catch (err) {
      // Cold-start failure (e.g. database unreachable): remember it, answer
      // every request with a clean 503 instead of crashing the function, and
      // retry initialization on the next request so a transient outage heals
      // itself without a redeploy.
      lastInitError = err instanceof Error ? err : new Error(String(err));
      // eslint-disable-next-line no-console
      console.error('[serverless] app init failed:', lastInitError.message);
      cachedServer = null;
    }
  }
  return cachedServer;
}

export default async function handler(req: any, res: any): Promise<void> {
  const server = await getServer();
  if (!server) {
    res.statusCode = 503;
    res.setHeader('content-type', 'application/json');
    res.end(
      JSON.stringify({
        statusCode: 503,
        message: 'API is starting or temporarily unavailable. Please retry.',
        timestamp: new Date().toISOString(),
      }),
    );
    return;
  }
  return server(req, res);
}
