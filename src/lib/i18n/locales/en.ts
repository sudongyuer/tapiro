import type { Translation } from '../resources';

const en: Translation = {
  account: {
    signIn: {
      google: 'Sign in with Google',
      error: {
        notConfigured: 'Sign-in isn’t set up yet.',
        cancelled: 'Sign-in cancelled.',
        failed: 'Couldn’t sign in. Try again.',
        network: 'No connection. Try again when you’re online.',
      },
    },
    welcome: {
      wordmark: 'Tapiro',
      tagline: 'Post a bounty. Help out on your way.',
      hello: 'Hi there!',
      headline: 'Tapir has your back in Malaysia',
      subline: 'Parcels, queues, rides back to YC: students helping each other out.',
      terms:
        'By continuing, you agree to the <terms>Terms of Use</terms> and <privacy>Privacy Policy</privacy>.',
      examples: {
        parcel: 'Pick up a parcel · RM 8',
        coffee: 'Bring a coffee · RM 5',
        ticket: 'Take a queue number · RM 15',
        books: 'Explain calculus · RM 20',
        umbrella: 'Lend an umbrella · on the way',
        car: '17:00 to YC · 1 more seat',
        boba: 'Buy bubble tea · RM 6',
      },
    },
    name: {
      title: 'Your Name',
      greeting: 'Nice to meet you!',
      question: 'What’s your name?',
      label: 'Name',
      placeholder: 'Enter your name',
      footer: 'Other students see this name. Up to 40 characters.',
      avatar: 'Profile photo',
      signOut: 'Sign Out',
      continue: 'Continue',
      error: {
        empty: 'Enter a name.',
        tooLong: 'Use 40 characters or fewer.',
        saveFailed: 'Couldn’t save your name. Try again.',
      },
    },
    language: {
      title: 'Language',
      greeting: 'One last thing!',
      question: 'Which language do you prefer?',
      footer: 'Tapiro follows your system language. You can change it later in Settings.',
      done: 'Get Started',
    },
    legal: {
      draft: 'Draft: this text will be replaced before the App Store release.',
      close: 'Close',
      contact: 'Contact us: [contact email]',
      terms: {
        title: 'Terms of Use',
        aboutTitle: 'What Tapiro Is',
        about:
          'Tapiro helps students in Malaysia help each other: post bounties, help out on the way, share rides.',
        accountTitle: 'Your Account',
        account:
          'You sign in with Apple or Google. You can delete your account at any time in Me → Settings.',
        moneyTitle: 'Payments',
        money: 'Tapiro never handles money: students pay each other directly.',
      },
      privacy: {
        title: 'Privacy Policy',
        collectTitle: 'What We Collect',
        collect:
          'The name, email (Apple relay addresses accepted) and photo that Apple or Google provide at sign-in; the display name you choose; and the bounties, rides and messages you post.',
        storeTitle: 'Where It’s Stored',
        store:
          'Data is stored with Supabase in Singapore (ap-southeast-1). Your sign-in session stays in your phone’s Keychain.',
        deleteTitle: 'Deleting Your Account',
        delete:
          'Delete your account and profile in Me → Settings → Delete Account. Settle any unpaid payments first.',
      },
    },
    me: {
      settings: 'Settings',
    },
    settings: {
      title: 'Settings',
      language: 'Language',
      signOut: 'Sign Out',
      deleteAccount: 'Delete Account',
      deleteFooter: 'A deleted account can’t be restored.',
    },
    delete: {
      title: 'Delete Your Account?',
      intro: 'This permanently deletes:',
      items: {
        profile: 'Your profile (name and photo)',
        payee: 'Your ways to receive payment',
        messages: 'Messages and reviews you wrote',
        memory: 'What Tapir remembers about you',
        coins: 'Your Tapir coins',
        stickers: 'Your stickers',
      },
      confirm: 'Delete Account',
      cancel: 'Cancel',
      deleting: 'Deleting account',
      payment: {
        owe: 'You pay {{name}} {{amount}}',
        owed: '{{name}} pays you {{amount}}',
      },
      error: {
        blocked:
          'You have a payment that isn’t settled yet. Settle it before deleting your account.',
        failed: 'Couldn’t delete your account. Try again.',
        network: 'No connection. Try again when you’re online.',
        signedOut: 'You’re already signed out.',
      },
    },
  },
  shell: {
    tabs: {
      bounty: 'Bounties',
      ride: 'Rides',
      messages: 'Messages',
      me: 'Me',
      askTapir: 'Ask Tapir',
    },
    home: {
      title: 'Bounties',
    },
    ride: {
      emptyTitle: 'Rides are coming soon',
      emptyBody: 'Share a car back to YC and split the fare automatically',
    },
    messages: {
      emptyTitle: 'No messages yet',
      emptyBody: 'Chats show up here once you take a bounty or join a ride',
    },
    accessory: {
      label: '{{title}}, {{sub}}',
      withMore: '{{sub}} · {{count}} more',
      hint: 'Opens Bounties and fans out your live cards',
      money: 'RM',
    },
    ask: {
      title: 'Ask Tapir',
      subtitle: {
        bounty: 'On Bounties · write a bounty or find one to take',
        ride: 'On Rides · find riders and split the fare',
        messages: 'On Messages · reply or translate',
        me: 'On Me · see what Tapir remembers',
      },
      prompt: {
        bounty: 'What do you need? One sentence is enough',
        ride: 'Who’s heading back to YC? When, and from where?',
        messages: 'Reply to Ah Kit, or translate something',
      },
      suggestions: {
        bounty: { first: 'Pick up my parcel', second: 'What can I take nearby?' },
        ride: { first: 'Who’s going back to YC at 5 pm?', second: 'Split this Grab receipt' },
        messages: { first: 'Translate Aiman’s message', second: 'Tell Ah Kit: wait in the lobby' },
        writeBounty: 'Write a bounty for me',
      },
      mic: 'Speak',
      comingSoon: 'Voice and AI drafts are coming soon',
      close: 'Close',
    },
  },
  home: {
    say: {
      payNamed: '{{name}} delivered — remember to pay',
      pay: 'You have a payment to make',
      rideMinutes: 'Leaving in {{count}} min, don’t be late',
      owedNamed: '{{name}} says they paid you — check it',
      progressNamed: '{{name}} is helping you — message them anytime',
      live: 'Something’s in progress, I’m keeping an eye on it',
      calm: 'Nothing on today… post a bounty?',
    },
    stage: {
      live: 'In progress',
    },
    stack: {
      fanOut: 'Spread out · {{count}}',
      collapse: 'Stack',
      fanOutHint: 'Lays the cards out at their own heights',
      collapseHint: 'Stacks the cards again',
      peekHint: 'Spreads out all cards',
    },
    money: 'RM {{amount}}',
    soon: 'This step isn’t available yet',
    card: {
      pay: {
        tag: 'You owe',
        title: 'Pay {{name}}',
        slide: 'Slide to pay · {{amount}} →',
        slideLabel: 'Slide to pay {{amount}}',
        footer: 'Direct pay · money goes straight to {{name}}',
      },
      ride: {
        tag: 'Ride · {{seats}} full',
        youBook: 'You book',
        departs: 'Leaves {{time}}',
        countdownSuffix: 'to go',
        countdownLabel: '{{time}} until departure',
        meet: 'Meet',
        destination: 'To',
        arrive: 'I’m here',
      },
      owed: {
        tag: 'Confirm',
        title: '{{name}} says they paid you',
      },
      progress: {
        tag: 'Your post · in progress',
        helper: '{{name}} took it',
        message: 'Message {{name}}',
        details: 'Details',
      },
      calm: {
        tag: 'Nothing pending today',
        morning: 'Good morning, {{name}}',
        afternoon: 'Good afternoon, {{name}}',
        evening: 'Good evening, {{name}}',
        ask: 'Say it and Tapir posts the bounty',
        askHint: 'Opens Ask Tapir',
        chipRide: 'Who’s heading back to YC at five?',
        chipParcel: 'Pick up my parcel',
        chipStudy: 'Find someone to explain calculus',
      },
    },
    section: {
      title: 'Bounties you can take',
      empty: 'Bounties arrive in the next release',
    },
    strip: {
      label: '{{title}}, {{line}}',
    },
  },
  debug: {
    title: 'Debug',
    account: {
      title: 'Sign-in',
      loading: 'Checking sign-in',
      signedOut: 'Signed out',
      signedIn: 'Signed in as {{name}}',
      scenes: {
        welcome: 'Welcome',
        profileSetup: 'Name step (long name)',
        languageStep: 'Language Step',
        settings: 'Settings (long name)',
        deleteBlocked: 'Delete account (unsettled payment)',
      },
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
      liveSample: 'Pay Ah Kit RM 15',
      mascot: 'Tapir mascot',
    },
  },
};

export default en;
