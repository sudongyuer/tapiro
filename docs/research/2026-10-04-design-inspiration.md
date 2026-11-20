# Tapiro: cute and mascot-led design inspiration

Researched 2026-10-04. Every factual claim has a URL next to it. Some claims come only from secondary sources and are marked **(secondary)**. Claims I could not verify are marked **(unverified)**.

## 0. Ground truth on the mascot animal

- The Malayan tapir is the only tapir species with two colours. It is black at the front and back with a pale "saddle" across the middle. In the forest at night this breaks up its outline (disruptive camouflage). It is listed as Endangered on the IUCN Red List. Sources: https://en.wikipedia.org/wiki/Malayan_tapir, https://news.mongabay.com/2016/09/black-white-and-unique-the-malayan-tapir-struggles-for-recognition/
- For design, this gives Tapiro a ready-made two-tone system: **ink (black) + saddle (cream/white)**. It also gives a gentle conservation story to tell in the app's About screen and marketing.

## 1. Award-verified references

Award status was checked on developer.apple.com/design/awards or apple.com/newsroom unless noted otherwise.

| App | Award (verified) | Source |
|---|---|---|
| (Not Boring) Habits | ADA 2022 **winner**, Delight and Fun; also a Visuals and Graphics finalist | https://developer.apple.com/design/awards/2022/ |
| (Not Boring) Weather | ADA 2021 finalist, Visuals and Graphics | https://developer.apple.com/design/awards/2021/ |
| Pok Pok Playroom | ADA 2021 **winner**, Delight and Fun | https://developer.apple.com/design/awards/2021/ |
| Duolingo | ADA 2023 **winner**, Delight and Fun | https://www.apple.com/newsroom/2023/06/apple-announces-winners-of-the-2023-apple-design-awards/ |
| Headspace | ADA 2023 **winner**, Social Impact (2022 finalist) | same as above; https://developer.apple.com/design/awards/2022/ |
| Bears Gratitude | ADA 2024 **winner**, Delight and Fun | https://www.apple.com/newsroom/2024/06/apple-announces-winners-of-the-2024-apple-design-awards/ |
| Gentler Streak | ADA 2024 **winner**, Social Impact | same as above |
| Crouton | ADA 2024 **winner**, Interaction | same as above |
| CapWords (HappyPlan Tech, China) | ADA 2025 **winner**, Delight and Fun | https://www.apple.com/newsroom/2025/06/apple-unveils-winners-and-finalists-of-the-2025-apple-design-awards/ |
| Taobao | ADA 2025 **winner**, Interaction | same as above |
| Lumy, Denim | ADA 2025 finalists, Delight and Fun | same as above |
| Moises | ADA 2025 finalist, Innovation | same as above |
| Tiimo | **2025 iPhone App of the Year** | https://www.apple.com/newsroom/2025/12/apple-unveils-the-winners-of-the-2025-app-store-awards/ |
| Focus Friend (Hank Green) | 2025 App Store Awards, **Cultural Impact** winner | same as above; https://apps.apple.com/us/iphone/story/id1847901870 |
| grug (Ocho) | ADA 2026 **winner**, Delight and Fun | https://www.apple.com/newsroom/2026/06/apple-reveals-winners-of-the-2026-apple-design-awards/ |
| The Outsiders (Gentler Stories) | ADA 2026 finalist, Interaction | https://developer.apple.com/design/awards/ (2026 page) |
| (Not Boring) Camera | ADA 2026 finalist, Visuals and Graphics | same as above |
| Pokémon Sleep | **Google Play** Best of 2023: Best Game for Good (US), Users' Choice and Cute & Casual (JP). No Apple award found. | https://www.pokemonsleep.net/en/news/3734353631333932343932393337323137/ |
| Finch | No ADA or App Store Award found. The App Store listing shows an Editors' Choice badge **(secondary, search snippet)**. | https://apps.apple.com/us/app/finch-self-care-pet/id1528595748 |

Corrections to the brief:
- **Finch never won an ADA.**
- **Pokémon Sleep's awards are from Google Play, not Apple.**
- **Bears Gratitude won in 2024, not 2023.**
- The CapWords App Store screenshot carries an "App Store Awards App of the Year" laurel. It does **not** appear on the 2025 global winners list, so it may be a regional award **(unverified)**.

## 2. Reference deep-dives

Downloaded screenshots are in `inspiration/`. Section 5 lists the source URL for each one.

### 2.1 Duolingo: the benchmark for a "cute that still works" system
- **Award:** ADA 2023, Delight and Fun (verified above).
- **Why it's cute without hurting usability:** characters are built from three basic shapes (rounded rectangle, circle, rounded triangle), every shape has rounded corners, and the perspective is flat. Source: Duolingo illustration guidelines, as quoted at https://www.nathanmagyar.com/blog/how-to-draw-duo/ and https://www.scribd.com/document/583545694/Duolingo-Illustration-Guidelines **(secondary; design.duolingo.com now redirects to https://blog.duolingo.com/hub/design/)**.
- **Palette:** Feather Green `#58CC02`, Mask Green `#89E219`, Eel `#4B4B4B` for text, Snow `#FFFFFF` for backgrounds. The internal rule is "when in doubt, lean in to green". Source: https://www.canny-creative.com/atlas/brand/duolingo/ **(secondary)**.
- **Type:** Feather Bold, a custom face by Fontsmith/Krista Radoeva for the 2019 Johnson Banks rebrand, used in lowercase for headlines only. DIN Next Rounded is used for body text. Sources: https://www.creativereview.co.uk/duolingo-rebrand-johnson-banks/, https://bethjohnson.design/duolingo, https://www.canny-creative.com/atlas/brand/duolingo/
- **Shape language:** chunky buttons with a solid darker "lip" (roughly a 4px offset bottom shadow) that collapses on press. The depth tells you what is tappable. Sources: https://60fps.design/shots/duolingo-button-tactile-interaction, https://medium.com/@lilskyjuicebytes/clone-the-ui-1-replicating-duolingos-button-in-pure-css-bd37a97edb7e **(secondary)**.
- **Restraint:** the 2025 core-tabs refresh moved away from segmented, heavily bordered layouts towards flatter cards and fewer type styles. "Consistency needs to be balanced with purpose." Source: https://blog.duolingo.com/core-tabs-redesign/
- **Mascot use:** Duo was redesigned to carry a wide range of emotions. He appears at key moments (lesson start and end, streaks, reminders), not on every list row. Source: https://www.canny-creative.com/atlas/brand/duolingo/
- **Borrow for Tapiro:** the 3-shape character construction rule; a pressable "lip" on the **primary CTA only** (post a bounty, accept); a single brand colour that owns every CTA; an emotion sheet for the mascot.

### 2.2 Bears Gratitude: an illustration-first indie app
- **Award:** ADA 2024, Delight and Fun.
- **Approach:** hand-drawn bears by co-founder Nayomi Hettiarachchi. "The art is the heart of everything we do." The home screen uses swipe cards and there is no sign-in screen. Source: https://developer.apple.com/news/?id=i74v3f4r
- **Palette and shape (from the screenshot):** warm butter-yellow and salmon backgrounds, thin dark-brown hand-drawn line art, and soft cards with large radii. A rewards screen gives sticker-style badges.
- **Mascot use:** bears decorate prompts and rewards. They frame content but never replace it.
- **Borrow:** reward stickers for finished bounties (a "tapir sticker book"), and prompts written in first person.

### 2.3 Gentler Streak: an abstract mascot that carries state
- **Award:** ADA 2024, Social Impact.
- **Mascot:** Yorhart, an orange heart character by Sören Selleslagh. It was deliberately designed without gender, race, age or cultural signals. It has variants for states such as sleep-deprived, feverish and exhausted, and it is "the sole repeating organic element" in the app. Sources: https://www.sketch.com/blog/gentler-streak/, https://developer.apple.com/news/?id=3m0ht22s
- **Borrow:** the tapir should be the **only** organic element on screen, with everything else native and clean. Use mascot poses to show **system state**: empty feed, offline, waiting for an accepter, task completed, dispute. A neutral design makes sense for a mixed audience (Chinese students alongside Malay, Chinese and Indian Malaysian counterparties).

### 2.4 (Not Boring) Habits: delight through 3D, haptics and motion
- **Award:** ADA 2022 winner, Delight and Fun.
- **Approach:** 3D scenes made in Blender and rendered with SceneKit, playful haptics, and habit progress shown as a journey through forests and mountains. Source: https://developer.apple.com/news/?id=9ab1g4r3
- **Borrow:** haptics and a small celebration animation when a bounty is accepted or paid out. Don't borrow the loud poster typography for a utility marketplace.

### 2.5 CapWords: a Chinese studio winning with stickers
- **Award:** ADA 2025, Delight and Fun.
- **Approach:** photos become die-cut **stickers** with a white outline (VisionKit subject lifting), micro-animations hide AI latency, and sound, touch and sight cues are "grounded in real-world physics". Source: https://developer.apple.com/articles/capwords/
- **Palette (from the screenshot):** sunny yellow background, black bold headline, and a multicoloured gradient word.
- **Borrow:** a **die-cut sticker treatment** for the tapir and for item photos in second-hand listings. Use loading animations as the mascot's moments.

### 2.6 Focus Friend: a mascot as the main interaction
- **Award:** 2025 App Store Awards Cultural Impact; Google Play Best App 2025 **(secondary)**. Sources: https://apps.apple.com/us/iphone/story/id1847901870, https://www.tubefilter.com/2025/08/20/hank-green-tops-app-store-charts-focus-friend/
- **Approach:** a cartoon Bean knits while you leave your phone alone. "Isn't about virtue or judgement but is just cute and fun." Source: https://ktla.com/news/apps-of-the-year-2025-focus-on-productivity-wellness-and-play/
- **Palette (from the screenshot):** pastel peach background, brown bean, and a retro teal timer device.
- **Borrow:** the mascot "does something" while you wait, for example while an accepter is on the way.

### 2.7 Tiimo: cute but calm
- **Award:** 2025 iPhone App of the Year.
- **Approach:** a visual planner with soft pastel task chips, small illustrated icons and a serif headline. Apple praised its "impressive visual planner". Source: https://www.apple.com/newsroom/2025/12/apple-unveils-the-winners-of-the-2025-app-store-awards/
- **Borrow:** colour-coded category chips for errands, pickups, queueing and tutoring, using a gentle pastel per category.

### 2.8 grug: minimal cute
- **Award:** ADA 2026, Delight and Fun.
- **Approach (from the screenshot):** a single hand-drawn line sun on white, with lowercase "caveman" micro-copy. Cute comes from **voice**, not decoration.
- **Borrow:** a distinctive mascot voice in empty states and notifications (for example, a short, warm tapir voice in Chinese) can do more than extra art.

### 2.9 Finch: a pet as the self-care loop
- **Award:** none verified from Apple or Google (see section 1).
- **Approach:** a customisable "birb" pet whose growth reflects your self-care. The style is pastel and chibi. Sources: https://ixd.prattsi.org/2024/09/design-critique-finch-ios-app/, https://www.pastemagazine.com/tech/finch/finch-app-mental-health-virtual-pet-self-care
- **Palette (from the screenshot):** sky blue and grass green, cream birds, pink cards.
- **Borrow (later):** an optional tapir that "grows" with the user's reputation or completed bounties. Keep it out of v1 scope.

### 2.10 Headspace: mascot faces as an emotion system
- **Award:** ADA 2023 Social Impact.
- **Approach:** the 2024 rebrand with Italic Studio extended the orange smiley into faces showing "stress, sadness, contentment, and every mood in between". It uses a custom Aperçu variant by Colophon whose curves "mimic the shape of the Headspace smile". Source: https://www.itsnicethat.com/articles/italic-studio-headspace-graphic-design-project-250424
- **Borrow:** let the type's curvature echo the mascot (for example, round dots and terminals that echo the tapir's round ears and snout).

### 2.11 Asian marketplace and super-app mascots
- **Meituan (美团):** the kangaroo mascot dates from 2015 (a big pouch and fast runner, which fits delivery). In June 2022 it became the childlike IP "团团" with sticker packs and 3D variants. Sources: https://www.sohu.com/a/607296826_121124800, https://www.shejidaren.com/yi-dai-shu-zuo-wei-zhu-ti-mei-tuan-ji-xiang-wu-she-ji-hua.html. **Borrow:** the animal's real trait maps to the service, the way the pouch maps to delivery. The tapir's long, flexible snout could map to "picking up and carrying" tasks.
- **Xianyu (闲鱼):** the logo moved from orange-yellow to a brighter, more vivid yellow. Owned IP includes the 「好奇怪」 and 「有毛毛」 blind-box series. Source: https://www.spinpai.com/html/View_2334.html **(secondary)**, https://www.digitaling.com/articles/912057.html. The screenshot shows a saturated yellow background, a black heavy CJK headline and a small fish mascot near the CTA. **Borrow:** heavy CJK display type on a flat brand colour reads instantly to Chinese students.
- **Mercari (Japan):** rebranded by Takram around a softened "m" and a custom typeface, Mercari Sans. Sources: https://www.takram.com/projects/mercari-rebranding, https://design.mercari.com/en/mercari-sans/. The JP App Store promo shows 3D clay-like characters for campaigns only. **Borrow:** keep characters for campaigns and onboarding; the core listing UI stays neutral.
- **Kakao Friends:** a character IP that began as KakaoTalk emoticons in 2012, created by illustrator Kwon Soon-ho (Hozo). It grew from stickers into merchandise. Sources: https://en.wikipedia.org/wiki/Kakao_Friends, https://www.kakaocorp.com/page/service/service/Kakao%20Friends?lang=ENG&tab=all. **Borrow:** ship a **tapir sticker pack** (iMessage/WeChat) as low-cost brand reach among students.
- **LINE Friends / Pairs:** not researched further. I found no primary source tying Pairs to a mascot.

## 3. Design sites: specific shots

Dribbble pages could not be fetched (bot challenge), so these come from search-indexed shot pages. The titles and designers are as indexed.

| Shot | Designer | URL | Relevance |
|---|---|---|---|
| Onboarding Mascots | Noah Jacobus | https://dribbble.com/shots/2781684-Onboarding-Mascots | mascot-led onboarding |
| Mobile App Mascot | UGEM | https://dribbble.com/shots/3869161-Mobile-App-Mascot | mascot sheet |
| Maps.me onboarding animation | Artua | https://dribbble.com/shots/15853117-Maps-me-onboarding-animation | animated mascot onboarding |
| Brownie: UX/UI of an Errand-Running App | Shunchen Xu | https://dribbble.com/shots/15568140-Brownie-UX-UI-Design-of-an-Errand-Running-App | closest to a bounty board |
| Errand App | Faith Dakoru | https://dribbble.com/shots/21200819-Errand-App | errand marketplace flows |
| Errand service mobile app | Rohit Jadhav | https://dribbble.com/shots/15511114-Errand-service-mobile-app-design | playful 3D errands |
| Task Management App / Claymorphism UI | Vitalii Zhy | https://dribbble.com/shots/17325605-Task-Management-Mobile-App-Claymorphism-UI | claymorphism on tasks |
| Claymorphism Mobile App | Timur A. | https://dribbble.com/shots/17333620-Claymorphism-Mobile-App | clay shapes |
| Onboarding Mobile Game, Claymorphism 3D | Vitali Stsiapanau | https://dribbble.com/shots/22643326-Onboarding-Mobile-Game-Claymorphism-3D | 3D clay mascot |
| NeuBrutalism Education Courses App | Abdalla Elsayed | https://dribbble.com/shots/18102313-NeuBrutalism-UI-style-Education-Courses-App | neo-brutal plus cute |
| Car Sharing Neubrutalism App | (UI Challenge #10) | https://dribbble.com/shots/19941331-Car-Sharing-Neubrutalism-Mobile-App-UI-Challenge-10 | future carpool vertical |
| Bruddle Neo Brutalism UI kit | Design Laboratory | https://dribbble.com/shots/23925410-Bruddle-Neo-Brutalism-UI-kit | outline and offset-shadow tokens |
| Finance Trading App UI (Kawaii) | Salman Khan | https://dribbble.com/shots/22977916-Finance-Trading-App-UI-Kawaii | kawaii applied to dense data |
| Tapir tag (55 shots) | various | https://dribbble.com/tags/tapir | existing tapir drawings to avoid copying |
| Mobbin: Duolingo iOS screens | — | https://mobbin.com/explore/screens/c25af873-c072-4b4a-9b71-ab7a9343991e | real production flows |
| Behance: mascot / mascot guidebook searches | — | https://www.behance.net/search/projects/mascot%20guidebook | mascot spec sheets |

Takeaways:
- Claymorphism and neo-brutalism shots look good as single frames but rarely show dense lists.
- Kawaii applied to finance (Salman Khan) shows that cute styling still works on data-heavy screens if the data area stays plain.

## 4. Typography for Chinese-first cute UI

- The **system rounded design** is the safe base. Apple's HIG says the system offers SF Pro and SF Compact "in rounded variants you can use to coordinate text with the appearance of soft or rounded UI elements" (https://developer.apple.com/design/human-interface-guidelines/typography). In SwiftUI it is `Font.Design.rounded` (iOS 13+, https://developer.apple.com/documentation/swiftui/font/design/rounded). No font file is bundled, and Dynamic Type and Bold Text work automatically.
- **SF Pro files cannot be embedded.** The San Francisco license allows the font only "for creating mock-ups of user interfaces" and says "You may not embed the Apple Font in any software programs" (https://developer.apple.com/fonts/). Always reach it through the system API.
- **Chinese glyphs under `.rounded`:** SF has no CJK glyphs, so Chinese text falls back to the system CJK face (PingFang SC) and is not rounded **(to verify in a prototype)**. If Chinese headlines need to look rounded, bundle a display face (table below) for headlines only and keep body text on the system font.
- **The HIG warns** that custom fonts must implement Dynamic Type and accessibility behaviours themselves (same HIG page). Use a bundled CJK font for display sizes only.
- **Latin and Malay pairing:** Nunito (OFL), Quicksand (OFL), Baloo 2 (OFL) and Fredoka (OFL) all cover latin-ext, which is enough for Malay (Latin script). Source: Google Fonts METADATA, https://github.com/google/fonts/tree/main/ofl. My suggestion is SF Pro Rounded for UI and **Nunito** or **Fredoka** only if a bundled display Latin face is wanted to match a CJK display face.

## 5. Downloaded images (internal reference only)

All files are 392×696 JPG App Store screenshots fetched through the iTunes Lookup API, saved in `design-research/inspiration/`.

| File | Source app page | Image URL |
|---|---|---|
| bears-gratitude-appstore-1.jpg | https://apps.apple.com/us/app/bears-gratitude/id6443609622 | https://is1-ssl.mzstatic.com/image/thumb/PurpleSource112/v4/5d/0a/60/5d0a6025-008e-cfe0-7cbd-a2d86cc0cd9f/42d6b2c8-7f73-42e1-98de-a77435f19a4e_1_-_SE.png/392x696bb.jpg |
| bears-gratitude-appstore-2.jpg | same | https://is1-ssl.mzstatic.com/image/thumb/PurpleSource122/v4/25/42/cf/2542cfbc-0aae-ec8d-a90b-d5aa5ffd0914/8622aebb-aa76-4f52-913b-f019fec8f5e8_2_-_SE.png/392x696bb.jpg |
| capwords-appstore-1.jpg | https://apps.apple.com/us/app/capwords-ai-language-tutor/id6738896465 | https://is1-ssl.mzstatic.com/image/thumb/PurpleSource221/v4/7e/53/36/7e53361f-828c-a7fd-827b-a323e82ee089/01_-_Hero.png/392x696bb.jpg |
| duolingo-appstore-1.jpg | https://apps.apple.com/us/app/duolingo-language-lessons/id570060128 | https://is1-ssl.mzstatic.com/image/thumb/PurpleSource211/v4/6e/ef/30/6eef3023-de04-3b29-21f8-a993245b9abd/iPhone6.5_-_Default_-_first_screen_adapt_Var_2_01.jpg/392x696bb.jpg |
| duolingo-appstore-2.jpg | same | https://is1-ssl.mzstatic.com/image/thumb/PurpleSource221/v4/cb/ee/31/cbee31c9-a814-b59b-db16-3136ce60d20d/V2_iOS6.5_02.jpg/392x696bb.jpg |
| finch-selfcare-pet-appstore-1.jpg | https://apps.apple.com/us/app/finch-self-care-pet/id1528595748 | https://is1-ssl.mzstatic.com/image/thumb/PurpleSource211/v4/6f/a9/fe/6fa9feb6-41c9-7c26-0f5c-296558c9f0f1/iPhone_social_large_01.jpg/392x696bb.jpg |
| finch-selfcare-pet-appstore-3.jpg | same | https://is1-ssl.mzstatic.com/image/thumb/PurpleSource211/v4/be/a7/84/bea784ad-4c13-e5fd-2108-1dc9827e05d9/iPhone_social_large_03.jpg/392x696bb.jpg |
| focus-friend-appstore-1.jpg | https://apps.apple.com/us/app/focus-friend-by-hank-green/id6742278016 | https://is1-ssl.mzstatic.com/image/thumb/PurpleSource221/v4/80/50/3b/80503b29-9abe-b1f2-5306-8618dd87faff/iPhone_6.7_Screenshots__U00281206_x_2622_px_U0029__U00281290_x_2796_px_U0029.png/392x696bb.jpg |
| gentler-streak-appstore-1.jpg | https://apps.apple.com/us/app/gentler-streak-workout-tracker/id1576857102 | https://is1-ssl.mzstatic.com/image/thumb/PurpleSource211/v4/fc/43/dc/fc43dc40-f5df-a46d-3799-521f962107df/Valera_English_iPhone1.png/392x696bb.jpg |
| grug-appstore-1.jpg | https://apps.apple.com/us/app/grug/id6751649802 | https://is1-ssl.mzstatic.com/image/thumb/PurpleSource211/v4/90/1a/6b/901a6b1c-73ed-01d5-9487-9e10f7403329/5E10394A-3ED5-45C4-9875-4C220EE5B109-grug_appstore_01.png/392x696bb.jpg |
| meituan-appstore-1.jpg | https://apps.apple.com/cn/app/id423084029 | https://is1-ssl.mzstatic.com/image/thumb/PurpleSource221/v4/4f/1a/65/4f1a6578-9605-de49-46a0-b6625a9592de/_U6d7c_U6c2c_U61b3_U0026_U68e3_U682d_U3009-5.5@2x.png/392x696bb.jpg |
| mercari-jp-appstore-1.jpg | https://apps.apple.com/jp/app/id667861049 | https://is1-ssl.mzstatic.com/image/thumb/PurpleSource211/v4/0f/ca/90/0fca907a-b9ce-2714-9fdc-9ca1bc65363c/_U0028Store_U00291290x2796_1_4.png/392x696bb.jpg |
| notboring-habits-appstore-1.jpg | https://apps.apple.com/us/app/not-boring-habits/id1593891243 | https://is1-ssl.mzstatic.com/image/thumb/PurpleSource221/v4/c1/1f/c7/c11fc74e-7c12-7cef-5538-53377e2045d1/51926e67-546b-422c-a440-ef85acbfaf28_habits-iphone6.7-1.png/392x696bb.jpg |
| pokemon-sleep-appstore-1.jpg | https://apps.apple.com/us/app/pok%C3%A9mon-sleep/id1579464667 | https://is1-ssl.mzstatic.com/image/thumb/PurpleSource211/v4/62/46/fe/6246feb5-aa96-8186-65a4-f2ec3e57a129/d5ceaaf0-070a-48df-a5a3-e1c282c793da_Poke_U0301monSleep_store_1242x2208_5.5_EN_01.png/392x696bb.jpg |
| tiimo-appstore-1.jpg | https://apps.apple.com/us/app/tiimo-to-do-list-planner/id1480220328 | https://is1-ssl.mzstatic.com/image/thumb/PurpleSource221/v4/0a/42/fb/0a42fb17-a478-fe50-7af2-7d551a47e2e9/iPhone_6_U00279_01.jpg/392x696bb.jpg |
| xianyu-idlefish-appstore-1.jpg | https://apps.apple.com/cn/app/id510909506 | https://is1-ssl.mzstatic.com/image/thumb/PurpleSource211/v4/61/3f/e9/613fe97c-7795-31b7-ce8f-30247604477c/001.png/392x696bb.jpg |

`contact.jpg` (one level up) is a contact sheet of all 16 screenshots.

## 6. Cross-cutting lessons: what makes cute usable

1. **One organic element.** The mascot is the only drawn thing on screen and everything else is native (Gentler Streak, Mercari).
2. **The mascot appears at state transitions, not on every row:** onboarding, empty, waiting, success, error (Duolingo, Yorhart, Focus Friend).
3. **Use depth only where you can tap.** Duolingo's lip goes on the CTA. iOS 26's own rule: "Don't use Liquid Glass in the content layer"; it belongs to the floating controls and navigation layer (https://developer.apple.com/design/human-interface-guidelines/materials). So cute styling goes in **content** (cards, stickers, mascot) and system glass handles navigation.
4. **Voice is cheap delight.** grug and Bears Gratitude get much of their charm from copy.
5. **Stickers travel.** CapWords die-cuts and Kakao emoticons double as shareable marketing.

## 3 candidate visual directions for Tapiro

### A. "Saddle Pop": two-tone graphic with a chunky CTA
- **Draws from:** Duolingo (the lip CTA, the 3-shape rule), Xianyu (heavy CJK on flat colour), Mercari (mascot reserved for campaigns), the neo-brutalism shots (Bruddle, Abdalla Elsayed).
- **Palette:**
  - Tapir Ink `#1E1B22` for text and outlines
  - Saddle `#FFF7E8` for the background
  - Bounty Mango `#FFC53D` for the primary CTA and reward amounts
  - CTA lip `#E0A100`
  - Pandan `#2DB37A` for success and accepted
  - Rambutan `#FF5A4E` for urgent and destructive
  - Sky `#7CC4FF` for info
- **Shape:** cards with a 20pt continuous radius, a 2pt ink outline on **mascot and stickers only**, and a 4pt offset solid lip on the primary button. Cards use a flat fill with a hairline, not drop shadows.
- **Type:** PingFang SC for body and SF Pro Rounded for numbers and Latin, both via the system. Chinese display headlines use 阿里妈妈方圆体 (bold, round axis) or 寒蝉圆黑体 Heavy.
- **Mascot:** a flat, geometric tapir (body = rounded rectangle, head = circle, snout = rounded triangle) with a black head and rump and a cream saddle. It appears on onboarding, empty states, the success sheet and the "waiting for accepter" loop. Motion is a subtle bob and ear-flick.
- **Risks:** the strongest identity, but the closest to Duolingo-clone territory. The yellow also overlaps with Meituan and Xianyu (yellow is crowded in Chinese apps). A high-contrast ink outline can feel loud next to iOS 26 glass.

### B. "Kampung Cozy": warm, hand-drawn and pastel
- **Draws from:** Bears Gratitude (hand-drawn line, stickers), Finch (pastel pet), Focus Friend (the mascot does something while you wait), Tiimo (pastel category chips).
- **Palette:**
  - Paper `#FBF4EA` for the background
  - Ink Brown `#3B2F2A` for text
  - Teh Tarik `#C98B5A`
  - Pandan `#8FCB8A`
  - Hibiscus `#F28B8B`
  - Langit `#A9D6F5`
  - Kaya `#F5D57A`
  - The tapir is drawn in `#2A2730` and `#F6F1E7`
- **Shape:** 24pt radius cards, wobbly hand-drawn 1.5pt line art in the illustrations only, and soft low-alpha warm shadows.
- **Type:** PingFang SC for body; 站酷快乐体 for headlines and stickers only (playful, OFL); Nunito Rounded-style Latin, or SF Rounded.
- **Mascot:** frequent and personable, including a daily greeting, an animated "tapir carrying your parcel" while a task is in progress, and a sticker book of completed bounties.
- **Risks:** the softest feel and the most "student-friendly", but trust can suffer for money and transactions. Hand-drawn assets are expensive to keep consistent across languages, and pastel contrast needs checking against WCAG.

### C. "Native Sticker": Liquid Glass first, tapir as a die-cut sticker (recommended starting point)
- **Draws from:** CapWords (die-cut stickers, micro-animation), Gentler Streak (one organic element, state poses), grug (voice over decoration), Crouton and Tiimo (calm native UI), the HIG materials guidance.
- **Palette:**
  - System backgrounds (light and dark)
  - Tapir Ink `#25232B` and Saddle `#F3EFE6` for the mascot only
  - Tint, single accent: Rambutan Coral `#FF6B57` or Pandan `#22B573`; choose one and use it for all CTAs and the glass tint
  - Gold `#F5B83D` for reward amounts
- **Shape:** native iOS 26. Use system glass tab and tool bars, a 16–20pt continuous radius on content cards, no outlines, and system shadows. The tapir and listing photos get a white 4pt die-cut sticker border plus a soft drop shadow.
- **Type:** all system: PingFang SC plus `Font.Design.rounded`. There are zero bundled fonts in v1. Optionally add 阿里妈妈方圆体 for the wordmark and splash only.
- **Mascot:** used sparingly and with intent. A pose library maps to app states: empty, searching, waiting, accepted, paid, error, offline. There are also sticker drops (Lottie/Rive) on success and an iMessage/WeChat sticker pack.
- **Risks:** it could read as "generic iOS with a sticker" if the mascot art is weak, so the tapir illustration quality carries the whole brand. Tint colours inside glass need contrast checks in both light and dark mode.

## Fonts: licensing table

| Font | Script | Licence and app embedding | Attribution or conditions | Source |
|---|---|---|---|---|
| SF Pro / SF Pro Rounded | Latin, Greek, Cyrillic | **Do not embed.** Use only through the system API (`Font.Design.rounded`). Font files are limited to UI mock-ups. | Registered Apple Developer, for mock-ups only | https://developer.apple.com/fonts/ ; https://developer.apple.com/design/human-interface-guidelines/typography |
| PingFang SC | CJK | System font: use through the system, don't bundle (bundling rights not researched) | — | iOS system font **(not separately researched)** |
| 站酷快乐体 ZCOOL KuaiLe | SC + Latin | **OFL** (designers Liu Bingke, Yang Kang, Wu Shaojie); embedding OK | Include the OFL text; can't sell standalone | https://github.com/google/fonts/tree/main/ofl/zcoolkuaile |
| 阿里妈妈方圆体 VF | SC (GB2312, 6763 chars), variable | Free commercial use, **embedding use allowed** ("以及嵌入式使用") | No modification or reverse engineering, no standalone resale, no trademark registration of glyphs; credit the owner where possible | https://www.alibabafonts.com/#/more (official, SPA; text quoted via https://www.maoken.com/freefonts/19073.html **(secondary)**) |
| 得意黑 Smiley Sans | SC (8,335 chars), oblique only | **OFL 1.1**; embedding OK | OFL text | https://github.com/atelier-anchor/smiley-sans |
| 寒蝉圆黑体 ChillRoundGothic | SC/TC/JP/KR, 7 weights, rounded Source Han | **OFL 1.1** | OFL text | https://github.com/Warren2060/ChillRoundGothic |
| HarmonyOS Sans | SC/TC + Latin | Free; may "use, copy, merge, embed, bundle, redistribute" unmodified copies | **Prominent notice in the software** that HarmonyOS Sans is used; no modification | https://github.com/openharmony/global_system_resources/blob/master/LICENSE_Fonts ; https://github.com/huawei-fonts/HarmonyOS-Sans |
| MiSans / MiSans Global | SC + 600+ languages | Free commercial use; embedding in software **allowed** | Must **note use of MiSans in the software**; no modification or resale | https://hyperos.mi.com/font/zh/faq/ |
| OPPO Sans 4.0 | SC + Latin | Free commercial use; app embedding not explicitly addressed **(unverified)** | No modification, resale or third-party download channels | https://open.oppomobile.com/new/developmentDoc/info?id=13223 ; https://www.ithome.com/0/804/511.htm **(secondary)** |
| Noto Sans SC / Source Han Sans | CJK | **OFL**; embedding OK | OFL text | https://github.com/google/fonts/tree/main/ofl/notosanssc |
| LXGW WenKai 霞鹜文楷 | SC/TC/KR (Klee One derivative) | **OFL 1.1**; free commercial use | No standalone file resale | https://github.com/lxgw/LxgwWenKai |
| Nunito | Latin-ext (Malay OK) | **OFL** | OFL text | https://github.com/google/fonts/tree/main/ofl/nunito |
| Quicksand | Latin-ext | **OFL** | OFL text | https://github.com/google/fonts/tree/main/ofl/quicksand |
| Baloo 2 | Latin-ext + Devanagari | **OFL** | OFL text | https://github.com/google/fonts/tree/main/ofl/baloo2 |
| Fredoka | Latin-ext + Hebrew | **OFL** | OFL text | https://github.com/google/fonts/tree/main/ofl/fredoka |

Licensing notes:
- **Lowest-risk stack:** system fonts only (PingFang SC + SF Rounded), plus one OFL display face (寒蝉圆黑体 or 站酷快乐体). This needs only an OFL notice in Settings → Licenses.
- **Attribution in the app:** HarmonyOS Sans and MiSans both require a credit inside the app. 阿里妈妈方圆体 asks you to credit the owner where possible.
- **Before shipping 阿里妈妈方圆体:** re-confirm the licence on the official Alimama page, because one aggregator mentions an app-use restriction (https://www.maoken.com/freefonts/19073.html vs. the search snippet).
- **App size:** CJK font files are large, so subset any bundled display face to GB2312 or a headline glyph set.
