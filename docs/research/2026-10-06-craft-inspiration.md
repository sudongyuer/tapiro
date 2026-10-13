# Craft inspiration: interaction details and home screens

Question: which concrete interaction details should Tapiro borrow, and why do they work?
Priority (founder, 2026-10-06): the first screen and its main entry points.
Scope: 38 details from 25 apps. 24 of them are about home screens and entry points.
Assets: 27 trimmed videos (H.264, no audio, 3–12 s, each under 2 MB) with key frames, plus screenshots.
Assets and `refs.json` live in the session scratchpad (`craft-refs/`), not in the repo.

Tags: 真机 = real screen recording (60fps.design, benji.org). 官网 = official site or newsroom.
商店 = App Store screenshot. No App Store preview videos could be fetched; store pages no longer
expose video URLs in static HTML.

## Home screens and entry points (首屏与入口)

### What the first screen is

- Halide opens straight to the viewfinder. Every control sits in the thumb zone. A tool's name
  flashes briefly above the shutter when tapped, then gets out of the way.
  https://www.lux.camera/pro-camera-action-introducing-halide-mark-ii/
- CapWords opens to the camera, titled with today's date. Captures are peeled into stickers and
  filed by day. https://apps.apple.com/us/app/id6738896465, https://developer.apple.com/articles/capwords/
- Arc Search opens to one field with the keyboard up. Each suggestion has its own "Browse for Me"
  action. https://apps.apple.com/us/app/arc-search-find-it-faster/id6472513080
- Grab and Uber lead with one "where to" field, then "Book again" for the last trip.
  https://apps.apple.com/my/app/grab-taxi-ride-food-delivery/id647268330,
  https://www.uber.com/newsroom/were-redesigning-the-uber-app-just-for-you
- (Not Boring) Weather shows one huge temperature and one sentence. A time slider flips the digits
  in 3D and recolours the sky. https://60fps.design/shots/not-boring-weather-temperature-slider
- Bears Gratitude's home is a stack of prompt cards. Tap left or right half to flip; the background
  colour follows the card. No sign-in. https://60fps.design/shots/bears-gratitude-tap-left-right-tips
- Airbnb 2025 cut the home to three top tabs (Homes, Experiences, Services) with 3D icons that
  animate once on switch. https://60fps.design/shots/airbnb-tab-icon-animation
- Tiimo's Today groups tasks by part of day (anytime, morning, day, evening), not by hour.
  https://apps.apple.com/us/app/id1480220328

### How the main action is offered

- Things 3 Magic Plus: a floating + you can drag to the exact spot in the list where the new item
  should go. Tap still works. https://60fps.design/shots/things-3-drag-to-create-to-do-interaction,
  https://www.culturedcode.com/things/support/articles/2803582
- Crouton Meal Plan: each day has its own "+" that opens a native menu in place; the item lands in
  that day. https://60fps.design/shots/crouton-pick-meal-type-menu
- Apple Music on iOS 26: the tab bar shrinks to a pill on scroll and the mini player stays attached
  as a bottom accessory. SwiftUI: `tabViewBottomAccessory`, `tabBarMinimizeBehavior` (iOS 26.0).
  https://www.apple.com/newsroom/2025/06/apple-introduces-a-delightful-and-elegant-new-software-design/
- Fliggy (飞猪): the home search box takes a whole sentence; a pull-up AI panel splits into
  帮我想 / 帮我订 / 帮我办; the centre tab is the mascot's head ("飞猪帮帮").
  https://apps.apple.com/cn/app/id453691481
- Airbnb 2025: the search pill expands into the full "Where?" panel; fields grow out of the pill.
  https://60fps.design/shots/airbnb-search-tab-interaction

### How in-progress items surface

- Flighty: each home row leads with a big countdown ("3h 43m"); status is coloured green or red.
  The live card strikes through the old time and shows the predicted one. Gates are yellow
  airport-sign chips. https://flighty.com/
- Flighty Live Activity: two times, a plane on a progress line, one sentence
  ("Gate Departure in 43m · Inbound aircraft has arrived"). Notifications are full sentences.
  https://flighty.com/
- Uber Live Activity: the Dynamic Island changes per trip phase. Information is ranked P0/P1/P2.
  The last 20% of the progress bar always means the last 2 minutes.
  https://www.uber.com/blog/live-activity-on-ios/
- Family: after you confirm a send, the spinner flies into the bottom navigation. A "Pending" group
  appears at the top of home. https://benji.org/family-values
- Monzo and Revolut: the first row of the feed is the future ("3 upcoming payments",
  "due tomorrow"), not history. https://apps.apple.com/gb/app/monzo-bank-mobile-banking/id1052238659,
  https://apps.apple.com/my/app/revolut-send-spend-and-save/id932493382

### Where the mascot or assistant lives

- Gentler Streak: the home header is Yorhart's face. Green glow and a smile when fine; red glow and a
  wince on a rest day. One plain sentence below. https://60fps.design/shots/gentler-streak-wellbeing-header
- Finch: the bird lives in a scene on the top half ("Adventuring, back in 7:36"); goals are below.
  https://apps.apple.com/us/app/id1528595748
- Duolingo: one path; a bobbing "START" bubble floats over the current node.
  https://developer.apple.com/news/?id=jhkvppla
- Alipay 蚂蚁阿宝: a 资产 | 阿宝 switch at the top. 阿宝 greets, offers three proactive suggestions,
  and answers with a confirm card (map, price). https://apps.apple.com/cn/app/id333206289
- Meituan 问小团: opens with a greeting and intent chips; results carry a one-tap 领券 button.
  https://apps.apple.com/cn/app/id423084029

### How home adapts by state

- Airbnb: an unfinished search becomes a "Continue searching" card; on travel day Trips puts a
  "Today" card on top. https://60fps.design/shots/airbnb-tactile-tab-button-interaction
- Gentler Streak and Flighty (above) change colour and copy by state, not layout.

## Other categories

- 转场: Family trays change height at every step, so the change itself says "next step".
  https://benji.org/family-values
- 导航: Family's tab switch slides toward the tab you tapped. "We fly instead of teleport." Same URL.
- 数字与计数: Flighty's split-flap digit flip (served on its 404 page). Family's amount input slides
  commas into place digit by digit. https://flighty.com/, https://benji.org/family-values
- 按下与触感: Opal's "Hold to Commit" fills with light, says "Keep Holding…", then turns to
  "✓ Committed". https://60fps.design/shots/opal-hold-to-commit-button-interaction
  iOS 26 controls become a magnifying glass lens under the finger (newsroom URL above).
- 等待与加载: CapWords hides background removal behind a particle sweep and cutout.
  https://60fps.design/shots/capwords-snap-mask-interaction
- 成功时刻: Not Boring Habits fills a ring on long press, bursts, settles into a 3D check.
  https://60fps.design/shots/not-boring-habits-long-press-mark-habit-interaction
  CapWords practice end: stickers orbit in, percent counts up, confetti fires once.
  https://60fps.design/shots/capwords-practice-complete-confetti-interaction
  Family fires confetti only on wallet backup. Uber's PIN illustration morphs into a blue shield.
  https://60fps.design/shots/uber-ride-verified-tick-in-sheet-animation
- 空状态: Airbnb Services shows a springy 3D object and "coming soon"; it changes per category.
  https://60fps.design/shots/airbnb-services-empty-state-tab-transistion
- 文字与排版: Crouton turns "for 4 minutes" in a recipe step into a tappable timer.
  https://apps.apple.com/us/app/crouton-recipe-manager/id1461650987

## Stated principles (verbatim)

Benji Taylor, Family (https://benji.org/family-values)

- "Each animation serves a purpose from an architectural perspective, aiding users in understanding their path from A → B."
- "If a component occupies a space and will persist in the next phase of the user's journey, it should remain consistent."
- "Mastering delight is mastering selective emphasis."
- Delight-Impact Curve: "the potential for delight increases as the frequency of feature usage decreases."
- "we decided to utilise trays for transient actions that don't need to be permanently on display within the app."

Emil Kowalski (https://emilkowal.ski/ui/you-dont-need-animations, https://emilkowal.ski/ui/great-animations)

- "I use Raycast hundreds of times a day. If it animated every time I opened it, it would be very annoying."
- "Before you start animating, ask yourself: what's the purpose of this animation?"
- "Your animations should also usually be shorter than 300ms."

Rauno Freiberg (https://rauno.me/craft/interaction-design)

- "Great interactions are modeled after properties from the real world, like interruptability."
- "Truly fluid gestures are immediately responsive."
- "Isn't the mother of all inputs no input at all?"

Josh Puckett (https://www.interfacecraft.dev/)

- "Software that feels right. Like it was made by someone who took the time to apply an almost unreasonable level of consideration."

Andy Allen, Not Boring (https://notbor.ing/words/the-most-satisfying-checkbox, https://notbor.ing/words/the-sound-of-software)

- "These moments of feel aren't reserved for big moments. In fact, they're most important for routine actions you perform over and over again."
- "If you play the same exact waveform over and over again, it doesn't matter how good it's designed, it'll get annoying really quick."
- "Sound is intrusive, so let people decide how and when it intrudes their space."

Note the tension: Kowalski says frequent actions should not animate; Allen says they deserve the
most care in _feel_ (haptics, sound variation). Both hold: frequent actions get instant haptic
feedback, not visible motion.

Teo Connor, Airbnb (https://www.designweek.co.uk/it-was-a-bit-nuts-teo-connor-on-designing-the-new-airbnb-app/)

- "The delightful moments always have a utility behind them."

Uber Live Activity team (https://www.uber.com/blog/live-activity-on-ios/)

- "Information on this surface is only glanced at for a few seconds at a time."

CapWords, Clu Soh (https://developer.apple.com/articles/capwords/)

- "CapWords is grounded in real-world physics: sound, touch, and sight cues."

Gentler Streak, Katarina Lotrič (https://developer.apple.com/news/?id=3m0ht22s)

- "Yorhart helps you establish a relationship with the app and with yourself, because it's what your heart would be telling you."

Bears Gratitude, Isuru Wanasinghe (https://developer.apple.com/news/?id=i74v3f4r)

- "We wanted people to go straight into the experience and start writing."

Apple, WWDC23 "Design dynamic Live Activities" (https://developer.apple.com/videos/play/wwdc2023/10194/)

- "Use the numeric content transition to count up or down important numbers in your Activity."

## Shortlist: adopt first (ranked)

1. **Active-task strip as the iOS 26 tab bar bottom accessory** (Apple Music). An accepted errand or
   booked ride rides above the tabs on every screen and stays when the bar minimises.
2. **Live Activity with a glance-ranked layout and a front-loaded progress curve** (Uber, Flighty).
   For an errand runner arriving or a Grab share pickup; one sentence, never a paragraph.
3. **Home adapts by state** (Airbnb, Monzo). Nothing going on: nearby bounties and "post". Something
   live: the in-progress card on top, future before history.
4. **In-progress card with struck-through old time and predicted time** (Flighty). For ride ETAs and
   errand deadlines that slip.
5. **Mascot face as the home status header** (Gentler Streak). 小貘's expression and one sentence
   state the day: quiet, someone needs you, your task is late. Colour and copy change; layout does not.
6. **Spinner flies to where the result will live** (Family). After posting a bounty, the sticker
   flies into the Activity tab, which gains a "Pending" group.
7. **One composer field that accepts a sentence** (Fliggy, Arc Search, Grab). "帮我从 Sunway 带杯奶茶"
   drafts a bounty card; the manual form is one tap away.
8. **Peel-to-sticker capture with a wait-hiding animation** (CapWords). Photo of an item for an errand
   becomes a die-cut sticker while upload and cutout run.
9. **Hold-to-commit for money and acceptance** (Opal, Not Boring Habits). Accepting a bounty or
   confirming a payout fills under the thumb with rising haptics; one-shot celebration after.
10. **Confetti budget by frequency** (Family Delight-Impact Curve, CapWords). First completed errand,
    first five-star review: full sticker burst. Routine completions: haptic and a check only.

## Gaps

- No moving recordings of the Flighty, Duolingo, Finch, Fliggy, Alipay or Meituan home screens; stills only.
- Partiful and Musubicho were not covered here (Musubicho: `2026-10-06-ai-native-reference.md`).
- Halide's "Stay out of the way" came from a page summary and is not quoted above.
- Arc Search founder quote was a search-snippet paraphrase and is omitted.
- Taobao (ADA 2025 Interaction) is a Vision Pro app and was skipped.
