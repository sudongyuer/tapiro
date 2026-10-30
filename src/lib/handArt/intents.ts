import type { BountyCategory } from '@/lib/stickers/category';

import type { HandArtId } from './ids';

export type Intent = {
  id: string;
  category: BountyCategory;
  art: HandArtId;
  words: { 'zh-Hans': string[]; en: string[]; ms: string[] };
};

export const INTENTS: Intent[] = [
  {
    id: 'pickup.food',
    category: 'pickup',
    art: 'food',
    words: { 'zh-Hans': ['外卖'], en: ['takeaway', 'food order'], ms: ['bungkus makanan'] },
  },
  {
    id: 'pickup.parcel',
    category: 'pickup',
    art: 'parcel',
    words: {
      'zh-Hans': ['快递', '包裹', '取件', '驿站', '取货'],
      en: ['parcel', 'package', 'courier', 'delivery'],
      ms: ['bungkusan', 'pakej', 'kurier', 'pos laju'],
    },
  },
  {
    id: 'pickup.document',
    category: 'pickup',
    art: 'document',
    words: { 'zh-Hans': ['取证件', '取文件'], en: ['collect document'], ms: ['ambil dokumen'] },
  },
  {
    id: 'buy.tea',
    category: 'buy',
    art: 'tea',
    words: {
      'zh-Hans': ['奶茶', '珍珠', '茶饮', '果茶', '饮料'],
      en: ['bubble tea', 'milk tea', 'boba', 'drink'],
      ms: ['teh', 'minuman'],
    },
  },
  {
    id: 'buy.coffee',
    category: 'buy',
    art: 'tea',
    words: { 'zh-Hans': ['咖啡', '拿铁'], en: ['coffee', 'latte'], ms: ['kopi'] },
  },
  {
    id: 'buy.medicine',
    category: 'buy',
    art: 'medicine',
    words: {
      'zh-Hans': ['药', '感冒', '退烧', '药房'],
      en: ['medicine', 'pharmacy', 'panadol', 'pills'],
      ms: ['ubat', 'farmasi'],
    },
  },
  {
    id: 'buy.food',
    category: 'buy',
    art: 'food',
    words: {
      'zh-Hans': ['饭', '早餐', '午餐', '晚餐', '便当', '面条', '吃', '夜宵', '打包'],
      en: ['food', 'lunch', 'dinner', 'breakfast', 'meal', 'rice', 'noodle'],
      ms: ['nasi', 'makan', 'sarapan', 'mee'],
    },
  },
  {
    id: 'buy.groceries',
    category: 'buy',
    art: 'bag',
    words: {
      'zh-Hans': ['超市', '日用品', '买菜', '水果', '零食'],
      en: ['grocery', 'groceries', 'supermarket', 'snack', 'fruit', 'shopping'],
      ms: ['pasar raya', 'barang dapur', 'buah', 'kedai runcit'],
    },
  },
  {
    id: 'queue.number',
    category: 'queue',
    art: 'queue',
    words: {
      'zh-Hans': ['排队', '取号', '占座', '占位', '抢票'],
      en: ['queue', 'line up', 'wait in line', 'seat', 'ticket'],
      ms: ['beratur', 'barisan', 'giliran', 'tiket'],
    },
  },
  {
    id: 'handle.visa',
    category: 'handle',
    art: 'document',
    words: {
      'zh-Hans': ['签证', '准证', '移民局', '续签', '护照'],
      en: ['visa', 'student pass', 'immigration', 'passport', 'permit'],
      ms: ['visa', 'pas pelajar', 'imigresen', 'pasport', 'permit'],
    },
  },
  {
    id: 'handle.print',
    category: 'handle',
    art: 'document',
    words: {
      'zh-Hans': ['打印', '复印', '装订', '扫描'],
      en: ['print', 'printing', 'photocopy', 'scan', 'binding'],
      ms: ['cetak', 'fotokopi', 'imbas'],
    },
  },
  {
    id: 'handle.form',
    category: 'handle',
    art: 'document',
    words: {
      'zh-Hans': ['表格', '文件', '申请', '盖章', '证明', '手续'],
      en: ['form', 'document', 'application', 'stamp', 'letter'],
      ms: ['borang', 'dokumen', 'permohonan', 'cop', 'surat'],
    },
  },
  {
    id: 'move.boxes',
    category: 'move',
    art: 'move',
    words: {
      'zh-Hans': ['搬', '箱子', '行李', '家具'],
      en: ['move', 'moving', 'box', 'luggage', 'furniture', 'carry'],
      ms: ['pindah', 'kotak', 'bagasi', 'perabot', 'angkat'],
    },
  },
  {
    id: 'accompany.ride',
    category: 'accompany',
    art: 'car',
    words: {
      'zh-Hans': ['机场', '拼车', '开车', '送我', '接机'],
      en: ['airport', 'ride', 'drive', 'carpool', 'klia'],
      ms: ['lapangan terbang', 'tumpang', 'memandu', 'klia'],
    },
  },
  {
    id: 'accompany.clinic',
    category: 'accompany',
    art: 'accompany',
    words: {
      'zh-Hans': ['陪诊', '医院', '诊所', '看病', '体检'],
      en: ['hospital', 'clinic', 'doctor', 'checkup'],
      ms: ['hospital', 'klinik', 'doktor'],
    },
  },
  {
    id: 'accompany.walk',
    category: 'accompany',
    art: 'accompany',
    words: {
      'zh-Hans': ['陪', '一起去', '带路', '翻译'],
      en: ['accompany', 'go with', 'come with', 'translate', 'company'],
      ms: ['teman', 'temankan', 'bersama', 'terjemah'],
    },
  },
  {
    id: 'study.tutor',
    category: 'study',
    art: 'study',
    words: {
      'zh-Hans': ['作业', '功课', '补习', '复习', '考试', '讲题', '辅导', '论文', '微积分', '课'],
      en: [
        'homework',
        'assignment',
        'tutor',
        'exam',
        'study',
        'essay',
        'thesis',
        'calculus',
        'studying',
      ],
      ms: ['kerja rumah', 'tugasan', 'tuisyen', 'peperiksaan', 'belajar', 'tesis'],
    },
  },
];
