import { resignFocus } from 'tapiro-kit';

import { createResignFirst } from './resignFirst';

export const afterResign = createResignFirst(resignFocus);
