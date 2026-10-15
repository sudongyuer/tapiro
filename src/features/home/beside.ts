export const BESIDE_MAX_LINES = 2;

export function exceedsBeside(lineCount: number) {
  return lineCount > BESIDE_MAX_LINES;
}
