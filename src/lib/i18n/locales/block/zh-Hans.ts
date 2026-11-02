export default {
  menu: '屏蔽{{name}}',
  confirm: {
    title: '屏蔽{{name}}？',
    body: '屏蔽后你们互相看不到对方的悬赏和拼车，也不能申请加入。{{name}}不会收到通知。可以在「我的 → 屏蔽名单」里解除。',
    confirm: '屏蔽',
    rideBody:
      '屏蔽后你们互相看不到对方的悬赏和拼车。你会退出这趟还没出发的拼车，不算放鸽子；已经出发的不受影响。{{name}}不会收到通知。可以在「我的 → 屏蔽名单」里解除。',
    applicantBody:
      '屏蔽后你们互相看不到对方的悬赏，也不能申请对方的悬赏。{{name}}不会收到通知，{{name}}的申请也会从这里消失。可以在「我的 → 屏蔽名单」里解除。',
    cancel: '不屏蔽',
  },
  blocking: '正在屏蔽',
  failed: '没屏蔽成功，再试一次',
  list: {
    title: '屏蔽名单',
    loading: '正在加载屏蔽名单',
    failed: '屏蔽名单没加载出来',
    refreshFailed: '没刷新成功 · 下面是上次加载的名单',
    retry: '重试',
    emptyTitle: '还没有屏蔽过谁',
    emptyBody: '在悬赏或拼车详情右上角的「⋯」里可以屏蔽发布的人。',
    footer: '左滑一行可以解除。解除后你们又能看到对方的悬赏和拼车，对方不会收到通知。',
    unblock: '解除',
    unblocking: '正在解除',
    unblockFailed: '没解除成功，再试一次',
  },
};
