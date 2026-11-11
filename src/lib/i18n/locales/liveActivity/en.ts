import type zhHans from './zh-Hans';

const en: typeof zhHans = {
  unit: 'min',
  stale: 'May not be up to date',
  homeStart: 'Pickup point',
  pair: '{{first}} · {{second}}',
  bounty: {
    onTheWay_one: '{{name}} · about {{count}} min away',
    onTheWay_other: '{{name}} · about {{count}} min away',
    left: 'Left {{time}}',
    eta: 'Arrives ~{{time}}',
    arrived: '{{name}} is here · {{place}}',
    arrivedPlain: '{{name}} is here',
    arrivedDetail: 'Go meet them',
    arrivedAt: 'Arrived {{time}}',
  },
  ride: {
    meetup: 'Meet up · {{place}}',
    leaving_one: 'Leaves in {{count}} min · {{arrived}}/{{total}} here',
    leaving_other: 'Leaves in {{count}} min · {{arrived}}/{{total}} here',
    gatherAt: 'Meet {{time}}',
    departAt: 'Leaves {{time}}',
    departed: 'On the way · {{place}}',
    aboard_one: '{{count}} rider on board',
    aboard_other: '{{count}} riders on board',
    departedAt: 'Left {{time}}',
  },
};

export default en;
