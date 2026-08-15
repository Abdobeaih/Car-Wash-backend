import { createApp } from './src/bootstrap';

let cachedServer: any;

async function getServer(): Promise<any> {
  if (!cachedServer) {
    const app = await createApp();
    await app.init();
    cachedServer = app.getHttpAdapter().getInstance();
  }
  return cachedServer;
}

export default async function handler(req: unknown, res: unknown): Promise<void> {
  const server = await getServer();
  return server(req, res);
}