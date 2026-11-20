# Finch: Self-Care Pet design reference (internal, for Tapiro)

Collected 2026-10-04. This is reference material for learning only. Tapiro will not copy Finch's assets, characters, or layouts.

App: Finch: Self-Care Pet, App Store id1528595748. The seller is listed as "Finch Care Public Benefit Corporation". Version 3.73.220, US rating 4.95 from about 759k ratings, genres Health & Fitness / Lifestyle ([iTunes Lookup US](https://itunes.apple.com/lookup?id=1528595748&country=us)).

## 1. Sources

| Source | URL | What it gave |
|---|---|---|
| iTunes Lookup API (us / cn / jp) | https://itunes.apple.com/lookup?id=1528595748&country=us (also `country=cn`, `country=jp`) | 8 iPhone + 8 iPad screenshot URLs. All three storefronts return the **same** 8 iPhone URLs, so cn/jp were skipped as duplicates. Raw JSON is saved as `finch/lookup-{us,cn,jp}.json` |
| App Store page | https://apps.apple.com/us/app/finch-self-care-pet/id1528595748 | Listing |
| Official site | https://finchcare.com/ | Logo, mascot pose SVGs, OG image |
| Official site CSS (hashed Next.js chunks, so the names may change) | https://finchcare.com/_next/static/chunks/3503zpx4prvej.css and https://finchcare.com/_next/static/chunks/0bgpl98km3vvm.css | **"Nest" design tokens** (colors, type scale, radii, spacing) and the **Rubik** font files (Regular/Medium/Bold), plus Nanum Pen Script for handwriting |
| Official features page | https://finchcare.com/about-finch | Feature descriptions (adventures, energy, goals, reflections, customization, good vibes) |
| Help center | https://help.finchcare.com/hc/en-us/categories/37934152903309-Finch-Features | Feature docs (not deeply read) |
| ScreensDesign showcase | https://screensdesign.com/showcase/finch-self-care-pet | 7 onboarding/home/paywall screen recordings as stills, plus UX notes (hatching-first onboarding, large tappable cards, confetti rewards) |
| svgapp.ai mascot analysis | https://svgapp.ai/app-mascots/finch-birb/ | Analysis of the birb as a modular character system and reward loop (third-party, not official) |
| Pratt IxD critique (2026) | https://ixd.prattsi.org/2026/02/design-critique-finch-self-care-pet-ios-app/ | Consistent green bottom button in onboarding; Quests/Settings judged overcrowded |
| Pratt IxD critique (2024) | https://ixd.prattsi.org/2024/09/design-critique-finch-ios-app/ | Returned HTTP 404 at fetch time; the search snippet says it describes skeuomorphic design and a birb modeled on the zebra finch |
| Paste Magazine (2023-01-10, Dana Forsythe) | https://www.pastemagazine.com/tech/finch/finch-app-mental-health-virtual-pet-self-care | Founder quotes on philosophy ("make self-care fun and accessible"). No quotes about visual design |
| Threads user post | https://www.threads.com/@sarahesterman/post/DL04mMGS3KT/ | User asks for a dark mode because "the menus are so bright", which is evidence that there is no system dark mode |
| Mobbin screen (blocked) | https://mobbin.com/explore/screens/c23448ad-8352-480e-a283-b75872525307 | Returned HTTP 403 without login. Search results say it is filed under Onboarding / Selecting & Choosing / Setting Up. Nothing was downloaded |
| UX teardown (not read) | https://medium.com/@deepthi.aipm/ux-teardown-finch-self-care-app-18122357fae7 | Search snippet only |

**Not found:** no official press kit or brand page on finchcare.com (the homepage links only About, Guardians, FAQ, Careers, Contact). I found no Dribbble or Behance case study by Finch's own designers, and no published interview about the art style.

## 2. Image list (all in `design-research/finch/`)

### App Store iPhone screenshots
These were requested at 392x696bb. The CDN returns them at **321x696** because the source aspect ratio is about 1:2.17. Each is the `screenshotUrls` entry with the size segment replaced, for example `.../iPhone_social_large_01.jpg/392x696bb.jpg`.

| File | Source URL | Shows |
|---|---|---|
| finch-appstore-us-1.jpg | https://is1-ssl.mzstatic.com/image/thumb/PurpleSource211/v4/6f/a9/fe/6fa9feb6-41c9-7c26-0f5c-296558c9f0f1/iPhone_social_large_01.jpg/392x696bb.jpg | "Self-care is better together": two birbs hugging on grass/sky, with trophy and heart speech bubbles |
| finch-appstore-us-2.jpg | https://is1-ssl.mzstatic.com/image/thumb/PurpleSource221/v4/e8/ca/ee/e8caee25-4118-702c-c751-02a9ce6b8c66/iPhone_social_large_02.jpg/392x696bb.jpg | Goal Buddies: forest scene on top, white list card with emoji goals, and two check columns (purple = you, blue = buddy, green = done) |
| finch-appstore-us-3.jpg | https://is1-ssl.mzstatic.com/image/thumb/PurpleSource211/v4/be/a7/84/bea784ad-4c13-e5fd-2108-1dc9827e05d9/iPhone_social_large_03.jpg/392x696bb.jpg | Sending a "good vibe": pink themed sheet, speech bubble, circular sticker grid, white pill CTA |
| finch-appstore-us-4.jpg | https://is1-ssl.mzstatic.com/image/thumb/PurpleSource211/v4/01/f7/19/01f7194f-379f-5b81-bb5d-e05a30711938/iPhone_social_large_04.jpg/392x696bb.jpg | Adventure: birbs in a city scene, "Adventuring, back in 7:36" dotted progress card, goal list with energy cost (5 lightning) and check buttons |
| finch-appstore-us-5.jpg | https://is1-ssl.mzstatic.com/image/thumb/PurpleSource211/v4/79/1d/c2/791dc207-24ec-5d17-ae7f-2faafaf7bdbc/iPhone_social_large_05.jpg/392x696bb.jpg | Celebration bottom sheet over a confetti scene: "You & Sam are now Goal Buddies!", split YOU/SAM tiles, purple CTA |
| finch-appstore-us-6.jpg | https://is1-ssl.mzstatic.com/image/thumb/PurpleSource221/v4/bf/c4/59/bfc45963-b7a0-97e2-39c1-da95a3059a3c/iPhone_social_large_06.jpg/392x696bb.jpg | "My Self-Care Progress": birb watering a heart flower in a cloud header, then plain white area rows with colored circular icons and mini bar sparklines, plus a dashed "Start a new area" row |
| finch-appstore-us-7.jpg | https://is1-ssl.mzstatic.com/image/thumb/PurpleSource211/v4/41/4e/5b/414e5b53-e6b8-588d-3894-a311fe1c89e3/iPhone_social_large_07.jpg/392x696bb.jpg | 30-day streak celebration: saturated blue, sunburst behind the birb, confetti, huge numeral, M–S week strip |
| finch-appstore-us-8.jpg | https://is1-ssl.mzstatic.com/image/thumb/PurpleSource221/v4/ab/3c/4c/ab3c4cbf-089a-f52e-759c-b7fb618465fd/iPhone_social_large_08.jpg/392x696bb.jpg | Social proof collage of birbs in circular cloud frames |

iPad screenshots exist (8, `ipad_social_01..08.jpg`, listed in `lookup-us.json`). They were not downloaded.

### Additional images (10)

| File | Source URL | Shows |
|---|---|---|
| finch-onboarding-choose-egg.webp | https://media.screensdesign.com/avs-pp/2744013022554124a217fcdd4f3d8163.webp (via https://screensdesign.com/showcase/finch-self-care-pet) | White screen, bold title, 6 colored eggs around the baby birb, selected egg on a soft gray rounded tile, full-width green CTA with a darker bottom "lip" |
| finch-onboarding-pronouns-selected-card.webp | https://media.screensdesign.com/avs-pp/75beb1441a7647ee9aa00b1d39692064.webp | "You hatched a birb!" Option cards with a thin border. The selected card gets a pink border, a filled heart, and a check circle |
| finch-onboarding-question-progress.webp | https://media.screensdesign.com/avs-pp/c41e4e24f82342c7b6fbd94cf49810b6.webp | Back chevron in a gray circle, thin green progress bar, small birb, emoji + label answer cards |
| finch-onboarding-generating-goals.webp | https://media.screensdesign.com/avs-pp/955e7e0669224620b1a369f83289c39a.webp | Loading state: green ring progress around the floating birb, "Generating your self-care goals with Piper…" |
| finch-paywall-offer.webp | https://media.screensdesign.com/avs-pp/277aa2fb463340a2b43f35a161313ba1.webp | Paywall: white background, orange highlighted discount text, birb with sunglasses and popsicle, green CTA |
| finch-home-goals-tabbar.webp | https://media.screensdesign.com/avs-pp/3f12623536b34261b1a04ff06163ed24.webp | **Home**: forest scene, translucent green energy card ("1st Adventure 0/15"), white goal cards with emoji tiles and gray 3D check buttons. The tab bar has 6 illustrated icons (Home, Quests, Shop, Friends, Bag, pet) and the selected tab sits in a lighter rounded square |
| finch-energy-max-celebration.webp | https://media.screensdesign.com/avs-pp/b2c3e088f2e04190a4c94eb5e0db37de.webp | Energy MAX celebration: yellow bar with a glowing bolt, "Woohoo!", rainbow stones flying to a counter, confetti, white "Continue" CTA |
| finch-site-invite-link-preview.png | https://finchcare.com/invite_link_preview.png | Official OG image (1200x630): three birbs in close-up in front of trees, hills, clouds |
| finch-site-pose-productivity-checklist.svg | https://finchcare.com/static-bird-poses/productivity-checklist.svg | Official vector pose: birb with pencil and checklist |
| finch-site-pose-curious-head-tilt.svg | https://finchcare.com/static-bird-poses/curious-head-tilt-question.svg | Official vector pose: head tilt with a "?" (a good model for empty/unknown states) |

The site has 10 more poses under `/static-bird-poses/` that were not downloaded: calm-balance-over-water, calm-reading-book-beanbag, connection-together-pose, excited-wings-together-noeffect, gratitude-sun-relax, happy-jump-one-leg, hearts-open-arms, peek-big-heart, self-kindness-hug-egg, watering-heart-flower ([finchcare.com/about-finch](https://finchcare.com/about-finch) HTML).

## 3. Design analysis

### Palette

**Official web tokens** come from the site CSS (`--nest-*`, [CSS](https://finchcare.com/_next/static/chunks/3503zpx4prvej.css)). They are exact, but they belong to the website and may differ from the app:

| Token | Hex |
|---|---|
| text-primary | #313131 |
| text-secondary | #66757F |
| surface-base / surface-high | #FFFFFF / #F8F8F8 |
| border-regular | #F0F0F0 |
| yellow surface-primary / shadow | #FFC954 / #F1B712 |
| blue / green / pink / yellow tints | #EBF3F9 / #EAF6EA / #FCF4F8 / #FFF8E8 |
| greens used for site buttons | #169B43, #0AA46C, bottom shadow #087B35 |

**Approximate app colors** were sampled from the JPEG/WebP screenshots, so compression shifts them a few units:

| Role | Approx hex | Where |
|---|---|---|
| Primary CTA green | ~#57B755 (lip ~#41993E) | onboarding "Hatch egg" / "Next" |
| Grass / scene green | ~#569E54 to #7EB65C | home scene, store art |
| Sky blue (scene and store background) | ~#A2DEFE | everywhere in store shots |
| Store headline navy | ~#174A8A | App Store captions |
| Purple CTA / "you" check | ~#9978EB / ~#6C58AD | Goal Buddies |
| Blue check / streak blue | ~#1A8EC9 / ~#0E9BE2 | buddy check, streak screen |
| Pink theme | ~#E56BA9, selection ~#E483B4 | vibes, pronoun selection |
| Energy yellow | ~#FFC11E | MAX bar |
| Neutral surfaces | ~#FDFDFD cards, ~#F1EFF2 to #F3F4F5 tiles and check buttons | onboarding, home |
| Title text | ~#333033 (matches token #313131) | onboarding |

**Mascot fills** come from the official SVG and are exact: body #BFC2D0 / #9699A3, belly #F0CEA9, feet and cheeks #E0634A, beak #FBDD00, eyes #332F35.

Pattern: the UI chrome is near-white with neutral grays. Saturated color shows up in four places only: the CTA, the selection state, the scene illustration, and full-bleed celebration screens. Each feature gets a hue (green = goals/primary, purple = you/buddy, pink = vibes, blue = streak, yellow = energy).

### Typography
- The website loads **Rubik** Regular/Medium/Bold and **Nanum Pen Script** (`--nest-handwriting: 26px`) ([CSS](https://finchcare.com/_next/static/chunks/0bgpl98km3vvm.css)).
- The app's headlines (onboarding titles, store captions) look like the same family: a rounded geometric sans in heavy weights. No source confirms that the app ships Rubik. Treat that as visual inference.
- Web type scale: display 32/28, heading 24/20, body 18/16/14/12, heading line-height 1.2, label tracking 0.8px. The uppercase spaced labels appear in-app as "START THE DAY", "DAY STREAK", "YOU/SAM".
- Titles are bold and centered in onboarding. List text is semibold and dark. Secondary text is gray.

### Shape: corner radii, cards, buttons
- Web tokens: `--nest-radius-button: 12px`, `--nest-radius-card: 24px`, `--nest-radius-large: 36px`.
- The app looks consistent with this. Goal and answer cards are about 16–20pt radius, white, with a hairline border (#F0F0F0-like) or a very soft shadow. Emoji sit in rounded-square gray tiles. Icons on the progress screen sit in colored circles.
- **Buttons are "pressable 3D"**: a flat fill plus a solid darker bottom edge. The site CSS has `box-shadow: 0 4px 0 #F1B712` and `0 3px #087B35`, and in-app the green CTA has a ~#41993E lip and the check buttons have gray lips. CTAs are full width with a 12–14pt radius, bold white label, and sit pinned at the bottom.
- Selection state is a colored 1.5–2pt border, a tinted icon, and a check circle on the right. It never fills the whole card.

### Mascot vs plain UI
- **Plain-UI screens** (onboarding questions, pronoun choice, paywall, settings) use a white background. The birb is a single small-to-medium figure (about 25–35% of width) above the title, with a soft ellipse ground shadow and no background scene. This is the closest model for Tapiro.
- **Scene screens** (Home, Goal Buddies, adventure) put a flat-vector landscape (sky, hills, pines, sun) in the top ~40% with the birb standing in it. The functional list floats below on white cards. The tab bar and the energy card take the scene's green hue (a translucent darker green).
- **Celebration screens** take over the whole screen in a single saturated color (blue streak, green energy) or use a bottom sheet over a confetti scene.
- The birb also speaks through white speech bubbles in first person: "Nourish what matters to you, cheep!"
- Mascot style: flat vector, no outlines, round blob body, oval black eyes, blush cheeks, tiny beak, two-tone body. It is drawn as a modular system so colors, clothes, and rooms can be customized ([svgapp.ai](https://svgapp.ai/app-mascots/finch-birb/), [about-finch](https://finchcare.com/about-finch)).

### Tab bar
- There are six tabs with **full-color illustrated icons** rather than SF Symbols: Home, Quests, Shop, Friends, Bag, and the pet's name/face. Labels sit below the icons and a red badge dot marks new items.
- The selected tab gets a lighter rounded-square highlight with a white label.
- The bar is tinted to match the scene (green on Home). This is the most "gamey" element and the opposite of what Tapiro wants.

### Illustration backgrounds
- Scenes are flat vector with 2–3 shade layers, no texture, and soft clouds. The sky is light cyan and the grass is mid green. A city skyline appears for adventures. The site OG image shows the same language ([invite_link_preview.png](https://finchcare.com/invite_link_preview.png)).

### Light and dark
- The app appears to be light-only. A user publicly asked for a dark mode because "the menus are so bright" and works around it with a dark-colored birb house ([Threads](https://www.threads.com/@sarahesterman/post/DL04mMGS3KT/)). Night is expressed through the scene, not the UI chrome.

### Motion and celebration
- Celebrations use confetti bursts, sunbursts/rays behind the birb, a giant numeral ("30 DAY STREAK"), a bar filling to "MAX" with a glowing bolt, and currency icons (rainbow stones) flying to a counter. The copy is exclamatory ("Woohoo!", "WOW!") (screenshots above; ScreensDesign mentions "playful microinteractions" and confetti rewards, [screensdesign](https://screensdesign.com/showcase/finch-self-care-pet)).
- **Delayed gratification**: goals add energy, the birb leaves on a timed adventure ("back in 7:36"), and it returns with a story ([about-finch](https://finchcare.com/about-finch)).
- Onboarding begins by hatching an egg, not with a feature tour ([screensdesign](https://screensdesign.com/showcase/finch-self-care-pet)). Loading is a ring progress around the floating mascot.
- Third-party analysis describes idle animations (head tilt, blinking, preening) that make the birb feel alive, and an explicit avoidance of guilt mechanics ([svgapp.ai](https://svgapp.ai/app-mascots/finch-birb/)).

### Accessibility note
Finch's own green CTA (~#57B755) with white text measures **2.53:1**, purple ~#9978EB measures 3.37:1, and blue ~#1A8EC9 measures 3.65:1. All fail WCAG AA for normal text, and the green also fails the 3:1 large-text threshold. Tapiro should darken accents for text-bearing fills (see §5).

## 4. What Tapiro can borrow (non-cartoony UI, cartoony mascot only)

**Borrow:**
1. **The white-chrome plus mascot vignette pattern** from Finch's onboarding and paywall: a plain white or near-white background, one mascot figure with a ground shadow above a bold centered title, and a pinned full-width CTA. The mascot carries the warmth so the UI doesn't need to.
2. **Neutral token structure** like Nest: text #313131-ish, secondary gray-blue, surface #FFF / #F8F8F8, hairline border #F0F0F0, plus per-feature *tint* surfaces (very light hue backgrounds) instead of saturated panels.
3. **Radii scale**: 12 (buttons) / 24 (cards) / 36 (sheets). This is soft but not bubbly. Pair it with SF Pro or a restrained rounded sans rather than a display-rounded face.
4. **Selection grammar**: border color + check circle + tinted icon on an otherwise white card.
5. **Emoji/icon in a rounded tile** on list rows. Use monochrome SF Symbols or simple duotone glyphs instead of illustrated emoji to keep it grown-up.
6. **First-person mascot microcopy in a speech bubble**, used sparingly (empty states, celebrations, onboarding), never in dense UI.
7. **Pose library**: Finch keeps a named set of static poses (curious head tilt, checklist, hug, peek-heart, etc.). Build a Tapiro mascot pose set mapped to states: empty, loading, success, error, paywall.
8. **Celebration as a moment**: a brief full-screen or bottom-sheet takeover with mascot, number, and subtle confetti, then return to calm UI. Keep the confetti palette limited to the accent family.
9. **Loading ring around the mascot** as a branded progress indicator.

**Avoid / tone down:**
- Illustrated multicolor tab bar icons and scene-tinted tab bars. Use the system tab bar with SF Symbols.
- Full-bleed landscape headers on every primary screen. If Tapiro uses a scene at all, confine it to the mascot's own space.
- Chunky 3D "lip" buttons everywhere. Optional: a 1–2pt darker bottom edge only on the single primary CTA, or none.
- A different saturated hue per feature. Pick one accent and use semantic colors (success/warning) only for meaning.
- Light-only design. Tapiro should ship a real dark mode (Finch users ask for it).
- Low-contrast white-on-pastel CTAs.

## 5. Accent palette suggestions (derived from Finch hues, darkened for AA)

Contrast was computed with the WCAG 2.x relative-luminance formula. Dark-mode surface reference is #1C1C1E, a typical iOS dark surface. Verify it against the final Tapiro tokens.

| Option | Light-mode accent | White text on accent | Dark-mode variant | Variant on #1C1C1E | Label on dark variant |
|---|---|---|---|---|---|
| A. Sprout green (from CTA ~#57B755) | **#2E7D32** | **5.13:1** | **#7FD07E** | 9.10:1 | use #111111 text: 10.09:1 (white would be 1.87:1) |
| B. Lavender (from ~#9978EB / ~#6C58AD) | **#6248C8** | **6.40:1** | **#B4A0F5** | 7.52:1 | #111111 text: 8.35:1 (white 2.26:1) |
| C. Sky blue (from ~#1A8EC9 / navy ~#174A8A) | **#1D6AA8** | **5.71:1** | **#7CC4F2** | 8.94:1 | #111111 text: 9.92:1 (white 1.90:1) |

Notes:
- The lighter dark-mode variants are meant for tint, text, icons, and button fills **with dark labels**. They cannot carry white text at 4.5:1. If the design requires white labels on dark-mode buttons, keep the light-mode accent for fills (A 5.13, B 6.40, C 5.71 with white).
- For comparison, Finch's own hues with white text: #57B755 2.53, #9978EB 3.37, #1A8EC9 3.65. All fail AA.
- Recommendation: **B (lavender)** if Tapiro wants the calmest, least "gamey" feel with a cartoony mascot. **A** if growth/habit is the core metaphor. **A** is also closest to Finch, so the brand is more likely to be read as derivative.
- Neutrals to pair: text #313131 (13.0:1 on white), secondary #66757F (4.76:1 on white, 4.48:1 on #F8F8F8, so it is borderline on gray surfaces and should be darkened slightly there).
