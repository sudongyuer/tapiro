# 用户故事地图

Tapiro 的需求和验收标准只记在这里。主干是同学使用 App 的路线，从左到右：第一次打开与登录 → 我的与设置 → 首页 →
收款方式 → 付款与结清 → 悬赏 → 拼车 → 消息 → 问小貘 → 信誉、贴纸与貘币。每个活动下面是用户故事，每个故事下面是验收
标准和覆盖它的测试。`node scripts/check-story-map.mjs` 检查这份文件（CI 也跑），`node scripts/story-map-board.mjs
<out.dc.html>` 生成设计稿上的看板。

## 写法

- `## <活动>`：主干上的一个活动，顺序就是看板从左到右的顺序。
- `### <故事 id> <标题>`：故事 id 是英文小写，用点分段（`payee.add-alipay`）。
- 故事下面四行固定：`- 故事：作为…我想…以便…`、`- 状态：done | building | planned`、`- 版本：v1 | later`、
  `- 规格：[名字](相对路径)`。
- 然后是一张表 `| 验收 id | 行为 | 覆盖 |`。验收 id 以故事 id 开头再加一段（`payee.add-alipay.name-required`）；
  行为用中文写一句；覆盖用英文逗号分隔，可以写多个（逗号后面紧跟下面的类别名才算分隔）：
  - `ui:<用例名>`：`verification/ui/cases/<用例名>.py`
  - `unit:<路径>`、`int:<路径>`、`db:<路径>`：单元测试、集成测试（本地 Supabase）、pgTAP 文件，路径从仓库根算起；
    可以加 `#<完整的测试名>`，必须和文件里某个 `test`/`describe` 名字（或其他引号里的完整字符串、`def` 函数名）
    完全一致
  - `device`：只能在真机上验，自动进入真机清单；可以写 `device: <怎么验>`
  - `gap: <原因>`：已知没有测试，原因必须写；只写 `gap` 不带原因时，done 的故事检查不通过
  - 只写类别不写目标（`ui`、`unit`、`db`、`int`）：计划中的覆盖，只允许出现在 building 和 planned 的故事里
- done 的故事每条标准都要有测试、`device` 或带原因的 `gap`。
- 验收行只能写在故事的验收表里；写在表外的检查会警告。

## 第一次打开与登录

### welcome.launch 离线打开看到欢迎页

- 故事：作为第一次打开 Tapiro 的同学，我想马上看到欢迎页，以便不用等网络就知道这是什么 App。
- 状态：done
- 版本：v1
- 规格：[foundation](specs/2026-10-11-foundation-design.md)

| 验收 id                    | 行为                                                  | 覆盖                                               |
| -------------------------- | ----------------------------------------------------- | -------------------------------------------------- |
| welcome.launch.signed-out  | 验证模式下离线启动、未登录，欢迎页铺满屏幕            | ui:app_launches                                    |
| welcome.launch.design-kept | 设计 token 场景在浅色和深色下显示每种字体角色和状态色 | ui:design_tokens, unit:src/ui/theme/tokens.test.ts |

### welcome.sticker-wall 欢迎页 A 漂浮贴纸墙

- 故事：作为新同学，我想在欢迎页看到贴纸和小貘在说能帮什么忙，以便一眼明白 Tapiro 是互助 App。
- 状态：done
- 版本：v1
- 规格：[foundation](specs/2026-10-11-foundation-design.md)

| 验收 id                            | 行为                                                       | 覆盖                                                                                                                                                                                             |
| ---------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| welcome.sticker-wall.settles       | 七张贴纸、小貘气泡、字标和登录面板静止下来                 | ui:welcome_a                                                                                                                                                                                     |
| welcome.sticker-wall.sticker-tap   | 点一张贴纸，小貘气泡说出这张贴纸的例子                     | ui:welcome_a, unit:src/features/account/welcomeLayout.test.ts#the parcel example matches the design copy                                                                                         |
| welcome.sticker-wall.panel-rises   | 登录面板 0.9 秒后升起，之后固定                            | ui:welcome_a, unit:src/features/account/welcomeTiming.test.ts#rises 0.9 s after the welcome screen appears                                                                                       |
| welcome.sticker-wall.drift-settles | 贴纸漂移不超过 7 pt 和 1.5 度，6–8 秒一圈，17 秒内全部停下 | unit:src/features/account/welcomeLayout.test.ts#drift stays within 7 pt and 1.5 degrees on a 6 to 8 s loop, unit:src/features/account/welcomeTiming.test.ts#every sticker drift ends within 17 s |
| welcome.sticker-wall.short-screen  | 667 pt 小屏去掉最下面两张贴纸并抬高主视觉                  | unit:src/features/account/welcomeLayout.test.ts#a short screen drops the car and the milk tea and lifts the hero, device: iPhone SE 尺寸看一遍                                                   |
| welcome.sticker-wall.malay-panel   | 马来文面板在小屏上不盖住标语                               | unit:src/features/account/welcomeLayout.test.ts#the Malay panel on a short screen lifts the hero past the umbrella and drops it                                                                  |
| welcome.sticker-wall.reduce-motion | 打开减弱动效时贴纸和小貘都不动，只淡入                     | device: 设置里打开减弱动效后冷启动                                                                                                                                                               |

### welcome.legal 协议和隐私政策

- 故事：作为新同学，我想在登录前看到用户协议和隐私政策，以便知道我同意了什么。
- 状态：done
- 版本：v1
- 规格：[foundation](specs/2026-10-11-foundation-design.md)

| 验收 id              | 行为                                         | 覆盖                                                             |
| -------------------- | -------------------------------------------- | ---------------------------------------------------------------- |
| welcome.legal.opens  | 条款行里的两个链接分别打开用户协议和隐私政策 | ui:welcome_legal, unit:src/features/account/linkSegments.test.ts |
| welcome.legal.closes | 关闭按钮和下滑都回到同一个登录面板           | ui:welcome_legal                                                 |

### account.sign-in 用 Apple 或 Google 登录

- 故事：作为新同学，我想用 Apple 或 Google 一键登录，以便不用再记一个密码。
- 状态：done
- 版本：v1
- 规格：[foundation](specs/2026-10-11-foundation-design.md)

| 验收 id                      | 行为                                                | 覆盖                                                                                                                       |
| ---------------------------- | --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| account.sign-in.fixture      | 验证模式下点登录按钮，以测试用户登录                | ui:sign_in_fixture, unit:src/features/account/fixtureAuthService.test.ts                                                   |
| account.sign-in.id-token     | 把 ID token 和 nonce 交给 Supabase，不走网页 OAuth  | unit:src/features/account/supabaseAuthService.test.ts#passes the provider ID token and nonce to Supabase                   |
| account.sign-in.full-name    | 只给一次的全名写进用户资料；写失败也照样登录        | unit:src/features/account/supabaseAuthService.test.ts#a one-time full name from the provider is written to user metadata   |
| account.sign-in.cancelled    | 取消登录什么都不存，停在欢迎页                      | unit:src/features/account/supabaseAuthService.test.ts#a cancelled provider sheet stores nothing                            |
| account.sign-in.failed-line  | 登录失败时面板里显示一行原因                        | unit:src/features/account/safeSignIn.test.ts, device: 真机上取消 Apple 登录看面板里的那一行                                |
| account.sign-in.unconfigured | 开发版没配置登录时按钮显示未配置                    | unit:src/features/account/supabaseAuthService.test.ts#without a client it is signed out and every provider is unconfigured |
| account.sign-in.keychain     | 会话存在 Keychain，超过单项大小时分块存，坏块读成空 | unit:src/lib/supabase/chunkedStorage.test.ts                                                                               |
| account.sign-in.real-apple   | 真机 Apple 登录成功                                 | device                                                                                                                     |
| account.sign-in.real-google  | 真机 Google 登录成功                                | device                                                                                                                     |

### account.onboarding 名字和语言

- 故事：作为刚登录的同学，我想确认名字、选好语言，以便别人认得我、界面是我看得懂的语言。
- 状态：done
- 版本：v1
- 规格：[foundation](specs/2026-10-11-foundation-design.md)

| 验收 id                        | 行为                                                 | 覆盖                                                                                                                 |
| ------------------------------ | ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| account.onboarding.prefill     | 名字用登录给的名字预填，忽略服务器的占位名           | ui:account_flow, unit:src/features/account/displayName.test.ts#initialDisplayName                                    |
| account.onboarding.name-rules  | 名字去掉首尾空格后 1–40 个字，按码点计数，空名字报错 | ui:account_flow, unit:src/features/account/displayName.test.ts#checkDisplayName, db:supabase/tests/profiles.test.sql |
| account.onboarding.long-name   | 40 个字的名字放在全尺寸输入框里，继续按钮不缩小      | ui:account_long_name, ui:onboarding_moment                                                                           |
| account.onboarding.moment      | 名字页和语言页在时刻背景上，有小貘小头和时刻标题     | ui:onboarding_moment, ui:onboarding_language_moment                                                                  |
| account.onboarding.language    | 语言页切换语言立即生效，点开始进首页                 | ui:account_flow, ui:onboarding_language_moment                                                                       |
| account.onboarding.sign-out    | 名字页顶部可以退出登录，再登录从头开始引导           | ui:account_onboarding_sign_out                                                                                       |
| account.onboarding.once        | 每个用户只引导一次，记录只存在这台手机               | unit:src/features/account/onboardingStore.test.ts, unit:src/features/account/accountStage.test.ts                    |
| account.onboarding.save-failed | 保存名字失败时保留之前的资料，下次再试               | unit:src/features/account/profileStore.test.ts                                                                       |
| account.onboarding.profile-row | 注册时数据库建好资料行并预填名字，超长截到 40 个字   | db:supabase/tests/profiles.test.sql, int:src/features/account/profileService.integration.ts                          |

### welcome.full-onboarding 完整新手引导（第三版 11 屏）

- 故事：作为新同学，我想在引导里试发一条悬赏、撕下第一张贴纸，以便还没用就知道怎么用。
- 状态：planned
- 版本：later
- 规格：[foundation](specs/2026-10-11-foundation-design.md)

| 验收 id                             | 行为                             | 覆盖       |
| ----------------------------------- | -------------------------------- | ---------- |
| welcome.full-onboarding.try-bounty  | 引导里能试发一条悬赏，不真的发布 | ui         |
| welcome.full-onboarding.permissions | 每个权限先解释再问               | ui, device |

## 我的与设置

### me.settings 设置

- 故事：作为同学，我想在设置里换语言、退出登录，以便按我的习惯用 App。
- 状态：done
- 版本：v1
- 规格：[foundation](specs/2026-10-11-foundation-design.md)

| 验收 id                 | 行为                                                          | 覆盖                                                                                                                |
| ----------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| me.settings.long-name   | 40 个字的名字和很长的邮箱下每一行都能点，删除账号那行看得见   | ui:account_settings_long                                                                                            |
| me.settings.language    | 在设置里选 English，界面立即换成英文，再换回来                | ui:settings_language                                                                                                |
| me.settings.resolve     | 语言优先用 App 里选的，其次按系统语言加文字匹配，最后 zh-Hans | unit:src/lib/i18n/resolve.test.ts                                                                                   |
| me.settings.complete    | 三种语言没有空文案                                            | unit:src/lib/i18n/resources.test.ts                                                                                 |
| me.settings.copy-review | 英文和马来文文案经母语者看过                                  | device: 用 en 和 ms 走一遍，请母语者审读                                                                            |
| me.settings.sign-out    | 退出登录只退这台手机，回到欢迎页，再登录直接回首页            | ui:account_flow, unit:src/features/account/supabaseAuthService.test.ts#signs out this device only and never rejects |

### account.delete 删除账号

- 故事：作为不再用 Tapiro 的同学，我想在 App 里删掉账号，以便我的资料不再留着。
- 状态：done
- 版本：v1
- 规格：[foundation](specs/2026-10-11-foundation-design.md)

| 验收 id                | 行为                                                                                                                 | 覆盖                                                                                                                                                                                                                                                   |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| account.delete.deletes | 确认后删掉资料和收款方式，回到欢迎页，再登录重新引导                                                                 | ui:account_flow, unit:src/features/account/accountActions.test.ts, int:supabase/functions/tests/account-delete.integration.ts                                                                                                                          |
| account.delete.blocked | 有没结清的付款时显示原因和那笔付款，删除按钮不能点                                                                   | ui:account_delete_blocked, unit:src/features/account/unsettledPayments.test.ts, unit:src/features/account/supabaseAuthService.test.ts#a blocked deletion carries the unsettled payments from the 409 body                                              |
| account.delete.auth    | 删除接口拒绝没有 token 和只带 anon key 的请求，不碰别的用户                                                          | int:supabase/functions/tests/account-delete.integration.ts                                                                                                                                                                                             |
| account.delete.lists   | 确认页列出会删掉的内容（资料、收款方式、消息和评价等）                                                               | ui:account_flow                                                                                                                                                                                                                                        |
| account.delete.failure | 删除失败时保留会话并显示失败                                                                                         | unit:src/features/account/supabaseAuthService.test.ts#maps deletion failures and keeps the session, unit:src/features/account/accountActions.test.ts#a throwing service reports failure instead of rejecting                                           |
| account.delete.bounty  | 有进行中的悬赏（已选人、还没确认完成）时不能删除，和没结清的付款列在一起；开着的悬赏随删除关掉并退回，申请随删除撤回 | db:supabase/tests/bounty_account_delete.test.sql, unit:supabase/functions/account-delete/handler.test.ts#blocks deletion while a bounty is active and names it, int:supabase/functions/tests/account-delete.integration.ts, gap: 列表界面在悬赏第 6 步 |

## 首页

### shell.tabs 四个 Tab

- 故事：作为同学，我想在悬赏、拼车、消息、我的之间一点就切，以便随时找到要做的事。
- 状态：done
- 版本：v1
- 规格：[foundation](specs/2026-10-11-foundation-design.md)

| 验收 id                    | 行为                                                                             | 覆盖                                                                                      |
| -------------------------- | -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| shell.tabs.switch          | 四个 Tab 切换页面，拼车和消息先显示空状态                                        | ui:shell_tabs, unit:src/features/shell/tabs.test.ts                                       |
| shell.tabs.badge           | 消息 Tab 显示未读角标，很大的数字封顶显示                                        | ui:shell_tabs, ui:home_worst, unit:src/features/shell/accessory.test.ts#caps large counts |
| shell.tabs.tapir-button    | 62 pt 的小貘按钮在浅色和深色下都有白色描边                                       | ui:shell_tabs                                                                             |
| shell.tabs.minimise        | 往下滑悬赏时 Tab 栏缩起（选中的 Tab、内嵌提醒条、48 pt 小貘），点缩起的 Tab 展开 | ui:shell_minimise                                                                         |
| shell.tabs.badge-voiceover | VoiceOver 读出消息角标的数字                                                     | device: 打开 VoiceOver 聚焦消息 Tab                                                       |

### shell.accessory 最要紧的一件事

- 故事：作为同学，我想在 Tab 栏上方看到现在最要紧的一件事，以便不会忘了付钱或赶车。
- 状态：done
- 版本：v1
- 规格：[foundation](specs/2026-10-11-foundation-design.md)

| 验收 id                    | 行为                                                          | 覆盖                                                                                       |
| -------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| shell.accessory.priority   | 我欠的钱 > 1 小时内出发的拼车 > 别人欠我的钱 > 进行中的悬赏   | unit:src/features/shell/accessory.test.ts#pickMostUrgent                                   |
| shell.accessory.more       | 不止一件时显示「还有 n 件」                                   | ui:home_worst, unit:src/features/shell/accessory.test.ts#a single item has nothing more    |
| shell.accessory.visibility | 悬赏顶部实时卡在屏上时隐藏，卡片滑走后出现，其他 Tab 一直显示 | ui:shell_tabs, ui:home_fan_out, unit:src/features/shell/accessory.test.ts#accessoryVisible |
| shell.accessory.none       | 没有事时任何 Tab 都不显示                                     | ui:home_calm, unit:src/features/shell/accessory.test.ts#hidden when there is no item       |
| shell.accessory.tap        | 在别的 Tab 点提醒条，回到悬赏顶部并摊开实时卡                 | ui:shell_accessory_tap                                                                     |
| shell.accessory.amount     | 金额单独放右边永不截断，长标题一行截断                        | ui:home_worst_inline, unit:src/lib/liveItems.test.ts#accessory amounts                     |

### home.stage 小貘舞台

- 故事：作为同学，我想打开首页就从小貘的颜色和话里知道今天有没有急事，以便不用一条条看。
- 状态：done
- 版本：v1
- 规格：[foundation](specs/2026-10-11-foundation-design.md)

| 验收 id           | 行为                                                   | 覆盖                                                                                                       |
| ----------------- | ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| home.stage.urgent | 欠钱时舞台是有急事的颜色                               | ui:home_three_cards, ui:shell_minimise, unit:src/features/home/homeModel.test.ts#owing money is urgent     |
| home.stage.live   | 有进行中的事、没欠钱时是进行中的颜色                   | ui:home_live, ui:home_one_card, unit:src/features/home/homeModel.test.ts#anything else live is in progress |
| home.stage.calm   | 什么都没有时是没事的舞台和平静卡，卡上有问小貘入口     | ui:home_calm, unit:src/features/home/homeModel.test.ts#nothing pending is calm                             |
| home.stage.line   | 小貘的话点名最前面那张卡的人，例如「送到啦，记得付款」 | ui:home_worst, unit:src/features/home/homeModel.test.ts#stageLine                                          |

### home.live-cards 实时卡叠放和摊开

- 故事：作为同学，我想同时进行的几件事叠成一摞、一点就摊开，以便首页不被挤满又能看全。
- 状态：done
- 版本：v1
- 规格：[foundation](specs/2026-10-11-foundation-design.md)

| 验收 id                       | 行为                                                     | 覆盖                                                                                                                                      |
| ----------------------------- | -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| home.live-cards.one           | 只有一件事时一张卡，没有叠影也没有摊开按钮               | ui:home_one_card, unit:src/features/home/stackLayout.test.ts#one card sits alone at its own height                                        |
| home.live-cards.three         | 三件事叠起露两层叠影，摊开成三张，付款卡在最前           | ui:home_three_cards                                                                                                                       |
| home.live-cards.fan-out       | 四件事叠起后摊开再收起；提醒条等最后一张卡滑到栏下才出现 | ui:home_fan_out, unit:src/features/home/stackLayout.test.ts#reports the fanned bottom while open so the accessory waits for the last card |
| home.live-cards.order         | 卡片顺序跟提醒条的优先级一样                             | ui:home_live, unit:src/features/home/homeModel.test.ts#cards follow the accessory priority and carry their detail                         |
| home.live-cards.haptic        | 摊开时有一下轻触感                                       | device                                                                                                                                    |
| home.live-cards.reduce-motion | 打开减弱动效时摊开和收起没有位移，直接切换               | device                                                                                                                                    |

### home.title-strip 悬赏令标题和收起的窄条

- 故事：作为同学，我想往下滑时舞台收成一条窄条、标题始终看得清，以便滑列表时还知道在哪。
- 状态：done
- 版本：v1
- 规格：[foundation](specs/2026-10-11-foundation-design.md)

| 验收 id                | 行为                                              | 覆盖                                                           |
| ---------------------- | ------------------------------------------------- | -------------------------------------------------------------- |
| home.title-strip.halo  | 悬赏令标题在展开、收起和切 Tab 回来后都有白色光晕 | ui:home_title_strip                                            |
| home.title-strip.strip | 收起的窄条紧贴在紧凑导航栏下面                    | ui:home_title_strip, unit:src/features/home/homeScroll.test.ts |

### home.worst-data 极端数据

- 故事：作为名字很长或金额很大的同学，我想首页照样排得下，以便信息不被截掉。
- 状态：done
- 版本：v1
- 规格：[foundation](specs/2026-10-11-foundation-design.md)

| 验收 id                   | 行为                                                          | 覆盖                                  |
| ------------------------- | ------------------------------------------------------------- | ------------------------------------- |
| home.worst-data.worst     | 40 个字的名字、很长的路线、RM 12,345.60、1,284 条未读都排得下 | ui:home_worst                         |
| home.worst-data.one       | Jo、RM 0.50、1 分钟、1 条未读也排得对                         | ui:home_one                           |
| home.worst-data.calm-name | 平静卡问候 40 个字的名字，问小貘按钮不被挤                    | ui:home_worst_calm                    |
| home.worst-data.beside    | 大数字放不下两行文字旁边时才换到下面                          | unit:src/features/home/beside.test.ts |
| home.worst-data.money     | 金额按 sen 存整数，显示两位小数和千分位                       | unit:src/lib/money.test.ts            |

### home.live-activity 实时活动和灵动岛

- 故事：作为同学，我想锁屏和灵动岛上看到正在进行的事，以便不用打开 App 也知道车还有几分钟到。
- 状态：planned
- 版本：v1
- 规格：[foundation](specs/2026-10-11-foundation-design.md)

| 验收 id                     | 行为                                         | 覆盖   |
| --------------------------- | -------------------------------------------- | ------ |
| home.live-activity.top-item | 最要紧的进行中事项显示为一条实时活动，一句话 | device |
| home.live-activity.in-app   | App 在前台时灵动岛是否显示，先做真机验证     | device |

## 收款方式

### payee.list 收款方式列表

- 故事：作为接单的同学，我想在一个地方管好我的收款方式，以便别人付钱给我时不出错。
- 状态：done
- 版本：v1
- 规格：[foundation](specs/2026-10-11-foundation-design.md)

| 验收 id                 | 行为                                                        | 覆盖                                                                                                                                                                                                                    |
| ----------------------- | ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| payee.list.default      | 默认方式有标记并排在第一，第一个转账方式自动成为默认        | ui:payee_list, unit:src/features/payee/methods.test.ts#default method, db:supabase/tests/payee_methods.test.sql                                                                                                         |
| payee.list.set-default  | 改默认后只剩一个默认                                        | unit:src/features/payee/methods.test.ts#changing the default leaves exactly one, int:src/features/payee/payeeService.integration.ts#changes the default, updates a QR and promotes on delete                            |
| payee.list.masked-bank  | 银行账号只显示后四位                                        | ui:payee_list, unit:src/features/payee/validate.test.ts#masks to the last four digits                                                                                                                                   |
| payee.list.recheck      | 收款码 90 天没重选时列表顶部黄色提示，「我的」有小红点      | ui:payee_list, unit:src/features/payee/methods.test.ts#a QR method is due after 90 days                                                                                                                                 |
| payee.list.menu-order   | + 菜单先列支付宝、微信、TNG，然后是「其他」                 | ui:payee_list                                                                                                                                                                                                           |
| payee.list.long         | 七个长名字的方式滚到底，现金那行完整地在提醒条和 Tab 栏上面 | ui:payee_long, unit:src/features/payee/payeeStore.test.ts#the worst fixture has seven transfer methods including a named bank                                                                                           |
| payee.list.delete-rule  | 删掉默认方式后最早的转账方式成为默认                        | unit:src/features/payee/methods.test.ts#removing the default promotes the oldest remaining transfer method, int:src/features/payee/payeeService.integration.ts#changes the default, updates a QR and promotes on delete |
| payee.list.swipe-delete | 左滑一行删除这个方式                                        | ui:payee_swipe_delete, unit:src/features/payee/methods.test.ts                                                                                                                                                          |
| payee.list.owner-only   | 别的用户看不到也改不了我的收款方式                          | db:supabase/tests/payee_methods.test.sql, int:src/features/payee/payeeService.integration.ts#another user sees none of them and cannot change them                                                                      |
| payee.list.load-retry   | 加载失败可以重试；删除失败列表不变                          | unit:src/features/payee/payeeStore.test.ts                                                                                                                                                                              |

### payee.add-alipay 添加支付宝收钱码

- 故事：作为用支付宝收钱的同学，我想存一张支付宝收钱码截图，以便发布者能扫码付我。
- 状态：done
- 版本：v1
- 规格：[foundation](specs/2026-10-11-foundation-design.md)

| 验收 id                        | 行为                                                                      | 覆盖                                                                                |
| ------------------------------ | ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| payee.add-alipay.steps         | 从「支付宝收钱码」进入，表单先说明在支付宝里怎么存收钱码                  | ui:payee_qr_alipay, ui:payee_qr                                                     |
| payee.add-alipay.accepts       | 支付宝收钱码确认为支付宝收钱码，没有换钱包的提示                          | ui:payee_qr_alipay, unit:src/features/payee/classifyQr.test.ts                      |
| payee.add-alipay.name-required | 不填支付宝显示的名字就保存会报错；填了显示「发布者会看到：名字 · 支付宝」 | ui:payee_qr_alipay, unit:src/features/payee/walletName.test.ts                      |
| payee.add-alipay.real-picker   | 系统相册里选一张真实的支付宝码图片，在机器上识别并保存                    | ui:payee_qr_real                                                                    |
| payee.add-alipay.look-alike    | 冒充 qr.alipay.com 的网址不被接受                                         | unit:src/features/payee/classifyQr.test.ts#does not accept a look-alike Alipay host |
| payee.add-alipay.paying-code   | 支付宝付款码被拦下，显示红色付款码提示，不保存                            | ui:payee_qr, unit:src/features/payee/classifyQr.test.ts#Alipay 18 digits from 28    |
| payee.add-alipay.step-names    | 支付宝首页「收钱」等按钮名和真机一致                                      | device                                                                              |
| payee.add-alipay.masked-name   | 能输入支付宝显示的打码中文名（例如「*明」）                               | device: AXe 打不出中文，在真机上输入                                                |

### payee.add-wechat 添加微信收款码

- 故事：作为用微信收钱的同学，我想存一张微信收款码截图，以便发布者能扫码付我。
- 状态：done
- 版本：v1
- 规格：[foundation](specs/2026-10-11-foundation-design.md)

| 验收 id                         | 行为                                                                  | 覆盖                                                                                                 |
| ------------------------------- | --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| payee.add-wechat.accepts        | wxp:// 收款码确认为微信收款码，没有换钱包的提示                       | ui:payee_qr_wechat, unit:src/features/payee/classifyQr.test.ts                                       |
| payee.add-wechat.name-required  | 不填微信显示的名字就保存会报错；填了显示「发布者会看到：名字 · 微信」 | ui:payee_qr_wechat, unit:src/features/payee/walletName.test.ts                                       |
| payee.add-wechat.merchant-order | 微信商户订单码（2 小时过期）被拒                                      | unit:src/features/payee/classifyQr.test.ts#rejects a WeChat Pay merchant order code (expires in 2 h) |
| payee.add-wechat.step-names     | 微信「收付款 → 二维码收款」按钮名和真机一致                           | device                                                                                               |

### payee.add-tng 添加 TNG / DuitNow 收款码

- 故事：作为用 TNG 收钱的同学，我想存一张 DuitNow 收款码，以便发布者用任何银行或钱包付我。
- 状态：done
- 版本：v1
- 规格：[foundation](specs/2026-10-11-foundation-design.md)

| 验收 id                     | 行为                                                          | 覆盖                                                                                                                                                                                                                                                 |
| --------------------------- | ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| payee.add-tng.accepts       | CRC 正确、不带金额的个人 DuitNow 码显示银行或钱包和码里的名字 | ui:payee_qr, ui:payee_qr_real, unit:src/features/payee/classifyQr.test.ts#accepts a static personal DuitNow QR with bank and name                                                                                                                    |
| payee.add-tng.wallet-switch | 在别家入口选到 DuitNow 码时，先提示换成 TNG 再保存            | ui:payee_qr                                                                                                                                                                                                                                          |
| payee.add-tng.damaged       | 改了一个字符的码判为损坏，不保存                              | unit:src/features/payee/classifyQr.test.ts#rejects a code with one changed character as damaged                                                                                                                                                      |
| payee.add-tng.amount        | 动态码和带固定金额的静态码都被拒                              | unit:src/features/payee/classifyQr.test.ts#rejects a dynamic code, unit:src/features/payee/classifyQr.test.ts#rejects a static code that carries an amount (the PayNet example)                                                                      |
| payee.add-tng.business      | 商家码可以存，标为商家                                        | unit:src/features/payee/classifyQr.test.ts#allows a business code and labels it                                                                                                                                                                      |
| payee.add-tng.several-codes | 一张截图里有几个码时选收款码                                  | unit:src/features/payee/classifyQr.test.ts#picks the receive code when a screenshot holds several codes                                                                                                                                              |
| payee.add-tng.non-ascii     | 中文和带重音的名字照样识别，CRC 按 UTF-8 算                   | unit:src/features/payee/classifyQr.test.ts#non-ASCII values                                                                                                                                                                                          |
| payee.add-tng.replace       | 重选另一家的码原地替换这一行，默认和位置不变                  | ui:payee_list, unit:src/features/payee/payeeStore.test.ts#replacing a QR with another wallet keeps the default and the position, int:src/features/payee/payeeService.integration.ts#replaces a QR with another wallet in place and keeps the default |
| payee.add-tng.checked-at    | 重选收款码会刷新检查时间，改手机号不会                        | unit:src/features/payee/payeeStore.test.ts#editing a phone keeps checkedAt; re-saving a QR refreshes it                                                                                                                                              |
| payee.add-tng.camera        | 用相机扫码添加（只在那时问相机权限）                          | device                                                                                                                                                                                                                                               |
| payee.add-tng.step-names    | TNG「Receive」按钮名和真机一致                                | device                                                                                                                                                                                                                                               |

### payee.add-phone 添加 DuitNow 手机号

- 故事：作为用银行收钱的同学，我想填 DuitNow 手机号和银行显示的名字，以便付款人能核对收款人。
- 状态：done
- 版本：v1
- 规格：[foundation](specs/2026-10-11-foundation-design.md)

| 验收 id                       | 行为                                 | 覆盖                                                                       |
| ----------------------------- | ------------------------------------ | -------------------------------------------------------------------------- |
| payee.add-phone.name-required | 没填银行显示的名字不能保存           | ui:payee_add_duitnow, unit:src/features/payee/validate.test.ts#is required |
| payee.add-phone.first-default | 没有方式时添加的第一个手机号成为默认 | ui:payee_add_duitnow, db:supabase/tests/payee_methods.test.sql             |
| payee.add-phone.mobile        | 马来西亚手机号校验，按 +60 格式显示  | unit:src/features/payee/validate.test.ts#checkMalaysianMobile              |
| payee.add-phone.name-cap      | 名字去掉多余空格，最多 60 个字       | unit:src/features/payee/validate.test.ts#caps at 60 characters             |

### payee.add-bank 添加银行账户

- 故事：作为少数用银行转账的同学，我想存银行账户，以便没有钱包的发布者也能付我。
- 状态：done
- 版本：v1
- 规格：[foundation](specs/2026-10-11-foundation-design.md)

| 验收 id               | 行为                                                     | 覆盖                                                                                                                                                  |
| --------------------- | -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| payee.add-bank.digits | 账号去掉空格和横线，只收数字                             | unit:src/features/payee/validate.test.ts#strips spaces and dashes                                                                                     |
| payee.add-bank.picker | 五家银行加「其他银行」，选其他时必须填 1–60 个字的银行名 | unit:src/features/payee/validate.test.ts#checkBank, int:src/features/payee/payeeService.integration.ts#saves a bank that is not in the picker by name |
| payee.add-bank.form   | 银行表单从 + 菜单打开、填写、保存后出现在列表里          | ui:payee_add_bank                                                                                                                                     |

### payee.cash 现金当面付

- 故事：作为愿意收现金的同学，我想打开一个开关，以便当面交易的发布者知道可以给现金。
- 状态：done
- 版本：v1
- 规格：[foundation](specs/2026-10-11-foundation-design.md)

| 验收 id           | 行为                                                  | 覆盖                                                                                                                                                                                                                    |
| ----------------- | ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| payee.cash.toggle | 现金是单独一组的开关，存成一行 cash，永远不会成为默认 | ui:payee_list, unit:src/features/payee/methods.test.ts#cash is never the default, even when added first, int:src/features/payee/payeeService.integration.ts#round-trips every method type with the first one as default |

## 付款与结清

### pay.sheet 付款弹窗

- 故事：作为要付钱的发布者，我想在一个弹窗里看到金额、收款方式和要复制的内容，以便在自己的 App 里付对人。
- 状态：done
- 版本：v1
- 规格：[foundation](specs/2026-10-11-foundation-design.md)

| 验收 id              | 行为                                                                                                    | 覆盖                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| -------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| pay.sheet.methods    | 收款方式是单选列表，钱包类在前；只有一种时直接选中那一行                                                | ui:pay_sheet_wallets, ui:pay_sheet_duitnow, unit:src/features/payment/model.test.ts#wallets come first: Alipay, WeChat, TNG, other DuitNow QR, phone, bank, cash, unit:src/features/payment/model.test.ts#a single method is preselected; several wait for a choice                                                                                                                                                                                     |
| pay.sheet.copy       | 每个值都能复制，复制后有反馈；参考号 TP-XXXX 也能复制                                                   | ui:pay_sheet_duitnow, unit:src/features/payment/model.test.ts#a payer copies the full number, in the format banks accept, unit:src/features/payment/model.test.ts#TP- plus four characters, never 0, O, 1 or I, db:supabase/tests/payments.test.sql                                                                                                                                                                                                     |
| pay.sheet.name-check | 显示「付款前核对：收款人应该是 {名字}」                                                                 | ui:pay_sheet_wallets                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| pay.sheet.no-methods | 收款人没有方式或只有现金时说明清楚                                                                      | ui:pay_sheet_none, ui:pay_sheet_cash                                                                                                                                                                                                                                                                                                                                                                                                                    |
| pay.sheet.cny        | 支付宝、微信显示 RM 金额加「约 ¥xx（参考）」，按 BNM 每日中间价，7 天内没有汇率就不显示，旁边写汇率来源 | ui:pay_sheet_wallets, unit:src/features/payment/model.test.ts#converts RM to yuan at the daily rate and rounds to the fen, unit:src/features/payment/model.test.ts#hides the reference when no rate is newer than 7 days, unit:supabase/functions/fx-rate/handler.test.ts#reads the CNY middle rate from a recorded BNM response, db:supabase/tests/fx_rates.test.sql, int:src/features/payment/paymentService.integration.ts#reads the latest BNM rate |
| pay.sheet.worst      | 长名字、大金额在浅色、深色和马来文下排得下                                                              | gap: worst 夹具已有长名字和 RM 12,345.60，付款弹窗的极端数据用例留到全量矩阵前补                                                                                                                                                                                                                                                                                                                                                                        |
| pay.sheet.offline    | 没有网络时操作不可用，显示没有网络                                                                      | unit:src/features/payment/paymentStore.test.ts#a failed action reports failure and keeps the list, gap: 还没有网络状态检测，断网时操作失败后显示「没成功」并保留输入                                                                                                                                                                                                                                                                                    |

### pay.open-app 打开付款 App

- 故事：作为付款人，我想一点就打开我的钱包 App，以便少切几次屏。
- 状态：done
- 版本：v1
- 规格：[foundation](specs/2026-10-11-foundation-design.md)

| 验收 id              | 行为                                                                         | 覆盖                                                                                                                 |
| -------------------- | ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| pay.open-app.wallets | 有真机确认过的链接时只打开钱包首页；没确认的链接不用，只给提示               | ui:pay_sheet_wallets, unit:src/features/payment/model.test.ts#no wallet link opens until it is confirmed on a device |
| pay.open-app.banks   | DuitNow 和银行只提示「打开你的银行 App，选 DuitNow」，号码可复制             | ui:pay_sheet_duitnow                                                                                                 |
| pay.open-app.real    | 真机上逐个打开 TNG、Grab、支付宝、微信，确认后在 WALLET_LINKS 里标 confirmed | device                                                                                                               |

### pay.qr 收款码付款

- 故事：作为付款人，我想把收款码存到相册再打开钱包扫，以便在同一台手机上也能扫码付。
- 状态：done
- 版本：v1
- 规格：[foundation](specs/2026-10-11-foundation-design.md)

| 验收 id              | 行为                                                                                     | 覆盖                 |
| -------------------- | ---------------------------------------------------------------------------------------- | -------------------- |
| pay.qr.save-and-open | 主按钮「存到相册」（链接确认后是「存到相册并打开 {app}」），另有「用另一台手机扫」全屏码 | ui:pay_sheet_wallets |
| pay.qr.photos        | 真机上只要「添加照片」权限就存进相册、在钱包里从相册扫成功                               | device               |

### pay.mark-paid 我已付款

- 故事：作为付完钱的发布者，我想点一下「我已付款」，以便接单人知道去查收。
- 状态：done
- 版本：v1
- 规格：[foundation](specs/2026-10-11-foundation-design.md)

| 验收 id                  | 行为                                                                                                                             | 覆盖                                                                                                                                                                                                                                                                                                                                                                                |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| pay.mark-paid.waiting    | 「我已付款」是固定在弹窗底部的主按钮；点了之后原地变成等待确认；首页和提醒条安静地显示「等 {名字} 确认」直到结清或对方说还没收到 | ui:pay_mark_paid_undo, unit:src/features/payment/paymentStore.test.ts#after 我已付款 the payer sees a quiet waiting item until the payee says 还没收到                                                                                                                                                                                                                              |
| pay.mark-paid.undo       | 收款人确认前可以撤回                                                                                                             | ui:pay_mark_paid_undo, unit:src/features/payment/model.test.ts#the payer undoes 我已付款 only before the payee confirms, db:supabase/tests/payments.test.sql                                                                                                                                                                                                                        |
| pay.mark-paid.screenshot | 可以附付款截图，双方和审核员可见，结清 30 天后删除；没挂上的草稿和撤回后的截图也会删掉                                           | ui:pay_mark_paid_undo, ui:pay_payee_confirm, db:supabase/tests/payments.test.sql, unit:supabase/functions/payment-proof-cleanup/handler.test.ts#removes proofs 30 days after settlement and clears their paths, int:src/features/payment/paymentService.integration.ts#pays, undoes, pays with a proof and settles through the RPCs, device, gap: 审核员查看入口在第 7 步（举报）做 |

### pay.confirm 收款确认和结清

- 故事：作为接单人，我想确认真的收到了钱，以便这件事结清、双方都能评价。
- 状态：done
- 版本：v1
- 规格：[foundation](specs/2026-10-11-foundation-design.md)

| 验收 id                       | 行为                                                                                                                                                                                                                                                 | 覆盖                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| pay.confirm.states            | 状态只经 RPC 变化：待付 → 已付 → 已结清或有争议                                                                                                                                                                                                      | unit:src/features/payment/model.test.ts#due → marked_paid → settled through the payer then the payee, db:supabase/tests/payments.test.sql                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| pay.confirm.received          | 收款人看到「{名字} 说已付款」，能打开对方附的截图，点已收到才结清；「已收到」是固定在弹窗底部的主按钮，「还没收到」是它下面的文字按钮                                                                                                                | ui:pay_payee_confirm, ui:pay_first_settle, db:supabase/tests/payments.test.sql                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| pay.confirm.title             | 收款人打开的弹窗标题是「收款」，付款人是「付款」；还不知道是哪一方时不显示标题                                                                                                                                                                       | ui:pay_payee_confirm, ui:pay_first_settle, ui:pay_mark_paid_undo, unit:src/features/payment/model.test.ts#the payee sees 收款 as the sheet title, the payer 付款, and an unknown role no title                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| pay.confirm.not-yet           | 点还没收到会提醒付款人，24 小时后可以举报（举报入口第 7 步做，先放说明）                                                                                                                                                                             | ui:pay_payee_confirm, unit:src/features/payment/paymentStore.test.ts#after 我已付款 the payer sees a quiet waiting item until the payee says 还没收到, db:supabase/tests/payments.test.sql                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| pay.confirm.cash              | 现金只要收款人点已收到                                                                                                                                                                                                                               | unit:src/features/payment/model.test.ts#cash settles from due on the payee alone; the payer never marks cash paid, ui:pay_first_settle, db:supabase/tests/payments.test.sql                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| pay.confirm.celebration       | 每次结清都全屏庆祝：贴纸从收据卡撕下飞进贴纸本、金额滚动、一次成功触感；第一次多「第一次收款」徽章，之后标题是「又帮成一单」；贴纸本在贴纸飞行时上移，落定后标题、小貘和贴纸本成一组在按钮上方居中；屏幕矮时先缩小间距、再整组缩小，按钮始终完整显示 | ui:pay_first_settle, ui:pay_payee_confirm, ui:pay_settle_routine, unit:src/features/payment/paymentStore.test.ts#settling removes the payment from the list; only the first settle is first, unit:src/features/payment/celebration/celebration.test.ts#the fixture settle returns the sticker count the sticker book then lists, db:supabase/tests/stickers.test.sql, unit:src/features/payment/celebration/celebration.test.ts#on a 667 pt iPhone SE the gap shrinks first, then the group scales to fit above the buttons, unit:src/features/payment/celebration/celebration.test.ts#the panel starts at the bottom of the stage and the sticker targets the scaled slot, device: 真机看动效和成功触感                                                                                                                                                                                                                                                                                                                                                           |
| pay.confirm.voiceover-modals  | VoiceOver：关掉全屏收款码或付款截图后，焦点回到打开它的那一行；最后一行之后读到底部主按钮                                                                                                                                                            | device: 打开 VoiceOver 打开再关闭全屏码和截图，划到底                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| pay.confirm.celebration-slots | 新贴纸总是飞进第一格（左上）；最近的贴纸（最多 5 张）先往后挪一格空出第一格，第 6 张旧贴纸在挪动时淡出，张数从 n-1 滚到 n；服务器没给张数时不显示张数、不占格子、不挪动，贴纸落在贴纸本中间，文案不提张数和「第一次」                                | ui:pay_settle_routine, ui:pay_payee_confirm, unit:src/features/payment/celebration/celebration.test.ts#a later sticker lands in the first slot and each earlier one shifts one slot forward, unit:src/features/payment/celebration/celebration.test.ts#from the seventh sticker on, the five most recent fill slots 1 to 5 and the sixth leaves the page, unit:src/features/payment/celebration/celebration.test.ts#a seventh sticker shifts five and fades out the sixth earlier one in the last slot, unit:src/features/payment/celebration/celebration.test.ts#the last card of a row moves to the first slot of the next row, unit:src/features/payment/celebration/celebration.test.ts#earlier stickers that did not load show as filled slots, never as empty ones, unit:src/features/payment/celebration/celebration.test.ts#claims no slot and shifts nothing: earlier stickers stay, nothing is a target or an empty outline, unit:src/features/payment/celebration/celebration.test.ts#the body never claims a number or a first, even on a first settle |
| pay.confirm.celebration-cny   | 有 7 天内的 BNM 汇率时金额下面显示人民币参考价（马来西亚国家银行中间价），没有就不显示                                                                                                                                                               | ui:pay_first_settle, ui:pay_settle_routine                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| pay.confirm.celebration-book  | 「看看贴纸本」进贴纸本，新贴纸在最前；「好的」回到已结清                                                                                                                                                                                             | ui:pay_settle_routine, ui:pay_first_settle, gap: 用例从调试场景打开贴纸本；真实路由（关掉付款弹窗再进「我的 → 我帮过的忙」）没有用例，因为验证模式的首页只有付款人那一方能打开付款弹窗                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| pay.confirm.celebration-skip  | 按钮出现前（1.4 秒）点按钮的位置也只是跳过，不会关掉或跳转；点屏幕任意处跳到落定画面；减弱动态效果时只淡入落定画面并保留一次成功触感；读屏只朗读一次完整结果                                                                                         | unit:src/features/payment/celebration/celebration.test.ts#the sticker lands at 1020 ms and every part ends by the end of the clock, device: 真机上在按钮出现前点按钮位置、点屏幕跳过、打开减弱动态效果和旁白各看一遍                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| pay.confirm.visibility        | 收款信息只给这件事的付款人，在付款步骤里看，结清后隐藏                                                                                                                                                                                               | db:supabase/tests/payments.test.sql, int:src/features/payment/paymentService.integration.ts#pays, undoes, pays with a proof and settles through the RPCs                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| pay.confirm.one-per-item      | 每个悬赏只有一笔正向付款，反向退款不算；拼车每位乘客一笔                                                                                                                                                                                             | db:supabase/tests/payments.test.sql                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| pay.confirm.category          | 悬赏付款带上类别，只能是八种之一                                                                                                                                                                                                                     | db:supabase/tests/payments.test.sql                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |

### pay.unpaid 不付款的处理

- 故事：作为接单人，我想 App 帮我提醒不付钱的人，以便我不用自己去催。
- 状态：building
- 版本：v1
- 规格：[foundation](specs/2026-10-11-foundation-design.md)

| 验收 id              | 行为                                                     | 覆盖                                                                 |
| -------------------- | -------------------------------------------------------- | -------------------------------------------------------------------- |
| pay.unpaid.reminders | 24 小时和 72 小时提醒付款人（推送第 9 步接上）           | unit:src/lib/unpaid.test.ts#reminds at 24 h and 72 h, once each, db  |
| pay.unpaid.block     | 欠 7 天或同时 2 笔没付就不能发新的，结清或举报处理后解除 | unit:src/lib/unpaid.test.ts, db:supabase/tests/payments.test.sql, ui |

### pay.prepay-refund 先付单取消后退款

- 故事：作为先付了钱的发布者，我想在取消时由接单人把钱付回给我，以便我不吃亏。
- 状态：building
- 版本：v1
- 规格：[product notes](product-notes.md)

| 验收 id                   | 行为                                                     | 覆盖                                      |
| ------------------------- | -------------------------------------------------------- | ----------------------------------------- |
| pay.prepay-refund.reverse | 取消先付单生成一笔反向付款，发布者确认收到后才算取消完成 | db:supabase/tests/payments.test.sql, unit |

### pay.home 首页和提醒条接上真实付款

- 故事：作为欠着钱的同学，我想首页和提醒条显示真实的待付款，以便一点「去付款」就能付。
- 状态：done
- 版本：v1
- 规格：[foundation](specs/2026-10-11-foundation-design.md)

| 验收 id               | 行为                                                                              | 覆盖                                                                                                                                                                                                                                                                                                                                                                     |
| --------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| pay.home.pay-card     | 首页待付卡片是「去付款」按钮，打开付款弹窗                                        | ui:pay_card_button                                                                                                                                                                                                                                                                                                                                                       |
| pay.home.accessory    | 提醒条和实时卡读真实的付款数据                                                    | ui:pay_card_button, unit:src/features/payment/paymentStore.test.ts#the store feeds the accessory through the live-item contract, unit:src/features/home/homeModel.test.ts#a payment item without fixture details builds its card from the payment, unit:src/lib/liveItems.test.ts#a source adds its items after the base feed and replaces them on the next publish      |
| pay.home.unknown      | 付款没加载出来或刷新失败时，首页显示「付款信息没加载出来 · 重试」，不显示「没事」 | ui:home_payments_failed, unit:src/features/payment/paymentStore.test.ts#a failed refresh marks the list stale instead of keeping it live, unit:src/features/home/homeModel.test.ts#a failed source shows the unavailable card instead of calm and keeps the stage off calm, unit:src/lib/liveItems.test.ts#a failed or stale source shows no items and reports the issue |
| pay.home.delete-check | 删除账号时检查真实的未结清付款                                                    | int:supabase/functions/tests/account-delete.integration.ts#blocks deletion while a real payment is unsettled, then allows it after settlement, ui:account_delete_blocked, unit:supabase/functions/account-delete/handler.test.ts#names the counterpart and the direction from the deleting user                                                                          |

### pay.cant-pay 付不了

- 故事：作为付款人，我想在付不了时告诉收款人，以便对方去检查收款方式。
- 状态：planned
- 版本：v1
- 规格：[foundation](specs/2026-10-11-foundation-design.md)

| 验收 id              | 行为                                                   | 覆盖   |
| -------------------- | ------------------------------------------------------ | ------ |
| pay.cant-pay.recheck | 点「付不了」后收款人的列表顶部出现重新检查提示和小红点 | ui, db |

## 悬赏

### bounty.board 能接的悬赏

- 故事：作为想帮忙赚点钱的同学，我想在首页下面看到能接的悬赏，以便找到顺手能做的事。
- 状态：building
- 版本：v1
- 规格：[bounty](specs/2026-10-11-bounty-design.md)

| 验收 id               | 行为                                                                                                                                                                                                                                                                                                                                                                                                                                                           | 覆盖                                                                                                                                                                                                                                                                                                     |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| bounty.board.data     | 有位置时有地点的悬赏按距离由近到远，没地点的排在后面按新到旧；没位置时全部按新到旧；只列开放、没过期、不是自己发的、双方没有拉黑的悬赏；只给地点名，不给详细地址                                                                                                                                                                                                                                                                                               | db:supabase/tests/bounty_nearby.test.sql                                                                                                                                                                                                                                                                 |
| bounty.board.pages    | 每页默认 20 条、最多 50 条，往下翻不重复不漏，距离相同或发布时间相同也一样；位置或筛选变了，旧的翻页位置作废，从第一页重新开始；列表滑到离底部一屏内自动加载下一页，「没写地点的」只在第一条没地点的悬赏前出现一次                                                                                                                                                                                                                                             | db:supabase/tests/bounty_nearby.test.sql, ui:bounty_board_list                                                                                                                                                                                                                                           |
| bounty.board.filters  | 全部 / 急单 / 塞得进空档三个筛选；急单是 3 小时内截止；塞得进空档去掉和自己进行中的悬赏时间重叠的；选中的「全部」显示总数；筛完没有时显示「现在没有急单」和「看全部」                                                                                                                                                                                                                                                                                          | db:supabase/tests/bounty_nearby.test.sql, unit:src/features/bounty/board/fixtureBoardService.test.ts, ui:bounty_board_states                                                                                                                                                                             |
| bounty.board.states   | 首次加载失败显示「没加载出来 · 重试」，筛选不显示数量，不当成空；没有悬赏时显示「附近暂时没有悬赏 · 发悬赏」；下拉刷新失败保留列表，上面提示数据是几点的；翻到底显示「就这些了 · 下拉刷新」；空和出错的卡片在分组背景上，小貘头不超过 32 pt                                                                                                                                                                                                                    | ui:bounty_board_states, unit:src/features/bounty/board/boardState.test.ts, unit:src/features/bounty/board/malaysiaClock.test.ts                                                                                                                                                                          |
| bounty.board.card     | 卡片三行：48 pt 类型贴纸、类型、标题（两行）、赏金；时间（急单用急的颜色加时钟图标和「急 · 」）和「地点 · 距离」（没距离只写地点，没地点写「没写地点」）；发布者首字头像、名字、靠谱度；右下 44 pt「申请」，申请过的换成「已申请 · 等对方选」并在歪着的贴纸上盖「已申请」章；整张卡是一个读屏元素，带打开和申请两个操作                                                                                                                                        | ui:bounty_board_list, unit:src/features/bounty/board/cardCopy.test.ts, unit:src/features/bounty/shared/tierCopy.test.ts                                                                                                                                                                                  |
| bounty.board.distance | 0–2 km 距离轴，从「你」或「这里」算，有地点的悬赏在轴上一张 44 pt 贴纸，挨得比 44 pt 近的合成一张带数字的贴纸，读屏读出标题和距离；最后「+N 更远」；点贴纸列表滚到最近那张卡片，卡片描一圈墨色边（淡入 150 ms、停 1.2 s、淡出 240 ms，只一次）；减弱动态效果时直接跳过去，描边直接出现又消失                                                                                                                                                                   | ui:bounty_board_axis, unit:src/features/bounty/board/axis.test.ts, unit:src/features/bounty/board/axisFocus.test.ts, device: 打开「减弱动态效果」，点轴上贴纸，列表直接跳到卡片，描边不淡入淡出, gap: 模拟器不能用 simctl 打开减弱动态效果（simctl ui 只有 appearance、increase_contrast、content_size） |
| bounty.board.location | 没决定定位权限时板子上方一张说明卡，点「允许定位」才弹系统窗；允许后按离你多远排；拒绝或「先不用」换成「选一个地方」一行，按新到旧排、没有距离轴；点这一行进搜索时保持选中，返回时取消选中；选了地方后显示「{地方} 附近 · 换」，从这里算距离，重开 App 还在；「先不用」记住，重开不再出现说明卡                                                                                                                                                                | ui:bounty_board_location, unit:src/features/bounty/board/originStore.test.ts, device: 真机上点「允许定位」弹出的系统窗文字和只在使用期间；进搜索时这一行保持选中（ui 只验返回后取消选中）                                                                                                                |
| bounty.board.detail   | 点卡片（不是「申请」）推进详情：48 pt 贴纸、标题、赏金；一组行：地点和「约 300 m · 精确地址只给选中的人」（没距离只写地点）、时间和急单的「急 · 还有 N 小时」、发布者和靠谱度（不能点）；说明单独一组；「申请」44 pt 固定在底部、在 Tab 栏上面，说明再长也不动；卡片推进时保持选中，系统返回后回到原来的滚动位置并取消选中；加载失败显示「没加载出来 · 重试」不显示行，悬赏不在了显示「这条悬赏已经不在了 · 返回」；回到详情时重新加载，刷新失败保留内容并提示 | ui:bounty_detail, unit:src/features/bounty/detail/detailState.test.ts, unit:src/features/bounty/detail/detailCopy.test.ts, unit:src/features/bounty/board/fixtureBoardService.test.ts, gap: 刷新失败的提示没有 ui 用例（fixture 只能让第一次加载失败），由 detailState.test.ts 覆盖                      |
| bounty.board.map      | 列表和地图用两张贴纸切换，记住上次的视图                                                                                                                                                                                                                                                                                                                                                                                                                       | ui                                                                                                                                                                                                                                                                                                       |
| bounty.board.locked   | 门槛不够的悬赏变暗，显示「{档位} 及以上可申请」和怎么解锁                                                                                                                                                                                                                                                                                                                                                                                                      | ui, db                                                                                                                                                                                                                                                                                                   |
| bounty.board.worst    | 60 字标题、80 字地点、40 字名字、RM 500 和 RM 1 都排得下；地点太长时截地点不截距离 | ui:bounty_board_worst |
| bounty.board.blocked  | 任何一方拉黑后，看不到对方的悬赏，也看不到对方的申请                                                                                                                                                                                                                                                                                                                                                                                                           | db:supabase/tests/bounties.test.sql, db:supabase/tests/bounty_nearby.test.sql                                                                                                                                                                                                                            |
| bounty.board.privacy  | 除了发布者和选中的人，谁都拿不到地点坐标；距离取整到 100 米                                                                                                                                                                                                                                                                                                                                                                                                    | db:supabase/tests/bounty_privacy.test.sql                                                                                                                                                                                                                                                                |

### bounty.post 发悬赏

- 故事：作为需要帮忙的同学，我想用一句话或一个表单发悬赏，以便很快找到人。
- 状态：building
- 版本：v1
- 规格：[bounty](specs/2026-10-11-bounty-design.md)

| 验收 id                     | 行为                                                                                                             | 覆盖                                                                                                                                                                                                |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| bounty.post.ai-draft        | 问小貘把一句话起草进确认表单，改动处高亮，离开表单前可撤销                                                       | ui                                                                                                                                                                                                  |
| bounty.post.manual          | 手动 + 表单走到同一个确认页                                                                                      | ui:bounty_post_form, ui:bounty_post_publish                                                                                                                                                         |
| bounty.post.draft           | 草稿只存在这台手机上：关掉、失败、重启都还在，发出去后才清空；删除账号时一起删掉                                 | unit:src/features/bounty/post/draftStore.test.ts, unit:src/features/bounty/post/settingsDraftStorage.test.ts, unit:src/features/account/accountActions.test.ts, ui:bounty_post_draft                |
| bounty.post.optional        | 时间和说明按需添加，在原位展开                                                                                   | ui:bounty_post_optional, unit:src/features/bounty/post/timeChoice.test.ts                                                                                                                           |
| bounty.post.place           | 发悬赏时搜地点或用当前位置；名称可改，精确地址只给选中的人                                                       | ui:bounty_post_place, ui:bounty_place_search, unit:src/features/bounty/post/validate.test.ts, unit:src/features/bounty/place/currentPlace.test.ts, unit:src/features/bounty/place/placePick.test.ts |
| bounty.post.failure         | 发布失败显示没发出去，表单保持，重试用同一条，不自动重发；同一条已经发出去时清空草稿并说「上次那条已经发出去了」 | unit:src/features/bounty/post/postFlow.test.ts, unit:src/features/bounty/post/sentDraft.test.ts, db:supabase/tests/bounty_publish_replay.test.sql, ui:bounty_post_failed                            |
| bounty.post.unpaid-hint     | 有欠款时点 + 先提示一次原因，表单照样打开；只在表单还在最前面时提示，去付款先关掉发悬赏再打开付款                | ui:bounty_post_unpaid_hint, ui:bounty_post_blocked, unit:src/features/bounty/post/startPost.test.ts, unit:src/features/bounty/post/postSheet.test.ts                                                |
| bounty.post.worst           | 60 字标题、500 字说明、RM 500 和 RM 1 在表单和确认页都排得下                                                     | ui:bounty_post_worst                                                                                                                                                                                |
| bounty.post.limits          | 报酬 RM 1–500 整数，标题 60、地点 80、描述 500、详细地址 120 个字，服务器同样检查                                | db:supabase/tests/bounties.test.sql, unit:src/features/bounty/post/validate.test.ts, ui:bounty_post_form                                                                                            |
| bounty.post.category        | 类别只能是八种之一                                                                                               | db:supabase/tests/bounties.test.sql                                                                                                                                                                 |
| bounty.post.cost            | 每月前 3 条免费（和拼车共用），之后每条 1 颗貘币                                                                 | db:supabase/tests/bounty_publish.test.sql, unit:src/features/bounty/post/cost.test.ts, ui:bounty_post_publish, ui:bounty_post_coin                                                                  |
| bounty.post.publish-blocked | 有没付清的钱时发布被拒，什么都不写                                                                               | db:supabase/tests/bounty_publish.test.sql, ui:bounty_post_blocked                                                                                                                                   |
| bounty.post.no-balance      | 没有免费名额也没有貘币时发布被拒，什么都不写                                                                     | db:supabase/tests/bounty_publish.test.sql, ui:bounty_post_no_balance                                                                                                                                |
| bounty.post.replay          | 同一条重发只发布一次、只扣一次                                                                                   | db:supabase/tests/bounty_publish.test.sql, unit:src/features/bounty/post/fixturePostService.test.ts, int:src/features/bounty/post/postService.integration.ts                                        |
| bounty.post.expiry          | 没有截止时间的悬赏 7 天后关闭、有截止时间的到点关闭，没人被选中就退回                                            | db:supabase/tests/bounty_jobs.test.sql                                                                                                                                                              |
| bounty.post.sticker         | 发布时贴纸飞进实时卡                                                                                             | ui                                                                                                                                                                                                  |
| bounty.post.photo           | 物品照片抠成贴纸                                                                                                 | device                                                                                                                                                                                              |

### bounty.apply 申请和挑人

- 故事：作为接单的同学，我想申请一条悬赏、等发布者挑我，以便双方都愿意再开始。
- 状态：building
- 版本：v1
- 规格：[bounty](specs/2026-10-11-bounty-design.md)

| 验收 id               | 行为                                                                                                                                                                                                                                                                                                                                     | 覆盖                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| bounty.apply.apply    | 卡片或详情上点「申请」打开整页申请单：可选的一句话（≤ 140 字，按字数计数）、发送中显示进度、失败保留这句话且不自动重发；成功后在打开它的那一面贴纸弹到 8° 并盖「已申请」（一次，减弱动态效果时只淡入），详情显示「已申请 · 等{name}选」和「你写的：…」；挑人前可以在详情撤回（系统确认，「不撤回」不变），撤回后恢复「申请」和不歪的贴纸 | ui:bounty_apply, ui:bounty_apply_detail, ui:bounty_apply_failed, ui:bounty_withdraw, unit:src/features/bounty/apply/applyFlow.test.ts, unit:src/features/bounty/shared/justApplied.test.ts, unit:src/features/bounty/shared/bountyCache.test.ts, unit:src/features/bounty/detail/detailState.test.ts, db:supabase/tests/bounty_apply.test.sql, device: 申请单收起后贴纸才在看得见的卡片或详情上弹到 8° 并盖章（模拟器上 AXe 读一次要约 1 秒，赶不上这不到一秒的动效，只能看录像或真机），成功触感和减弱动态效果下的淡入只在真机上能看 |
| bounty.apply.prepay   | 先付的悬赏只收靠谱及以上的申请                                                                                                                                                                                                                                                                                                           | db                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| bounty.apply.no-payee | 没有任何收款方式不能申请，申请单说明原因、不显示输入框，「添加收款方式」关掉申请单去 我的 → 收款方式；申请后删光收款方式也不能被选中                                                                                                                                                                                                     | db:supabase/tests/bounty_apply.test.sql, db:supabase/tests/bounty_flow.test.sql, ui:bounty_apply_no_payee, ui:bounty_apply_detail, unit:src/features/bounty/apply/applyFlow.test.ts                                                                                                                                                                                                                                                                                                                                                   |
| bounty.apply.blocked  | 任何一方拉黑后不能申请                                                                                                                                                                                                                                                                                                                   | db:supabase/tests/bounty_apply.test.sql                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| bounty.apply.closed   | 已选好人、已关闭或已过期的悬赏不能申请，原因分开，申请单显示原因并停用「发送」                                                                                                                                                                                                                                                           | db:supabase/tests/bounty_apply.test.sql, ui:bounty_apply_failed, unit:src/features/bounty/apply/applyFlow.test.ts                                                                                                                                                                                                                                                                                                                                                                                                                     |
| bounty.apply.select   | 发布者按住确认挑一个人，其他人收到「这次没选上」                                                                                                                                                                                                                                                                                         | ui, device, db:supabase/tests/bounty_flow.test.sql, db:supabase/tests/bounty_read.test.sql, gap: concurrency needs two sessions（两台设备同时挑人要两个数据库会话；单会话测了第二次挑人得到 taken）                                                                                                                                                                                                                                                                                                                                   |
| bounty.apply.address  | 详细地址只给选中的接单人                                                                                                                                                                                                                                                                                                                 | db:supabase/tests/bounties.test.sql                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| bounty.apply.seen     | 「这次没选上」「过期了 · 免费次数已退回」看过就消失，换设备也一样                                                                                                                                                                                                                                                                        | db:supabase/tests/bounty_read.test.sql, ui                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |

### bounty.flow 进行和完成

- 故事：作为发布者和接单人，我们想清楚地走完出发、完成、付款，以便谁该做什么一目了然。
- 状态：building
- 版本：v1
- 规格：[bounty](specs/2026-10-11-bounty-design.md)

| 验收 id                    | 行为                                                                                                                                | 覆盖                                                                                                                                                                                                                      |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| bounty.flow.transitions    | 每个允许和禁止的状态变化都由服务器检查，原因分类型                                                                                  | db:supabase/tests/bounty_flow.test.sql, db:supabase/tests/bounty_cancel.test.sql                                                                                                                                          |
| bounty.flow.start          | 接单人点「出发了」；先付单要等发布者已收到                                                                                          | db:supabase/tests/bounty_flow.test.sql, ui                                                                                                                                                                                |
| bounty.flow.eta            | 到达时间改了，旧时间划掉显示新时间                                                                                                  | ui                                                                                                                                                                                                                        |
| bounty.flow.dispute        | 「有问题」暂停自动确认，接单人能看到原因；再点完成重新算 48 小时                                                                    | db:supabase/tests/bounty_flow.test.sql, db:supabase/tests/bounty_jobs.test.sql, ui                                                                                                                                        |
| bounty.flow.payment        | 确认完成后开一笔付款，带类别，每个悬赏只有一笔                                                                                      | db:supabase/tests/bounty_flow.test.sql                                                                                                                                                                                    |
| bounty.flow.settled        | 悬赏「已结清」跟着付款走，不单独存                                                                                                  | db:supabase/tests/bounty_read.test.sql                                                                                                                                                                                    |
| bounty.flow.auto-confirm   | 接单人点完成后 48 小时没人处理自动确认                                                                                              | db:supabase/tests/bounty_jobs.test.sql, db:supabase/tests/bounty_flow.test.sql, unit, gap: concurrency needs two sessions（发布者确认和定时任务同时发生要两个数据库会话；单会话测了任务先确认后发布者确认得到同一笔付款） |
| bounty.flow.reminder       | 约定开始时间到了还没出发，双方都看到提醒                                                                                            | db:supabase/tests/bounty_jobs.test.sql, ui                                                                                                                                                                                |
| bounty.flow.cancel         | 挑人后任何一方取消都记一次放鸽子，60 天豁免一次；约定开始 30 分钟后（开始后才挑人的从挑人算起）接单人还没出发，发布者取消算接单人的 | db:supabase/tests/bounty_cancel.test.sql, unit, gap: concurrency needs two sessions（双方同时取消要两个数据库会话；单会话测了重放得到第一次的结果）                                                                       |
| bounty.flow.cancel-preview | 取消前告诉自己会不会算放鸽子、还有没有豁免                                                                                          | db:supabase/tests/bounty_cancel.test.sql, ui                                                                                                                                                                              |
| bounty.flow.refund         | 没人被选中就关掉、过期或挑人前取消，退回貘币或免费名额；挑人后取消不退                                                              | db:supabase/tests/bounty_publish.test.sql, db:supabase/tests/bounty_cancel.test.sql, db:supabase/tests/bounty_jobs.test.sql                                                                                               |
| bounty.flow.live-items     | 首页实时卡：选人、出发、确认完成、处理有问题四种待办，其余进行中                                                                    | db:supabase/tests/bounty_read.test.sql, unit, ui                                                                                                                                                                          |

### bounty.boosts 加急、置顶、装扮

- 故事：作为发布者，我想花貘币让悬赏更显眼，以便更快有人接。
- 状态：planned
- 版本：later
- 规格：[bounty](specs/2026-10-11-bounty-design.md)

| 验收 id             | 行为                         | 覆盖     |
| ------------------- | ---------------------------- | -------- |
| bounty.boosts.spend | 加急、置顶花貘币，第一版不做 | unit, ui |

## 拼车

### ride.board 我的拼车和能加入的拼车

- 故事：作为想拼 Grab 回家的同学，我想看到所有人的拼车，以便找到同路的人。
- 状态：planned
- 版本：v1
- 规格：[carpool](specs/2026-10-11-carpool-design.md)

| 验收 id         | 行为                                                       | 覆盖   |
| --------------- | ---------------------------------------------------------- | ------ |
| ride.board.mine | 我的拼车在前，然后是能加入的拼车                           | ui     |
| ride.board.sort | 所有人可见，出发点近、目的地相同的排前面；按天和目的地筛选 | db, ui |

### ride.create 发起拼车

- 故事：作为组织者，我想用一句话、一张微信群截图或一个表单发起拼车，以便很快凑齐人。
- 状态：planned
- 版本：v1
- 规格：[carpool](specs/2026-10-11-carpool-design.md)

| 验收 id            | 行为                                                   | 覆盖     |
| ------------------ | ------------------------------------------------------ | -------- |
| ride.create.seats  | 2–6 个座位，默认 4 个                                  | unit, ui |
| ride.create.places | 出发点和目的地是常用地点、小貘记得的地点或地图上选的点 | ui       |
| ride.create.refund | 没人加入就取消或过期时退回貘币或免费名额               | unit, db |

### ride.join 加入和集合

- 故事：作为乘客，我想申请加入、到点集合，以便大家准时上车。
- 状态：planned
- 版本：v1
- 规格：[carpool](specs/2026-10-11-carpool-design.md)

| 验收 id            | 行为                                                         | 覆盖     |
| ------------------ | ------------------------------------------------------------ | -------- |
| ride.join.request  | 申请加入要组织者同意，满员不再接受                           | db, ui   |
| ride.join.gather   | 出发前 30 分钟进入集合：集合点、倒计时、「我到了」           | ui       |
| ride.join.fifteen  | 出发前 15 分钟没满员由组织者决定走不走；这段时间退出算放鸽子 | unit, db |
| ride.join.boarding | 组织者勾谁上车了；没被勾的人可以申诉，别的乘客一键证明       | ui, db   |
| ride.join.late     | 司机晚到时旧时间划掉显示新时间                               | ui       |
| ride.join.expire   | 出发后 2 小时没点出发就过期，不记任何人放鸽子                | unit, db |

### ride.split 分账和付款

- 故事：作为垫付车费的组织者，我想 App 帮我算好每人多少、让大家直接付我，以便不用一个个催。
- 状态：planned
- 版本：v1
- 规格：[carpool](specs/2026-10-11-carpool-design.md)

| 验收 id                  | 行为                                                       | 覆盖   |
| ------------------------ | ---------------------------------------------------------- | ------ |
| ride.split.equal         | 默认按上车的人（含组织者）平分，每份往上取整到 RM 0.10     | unit   |
| ride.split.edit          | 组织者可以改每个人的金额；乘客可以点「金额不对」           | ui, db |
| ride.split.receipt       | 拍 Grab 收据，小貘起草分账，组织者确认（按用量扣小貘体力） | ui     |
| ride.split.pay           | 每个乘客用付款弹窗付给组织者，组织者逐个确认收到           | ui, db |
| ride.split.live-activity | 实时活动分凑人、集合、上车、到了四段                       | device |

## 消息

### chat.thread 每件事一个对话

- 故事：作为发布者或乘客，我想在每条悬赏或拼车里和对方聊天，以便约时间地点。
- 状态：planned
- 版本：v1
- 规格：[foundation](specs/2026-10-11-foundation-design.md)

| 验收 id             | 行为                                           | 覆盖    |
| ------------------- | ---------------------------------------------- | ------- |
| chat.thread.members | 每条悬赏或拼车一个对话，只有成员能看           | db      |
| chat.thread.media   | 能发文字和图片，长按消息可以翻译或举报         | ui      |
| chat.thread.hint    | 新对话固定显示关于定金和在付款步骤外付钱的提醒 | ui      |
| chat.thread.kept    | 对话一直保留；删除账号只删自己发的消息         | db, int |

### chat.safety 举报和拉黑

- 故事：作为同学，我想举报和拉黑骚扰我的人，以便安心使用。
- 状态：planned
- 版本：v1
- 规格：[foundation](specs/2026-10-11-foundation-design.md)

| 验收 id            | 行为                               | 覆盖   |
| ------------------ | ---------------------------------- | ------ |
| chat.safety.report | 每个资料页和每条消息都能举报和拉黑 | ui, db |

### chat.block 拉黑

- 故事：作为同学，我想拉黑让我不舒服的人，以便我们不再在悬赏里遇到。
- 状态：building
- 版本：v1
- 规格：[bounty](specs/2026-10-11-bounty-design.md)

| 验收 id                   | 行为                                                                                                                                                                                                                            | 覆盖                                                                                                                                                                             |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| chat.block.private        | 名单只有拉黑的人自己读得到，被拉黑的人读不到，客户端不能直接写                                                                                                                                                                  | db:supabase/tests/blocks.test.sql                                                                                                                                                |
| chat.block.either-side    | 任何一方拉黑都算双方互相屏蔽；取消后恢复                                                                                                                                                                                        | db:supabase/tests/blocks.test.sql                                                                                                                                                |
| chat.block.account-delete | 删除账号时一起删掉                                                                                                                                                                                                              | db:supabase/tests/blocks.test.sql                                                                                                                                                |
| chat.block.detail         | 悬赏详情右上角「⋯」里只有红色的「屏蔽某某」，系统操作表说明后果，选「屏蔽」才屏蔽；屏蔽时「⋯」换成进度，成功后详情关闭、悬赏板马上去掉对方的悬赏并重新加载；失败提示「没屏蔽成功」，不自动重试                                  | ui:bounty_block, unit:src/features/bounty/block/blockFlow.test.ts, unit:src/features/bounty/board/boardState.test.ts, unit:src/features/bounty/board/fixtureBoardService.test.ts |
| chat.block.list           | 我的 → 屏蔽名单（推进时这一行保持选中）列出屏蔽的人，最近的在前；左滑「解除」，等服务器确认前这一行显示进度，确认后移出名单，回到悬赏板重新加载后对方的悬赏又出现；失败保留这一行并提示；没屏蔽过谁显示说明；没加载出来不当成空 | ui:bounty_block, unit:src/features/bounty/block/blockFlow.test.ts, unit:src/features/bounty/block/blockService.test.ts, device: 从屏蔽名单返回我的时这一行先保持选中再淡出       |
| chat.block.entry          | 资料页和申请人长按菜单里的「屏蔽某某」                                                                                                                                                                                          | ui                                                                                                                                                                               |

### chat.push 推送通知

- 故事：作为同学，我想有人申请、付款或发消息时收到通知，以便不错过。
- 状态：planned
- 版本：v1
- 规格：[foundation](specs/2026-10-11-foundation-design.md)

| 验收 id               | 行为                                             | 覆盖         |
| --------------------- | ------------------------------------------------ | ------------ |
| chat.push.provisional | 引导后先要临时授权，第一次发布或申请后再正式请求 | unit, device |
| chat.push.delivery    | 真机收到推送，数据放在 body 下面                 | device       |
| chat.push.off         | 关掉通知后角标和提醒条照样工作                   | ui           |

## 问小貘

### ask.sheet 问小貘半屏

- 故事：作为同学，我想在任何 Tab 点小貘按钮就能问它，以便随手让它帮忙。
- 状态：done
- 版本：v1
- 规格：[foundation](specs/2026-10-11-foundation-design.md)

| 验收 id             | 行为                                    | 覆盖               |
| ------------------- | --------------------------------------- | ------------------ |
| ask.sheet.from-tabs | 从悬赏和拼车打开半屏，建议按当前 Tab 变 | ui:shell_ask_tapir |
| ask.sheet.keeps-tab | 关掉半屏后还是原来那个 Tab              | ui:shell_ask_tapir |
| ask.sheet.mic       | 麦克风按钮在占位版里不可用              | ui:shell_ask_tapir |

### ask.consent 第一次用 AI 前同意

- 故事：作为同学，我想第一次用小貘前知道数据发给谁、做什么，以便自己决定要不要用。
- 状态：planned
- 版本：v1
- 规格：[foundation](specs/2026-10-11-foundation-design.md)

| 验收 id             | 行为                                                       | 覆盖   |
| ------------------- | ---------------------------------------------------------- | ------ |
| ask.consent.screen  | 同意页写明阿里云百炼（新加坡）、用途和发送的数据，记下时间 | ui, db |
| ask.consent.decline | 不同意时每个功能都还能手动完成                             | ui     |

### ask.draft 起草和小貘体力

- 故事：作为同学，我想小貘帮我起草、翻译，以便省时间，又不会用超。
- 状态：planned
- 版本：v1
- 规格：[foundation](specs/2026-10-11-foundation-design.md)

| 验收 id              | 行为                                                             | 覆盖     |
| -------------------- | ---------------------------------------------------------------- | -------- |
| ask.draft.edge       | 所有云端调用经新加坡的 Edge Function，App 里没有任何密钥         | int      |
| ask.draft.only-draft | 小貘只起草，不替用户发布、接受或发送                             | ui       |
| ask.draft.energy     | 按用量扣小貘体力，每天 6 点免费回满；嫩叶不过期，1 颗貘币换 1 份 | unit, db |
| ask.draft.error      | 服务出错时显示小貘晕了和手动方式，不扣体力                       | ui, unit |
| ask.draft.voice      | 半屏里的麦克风说中文、英文、马来文都能识别                       | device   |
| ask.draft.memory     | 小貘记得的地点和偏好可以看、可以删、可以关                       | ui, db   |

### ask.long-press-voice 长按小貘按钮说话

- 故事：作为同学，我想长按小貘按钮直接说话，以便更快。
- 状态：planned
- 版本：later
- 规格：[foundation](specs/2026-10-11-foundation-design.md)

| 验收 id                    | 行为                       | 覆盖   |
| -------------------------- | -------------------------- | ------ |
| ask.long-press-voice.spike | 先在真机上验证长按能不能做 | device |

## 信誉、贴纸与貘币

### rep.reviews 评价

- 故事：作为结清了一件事的同学，我想给对方一个表情和几个标签，以便下一个人知道他靠不靠谱。
- 状态：planned
- 版本：v1
- 规格：[foundation](specs/2026-10-11-foundation-design.md)

| 验收 id            | 行为                                                | 覆盖         |
| ------------------ | --------------------------------------------------- | ------------ |
| rep.reviews.faces  | 开心 / 一般 / 不开心加标签和一句话，只能在结清后评  | ui, db       |
| rep.reviews.sealed | 双方都评了或 7 天后才同时公开，被评的人可以回复一次 | unit, db, ui |

### rep.tier 靠谱度

- 故事：作为同学，我想看到对方的靠谱度，以便决定要不要和他交易。
- 状态：building
- 版本：v1
- 规格：[foundation](specs/2026-10-11-foundation-design.md)

| 验收 id            | 行为                                                                                                     | 覆盖                                        |
| ------------------ | -------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| rep.tier.inputs    | 按 180 天内结清数、不同对象、完成率和注册时长算；按时付款比例只记在快照里、不参与门槛；评价在第 6 步加入 | db:supabase/tests/reputation.test.sql, unit |
| rep.tier.recompute | 每天马来西亚时间 03:30 重算                                                                              | db:supabase/tests/reputation.test.sql       |
| rep.tier.visible   | 所有登录用户只读得到档位，读不到明细                                                                     | db:supabase/tests/reputation.test.sql       |
| rep.tier.tiers     | 新朋友 / 靠谱 / 很靠谱 / 貘友四档，以文字徽章显示                                                        | ui                                          |
| rep.tier.drop      | 掉档时用一个平静的系统弹窗说明原因和怎么恢复                                                             | ui                                          |

### rep.no-show 放鸽子记录

- 故事：作为同学，我想偶尔一次临时有事不被记成不靠谱，而反复放鸽子的人会被记下，以便靠谱度公平。
- 状态：building
- 版本：v1
- 规格：[bounty](specs/2026-10-11-bounty-design.md)

| 验收 id                 | 行为                                                  | 覆盖                                                                                                                                   |
| ----------------------- | ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| rep.no-show.waiver      | 60 天内第一次放鸽子豁免，之后算数；豁免过了 60 天恢复 | db:supabase/tests/reputation.test.sql, gap: concurrency needs two sessions（两次同时取消抢同一个豁免要两个数据库会话，pgTAP 只有一个） |
| rep.no-show.once        | 同一件事只记一次，重复调用返回同样结果                | db:supabase/tests/reputation.test.sql                                                                                                  |
| rep.no-show.server-only | 只有服务器能记，客户端读不到也写不了                  | db:supabase/tests/reputation.test.sql                                                                                                  |

### rep.stickers 贴纸本和小貘等级

- 故事：作为同学，我想每结清一件事得到一张贴纸、小貘升级，以便帮忙这件事有点乐趣。
- 状态：building
- 版本：v1
- 规格：[foundation](specs/2026-10-11-foundation-design.md)

| 验收 id             | 行为                                                     | 覆盖                                                                            |
| ------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------- |
| rep.stickers.earn   | 每结清一件事双方各得一张对应类别的贴纸                   | db:supabase/tests/stickers.test.sql, unit:src/lib/stickers/stickers.test.ts, ui |
| rep.stickers.levels | 3、8、15、25 张升到 2–5 级，之后每 15 张一级，只解锁装扮 | unit                                                                            |

### rep.sticker-book 只读贴纸本「我帮过的忙」

- 故事：作为帮过忙的同学，我想在「我的」里翻看攒下的贴纸，以便看到自己帮成了多少单。
- 状态：done
- 版本：v1
- 规格：[foundation](specs/2026-10-11-foundation-design.md)

| 验收 id                  | 行为                                                                                                                                      | 覆盖                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| rep.sticker-book.earn    | 结清时在同一事务里给收款人和付款人各发一张贴纸（拼车是汽车，有类别的悬赏是类别贴纸，没有类别是小貘）；重放结清不多发，反向付款不发        | db:supabase/tests/stickers.test.sql, int:src/features/payment/paymentService.integration.ts#pays, undoes, pays with a proof and settles through the RPCs, unit:src/lib/stickers/stickers.test.ts#a ride earns a car sticker; a bounty with a category earns its category sticker; without one, a 小貘 sticker, unit:src/lib/stickers/stickers.test.ts#an unknown category from the server falls back to the 小貘 sticker |
| rep.sticker-book.private | 只有自己读得到自己的贴纸，客户端不能新增、修改或删除；删除账号时一起删除                                                                  | db:supabase/tests/stickers.test.sql                                                                                                                                                                                                                                                                                                                                                                                      |
| rep.sticker-book.me-row  | 「我的」在收款方式上面有一行「我帮过的忙」和张数，点进贴纸本（push，系统返回）                                                            | ui:sticker_book, ui:sticker_book_empty                                                                                                                                                                                                                                                                                                                                                                                   |
| rep.sticker-book.grid    | 三列、最新在前，每张贴纸下有白色标签和日期，只读；长标题在马来文下也排得下                                                                | ui:sticker_book, unit:src/lib/stickers/stickers.test.ts#stickers list newest first                                                                                                                                                                                                                                                                                                                                       |
| rep.sticker-book.empty   | 没有贴纸时显示全尺寸小貘和怎么得到第一张                                                                                                  | ui:sticker_book_empty                                                                                                                                                                                                                                                                                                                                                                                                    |
| rep.sticker-book.unknown | 贴纸没加载出来时显示「贴纸没加载出来 · 重试」，不显示空的贴纸本；回到前台静默刷新，刷新失败保留上次的贴纸并标明不是最新；退出登录清掉贴纸 | unit:src/lib/stickers/stickers.test.ts#a failed load is failed, never an empty book, and a retry loads it, unit:src/lib/stickers/stickers.test.ts#a foreground refresh keeps the book on screen and marks it stale when it fails, unit:src/lib/stickers/stickers.test.ts#signing out (the session view unmounting) leaves no stickers behind, gap: 还没有注入贴纸加载失败的 UI 用例                                      |
| rep.sticker-book.count   | 张数在英文里区分单复数，中文和马来文不变                                                                                                  | unit:src/lib/stickers/stickers.test.ts#English pluralises the count; Chinese and Malay do not                                                                                                                                                                                                                                                                                                                            |

### coins.purchase 买貘币

- 故事：作为免费名额用完的同学，我想用 App 内购买貘币，以便继续发布。
- 状态：planned
- 版本：v1
- 规格：[foundation](specs/2026-10-11-foundation-design.md)

| 验收 id                | 行为                                                 | 覆盖    |
| ---------------------- | ---------------------------------------------------- | ------- |
| coins.purchase.packs   | 三档 RM5=5、RM10=11、RM30=35，服务器验证交易后才入账 | int, ui |
| coins.purchase.short   | 余额不够时弹出三档和「下个月 1 号还有 3 条免费」     | ui      |
| coins.purchase.sandbox | 真机沙盒购买成功入账                                 | device  |

### coins.ledger 发布扣费、退回和余额

- 故事：作为发布悬赏或拼车的同学，我想发布时先用免费名额、不够再扣貘币，取消时退回，以便清楚自己花了什么。
- 状态：building
- 版本：v1
- 规格：[bounty](specs/2026-10-11-bounty-design.md)

| 验收 id                 | 行为                                                     | 覆盖                                                                                                                                              |
| ----------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| coins.ledger.spend      | 先用本月免费名额，再扣 1 颗；都没有时拒绝，什么都不写    | db:supabase/tests/coins.test.sql, gap: concurrency needs two sessions（两次同时发布抢最后一个免费名额或最后一颗要两个数据库会话，pgTAP 只有一个） |
| coins.ledger.refund     | 退回恢复貘币或免费名额，同一件事只退一次                 | db:supabase/tests/coins.test.sql                                                                                                                  |
| coins.ledger.balance    | 余额由账本算出，只读得到自己的，并给出下次免费名额的时间 | db:supabase/tests/coins.test.sql                                                                                                                  |
| coins.ledger.anonymised | 删除账号后账本行保留但不再关联到人                       | db:supabase/tests/coins.test.sql                                                                                                                  |

### coins.grants 免费貘币

- 故事：作为新同学和常帮忙的同学，我想免费得到貘币，以便不花钱也能用。
- 状态：building
- 版本：v1
- 规格：[foundation](specs/2026-10-11-foundation-design.md)

| 验收 id                   | 行为                                                                              | 覆盖                             |
| ------------------------- | --------------------------------------------------------------------------------- | -------------------------------- |
| coins.grants.ledger       | 一个只追加的服务器账本，余额由账本算出，客户端不能写                              | db:supabase/tests/coins.test.sql |
| coins.grants.new-user     | 新人 5 颗，注册时由服务器发                                                       | db:supabase/tests/coins.test.sql |
| coins.grants.onboarding   | 新手任务各 1 颗：加收款方式、第一次发布或拼车、第一次帮成；每项只发一次           | db:supabase/tests/coins.test.sql |
| coins.grants.help-settled | 每帮成一单悬赏 1 颗，马来西亚时间每月最多 10 颗；拼车和反向付款不发               | db:supabase/tests/coins.test.sql |
| coins.grants.sources      | 每周点首页小貘 1 颗；邀请双方各 3 颗                                              | unit, db                         |
| coins.grants.free-posts   | 每月 3 条免费发布，按马来西亚时间的自然月，悬赏和拼车共用，退回的免费发布恢复名额 | db:supabase/tests/coins.test.sql |

### rep.vouching 熟人担保

- 故事：作为老用户，我想为认识的新同学担保，以便他更快被信任。
- 状态：planned
- 版本：later
- 规格：[foundation](specs/2026-10-11-foundation-design.md)

| 验收 id            | 行为                     | 覆盖 |
| ------------------ | ------------------------ | ---- |
| rep.vouching.vouch | 担保规则等信誉调研后再定 | db   |
