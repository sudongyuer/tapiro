import { describe, it } from 'jsr:@std/testing@1/bdd';

type Case = readonly unknown[];

const test = Object.assign((name: string, run: () => unknown) => it(name, run), {
  each: (cases: readonly Case[]) => (name: string, run: (...args: never[]) => unknown) => {
    for (const args of cases) {
      it(name.replace('%s', String(args[0])), () => run(...(args as never[])));
    }
  },
});

export { expect } from 'jsr:@std/expect@1';
export { describe, test };
