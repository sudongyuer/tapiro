export const FIXTURE_VARIANTS = ['demo', 'worst', 'one', 'empty'] as const;
export type FixtureVariant = (typeof FIXTURE_VARIANTS)[number];

export function fixtureVariant(value: string | undefined): FixtureVariant {
  return FIXTURE_VARIANTS.find((variant) => variant === value) ?? 'demo';
}
