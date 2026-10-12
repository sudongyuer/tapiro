import type { AuthProvider, AuthService, SignInResult } from './types';

export async function safeSignIn(
  service: AuthService,
  provider: AuthProvider,
): Promise<SignInResult> {
  try {
    return await service.signIn(provider);
  } catch {
    return { ok: false, reason: 'failed' };
  }
}
