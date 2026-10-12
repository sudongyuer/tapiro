import type { Translation } from '../resources';

const en: Translation = {
  account: {
    signIn: {
      apple: 'Sign in with Apple',
      google: 'Sign in with Google',
      error: {
        notConfigured: 'Sign-in isn’t set up yet.',
        cancelled: 'Sign-in cancelled.',
        failed: 'Couldn’t sign in. Try again.',
        network: 'No connection. Try again when you’re online.',
      },
    },
  },
  debug: {
    title: 'Debug',
    account: {
      title: 'Sign-in',
      loading: 'Checking sign-in',
      signedOut: 'Signed out',
      signedIn: 'Signed in as {{name}}',
    },
    tokens: {
      title: 'Design tokens',
      roleSample: '{{role}} bounty',
      reward: 'RM 15',
      statusOpen: 'Open',
      statusActive: 'In progress',
      statusPending: 'To confirm',
      statusDone: 'Done',
      statusUrgent: 'Urgent',
      accept: 'Accept',
      posted: 'Your bounty is posted',
    },
  },
};

export default en;
