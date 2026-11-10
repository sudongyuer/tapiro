import { appleVerifiers } from './apple.ts';
import { APPLE_ROOT_CA_G3 } from './appleRoot.ts';
import { iapConfig } from './config.ts';

export const config = iapConfig((key) => Deno.env.get(key));

export const verifiers = appleVerifiers(config, [APPLE_ROOT_CA_G3]);
