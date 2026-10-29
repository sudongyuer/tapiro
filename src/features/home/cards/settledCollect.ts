export type SettledExit = 'leave' | 'fade';

export type SettledCollectSteps = {
  collect: () => void;
  fly: () => Promise<{ landed: boolean }>;
  haptic: () => void;
  announce: () => void;
  exit: (kind: SettledExit) => Promise<void>;
  dismiss: () => void;
};

const NOT_LANDED = { landed: false };

export async function runSettledCollect(steps: SettledCollectSteps, reduceMotion: boolean) {
  steps.collect();
  const flight = steps.fly().catch(() => NOT_LANDED);
  const fadeInPlace = reduceMotion ? steps.exit('fade') : null;
  const { landed } = await flight;
  if (!landed) steps.haptic();
  steps.announce();
  await (fadeInPlace ?? steps.exit(landed ? 'leave' : 'fade'));
  steps.dismiss();
}
