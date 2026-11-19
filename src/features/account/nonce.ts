export type Nonce = { raw: string; hashed: string };

export type NonceSource = () => Promise<Nonce>;

// Supabase compares sha256(raw) as lowercase hex with the token's `nonce` claim, so the provider receives the hash.
export function createNonceSource(
  randomString: () => string,
  sha256Hex: (value: string) => Promise<string>,
): NonceSource {
  return async () => {
    const raw = randomString();
    return { raw, hashed: (await sha256Hex(raw)).toLowerCase() };
  };
}
