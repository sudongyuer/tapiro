import type { Translation } from '../resources';

import bounty from './bounty/en';
import pay from './pay/en';
import payee from './payee/en';
import stickers from './stickers/en';

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
          'You sign in with Apple or Google. You can delete your account in Me → Settings; if a payment is still unsettled, settle it first.',
        moneyTitle: 'Payments and Coins',
        money:
          'Students pay each other directly in their own bank or e-wallet apps, or in cash in person; Tapiro does not handle payments between students. Coins are bought through the App Store, can be used only in Tapiro, and can’t be sent to others or cashed out.',
      },
      privacy: {
        title: 'Privacy Policy',
        collectTitle: 'What We Collect',
        collect:
          'The name, email (Apple relay addresses accepted) and photo that Apple or Google provide at sign-in; the display name you choose; the bounties and rides you post, chat messages and images, and reviews; the payment methods you add (DuitNow number, bank account, and the text read from a receive QR code, never the image); screenshots you attach when paying (visible to both sides and moderators); your reports and blocks; payment records (who paid whom, the amount and whether it was confirmed); your coin ledger and App Store purchase records; and a device token for push notifications.',
        aiTitle: 'Ask Tapir',
        ai: 'Only after you agree: what you send to Ask Tapir goes through our server to Alibaba Cloud Model Studio (Singapore). Conversations and drafts stay on your phone; the places and preferences in Tapir Remembers are synced, and you can view and delete them.',
        storeTitle: 'Where It’s Stored',
        store:
          'Data is stored with Supabase in Singapore (ap‑southeast‑1). Your sign-in session stays in your phone’s Keychain.',
        deleteTitle: 'Deleting Your Account',
        delete:
          'Delete your account in Me → Settings → Delete Account. Deleted: your profile, payment methods, your messages and reviews, Tapir Remembers, coins and stickers. Kept: the other person’s side of each chat (without your messages), and anonymised coin ledger and in-app purchase records. You can’t delete while a payment is unsettled; Tapiro shows which one.',
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
  payee,
  pay,
  stickers,
  bounty,
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
      bounty: '{{title}} · {{line}}',
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
      waiting: { tag: 'Waiting to be confirmed' },
      unavailable: {
        title: 'Couldn’t load your payments',
        body: 'We can’t tell yet whether you owe money or someone paid you.',
        retry: 'Try again',
        loading: 'Loading your payments',
      },
      pay: {
        tag: 'You owe',
        title: 'Pay {{name}}',
        button: 'Pay now',
        buttonLabel: 'Pay {{amount}} now',
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
      bounty: {
        tag: {
          action: 'Needs you',
          inProgress: 'In progress',
          waiting: 'Waiting on them',
        },
        line: '{{title}} · {{line}}',
        label: '{{title}}, {{line}}, reward {{reward}}',
        details: 'View',
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
    bounty: {
      post: 'Post form',
      confirm: 'Confirm post',
      placeSearch: 'Choose a Place',
      board: 'Bounty board',
      detail: 'Bounty detail',
      applicants: 'Choose a helper (applicants)',
      status: 'Status page (state × role)',
    },
    pay: { title: 'Pay sheet' },
    stickers: { title: 'Sticker book' },
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
      hold: 'Hold to choose Ah Kit',
      holdHolding: 'Keep holding…',
      holdBusy: 'Choosing…',
      holdHint: 'Hold for about 1 second',
    },
  },
};

export default en;
