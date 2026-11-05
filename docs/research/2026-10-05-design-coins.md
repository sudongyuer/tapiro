# 貘币 (Tapir coin) design references

Internal reference board, collected 2026-10-05. Images live in `design-research/coins/` (41 files). All third-party IP (Nintendo, HoYoverse, Niantic, Devsisters, Royal Mint, RAM, BNM, and others) is for internal mood reference only. Do not ship it or trace it.

Download notes: Dribbble and Behance block scripted access with bot challenges, so 3D and animation references come from Sketchfab, LottieFiles, Rive Community, icons8 and Microsoft Fluent Emoji instead. Fandom images were fetched through the `wsrv.nl` image proxy because `static.wikia.nocookie.net` returns a Cloudflare 403. Commons has no 2011-series Malaysian coin photos (copyright), so those come from a blog photo of the circulating coins.

Tapiro constraints the notes check against: native iOS UI, the mascot is the only cartoon element, ink `#25232B`, cream `#F3EFE6`, die-cut sticker moments, and no yellow-dominated brand color (the coin itself may be gold).

---

## 1. 3D glossy / rendered coins (6)

| File | Source page | Credit | Note |
|---|---|---|---|
| `3d-fluentemoji-coin-1.png` | https://github.com/microsoft/fluentui-emoji/tree/main/assets/Coin (img: `raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Coin/3D/coin_3d.png`) | Microsoft Fluent Emoji (MIT) | Soft "clay" 3D: thick rounded rim, recessed face, the emblem raised one step. Low specular, warm orange-gold. |
| `3d-icons8-fluency-coin-2.png` | https://icons8.com/icons/set/coin--style-3d-fluency (img: `img.icons8.com/3d-fluency/512/coin.png`) | icons8 3D Fluency | Blank coin: a pale butter-gold face with a fat rounded rim and a soft top-left highlight. Reads as friendly, not bling. |
| `3d-sketchfab-stylized-coin-6.jpg` | https://sketchfab.com/3d-models/8cd6f95c44994ed5944a42892d0ffc10 | BarracudaByte | Game-stylized: saturated gold, raised star in a recessed well, bevelled rim, strong rim light on a dark background. |
| `3d-sketchfab-pirate-coin-5.jpg` | https://sketchfab.com/3d-models/9135d081eaa74842a121fc3c81291aa3 | Dave Nieves | Hand-painted PBR: a dark enamel inner disc with a raised emblem and a worn bronze rim. The ink-centre plus metal-ring layout maps well to `#25232B`. |
| `3d-sketchfab-fantasy-coins-7.jpg` | https://sketchfab.com/3d-models/71a3526b3403419f97717865afb27a41 | Kigha | Realistic gold, silver and copper set with fine relief and reeded edges. Shows a tier system by metal. |
| `3d-commons-chocolate-foil-coins-8.jpg` | https://commons.wikimedia.org/wiki/File:Chocolate-Gold-Coins.jpg | Evan-Amos (CC0) | Foil-wrapped chocolate coins: soft crinkled emboss and a slightly squishy edge. A warm, edible "treat" feel. |

**What makes it premium:** a thick rounded rim (about 12–15% of the radius) that catches one clean highlight arc; a recessed field with a raised emblem (two depth steps at most); a single warm key light plus a cool rim light; restrained specular (Fluent and icons8) rather than a full chrome sweep.
**Small size (16–24pt):** Fluent and icons8 hold up at small sizes because the silhouette is a rim ring plus one mark. Sketchfab-style renders turn to mud below 32pt and would need a separate flat glyph.
**Fit with Tapiro:** good as a hero or reward render (wallet header, purchase sheet). The soft clay/Fluent material sits next to native iOS UI better than hyper-real gold. Pair it with a flat glyph for inline amounts.

## 2. Game currencies with character (8)

| File | Source page | Credit | Note |
|---|---|---|---|
| `game-mario-3d-coin-1.png` | https://www.mariowiki.com/File:Coin_3D_Artwork_2.png | Nintendo (via Super Mario Wiki) | The canonical icon: a slot mark in a recessed field and a wide flat rim. Pure, saturated yellow-gold. |
| `game-mario-sm3dw-coin-2.png` | https://www.mariowiki.com/File:Coin_Artwork_-_Super_Mario_3D_World.png | Nintendo | Same coin in 3/4 view: thick edge, sharp specular sparkle. Shows how a coin reads when it spins. |
| `game-genshin-mora-2.png` | https://genshin-impact.fandom.com/wiki/File:Item_Mora.png | HoYoverse | Engraved line emblem (triquetra-like star) on pale champagne gold with a soft glow halo. Elegant rather than cute. |
| `game-genshin-primogem-1.png` | https://genshin-impact.fandom.com/wiki/File:Item_Primogem.png | HoYoverse | Premium currency as a gem, not a coin: a 4-point crystal with iridescent pastel facets. Useful for a second, rarer currency. |
| `game-pokemongo-pokecoin-1.png` | https://pokemongo.fandom.com/wiki/File:PokeCoin.png | Niantic / The Pokémon Company | **Key ref:** the mascot silhouette (Pikachu) in a lighter gold intaglio, cropped by the inner rim, with a reeded outer edge. Mascot plus coin without becoming a cartoon. |
| `game-acnh-nookmiles-1.png` | https://animalcrossing.fandom.com/wiki/File:NH-Icon-Nook_Miles.png | Nintendo | A ticket or card, not a coin. Flat colour, a thick dark outline and a simple glyph on a rounded-rect card, with a chunky, sticker-like silhouette. |
| `game-acnh-bellbag-2.png` | https://animalcrossing.fandom.com/wiki/File:NH-large_bag_of_bells-icon.png | Nintendo | A bag of currency rather than a coin: brown outline, cream fill, star mark. The palette is close to Tapiro's cream and ink. |
| `game-fallguys-kudos-3.png` | https://fallguysultimateknockout.fandom.com/wiki/File:FG_Pre-Registration_Kudos.png | Mediatonic / Epic | Non-gold currency: a magenta chunky 3D coin with a "K" monogram. Proves a coin reads as currency through rim and stack alone, without gold. |

**What makes it premium:** one simple emblem (slot, star, silhouette, monogram) carried consistently from icon to 3D; a halo or glow only on rare currencies; a separate shape (gem) for the premium tier.
**Small size:** the Mario coin and PokéCoin are the benchmarks. A slot or a single silhouette stays legible at 16pt; the Mora's fine engraving does not.
**Fit:** PokéCoin is the closest model: mascot silhouette as intaglio, no face details. ACNH shows cream and dark-brown outline currency that already sits near Tapiro's palette.

## 3. Mascot / emblem embossed coins (5)

| File | Source page | Credit | Note |
|---|---|---|---|
| `mascot-mario-wonder-flowercoin-1.png` | https://www.mariowiki.com/File:SMBW_flower_coin.png | Nintendo | The coin shape itself is the emblem (a 4-lobed flower in glossy magenta). Suggests a tapir-head-shaped special coin. |
| `mascot-cookierun-coin-4.png` | https://cookierun.fandom.com/wiki/File:Coin.png | Devsisters | The mascot's full-body silhouette (gingerbread) debossed in a silver coin with a dark outline ring. Simple and readable small. |
| `mascot-cookierun-hellokitty-coin-5.png` | https://cookierun.fandom.com/wiki/File:Icon_hello_kitty_coin.png | Devsisters × Sanrio | Collab coin: the character face as a raised head shape with a bow, four rivet dots on the rim, black outline, pink. Shows how a face reads at about 40px. |
| `mascot-royalmint-peterrabbit-2019-7.jpg` | https://www.royalmint.com/collect/archive/2019/peter-rabbit-2019-uk-50p-silver-proof-coin/ | The Royal Mint, design by Emma Noble | **Key ref:** a real heptagonal 50p in silver proof with a colour-printed illustrated character and engraved serif lettering on the rim. The metal stays dignified while the character carries the charm. |
| `mascot-ramint-bluey-dollarbucks-9.png` | https://www.ramint.gov.au/collect/national-coin-collection/corporate-partnerships/australia-post-programs/bluey-dollarbucks | Royal Australian Mint | A cartoon dog rendered in pure relief (no colour) on aluminium-bronze, with playful curved lettering. Shows a cartoon translating to frosted relief on a mirror field. |

**What makes it premium:** frosted relief on a mirror field (the proof finish), legend text running around the rim, and the character drawn by the original illustrator, not re-cartooned. The colour-printed version uses colour only on the character.
**Small size:** full-body characters die below 32pt. Only a head silhouette (Cookie Run, Hello Kitty) survives at 16–24pt.
**Fit:** strongest family for 貘币. A tapir head silhouette, or the black-head / cream-saddle split, works as the emblem. Tapir colouring is two-tone by nature, so it needs no extra colour: a black-patina head on a cream or gold field.

## 4. Real-world / heritage coins (6)

| File | Source page | Credit | Note |
|---|---|---|---|
| `heritage-my-50sen-2.jpg` | https://lunaticg.blogspot.com/2011/10/malaysia-3rd-series-coins.html | Bank Negara Malaysia 3rd series (2011, issued 2012), photo by lunaticg blog | 50 sen: obverse hibiscus with a large italic "50"; reverse sulur kacang (bean tendril) motif with a latent-image denomination; 14 dots and 5 lines on the rim. |
| `heritage-my-20sen-3.jpg` | same | BNM / lunaticg | 20 sen: bunga melur (jasmine) over a destar siga cloth pattern. Pale brass gold with very shallow, refined relief. |
| `heritage-cn-kaiyuan-tongbao-4.jpg` | https://commons.wikimedia.org/wiki/File:Xing_Huichang_Kaiyuan_Tongbao_-_Scott_Semans.jpg | Scott Semans (Commons) | Tang 开元通宝: a square hole (方孔), raised square rim around the hole plus a raised outer rim, four characters. Green-bronze patina. |
| `heritage-cn-qianlong-tongbao-5.jpg` | https://commons.wikimedia.org/wiki/File:Qianlong_Tongbao_(Pavel_Rybin)_obverse_jpg.jpg | Pavel Rybin (Commons) | Qing 乾隆通宝: a cleaner brass example. The double-rim (outer plus inner square) system is the signature. |
| `heritage-jp-5yen-6.png` | https://commons.wikimedia.org/wiki/File:5_Yen_Heisei.png | Commons | 5 yen: a centre hole with a gear ring, rice stalk and water lines, and a 五円 block. Shows that a holed coin can be modern and graphic. |
| `heritage-cn-lucky-coins-redstring-8.jpg` | https://www.flickr.com/photos/25056484@N00/218495576 | Vanessa Pike-Russell (CC BY-NC-ND) | Lucky charm coins (花钱 / feng-shui) with zodiac animals, bagua octagons and red string. The animal-on-a-holed-coin precedent. |

**What makes it premium:** shallow relief with crisp edges, a double rim (outer plus the hole's inner rim), latent or tilt effects (the 50 sen), and natural patina or brass rather than bright yellow gold.
**Small size:** the square hole is the strongest silhouette in this whole board. At 16pt a ring with a square hole reads as "coin" in any colour, with no detail needed.
**Fit:** the 方孔 can carry the tapir face. The square hole can sit where the cream saddle meets the black head, or the four characters can become 貘 + three marks. A Malaysian floral rim (sulur kacang curls) is a subtle local nod that does not make the coin cartoon.

## 5. Sticker / die-cut / outline and pixel coins (7)

| File | Source page | Credit | Note |
|---|---|---|---|
| `sticker-rawpixel-goldcoins-1.webp` | https://www.rawpixel.com/image/6478687/vector-sticker-public-domain-golden | rawpixel (CC0) | Hand-inked heavy black outline with flat gold and a hard offset shadow. Shows how the ink `#25232B` outline works. |
| `sticker-rawpixel-stackedcoins-2.webp` | https://www.rawpixel.com/image/6431566/vector-sticker-public-domain-golden | rawpixel (CC0) | Same style as stacks: a playful wobble line with a deliberately imperfect ink line. |
| `sticker-flickr-enamelled-pound-3.jpg` | https://www.flickr.com/photos/25220653@N06/49832201258 | wowcoin (CC BY-NC-SA) | A real £1 with hard-enamel fill (navy field, gold lion, green wreath). Enamel fill is a path to an ink-coloured field on a metal rim. |
| `sticker-adafruit-bitcoin-diecut-4.jpg` | https://www.flickr.com/photos/35434449@N08/24915030977 | adafruit (CC BY-NC-SA) | A physical die-cut coin sticker: a flat gold disc with a white kiss-cut border. Literal "sticker coin" reference. |
| `mascot-cookierun-season8-commemorative-6.png` | https://cookierun.fandom.com/wiki/File:Currency_season_8_commemorative_coin.png | Devsisters | Bottle-cap scalloped edge with a thick black outline and a tilted, sticker-like pose. A playful scalloped rim. |
| `pixel-smb-coin-1.png` | https://commons.wikimedia.org/wiki/File:Super_Mario_Bros._coin_edited.svg | Nintendo sprite (SVG redraw on Commons) | The 1985 NES coin: a 4-colour pixel oval with a slot. The minimum viable coin. |
| `pixel-oga-animated-coins-gold-2.png` | https://opengameart.org/content/animated-coins | OpenGameArt (upscaled 4× nearest) | 8-frame pixel spin sheet with a drop shadow. Shows the spin decomposition at low resolution. |

**What makes it premium:** for stickers, the quality is in the white border (consistent offset of about 6–8% of the radius, rounded joins), a subtle paper shadow and a slight tilt. For enamel, it is the crisp metal cloisons between colour fields.
**Small size:** outline styles are the most legible at 16–24pt, because the ink outline gives contrast on both light and dark backgrounds.
**Fit:** perfect for Tapiro's die-cut sticker moments (rewards, achievements, empty states). Pixel is off-brand except possibly as an Easter egg.

## 6. Animation references (9)

| File | Source page | Image URL | Credit | Note |
|---|---|---|---|---|
| `anim-lottie-rupee-coin-flip-bhadani-1.gif` | https://lottiefiles.com/free-animation/rupee-coin-pFvKkxa1dm | assets-v2.lottiefiles.com/a/aec8c628-…/uadICoB3dA.gif | Shresth Bhadani | Flat coin: idle → squash flip → diagonal glint sweep with sparkle stars. A clean, cheap-to-build vector loop. |
| `anim-lottie-3d-coin-toss-korolkov-2.gif` | https://lottiefiles.com/free-animation/3d-coin-flip-UKKErcMHOW | …/52bb8aca-…/f9m3IhPVby.gif | Dmytro Korolkov | Faux-3D toss: speed lines on rise, edge thickness grows as it turns, glint at the apex, tilts on landing. |
| `anim-lottie-coin-chest-burst-qrious-3.gif` | https://lottiefiles.com/free-animation/dollar-coins-chest-6cYHhoWk1z | …/fb082198-…/iqN5etDBcz.gif | Qrious Studio | Chest bounces, lid pops, coins burst and settle with twinkles. A reward-reveal beat. |
| `anim-lottie-star-coin-glint-muhammadali-5.gif` | https://lottiefiles.com/free-animation/gold-coin-5Spp5kJbLP | …/48ef1eec-…/8lHVsa1H2l.gif | Muhammad Ali | Y-axis spin (front → edge → front) followed by a highlight band sweep. A standard idle loop. |
| `anim-lottie-coin-fountain-6.gif` | https://lottiefiles.com/free-animation/coins-animation-d9ZT3GN5f8 | …/62f6573c-…/mSyc35l85s.gif | kucağımda harddiskler (LottieFiles user) | A coin spurt or fountain: a stream of small coins arcing up. Coin-rain particle reference. |
| `anim-lottie-coin-jar-deposit-febrianto-7.gif` | https://lottiefiles.com/free-animation/saving-the-money-C9plsMchxQ | …/ede0bbea-…/y8buihiXFN.gif | Bayu Febrianto | A hand drops a coin into a jar, the jar wobbles, and the coin settles. A "collect into balance" metaphor. |
| `anim-oga-starcoin-rotate-frames-8.png` | https://opengameart.org/content/coin-animation | opengameart.org/sites/default/files/star%20coin%20all%20rotate.png | OpenGameArt contributor | 6 key poses of a coin turn (front, 3/4, edge, back). A spin keyframe sheet; downscaled. |
| `anim-rive-cleancoin-mogerross-12.png` | https://rive.app/community/files/1198-2314-cleancoin-coin-animation-click-trigger/ | public.rive.app/community/video-thumbnails/1198-2314-….png | Moger.ross | Rive state machine with a click trigger. Mint-green coin, acorn emblem, dark ink outline, sparkle burst. **Closest in tone to Tapiro** (non-gold, ink-outlined, interactive). |
| `anim-rive-coin-flip-abdussalampopsy-10.png` | https://rive.app/community/files/16750-31501-coin-flip-animation/ | public.rive.app/community/video-thumbnails/16750-31501-…-watermark.png | abdussalampopsy | Faux-3D flip in Rive: gold rim, red enamel field, raised star. |

Other animation pages noted but not downloaded:
- https://rive.app/community/files/15586-29408-spinning-coin-3d/ (sankalp95): seamless spin plus float bob.
- https://rive.app/marketplace/22045-41341-coins-animation/ (annaglukhikh)
- https://rive.app/community/files/2090-4153-coin-switch/ (Shirley): a trim-path coin toggle.
- https://lottiefiles.com/free-animations/coin: the full LottieFiles coin index.

**What makes it feel premium:**
- **Anticipation:** a squash before the toss.
- **Rim thickness on the edge-on frame:** never let the coin collapse to a line. Mario and Korolkov keep a visible edge.
- **One glint sweep, not continuous sparkle.**
- **Overshoot and settle on landing.**
- **Haptic sync:** on iOS, use a light impact per coin landing and success on the total.
- **Count-up of the balance number:** this is where most of the reward feeling comes from.

---

## Five candidate directions for 貘币

### A. 貘纹金 "Mint Proof" (recommended hero direction)
- **Refs:** PokéCoin, Peter Rabbit proof 50p, Bluey dollarbuck, Fluent coin material.
- **Material:** soft-clay 3D gold (Fluent and icons8 softness), a frosted relief on a mirror field for the emblem.
- **Colour:** warm champagne gold (≈`#E9C77B` to `#C9973F`); emblem in a deeper antique gold; no pure yellow. In dark mode the rim picks up a cream `#F3EFE6` highlight.
- **Emblem / mascot:** the tapir head in profile as a frosted intaglio. The black head is a darker gold tone and the saddle a lighter frosted area, so the colour split comes from finish, not paint.
- **Rim:** thick rounded rim with fine reeding at hero sizes only.
- **Small size:** at ≤24pt, swap to a flat 2-tone glyph: a gold disc, an ink tapir-head silhouette, and a 1px darker rim ring.
- **Signature animation:** "tapir nod". On collect, the coin flips once on Y, and as the emblem faces front, the tapir head does a tiny nod (a 2-frame emboss shift) while a single glint sweeps. Light haptic, then the balance counts up.

### B. 方孔貘 "Heritage Cash"
- **Refs:** Kaiyuan and Qianlong tongbao, 5 yen, lucky charm coins, Malaysian 50 sen sulur kacang.
- **Material:** brushed brass or aged bronze, shallow crisp relief.
- **Colour:** brass `#C8A86A` with an ink `#25232B` patina in the recesses. An optional red-string accent appears only in festive moments.
- **Emblem / mascot:** a square hole in the centre framed as the tapir's cream saddle window, with the tapir head and legs wrapping around the hole in relief. Alternatively, 貘 plus three small marks in the four positions.
- **Rim:** a double rim (outer rim plus the square inner rim); optional sulur-kacang curl band for a Malaysian nod.
- **Small size:** excellent. A ring with a square hole reads at 16pt with zero detail and is distinctive in any App Store screenshot.
- **Signature animation:** "string drop". Coins slide onto a red string through the square hole and stack with a clack. A coin spins on its edge like a real cash coin and wobbles down (Euler's disk settle).

### C. 贴纸貘币 "Die-cut Sticker Coin"
- **Refs:** rawpixel ink coins, adafruit die-cut sticker, Cookie Run S8 scalloped coin, Rive CleanCoin.
- **Material:** flat print; gold as two flat tones with one hard highlight; paper white border.
- **Colour:** flat gold `#E3B85C` and `#B98A35`, ink `#25232B` outline at about 6% stroke, white `#FFFFFF` kiss-cut border, soft paper shadow.
- **Emblem / mascot:** the full cartoon tapir face (eyes allowed). This is the mascot's own world, so cartoon is permitted here.
- **Rim:** an ink outline with an inner ring; optional scalloped bottle-cap edge for special or limited coins.
- **Small size:** very good, because the outline gives contrast on any background. Drop the white border below 24pt.
- **Signature animation:** "peel and slap". The sticker peels off a backing (a corner curl), flies to the balance pill and slaps down with a squash, a paper rustle and a light haptic. Best for rewards and achievement moments, matching Tapiro's die-cut moments.

### D. 墨奶双色 "Ink & Cream Enamel" (on-brand, least gold)
- **Refs:** enamelled £1 pin, Hello Kitty Cookie Run coin, Fall Guys Kudos (non-gold currency), Rive CleanCoin.
- **Material:** hard enamel in a thin gold cloisonné rim, like a pin badge.
- **Colour:** ink `#25232B` enamel field, cream `#F3EFE6` tapir saddle, gold only on the rim and cloison lines.
- **Emblem / mascot:** the tapir's own two-tone body is the design. The coin face is split like the tapir: an ink top half and a cream "saddle" band, with a tiny gold tapir eye or ear line.
- **Rim:** a thin polished gold rim with 4 small rivet dots (a Hello Kitty coin nod).
- **Small size:** strong. The ink-and-cream split reads at 16pt and matches the brand UI in both light and dark mode.
- **Signature animation:** "enamel shine". A slow diagonal light sweep across the glossy enamel, and on collect the cream band fills in like poured enamel. Subtle enough for native iOS.

### E. 貘形异形币 "Shaped Tapir Token" (special or premium tier)
- **Refs:** Mario Wonder Flower Coin, Genshin Primogem (separate premium shape), Peter Rabbit heptagon.
- **Material:** glossy 3D, the same family as A, but candy-like (Flower Coin gloss).
- **Colour:** gold for the standard coin. A rarer tier uses an iridescent pearl or cream (Primogem-style) instead of a new hue.
- **Emblem / mascot:** the coin outline is the tapir-head silhouette (rounded snout bump plus ears), or a heptagon or rounded-square "貘" medal. A recessed rim follows the shape.
- **Rim:** a thick bevel that follows the silhouette.
- **Small size:** the silhouette is recognisable, but the non-round shape fights baseline alignment in text. Use it for premium or event currency, not for inline balance.
- **Signature animation:** "snout boop". It pops in with an overshoot scale, the snout bumps forward on tap, and it bursts into 3–5 round A-coins (a premium-to-standard conversion metaphor).

**Suggested combination:** A or D for the everyday coin (D is the most on-brand), C for reward and sticker moments, B as a seasonal or Malaysian-heritage skin, and E only if a second, premium currency appears.
