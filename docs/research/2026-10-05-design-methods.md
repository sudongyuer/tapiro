# 品牌公开设计方法核查（Tapiro 设计方向用）

核查日期：2026-10-05。只采用品牌自己发布的一手来源。标注说明：

- **已核实**：在一手来源里读到原文。
- **部分核实**：一手来源有，但和原说法有出入。
- **未核实**：找不到一手来源，只有第三方。

---

## 1. Duolingo：角色系统、动画、连胜庆祝

**结论：部分核实。** "角色由 Duo 的形状、眼睛、身体构成"属实。`design.duolingo.com` 现在 301 跳转到 `blog.duolingo.com/hub/design/`，这个设计中心页只列出几篇文章，没有能查阅的品牌规范。所以"品牌规范站"这一条**未核实**。

**一手来源（已打开）**

- https://blog.duolingo.com/building-character/
- https://blog.duolingo.com/shape-language-duolingos-art-style/
- https://blog.duolingo.com/world-character-visemes/
- https://blog.duolingo.com/streak-milestone-design-animation/
- https://blog.duolingo.com/widget-feature/
- https://blog.duolingo.com/hub/design/（`design.duolingo.com` 跳转到这里）

**原文里的方法**

- 人类角色沿用 Duo 的设计语言：几何形体、很大的眼睛、独特的身体比例、和身体分开的脚。"He's very geometric and basically just a body with wings … really big endearing eyes and a unique body shape and detached feet."
- 角色出现在练习里：替用户念句子；用户答对时，每个角色播放自己的庆祝动画；连续答对几题后，课中插一段奖励动画。整套角色迭代了 18 个月。
- 形状语言：从硬边改成更圆、更亮的画风；细节只留到看得懂为止。"clearly communicated with very few cleverly placed vector shapes."
- 动画用 Rive 的 State Machine 驱动。每个角色做 20 多个口型，按音素时间实时混合。客户端只下载音频和时间数据，不下载视频。用户提前做完题，角色会及时停下。"much less than sending down a little movie."
- 连胜里程碑：从火焰改成凤凰，因为鸟的侧影在很多文化里都能看懂。动画先做多轮粗稿试节奏："Timing is everything in animation." 里程碑卡片可以在 App 内直接保存和分享。
- 小组件里 Duo 的情绪跟着用户状态变：快到午夜还没学，Duo 越来越慌；完成后放松、开心。后续又加了 25 张不同情绪和场景的插画。

**用于 Tapiro**

- 小貘的造型规则只定一次：几个基本形、眼睛、身体比例、轮廓线粗细。以后新增的表情和姿势都从这套规则里出，不另画新风格。
- 小貘用 Rive State Machine 做。输入只放几个状态，比如 `idle`、`thinking`、`success`、`sad`，由 App 代码驱动，不为每个场景导出一段视频。用户点击时动画要能马上停或切换。
- 小貘的情绪绑定真实状态，比如悬赏快过期、有人接单、任务完成。同一个状态永远对应同一个表情，不随机。

---

## 2. 中国吉祥物（美团袋鼠、盒马河马、钉钉燕子）

**结论：部分核实，而且来源不是品牌方。** 给出的站酷文章是第三方用户"停停走走UP"（郑州的交互设计师）写的，不是美团、盒马、钉钉的官方材料。文章里有下面三条具体描述，但**没有**提出"一个特征对应一个功能"这样的原则。文章的总结只是：吉祥物要传达"品牌气质和调性"，并帮助和用户建立情感联系。"一个特征对应一个功能"是对这几个例子的归纳，不是来源里的原话。我没有找到三家品牌讲这些设计的官方一手材料，**未核实**。

**来源（已打开，第三方）**

- https://www.zcool.com.cn/article/ZOTE5NzYw.html

**文章原文**

- 美团袋鼠：「袋鼠'袋子大、囊括物品多、跑得快'的特点，与美团外卖品类丰富、送餐速度快的定位一致」
- 盒马河马：「河马嘴巴中间是无穷大的形状，并且嘴巴比较大，看起来比较能吃的样子。」
- 钉钉"钉三多"：「尖尾雨燕，钉钉 logo 的造型，胸口的闪电代表'快捷、速度'」

**用于 Tapiro**

- 如果要用这个思路，作为我们自己的规则写进设计文档，不要说成行业方法。比如：貘的长鼻子只用来"指"和"递"东西，对应"帮忙、递送"。
- 一个特征只承担一个含义，最多两个。不要给小貘加一堆符号。

---

## 3. Airbnb 2025 改版："Lava" 3D 动态图标

**结论：大部分未核实。** Airbnb 的官方新闻稿只说做了一个立体、带动画的设计系统，**没有**提到 "Lava"、图标格式或任何技术细节。"Lava"这个名字和"带透明通道的轻量视频格式"这种说法，我只在第三方来源里看到：一篇个人 Medium 文章（403，打不开），以及 X/LinkedIn 上的转述。Airbnb Tech Blog（medium.com/airbnb-engineering）和 airbnb.design 上都没找到相关文章。Medium 那篇文章里的具体技术数字（文件大小、编码方式、60fps）都不能当事实引用。

**一手来源（已打开）**

- https://news.airbnb.com/airbnb-2025-summer-release/

**原文里能确认的内容**

- 为了加入服务和体验，App 从头重建。
- "We also created a design system with a dimensional and beautifully animated interface that brings the world of Airbnb to life, so planning your trip feels as effortless and delightful as the trip itself."

**用于 Tapiro**

- 只能借鉴方向：少量立体、会动的图标，用在入口这类高价值位置。不要引用 "Lava" 的技术细节。
- Tapiro 已经有贴纸和 Rive 两种表现手法，暂时不需要第三种格式。如果要试立体图标，只放在 Tab 或分类入口这类少数地方，并且先在真机上测性能。

---

## 4. Monzo 语气规范

**结论：已核实。**

**一手来源（已打开）**

- https://monzo.com/tone-of-voice

**原文里的方法**

- 三条原则：
  1. **Straightforward kindness**：清楚、包容，以读者为中心，把复杂的事说简单。
  2. **Everyday magic**：在平常的时刻给一点意外的惊喜，该庆祝就庆祝，该安慰就安慰。
  3. **Warm wit**："Humour is a delicate seasoning in our writing. We want people to feel part of the joke, not the target of it."
- 幽默要少："we never want our sense of humour to get in the way of the core message."
- 按场景限制幽默：客服场景不用（"the risk of getting it wrong is greater than the benefit of getting it right"）；只要消息可能是负面的，或者拿不准，就写得简单直白；涉及金钱压力和情绪时，不开玩笑。
- 不拿别人开玩笑（"don't punch down"），也不用最容易想到的那个梗。

**用于 Tapiro**

- 文案写一张场景表，标明哪里能俏皮，哪里不能。可以俏皮：空状态、完成庆祝、引导页。不能俏皮：付款、纠纷、举报、取消、账号安全、出错提示。
- 小貘的表情也按这张表来。负面场景只用平静的表情或者不出现，不卖萌。
- 三种语言（zh-Hans、en、ms）都按这张表写。幽默不好翻译时，宁可去掉。

---

## 5. Karrot（当근）SEED 设计系统

**结论：部分核实，需要修正说法。** 原说法是"token 从 Figma 生成，各平台共享"。实际情况是：**Rootage YAML 才是 token 和组件 schema 的唯一源头。** 只有颜色、渐变、阴影是先从 Figma variables 抽取，再回写进 YAML（`bun figma:sync`）。时长、缓动、尺寸、字号等 token 直接在 YAML 里写。然后从 YAML 生成 CSS、Tailwind 和各框架的产物。README 说同一份 token 源支持 React、iOS、Android、Lynx。rootage 的 README 说可以生成 Swift 和 Kotlin 的枚举。

**一手来源（已打开）**

- https://seed-design.io/
- https://github.com/daangn/seed-design （README、`ARCHITECTURE.md`）
- https://github.com/daangn/seed-design/tree/main/packages/rootage （`duration.yaml`、`timing-function.yaml`、`collections.yaml`）

**原文里的方法**

- "Rootage YAML이 토큰과 컴포넌트 스키마의 원천이다"（Rootage YAML 是 token 和组件 schema 的源头）。生成流程固定为 figma:sync → rootage:generate → recipe → 平台产物 → 文档。
- 动效也做成 token：`$duration.d1–d6`（50–300ms，每档 50ms）；缓动分为 `enter`、`exit`、`enter-expressive`、`exit-expressive`；按压缩放有专门的 `pressed-scale` 时长和曲线。
- token 集合有模式：颜色分 `theme-light` 和 `theme-dark`；**动效分 `preferred` 和 `reduced`**，所以"减弱动态效果"是在 token 层处理的。

**用于 Tapiro**

- 在 `src/ui/theme/tokens.ts` 里加动效 token：几档时长，加上 enter、exit 和"表现型"缓动，以及按压反馈。不要在组件里写死毫秒数。
- 动效 token 也分 `preferred` 和 `reduced` 两套。打开"减弱动态效果"时，贴纸弹出、小貘动画自动换成淡入或静态。
- `docs/design-language.md` 和 `tokens.ts` 继续作为唯一源头，现在规模不需要接 Figma 同步。

---

## 6. CapWords（Apple "Behind the Design"）

**结论：已核实，只有一处例外。** 文章写了用动画覆盖等待、贴纸概念的来源、物理感，**没有**专门讲新手引导（onboarding），这一点**未核实**。CapWords 获得 2025 Apple Design Award 的 Delight and Fun 类。

**一手来源（已打开）**

- https://developer.apple.com/articles/capwords/

**原文里的方法**

- 用动画覆盖等待：识别流程拆成"拍摄 → 去背景 → 确认 → 展示结果"。用户确认"是不是要收集这个东西"的这一步，正好给 API 留出时间。同时界面播放一个 "micro-animation"，所以大多数用户察觉不到在等。
- 贴纸的来源：创始人的女儿从两岁起到处贴贴纸，于是想到把现实中的东西"撕"下来收集。
- 抠图没有用 App 内置的大模型，而是用了系统的 VisionKit 主体抠图。"That's how we peeled items off easily."
- 依靠真实物理感："grounded in real-world physics: sound, touch, and sight cues." 声音用 AVAudioEngine 播放。
- 从立项到上架用了四个月。

**用于 Tapiro**

- 发布悬赏或用 AI 生成草稿时，把等待拆成用户能参与的步骤，比如先确认图片和分类，后台同时处理。中间用贴纸"撕下"的短动画衔接，不显示空白转圈。
- 贴纸抠图优先用系统的 VisionKit 主体抠图（在 `modules/tapiro-kit` 里实现），不要自己做描边模拟，也不要接云端模型。
- 贴纸时刻同时给视觉、声音、触感三种反馈，三者在时间上对齐。只用在少数关键时刻，比如领到悬赏、完成互助。

---

## 补充 A：Apple HIG（动效、加载、触感）

**结论：已核实**（从 HIG 的 JSON 数据接口取得原文）。

**一手来源**

- https://developer.apple.com/design/human-interface-guidelines/motion
- https://developer.apple.com/design/human-interface-guidelines/loading
- https://developer.apple.com/design/human-interface-guidelines/playing-haptics

**原文里的方法**

- 动效要有目的："Don't add motion for the sake of adding motion." 动效要能关掉，重要信息不能只靠动效传达。
- 反馈动画要短、要准。在 App 里，频繁发生的交互一般不要加动效。允许用户打断动效："don't make people wait for an animation to complete before they can do anything."
- 加载："Show something as soon as possible." 用占位内容；等待中允许用户做别的事。等待不可避免地很长时，可以给用户看点有意思的东西。
- 触感：系统触感按文档里的含义使用，不要挪作他用。一种触感对应一种结果，保持一致；强度要和动画匹配；不要滥用；要能关掉。

**用于 Tapiro**

- 定一条规则：签名动效（贴纸、小貘）只放在低频的关键时刻。列表、按钮、切换 Tab 这类高频操作只用系统自带动效。
- 所有庆祝动画都能点一下跳过，或者用户可以直接继续操作。
- 列一张触感表：成功用 `success`，失败用 `error`，贴纸落下用一次 `impact`。不要用 `success` 表示"已取消"。

---

## 查过但未采用的

- **Headspace**：搜到的都是第三方（Blush 访谈、案例文章、插画师个人作品集），没找到 Headspace 官方的设计规范或博客。**未核实，没有收录。**
- **Finch**：只有 fandom wiki、媒体报道、第三方分析，没有官方设计文章。**未核实，没有收录。**
