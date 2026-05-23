import { request } from '@playwright/test';

async function waitForOk(url: string, label: string, attempts = 120): Promise<void> {
  const ctx = await request.newContext();
  try {
    for (let i = 0; i < attempts; i++) {
      try {
        const res = await ctx.get(url);
        if (res.ok()) {
          return;
        }
      } catch {
        // server still starting
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    throw new Error(`${label} did not become ready at ${url}`);
  } finally {
    await ctx.dispose();
  }
}

export default async function globalSetup(): Promise<void> {
  await waitForOk('http://127.0.0.1:4173/react/workspace/demo', 'React demo');
  await waitForOk('http://127.0.0.1:4174/workspace/demo', 'Angular demo');
}
