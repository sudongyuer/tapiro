import { isLocalStack, type Env } from '../_shared/localStack.ts';
import { DEEPSEEK_FALLBACK, singaporeBaseUrl } from './models.ts';
import { modelStudioProvider } from './modelStudio.ts';
import { fakeProvider, type AiProvider } from './provider.ts';

export const TEST_PROVIDER_HEADER = 'x-tapiro-test-provider';
export const LOCAL_MOCK_KEY = 'local-mock-key';

export function providerFromEnv(env: Env): AiProvider | null {
  const name = env('AI_PROVIDER');
  if (name === 'fake') return fakeProvider;
  if (name !== 'qwen') return null;
  const baseUrl = singaporeBaseUrl(env('MODEL_STUDIO_WORKSPACE_ID') ?? '');
  const apiKey = env('MODEL_STUDIO_API_KEY')?.trim();
  if (!baseUrl || !apiKey) return null;
  const fallback = env('MODEL_STUDIO_FALLBACK') === 'deepseek' ? DEEPSEEK_FALLBACK : null;
  return modelStudioProvider({ baseUrl, apiKey, fallback });
}

// The stack test drives the real adapter against a mock Model Studio while the fake stays the default; only the CLI's
// local stack with the explicit flag honours the header, so a hosted project can never be pointed away from Singapore.
export function localTestProvider(env: Env): AiProvider | null {
  const baseUrl = env('AI_TEST_MODEL_STUDIO_URL');
  if (env('AI_ALLOW_TEST_PROVIDER') !== '1' || !baseUrl || !isLocalStack(env)) return null;
  return modelStudioProvider({ baseUrl, apiKey: LOCAL_MOCK_KEY, fallback: DEEPSEEK_FALLBACK });
}

export function providerFor(
  req: Request,
  configured: AiProvider | null,
  test: AiProvider | null,
): AiProvider | null {
  return test && req.headers.get(TEST_PROVIDER_HEADER) === 'qwen' ? test : configured;
}
