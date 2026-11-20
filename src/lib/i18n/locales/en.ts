import type { Translation } from '../resources';

import ask from './ask/en';
import block from './block/en';
import chat from './chat/en';
import coins from './coins/en';
import liveActivity from './liveActivity/en';
import bounty from './bounty/en';
import pay from './pay/en';
import ride from './ride/en';
import rideReminders from './rideReminders/en';
import rideSettle from './rideSettle/en';
import reputation from './reputation/en';
import payee from './payee/en';
import stickers from './stickers/en';

const en: Translation = {
  account: {
    signIn: {
      google: 'Sign in with Google',
      testAccounts: 'Test accounts (local development only)',
      testAccountAs: 'Sign in as {{name}}',
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
        parcel: 'Pick up a parcel · {{amount}}',
        coffee: 'Bring a coffee · {{amount}}',
        ticket: 'Take a queue number · {{amount}}',
        books: 'Explain calculus · {{amount}}',
        umbrella: 'Lend an umbrella · on the way',
        car: '17:00 to YC · 1 more seat',
        boba: 'Buy bubble tea · {{amount}}',
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
      loading: 'Loading your profile',
      loadFailed:
        'Couldn’t load your profile, so your name and photo stay as they are. Check your connection and try again.',
      retry: 'Try again',
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
      contact: 'Contact us: sudongyu3@gmail.com',
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
          'The name, email (Apple relay addresses accepted) and photo that Apple or Google provide at sign-in; the display name you choose; the bounties and rides you post, chat messages and images, and reviews; the payment methods you add (DuitNow number, bank account, and the text read from a receive QR code, never the image); screenshots you attach when paying (visible to both sides and moderators); your reports and blocks; payment records (who paid whom, the amount and whether it was confirmed); your coin ledger and App Store purchase records; and a device token for push notifications. If you allow location, Tapiro reads your location only while you use it, to sort nearby bounties and rides by distance, to show nearby places first when you search for one, or to use where you are as the place of a bounty or ride you post. Your location goes only with those lookups to our server or Apple Maps, and we don’t keep it unless you post it as a bounty’s or ride’s place.',
        aiTitle: 'Ask Tapir',
        ai: 'Only after you agree: what you type or say, pictures you pick, and messages you translate go through our server to Alibaba Cloud Model Studio (Singapore); the places and habits in Tapir Remembers go along only with drafts and answers, never with translations or voice-to-text. Alibaba Cloud’s terms say it does not use this data to train or improve its models. Its data retention policy says it keeps these requests and replies for no longer than 30 days by default, and may keep them longer when the law requires it, to keep the service secure, or when its safety filters flag the content. Conversations and drafts stay on your phone; the server keeps only consent records and usage, never the conversation; Tapir Remembers is synced, and you can view, change and delete it.',
        storeTitle: 'Where It’s Stored',
        store:
          'Data is stored with Supabase in Singapore (ap‑southeast‑1). Your sign-in session stays in your phone’s Keychain.',
        deleteTitle: 'Deleting Your Account',
        delete:
          'Delete your account in Me → Settings → Delete Account. Deleted: your profile, payment methods, your messages and reviews, Tapir Remembers, coins and stickers. Kept: the other person’s side of each chat (without your messages), and anonymised records of your coin ledger, in-app purchases, Ask Tapir usage and the leaves in your Jar. You can’t delete while a payment is unsettled; Tapiro shows which one.',
      },
    },
    me: {
      settings: 'Settings',
    },
    settings: {
      title: 'Settings',
      language: 'Language',
      signOut: 'Sign Out',
      signingOut: 'Signing out…',
      deleteAccount: 'Delete Account',
      deleteFooter: 'A deleted account can’t be restored.',
      icp: 'ICP filing number',
      regionNoAi:
        'Ask Tapir, message translation and voice input aren’t offered in Tapiro from the China mainland App Store.',
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
  block,
  chat,
  coins,
  liveActivity,
  reputation,
  ask,
  bounty,
  ride,
  rideReminders,
  rideSettle,
  live: {
    offline: 'May not be up to date',
    staleAt: 'May not be up to date · data from {{time}}',
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
    accessory: {
      label: '{{title}}, {{sub}}',
      withMore: '{{sub}} · {{count}} more',
      hint: 'Opens Bounties and fans out your live cards',
    },
    ask: {
      title: 'Ask Tapir',
      subtitle: {
        bounty: 'On Bounties · write a bounty or answer a question',
        ride: 'On Rides · answer a question or write a bounty',
        messages: 'On Messages · touch and hold someone’s message to translate it',
        me: 'On Me · write a bounty or answer a question',
      },
      prompt: {
        bounty: 'What do you need? One sentence is enough',
        ride: 'Ask anything, like how to get to the airport',
        messages: 'Ask anything, like how to say something in Malay',
      },
      suggestions: {
        bounty: { first: 'Pick up my parcel', second: 'What do I need to pick up a parcel?' },
        ride: {
          first: 'Cheapest way from Sunway to KLIA?',
          second: 'Find someone to bring my things back to YC',
        },
        messages: {
          first: 'How do I say “wait in the lobby” in Malay?',
          second: 'How do I tell my landlord the heater broke?',
        },
        writeBounty: 'Write a bounty for me',
      },
      mic: 'Speak',
      send: 'Send',
      close: 'Close',
    },
  },
  home: {
    say: {
      payNamed: '{{name}} delivered — remember to pay',
      pay: 'You have a payment to make',
      rideMinutes: 'Leaving in {{count}} min, don’t be late',
      owedNamed: '{{name}} says they paid you — check it',
      settled: '{{name}} got the money — all done!',
      settledUnnamed: 'They got the money — all done!',
      bounty: '{{title}} · {{line}}',
      live: 'Something’s in progress, I’m keeping an eye on it',
      unavailable: 'Couldn’t load your payments. Pull down to try again',
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
    card: {
      waiting: { tag: 'Waiting to be confirmed' },
      settled: {
        tag: 'Settled',
        line: '{{title}} · {{name}} confirmed payment',
        lineUnnamed: '{{title}} · Payment confirmed',
        headline: 'Done! Here’s your sticker',
        collect: 'Add to Sticker Book',
        collected: 'Added to Sticker Book',
        badge: '+1',
        strip: '{{title}} · Done',
        a11y: 'Settled, {{line}}, {{amount}}',
      },
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
        message: 'Message',
      },
      calm: {
        tag: 'Nothing pending today',
        morning: 'Good morning, {{name}}',
        afternoon: 'Good afternoon, {{name}}',
        evening: 'Good evening, {{name}}',
        ask: 'Say it and Tapir posts the bounty',
        askHint: 'Opens Ask Tapir',
        chipQuestion: 'Cheapest way to KLIA?',
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
    ride: {
      list: 'Ride list',
      form: 'Ride form',
      confirm: 'Confirm ride',
      detail: 'Ride detail',
    },
    bounty: {
      post: 'Post form',
      confirm: 'Confirm post',
      placeSearch: 'Choose a Place',
      board: 'Bounty board',
      map: 'Bounties on the map',
      detail: 'Bounty detail',
      applicants: 'Choose a helper (applicants)',
      status: 'Status page (state × role)',
    },
    pay: { title: 'Pay sheet' },
    stickers: { title: 'Sticker book' },
    chat: { thread: 'Chat thread (keyboard)' },
    reputation: { profile: 'Profile', review: 'Review sheet', reviewOpen: 'Open the review' },
    coins: { page: 'Coins page', invite: 'Invite page' },
    ask: { settings: 'Me → Tapir' },
    store: {
      title: 'StoreKit end to end',
      signIn: 'Sign in as Xiaolin',
      openCoins: 'Open coins',
      buyKept: 'Sign out, then buy 5',
    },
    liveActivity: {
      title: 'Live Activity',
      bountyOnTheWay: 'Bounty · on the way',
      bountyArrived: 'Bounty · arrived (leaves in 15 min)',
      rideMeetupHome: 'Ride · meet up (from home)',
      rideMeetupPlace: 'Ride · meet up (public place)',
      rideDeparted: 'Ride · on the way (leaves in 15 min)',
      stale: 'On the way · stale in 1 min',
      endNow: 'End now',
      list: 'List',
      helper: 'Lin',
      place: 'Library',
      task: 'Pick up a parcel',
      start: 'Sunway Geo Residences',
    },
    flight: {
      title: 'Sticker flight to Me',
      fly: 'Fly to Me',
      flyReduced: 'Fly (Reduce Motion)',
      reset: 'Put the sticker back',
    },
    map: {
      title: 'Map stickers',
      near: 'Zoom in',
      far: 'Zoom out',
      me: 'From me',
      place: 'From here',
    },
    tokens: {
      title: 'Design tokens',
      roleSample: '{{role}} bounty',
      reward: '{{amount}}',
      statusOpen: 'Open',
      statusActive: 'In progress',
      statusPending: 'To confirm',
      statusDone: 'Done',
      statusUrgent: 'Urgent',
      accept: 'Accept',
      posted: 'Your bounty is posted',
      liveSample: 'Pay Ah Kit {{amount}}',
      mascot: 'Tapir mascot',
      hold: 'Hold to choose Ah Kit',
      holdHolding: 'Keep holding…',
      holdBusy: 'Choosing…',
      holdHint: 'Hold for about 1 second',
    },
  },
};

export default en;
