import type zhHans from './zh-Hans';

const ms: typeof zhHans = {
  unit: 'min',
  stale: 'Mungkin tidak terkini',
  homeStart: 'Tempat bertolak',
  pair: '{{first}} · {{second}}',
  bounty: {
    onTheWay_one: '{{name}} · lebih kurang {{count}} minit lagi',
    onTheWay_other: '{{name}} · lebih kurang {{count}} minit lagi',
    onTheWayStale: '{{name}} · dalam perjalanan',
    left: 'Bertolak {{time}}',
    eta: 'Tiba ~{{time}}',
    arrived: '{{name}} sudah sampai · {{place}}',
    arrivedPlain: '{{name}} sudah sampai',
    arrivedDetail: 'Pergi jumpa dia',
    arrivedAt: 'Sampai {{time}}',
  },
  ride: {
    meetup: 'Berkumpul · {{place}}',
    leaving_one: 'Bertolak dalam {{count}} minit · {{arrived}}/{{total}} sudah sampai',
    leaving_other: 'Bertolak dalam {{count}} minit · {{arrived}}/{{total}} sudah sampai',
    gatherAt: 'Berkumpul {{time}}',
    departAt: 'Bertolak {{time}}',
    departed: 'Sudah bertolak · {{place}}',
    aboard_one: '{{count}} orang dalam kereta',
    aboard_other: '{{count}} orang dalam kereta',
    departedAt: 'Bertolak {{time}}',
  },
};

export default ms;
