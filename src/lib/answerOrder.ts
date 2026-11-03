export function createAnswerOrder() {
  let issued = 0;
  let applied = 0;
  let failed = 0;
  return {
    start: () => ++issued,
    succeeded(request: number): 'ready' | 'stale' | null {
      if (request <= applied) return null;
      applied = request;
      return failed > request ? 'stale' : 'ready';
    },
    failed(request: number) {
      failed = Math.max(failed, request);
      return request > applied;
    },
  };
}
