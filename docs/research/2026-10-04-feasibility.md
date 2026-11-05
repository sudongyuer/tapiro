# Tapiro 可行性研究（2026-10-04）

开局关卡 1 确认的约束：RN + Expo + 一个 Swift 模块，仅 iOS；Apple + Google 登录；三语（zh-Hans 默认、en、ms），跟随系统 + App 内切换；最低支持最新两个 iOS 大版本；悬赏报酬线下结算；长期维护。

原型均为一次性代码，未保留；截图与测量数据保留在 `evidence/`。所有版本、价格、条款均来自本次会话抓取的一手来源，链接见各详细报告。

| 问题 | 方法 | 结论 | 详细报告 |
| --- | --- | --- | --- |
| 后端选型 | 调研（官方文档、定价页） | **Supabase 新加坡区（ap-southeast-1）** | [backend-platform](2026-10-04-backend-platform.md) |
| 吉祥物动画 | 原型：Lottie / Rive / Reanimated+SVG 三版 Release 构建，测包体积与 CPU | **吉祥物用 Rive，普通 UI 动效用 Reanimated，Lottie 备选** | [animation](2026-10-04-animation.md) |
| 推送与定位 | 原型：expo-notifications + expo-location，模拟器 simctl push / location | **Expo Push Service；仅"使用期间"+ 模糊定位** | [push-location](2026-10-04-push-location.md) |
| 版本与审核 | 调研（Expo changelog、Apple Developer News、App Review Guidelines） | 见下 | [backend-platform](2026-10-04-backend-platform.md) |

## 关键结果

**版本**
- Expo 稳定版 SDK 57（RN 0.86）；SDK 58 自 2026-09-15 起为 beta。
- 最新两个 iOS 大版本是 27 和 26，部署目标定为 iOS 26.0。
- 用 iOS 27 SDK 构建必须启用 UIScene 生命周期：SDK 57 需显式开启 `ios.enableSceneSupport`，SDK 58 默认开启。

**后端：Supabase**
- 附近任务：PostGIS 支持最近邻查询，"附近任务"直接可用；Firestore 的 geohash 会有误报，D1 没有空间查询。
- 数据模型：任务、接单、举报、拉黑都是关系型数据，适合 Postgres + 行级权限。
- 登录：原生 Apple / Google ID token 登录，Apple 密钥不需要每半年轮换。
- 以后的聊天可以用 Realtime Broadcast 实现。
- 费用：上线用 Pro，每月 $25（免费项目闲置 7 天会被暂停）；自定义域名另加每月 $10。
- Firebase 淘汰：Google 在中国大陆被封，学生回国后无法使用。

**中国大陆可达性：所有方案都没有得到验证**
- supabase.co 的社区反馈结论不一。
- Google 登录在大陆不可用，所以 Apple 登录是必须保底可用的那个。
- 上线前必须在大陆真实网络环境测一次。

**动画**

| | Lottie | Rive | Reanimated + SVG |
| --- | --- | --- | --- |
| 增加的体积（arm64） | ≈4.4 MB | ≈10.3 MB | ≈5.8 MB |
| 空闲时 CPU | 0.5% | 4.2% | 64.8%（只动 transform 时 22.5%） |
| 交互状态机 | 无 | 内置 | 手写 |

- 三个方案都没有肉眼可见的掉帧。
- Rive 是 0.x 版本，更新频繁；免费版导出的动画带 Rive 启动画面，正式上线前设计师需要付费席位（每月 $9 起）。
- 模拟器上的性能数字不能作为结论，最终要在真机上用 Instruments 测一遍。

**推送**
- 模拟器上的模拟远程推送、"静默授权"都能跑通。
- 两个坑：
  - expo-notifications 把"静默授权"状态报成 `undetermined`，需要判断 `ios.status === PROVISIONAL`。
  - 推送里的自定义数据必须放在 payload 的 `body` 键下，放在顶层会读到 `data=null`。
- 真实推送要等配好 APNs 密钥后在真机上验证。

**定位**
- 只申请"使用期间"权限并默认模糊定位：吉隆坡测出误差约 1.2 km，精度 ±4.7 km，够"附近任务"用。
- 不需要后台定位。用户拒绝定位时，提供手动选择区域或校园。

**审核与合规**
- 4.8：提供 Google 登录时必须同时提供 Apple 登录。
- 5.1.1(v)：
  - 必须支持在 App 内删除账号，并撤销 Apple 的登录凭证。
  - 不登录也能浏览。
- 1.2：用户发布的内容必须有内容过滤、举报、拉黑，并公开联系方式。
- 不允许匿名或随机聊天。
- 4.5.4：
  - 推送必须让用户主动开启，推送内容不含个人敏感信息。
  - 营销类推送要用户另外同意。
- PDPA：
  - 注册时展示隐私声明。
  - 制定数据保留和删除策略。
  - 数据泄露 72 小时内上报。
  - 对数据存放到新加坡做跨境传输评估。
  - 不收集 IC、护照、学号。

以上审核与合规结论属于产品层面，不写入 AGENTS.md；写第一个功能的 spec 时再逐条讨论。

## 推荐形态

**RN + Expo + 一个 Swift 模块，保持不变。**
- 本研究没有发现任何依赖无法在 Metro 中打包。
- Rive 和 Lottie 都通过 dev build 正常运行。
- 主要界面是列表、表单和卡通视觉，RN 能满足；遇到达不到系统质量的控件，再放进 Swift 模块。

## 未决与风险

- 中国大陆可达性未验证，上线前要实测。
- 在一个完全不涉及钱的免费 App 上 PDPA 是否适用，目前不明确；暂按适用处理。
- 动画和推送都只在模拟器上验证过，真机验证留到阶段 4 有 TestFlight 包之后做。
- 磁盘空间：同时编多个 iOS Release 构建把磁盘写满过，临时目录因此丢失过一次。
