export default {
  account: {
    signIn: {
      google: '通过 Google 登录',
      error: {
        notConfigured: '登录还没配置好，暂时不能用',
        cancelled: '已取消登录',
        failed: '登录没成功，请再试一次',
        network: '没有网络，连上后再试',
      },
    },
  },
  debug: {
    title: '调试',
    account: {
      title: '登录',
      loading: '正在读取登录状态',
      signedOut: '未登录',
      signedIn: '已登录：{{name}}',
    },
    tokens: {
      title: '设计令牌',
      roleSample: '{{role}} 悬赏令',
      reward: 'RM 15',
      statusOpen: '待接单',
      statusActive: '进行中',
      statusPending: '待确认',
      statusDone: '已完成',
      statusUrgent: '紧急',
      accept: '接单',
      posted: '悬赏贴出去啦',
    },
  },
};
