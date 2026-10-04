# CapWords: design reference for Tapiro

Collected 2026-10-04. Internal reference only. We learn from CapWords; we do not copy it. Image files are in `capwords/`, next to this file.

Constraint for Tapiro: the UI stays non-cartoony. The cartoon Malayan tapir mascot is the only cartoon element.

## 1. Facts

| Fact | Source |
|---|---|
| App "CapWords: AI Language Tutor" by HappyPlan Tech. Seller URL capwords.app. Released 2025-02-14. Version 2.0.10 at lookup. Genres: Education, Utilities | iTunes Lookup: https://itunes.apple.com/lookup?id=6738896465&country=us |
| Localized names: cn "CapWords: AI 口语教练", jp "CapWords: AI英会話・写真で語学" | same API with `country=cn` and `country=jp` |
| Won the 2025 Apple Design Award for Delight and Fun. Also an App Store Award winner (2025). Team of 3, based in Beijing. Founder Ace Lee; Clu Soh helped build it | https://developer.apple.com/articles/capwords/ |
| ADA citation: "With the snap of a camera and a fun animation, CapWords transforms everyday objects … into interactive stickers … each flash card transition is accompanied by a real-world sound" | https://developer.apple.com/design/awards/2025/ |
| Cutouts use VisionKit subject lifting. On-device segmentation models were tried and dropped. GPT-4 identifies the object. AVAudioEngine plus Neural Voice for audio. CloudKit sync. No server | https://developer.apple.com/articles/capwords/ |
| The site lists AVSpeechSynthesizer (Neural Voice), "VisionKit and AVFoundation: for image capture and background removal", CloudKit, and SFSpeechRecognizer | https://capwords.app/ |
| Capture flow: Capture → remove background → confirm → display. A "micro-animation" covers the API latency during the confirm step | https://developer.apple.com/articles/capwords/ |
| Sound: recorded on iPhone, refined in GarageBand. "The swipe and flip sounds, as well as error prompts, were captured using concert tickets and flyers." The first prototype was made in video editing before any code | https://capwords.app/about |
| Card background colors match the object's color, and the cutout and the word animate separately (少数派 review) | https://sspai.com/post/98389 |
| Catalogued motions: streak confetti, snap mask (particle masking), splash, practice-complete confetti, feature-sheet card pop, onboarding capture, intro dots, swipe-cards gesture tip. Described as "spring-loaded card pops, celebratory confetti bursts, and interactive particle masking effects". The videos need a paid account and were not downloaded | https://60fps.design/apps/capwords |
| Chinese design write-up: dot-grid background, grain texture on cards, white sticker borders, soft shadows, generous whitespace. This is a secondary analysis, not the team's own words | https://www.ftium4.com/CapWords-Design-Analysis.html |
| The official site is built in Framer and uses the fonts `Inter Tight` and `Merriweather` | page source of https://capwords.app/ |

Unrelated look-alike, do not cite: GitHub `xdeng3-collab/capwords`. It is a pixel-art clone, not this app. Mobbin returned 404. ScreensDesign had no CapWords page. Zhihu returned 403.

## 2. Team quotes (verbatim)

- "Language learning should feel natural, a part of everyday life—something warm, not cold or mechanical." Ace Lee, https://capwords.app/about
- "What if we could 'peel' things off from the real world like a sticker and collect them?" Ace Lee, https://capwords.app/about
- "To us sound effects should feel warm and human, never cold or mechanical." https://capwords.app/about
- "CapWords treats every detail as a product, drawing inspiration from the everyday. We crafted interactions and sound effects by experimenting with real materials colliding, tapping, and swiping familiar objects." https://capwords.app/about
- "CapWords is grounded in real-world physics: sound, touch, and sight cues. That's why it works so well." Clu Soh, https://developer.apple.com/articles/capwords/
- "It worked really well without needing to integrate big models inside the app. That's how we peeled items off easily." Clu Soh, about VisionKit, same article
- User feedback the team quotes: "The warmest and most humane AI I've ever used." Same article and the about page

## 3. Images

### App Store iPhone screenshots

There are 27 files. Each was requested at `392x696bb.jpg` and Apple returned 322×696. The cn and jp sets are separate localized assets with different URLs, so all three sets were kept. The 9 screens in each set follow the same order:

| # | US file | Shows |
|---|---|---|
| 1 | capwords-appstore-us-1.jpg | Hero on yellow `#FFEB76`. Sticker collage (dog "Perro", cone, banana, polaroid). Huge black bold headline with a white sticker outline. "language" set in rainbow pastel letters. Award laurels |
| 2 | -us-2 | Camera screen: viewfinder corner brackets, serif date "Feb 03", round shutter with a rainbow ring |
| 3 | -us-3 | "Talk about your day": sticker scatter, Cappy the pink donut mascot with a speech bubble, black pill CTA "Talk with Cappy" |
| 4 | -us-4 | Conversation screen on a pastel-pink card. "light up words" 0/15 progress. Sticker "Helado". Big rounded sentence with the keyword underlined |
| 5 | -us-5 | Word detail: sticker in the center, translations floating as small white sticker labels with flags, IPA plus speaker icon |
| 6 | -us-6 | Example sentences: plain white list, bold sentence plus grey translation, speaker icons |
| 7 | -us-7 | Fan of speckled flashcards (red, orange, green, purple, rust) |
| 8 | -us-8 | Flashcard deck, counter "1/14", "Hold & Speak to conquer", mic button |
| 9 | -us-9 | Review cards: white, about 24pt radius, yellow stars |

US URLs: https://is1-ssl.mzstatic.com/image/thumb/PurpleSource221/v4/7e/53/36/7e53361f-828c-a7fd-827b-a323e82ee089/01_-_Hero.png/392x696bb.jpg and the eight siblings. Every URL is listed in `capwords/lookup-{us,cn,jp}.json` (field `screenshotUrls`). Swap `320x480bb.jpg` for `392x696bb.jpg` to get these sizes.
- `capwords-appstore-cn-1..9.jpg` is the Chinese set (hero "轻松开口说 / AI拍照 / 学外语", same layout).
- `capwords-appstore-jp-1..9.jpg` is the Japanese set.

### Other images (11)

| File | Source URL | Shows |
|---|---|---|
| adc-article-capwords-3.jpg | https://developer.apple.com/articles/images/article-capwords-3_2x.jpg | Example-sentence list (keyword in orange), camera confirm sheet, word detail "Palm tree" with a "View examples" pill |
| adc-article-capwords-4.jpg | https://developer.apple.com/articles/images/article-capwords-4_2x.jpg | Confirm step (mug with yellow glow, three circular buttons), sticker grid "Feb 10", flashcard back with grain |
| site-home-day-collections.png | https://framerusercontent.com/images/s7jJuQvRf6ZvbNMLOu4hvh19T8c.png | Home: day cards in muted colors (sage, mauve, dusty blue, lilac), serif dates, sticker rows |
| site-flashcard-front-colored.png | https://framerusercontent.com/images/o42ylFYbiEBkwgeWClm9K2i40sk.png | Flashcard front: taupe speckled card over rotated cream and orange cards, "0 / 34" pill, dashed mic |
| site-flashcard-back-white.png | https://framerusercontent.com/images/ntrXxlRZmxxm32AtSj81jjEBpk4.png | Flashcard back: white grain card with a hairline divider |
| site-sticker-grid-day.png | https://framerusercontent.com/images/mG7Df1O5jISgy7XrGDQq7UJbE.png | Sticker grid of one day's words with floating capture FAB |
| site-capture-confirm-glow.png | https://framerusercontent.com/images/btM6R8ZLsDm1mkzHi2FjpDVliEo.png | Confirm step: radial yellow glow behind the cutout, buttons for retake, confirm (purple check), and discard |
| site-capture-camera-sheet.png | https://framerusercontent.com/images/kEhswH2ti1L5L23WQxr5uPtYPM.png | Camera with grain/particle mask around the subject (the "snap mask"), bottom sheet with confirm buttons |
| site-card-pizza-orange.png | https://framerusercontent.com/images/3hpPrQit0upEssTxd2BCts4tc.png | Marketing flashcard, orange `#F3B061`, white cutout border |
| site-card-orchid-purple.png | https://framerusercontent.com/images/s1JO88I0Z41bVp991zVR2Zf9460.png | Marketing flashcard, orchid `#BA7EBB` |
| site-doodle-flask-sticker.png | https://framerusercontent.com/images/k97CSAy8TJLq9WHzqONbSQi1sA.png | Line-doodle icon (flask) with a white sticker outline, used for site decoration |

## 4. Design analysis (from viewing the images)

Hex values were sampled from the images with Pillow. They are approximate because of JPEG compression and marketing renders.

**Two layers.** The product UI is almost plain: `#F4F4F4` canvas, white controls, grey text. All the color and personality come from the content: photo cutouts, colored cards, and the single mascot (Cappy). The App Store frames add yellow and pastel backgrounds and sticker collages. The real screens are much quieter than the store art. This split is the main lesson for Tapiro.

**Palette.**
- Canvas `#F4F4F4`. Cards and buttons `#FFFFFF`.
- Marketing hero yellow `#FFEB76`.
- Day-card pastels, muted and greyed: sage `#B6B98D`, mauve `#B894A7`, dusty blue about `#95AFCB`, lilac `#BBB1D5`.
- Flashcard fills: orange `#F3B061`, orchid `#BA7EBB`, taupe `#8C7D6B`, and coral, green, and rust variants.
- Ink: near-black, plus a dark navy for sticker labels (about `#1C3344`, which is also present in the site CSS).
- Highlights: orange keyword highlight (about `#EB732F`/`#F59E6C` in the site CSS) and a lavender/purple check icon.

**Typography.**
- Date headers use a serif ("Feb 12", "May 07"). It looks like Apple's New York or Merriweather; uncertain.
- Sticker labels and word titles use a very heavy geometric/rounded sans in dark navy with a white outline stroke. The exact font is unknown.
- Body text is SF Pro. Translations are grey and smaller.
- Marketing headlines are heavy rounded sans. The site uses Inter Tight.

**Corner radii, measured on the 1206-px-wide home screenshot at @3x.**
- Day cards: about 38pt continuous corner, 20pt side margin, 12pt gap, about 194pt tall.
- Flashcards: about 28–32pt.
- Circular icon buttons: 44–48pt white circles on `#F4F4F4`.
- Pills: counter "0 / 34", "View examples", hint chips.

**Sticker treatment.** VisionKit cutout, then an even white die-cut border. The border is about 3–4pt in the grid (about 12px @3x) and about 2.6% of card width on large marketing cards. A very soft, low-opacity drop shadow lifts the sticker. Labels sit under or across the sticker as their own white-outlined text "sticker".

**Texture.** A faint dot grid sits on the canvas of the capture and confirm screens. Flashcards carry speckle/grain dots that feel like printed paper. A radial yellow glow sits behind a freshly captured object.

**Illustration vs plain.** Inside the app, roughly 90% plain UI plus photos. Cartoon drawing is limited to Cappy, a few line doodles, and confetti.

**Buttons and navigation.**
- No tab bar. The home screen has two corner circular icon buttons (learn/review and profile).
- A floating circular capture FAB with a rainbow ring.
- Back chevron at top left.
- Main CTA is a black full-width pill ("Talk with Cappy").
- Secondary actions are white circles holding a single glyph.

**Light/dark.** All available images are light mode. Dark mode support was not verified (unknown).

**Motion, sound, and haptics.**
- Capture: particle/grain mask, then peel into a sticker, then a glow on confirm. Card pops are spring-loaded. Confetti marks streaks and practice completion. The cutout and the word animate separately. Sources: 60fps.design and sspai.
- Every flashcard transition plays a recorded real-world sound (ADA citation).
- Haptics: no primary source found; unknown.

**Accessibility caveat.** The colored flashcards put white bold text on mid-tone fills, which fails WCAG. White on `#F3B061` is 1.88:1, on `#BA7EBB` 3.09:1, on `#8C7D6B` 3.99:1. Tapiro should not copy this.

## 5. What Tapiro can borrow without becoming cartoony

1. **Content-colored, chrome-neutral.** Keep a neutral canvas (`#F4F4F4` / white) and system-like controls. Let user content carry the color: listing photos, a category tint on cards. Only the tapir is drawn.
2. **The die-cut "sticker" as a reward object, not a UI style.** Use the white-border cutout plus a soft shadow for special moments only: a completed help request, a badge, the tapir appearing on a success screen. Use VisionKit subject lifting for listing photos if we want object cutouts. Do not apply sticker outlines to buttons or text.
3. **Calm day/collection cards.** A large continuous radius (32–38pt) and muted, desaturated tints with a serif date or heading give warmth without looking childish.
4. **Grain over illustration.** A subtle paper grain or dot grid on hero cards adds a tactile feel without cartoon art.
5. **Hide latency with a confirm step and a micro-animation.** This maps directly onto posting or AI steps in Tapiro.
6. **Recorded, physical sound and restrained motion.** Spring card pops; confetti reserved for real milestones such as a request resolved or a first helper. Make sound optional, and default to haptics in a mutual-help context.
7. **One mascot, one role.** Like Cappy in the conversation feature, the tapir appears in specific moments (empty states, onboarding, celebrations) and never as decoration on every screen.
8. **Avoid** the rainbow multi-color headline, emoji-heavy copy, and white text on mid-tone fills.

## 6. Accent color proposals (derived from CapWords hues)

Contrast follows the WCAG 2.x relative-luminance formula, computed in Python. Each ratio is for the button label on its fill.

| Accent | Derived from | Light fill | Light label | Ratio | Dark-mode fill (lighter) | Dark label | Ratio |
|---|---|---|---|---|---|---|---|
| A. Coral | traffic-cone / flashcard coral | `#C8462F` | `#FFFFFF` | 4.80:1 | `#FF8E73` | `#1F1412` | 8.03:1 |
| B. Lavender | confirm-check purple / lilac day card | `#6A55D0` | `#FFFFFF` | 5.49:1 | `#AFA2F6` | `#17142A` | 7.97:1 |
| C. Amber | hero yellow / orange card | `#F2C14E` | `#1F1A12` | 10.30:1 | `#FFD66E` | `#1F1A12` | 12.43:1 |

Extra (optional): sage `#5E6B3A` with white is 5.77:1; dark-mode sage `#BCC791` with `#171A10` is 9.83:1.

Notes:
- Coral and lavender reach 4.5:1 or better with white labels in light mode. Their dark-mode variants need dark labels.
- Amber needs a dark label in both modes.
- As text or icon color against the canvas, only coral (4.37:1 on `#F4F4F4`, just under 4.5) and lavender (4.99:1) come close. Amber (1.53:1) must not be used for text on light backgrounds.
- In dark mode on `#1C1C1E`, the lighter variants are readable as text: coral 7.59:1, lavender 7.55:1, amber 12.23:1.
