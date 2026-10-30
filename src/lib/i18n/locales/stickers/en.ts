import type zhHans from './zh-Hans';

const en: typeof zhHans = {
  book: {
    title: 'Done together',
    sub: 'One more each time a job gets done and paid',
    summary: '{{total}} · {{sub}}',
    view: { stack: 'Cards', calendar: 'Calendar', a11y: 'View' },
  },
  count_one: '{{count}} sticker',
  count_other: '{{count}} stickers',
  empty: {
    title: 'No stickers yet',
    body: 'Help someone or get help. Once it’s done and paid, the sticker lands here.',
  },
  label: {
    payee: 'Helped {{name}}',
    payer: '{{name}} helped me',
    payeeUnnamed: 'Helped a fellow student',
    payerUnnamed: 'A fellow student helped me',
    ride: 'With {{name}}',
    rideUnnamed: 'With a fellow student',
  },
  card: {
    position: 'Card {{index}} of {{total}}',
    a11y: '{{date}}, {{line1}}, {{title}}',
    hint: 'Swipe to turn the cards',
  },
  calendar: {
    summary_one: '{{count}} done',
    summary_other: '{{count}} done',
    previous: 'Previous Month',
    next: 'Next Month',
    day: '{{date}}',
    dayDone_one: '{{date}}, {{count}} done: {{titles}}',
    dayDone_other: '{{date}}, {{count}} done: {{titles}}',
    join: ', ',
    open: 'Opens that day’s card',
  },
  art: {
    parcel: 'a parcel',
    tea: 'a cup of milk tea',
    bag: 'a shopping bag',
    food: 'a bowl of rice',
    medicine: 'a medicine bottle',
    queue: 'a queue ticket',
    document: 'a stamped form',
    move: 'moving boxes',
    study: 'a book and pencil',
    accompany: 'two people walking together',
    car: 'a car',
    other: 'a cat',
  },
  loading: 'Loading stickers',
  loadFailed: {
    title: 'Couldn’t load your stickers',
    body: 'Check your connection and try again.',
  },
  stale: 'Couldn’t refresh your stickers. These are from the last load.',
  retry: 'Try Again',
};

export default en;
