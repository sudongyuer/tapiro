import { fixtureUser } from '@/features/account';

export const LONG_NAME = '欧阳娜娜'.repeat(10);

export const longNameUser = {
  ...fixtureUser('google'),
  name: LONG_NAME,
  email: 'nurul.aisyah.binti.abdullah.rahman.student@gmail.com',
};
