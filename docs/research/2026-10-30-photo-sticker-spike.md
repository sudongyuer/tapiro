# Spike: photo → die-cut sticker, and hand-drawn illustrations (bounty step 9)

Date: 2026-10-30. Branch `spike/photo-sticker` (local). Scope: feasibility only; no product UI and no UI decisions.
Inputs: `docs/specs/2026-10-11-bounty-design.md` (photo sticker on the card; cut-out on device in the kit, only the
PNG uploaded; fallback: rounded thumbnail), `docs/product-notes.md` "Stickers" (CapWords look; DOOD-style redraw as
an optional second layer), and the owner's DOOD screen recording relayed on 2026-10-30.

## Summary

- **Cut-out API:** Vision `VNGenerateForegroundInstanceMaskRequest` (iOS 17+), or its Swift-native form
  `GenerateForegroundInstanceMaskRequest` (iOS 18+). It is headless, so it fits a kit function. VisionKit's
  `ImageAnalysisInteraction.subjects` needs a view and the Live Text interaction, so it does not fit.
- **Simulator:** the request **does not run** on the iOS 26.5 Simulator. Every call failed with
  `com.apple.Vision Code=9 "Could not create inference context"`. Forcing the CPU failed too, with
  `Code=22 "unsupported compute device <MLCPUComputeDevice>"`. A device check is required.
- **Quality and speed:** I ran the same pipeline on macOS 26.5 (M2 Max, same Vision request) as a proxy. All four
  photos cut out with one instance each. Warm Vision time was 33–43 ms, the first cold call took 2.8 s, and the
  sticker render took 15–65 ms. iPhone numbers are **unknown** until the device check.
- **Border:** stroke the traced contour (`VNDetectContoursRequest` + `CGContext` round-join stroke). Dilation
  (`CIMorphologyMaximum`) leaves faceted corners.
- **Hand-drawn look:** a Core Image filter does not produce it. The DOOD look needs a generative model. Apple
  `ImageCreator` is the on-device candidate but does not run on the Simulator (`notSupported`), does not accept
  Malay, and does not work on iPhones bought in mainland China. Two other options exist: a cloud model through an
  Edge Function, or a fixed, commissioned illustration set per intent.

## 1. On-device subject cut-out

### API (Apple docs)

| API                                                                                                                                                                       | iOS  | Source                                                                                                                                     |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `VNGenerateForegroundInstanceMaskRequest`: "generates an instance mask of noticable objects to separate from the background"                                              | 17.0 | https://developer.apple.com/documentation/vision/vngenerateforegroundinstancemaskrequest                                                   |
| `GenerateForegroundInstanceMaskRequest` (Swift-native Vision)                                                                                                             | 18.0 | https://developer.apple.com/documentation/vision/generateforegroundinstancemaskrequest                                                     |
| `VNInstanceMaskObservation.generateMaskedImage(ofInstances:from:croppedToInstancesExtent:)`: "everything becomes transparent black, except for the instances you specify" | 17.0 | https://developer.apple.com/documentation/vision/vninstancemaskobservation/generatemaskedimage(ofinstances:from:croppedtoinstancesextent:) |
| `generateScaledMaskForImage(forInstances:from:)`                                                                                                                          | 17.0 | https://developer.apple.com/documentation/vision/vninstancemaskobservation/generatescaledmaskforimage(forinstances:from:)                  |
| `InstanceMaskObservation` (Swift-native observation)                                                                                                                      | 18.0 | https://developer.apple.com/documentation/vision/instancemaskobservation                                                                   |
| VisionKit `ImageAnalysisInteraction.subjects` (needs a view with the interaction attached)                                                                                | 17.0 | https://developer.apple.com/documentation/visionkit/imageanalysisinteraction/subjects                                                      |

The deployment target is iOS 26, so either Vision form is available. The spike uses the `VN` form because its
synchronous `perform` fits an Expo `AsyncFunction`, which already runs off the main queue.

### Spike code

- `modules/tapiro-kit/ios/PhotoSticker.swift` implements `photoSticker({ uri, border, maxSide, cpuOnly })`. It
  decodes the file, downscales it to 1024 px on the long side (which bakes in the EXIF orientation), and runs the
  request. It takes the masked image cropped to the instances, then draws a white die-cut border and a soft shadow
  (black at 28 %, blur ≈ border width, offset down). It writes a PNG to `tmp` and returns a typed result:
  `{status: 'ok', uri, width, height, bytes, visionMs, totalMs, …}` or `{status: 'failed', code, message}`. The codes
  are `decode`, `vision`, `noSubject`, `render` and `write`. Border width is 3.5 % of the subject's long side.
- `src/debug/PhotoStickerScene.tsx` is the Debug scene `photo-sticker`. It runs every photo in
  `Documents/spike-photos` through both border modes and writes `Documents/spike-results.json`. Photos are copied in
  with `simctl get_app_container`, and the scene is launched with `-uiVerifyScene photo-sticker` on `Tapiro Verify 2`.
- `docs/research/evidence/photo-sticker/mac-proxy.swift` is the macOS proxy. It is generated from the kit's two
  render functions, so the pipeline is the same code with `UIColor` replaced by `CGColor`.

### Test photos

All four come from Wikimedia Commons. I checked each licence through the Commons API (`extmetadata.LicenseShortName`)
and used the 1280 px thumbnails.

| Case                                                                        | File                                                 | Licence       |
| --------------------------------------------------------------------------- | ---------------------------------------------------- | ------------- |
| Parcel / box                                                                | `File:Corrugated box - haz mat.jpg`                  | Public domain |
| Drink cup in a cluttered scene (cup in a carrier on a table, window behind) | `File:Tea bought from the buffet car 2025-07-27.jpg` | CC0           |
| Clear plastic bubble-tea cup, cropped by the frame                          | `File:Bubble-tea.jpg`                                | CC0           |
| Object outdoors with clutter (backpack, a plastic bag beside it)            | `File:Ubuntu backpack.jpg`                           | CC0           |

## 2. Simulator result

The scene ran on `Tapiro Verify 2` (iPhone 17 Pro, iOS 26.5 runtime, Release verify build). All 8 runs (4 photos ×
2 borders) failed the same way:

```
Error Domain=com.apple.Vision Code=9 "Could not create inference context"
  | cpu: Error Domain=com.apple.Vision Code=22 "unsupported compute device <MLCPUComputeDevice: 0x105a61ef0>"
```

The second error is from the retry with `request.setComputeDevice(<cpu>, for: .main)`. Evidence:
`evidence/photo-sticker/simulator-vision-error.png`.

Consequences:

- **The cut-out needs a device check** (any iPhone that runs iOS 26). Record the cold and warm `visionMs`, `totalMs`
  and the output size there.
- **UI cases cannot exercise the real cut-out.** Verify mode should replace `photoSticker` at the service boundary,
  for example by returning a bundled sticker PNG or a `vision` failure, so that the success path and the
  "rounded thumbnail" fallback can both be checked. This matches how the kit's MapKit search is replaced today.
- Most users will never hit the spec's fallback, but every Simulator run will. This makes the fallback path
  mandatory and keeps it tested.

### macOS proxy results (M2 Max, macOS 26.5.2; input downscaled to ≤ 1024 px)

Three runs per photo. Run 0 includes the model load.

| Photo    | Input    | Instances | Vision (cold / warm) | Render + PNG, dilate | Render + PNG, contour | Output    | PNG size       |
| -------- | -------- | --------- | -------------------- | -------------------- | --------------------- | --------- | -------------- |
| box      | 975×1024 | 1         | 2793 / 37–42 ms      | 32–33 ms (580 cold)  | 63–65 ms              | 1091×1164 | 978 / 934 KB   |
| cup      | 1024×771 | 1         | 34–37 ms             | 15 ms                | 33–35 ms              | 798×640   | 483 / 457 KB   |
| boba     | 683×1024 | 1         | 33–38 ms             | 19–22 ms             | 30–31 ms              | 621×1240  | 507 / 484 KB   |
| backpack | 768×1024 | 1         | 35–43 ms             | 29–36 ms             | 53–56 ms              | 902×940   | 1064 / 1025 KB |

Evidence: `evidence/photo-sticker/mac-dilate-vs-contour.png` (top row dilate, bottom row contour, placed slightly
tilted on `--color-moment-bg` for viewing only).

Observations:

- The box, the cup with its carrier, and the boba cup cut out cleanly. In the cup scene, the model kept the cup and
  its carrier together as one subject. That is reasonable for "the item", but nothing in the API controls it.
- **Subject touching the frame:** the boba cup is cropped by the photo, so the sticker has a straight edge where
  the photo ends. The border wraps it as a flat side.
- **Clutter:** in the backpack photo, part of the plastic bag beside the backpack is included. The request
  returns every foreground instance it finds, and the spike merged all of them. Choosing one instance (the
  largest, or the one under a tap) is possible with `instanceAtPoint`/`allInstances`.
- **Output size:** 0.45–1.06 MB at ≤ 1024 px input. The card shows the sticker at far less than that. Rendering at
  512 px, or encoding HEIC/WebP-with-alpha, would cut upload and storage roughly fourfold. This is untested and
  needs a check against the card's largest display size.
- Transparent objects (the clear dome lid) survived. Very low-contrast scenes and dark photos were not tested.

## 3. Border: dilate the mask vs stroke the contour

Both modes are in the kit (`border: 'dilate' | 'contour'`).

- **Dilate** (`CIMorphologyMaximum` on the alpha mask, then a 1.2 px blur; with R = G = B = A the result is already
  premultiplied white). Simple, robust, and fills holes smaller than the radius. It was the faster render on the Mac
  (15–36 ms). But the morphology kernel leaves **faceted, polygonal corners and a slightly wobbly edge** (see
  `evidence/photo-sticker/mac-border-zoom.png`, left). Cost grows with the radius, so a thick CapWords-style border
  costs more.
- **Contour stroke** (`VNDetectContoursRequest` on the mask at 512 px, `topLevelContours` → `normalizedPath` →
  fill plus a stroke of width 2r with round joins, and the shadow drawn by `CGContext.setShadow`). It gives
  **smooth, round die-cut corners** like a printed sticker (zoom, right). Thickness is free, and the shadow comes
  from the same path. Filling only the top-level contours fills every interior hole, such as the gap in a mug
  handle, with white, as die-cut stickers usually are. Render took 30–65 ms on the Mac. Risks: the contour is
  simplified at 512 px (invisible at card size), and if contour detection fails we fall back to dilation.
  `VNDetectContoursRequest` is iOS 14+ (https://developer.apple.com/documentation/vision/vndetectcontoursrequest).

**Pick: contour stroke, with dilation as the fallback inside the kit.** Reasons: it matches the CapWords look
(smooth round outline, thick border), it makes border thickness a free parameter, and both modes cost well under
100 ms on the proxy. The upstream `CIMorphologyMaximum` reference (`CIMorphologyMaximum`, iOS):
https://developer.apple.com/documentation/coreimage/cimorphologymaximum.

## 4. Cloud stylised redraw (not implemented)

This would follow the AI rules in `AGENTS.md`: an Edge Function pinned to Singapore, a consent screen naming the
provider, a per-user daily limit, a manual path (the cut-out or the rounded thumbnail), and the user's tap before
anything is published.

| Model (Alibaba Model Studio, International / Singapore) | Fit                                                                                                          | Price (list, Singapore) | Rate limit | Source                                                                                                                                                  |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ----------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `qwen-image-2.1-pro`                                    | Image editing with up to 10 reference images; "native support for generating and editing transparent images" | US$0.04 / image         | 20 RPM     | https://www.alibabacloud.com/help/en/model-studio/qwen-image-2-1-pro                                                                                    |
| `qwen-image-2.1-turbo`                                  | Same family, 8 denoising steps; RGBA output and subject extraction                                           | US$0.016 / image        | 120 RPM    | https://www.alibabacloud.com/blog/qwen-image-2-1-pro-and-turbo-apis-are-live-one-7b-model-to-generate-edit-and-cut-out_603679 (vendor blog, 2026-10-26) |
| `qwen-image-edit`                                       | Older editing model                                                                                          | US$0.045 / image        | 120 RPM    | https://www.alibabacloud.com/help/en/model-studio/model-qwen-image-edit                                                                                 |

**Unknown:** latency (neither page states it), sync or async call style, output URL expiry, pinned snapshot IDs for
2.1, and whether a yarn/crayon prompt gives a consistent house style across very different photos. These need a
paid trial call from an Edge Function. Cost scales with retries: an unlimited "Retry" like DOOD's multiplies spend,
so the daily limit has to count retries. Data handling follows the Model Studio international terms already
recorded in `docs/research/2026-10-04-ai-providers.md`.

## 5. Hand-drawn illustrations: from a photo, and from a bounty's intent

### 5a. Apple Image Playground (`ImageCreator`)

Facts from Apple's docs:

- `ImageCreator` (iOS 18.4+) "Generates images programmatically from the description and style information you
  specify… as a text string or as a combination of text and images". It returns images through an `AsyncSequence`.
  https://developer.apple.com/documentation/imageplayground/imagecreator
- **Styles:** `ImagePlaygroundStyle.animation`, `.illustration`, `.sketch` (iOS 18.4), `.emoji`, and
  `.externalProvider` (iOS 26: "a style provided by an external provider"). Apps must check `availableStyles` first.
  There is no crayon or tufted style. https://developer.apple.com/documentation/imageplayground/imageplaygroundstyle
- **Concepts:** `.text(_:)`, `.extracted(from:title:)` for long text, `.drawing(_:)` (PencilKit), and `.image(_:)`
  from a `CGImage` or a URL. So both photo → illustration and intent text → illustration are expressible.
  https://developer.apple.com/documentation/imageplayground/imageplaygroundconcept
- **iOS 26.4 options:** `images(for:style:options:limit:)` with `ImagePlaygroundOptions`. These include
  `creationStrategy` (`editExisting`, which "more closely resembles the original image", or `generateNew`),
  `creationVariety` (`low`/`high`), and `sizeSpecification`.
  https://developer.apple.com/documentation/imageplayground/imageplaygroundoptions
- **Errors:** `notSupported` ("Make sure the device has the hardware required"), `unavailable` (models not yet
  downloaded), `unsupportedLanguage`, `unsupportedInputImage`, `backgroundCreationForbidden`, `creationFailed`,
  `faceInImageTooSmall`, and `conceptsRequirePersonIdentity`.
  https://developer.apple.com/documentation/imageplayground/imagecreator/error
- **Availability** (Apple Support, "How to get Apple Intelligence", https://support.apple.com/en-us/121115):
  - Devices: iPhone 15 Pro and later, plus iPhone Air and iPhone Duo.
  - Languages include Chinese (simplified) and English. **Malay is not listed.**
  - "Apple Intelligence features will not currently work for supported devices purchased in China mainland."
  - In the current release the page lists Image Playground among features that rely on server-side models with
    "daily usage limits", so it is not purely on device. **Unknown:** which parts run on device and whether a
    third-party `ImageCreator` call counts against that limit.

**Simulator run** (`Tapiro Verify 2`, iOS 26.5): `try await ImageCreator()` threw **`notSupported`** for every probe.
The probes were Chinese text, English text in `illustration` and `sketch`, Malay text, and text plus the box photo.
Raw output is in the scene's `spike-playground.json`. It needs a device check on an Apple Intelligence iPhone with
Apple Intelligence turned on. Untested: output quality, how close `.illustration` or `.sketch` gets to DOOD's
crayon/yarn look (unknown; no style is named crayon or yarn), and latency.

Verdict: usable only as an **optional enhancement** with a fallback. Many target users carry phones bought in
mainland China or older than iPhone 15 Pro, Malay prompts are rejected, the styles are fixed and not crayon, and
background creation is forbidden (`backgroundCreationForbidden`), so generation must happen while the app is in the
foreground.

### 5b. No-model option: a fixed illustration library per intent

- Base set: the 8 bounty categories in `CATEGORY_SYMBOLS` (`pickup`, `buy`, `queue`, `handle`, `move`, `accompany`,
  `study`, `other`) plus carpool, so **9 illustrations**. `pickup` already has bespoke art (`ParcelArt`); the others
  use SF Symbols today.
- Common sub-intents that read better with their own picture, such as parcel vs food pickup, bubble tea vs groceries,
  airport vs campus ride, and printing vs documents, bring the count to about **20–30**. Picking by category works
  today. Picking by keyword needs a small keyword → illustration table per locale (zh-Hans, en, ms) and an `other`
  fallback, or, later, the AI drafting step (bounty step 10) choosing the key.
- Making the set: one illustrator, or one generation session with a single model followed by hand cleanup. Keep one
  palette from `docs/design-language.md`, one line weight, one texture and one camera angle, and export each at
  @2x/@3x or as SVG/Rive. Consistency is the hard part: generated batches drift in style, so budget a cleanup pass.
- Trade-offs: deterministic, offline, free per post, works on every device and in every language, and testable in UI
  cases. But it shows the _intent_, not the user's actual item, and it has no retry and no per-photo novelty.

### 5c. Can a Core Image filter give the crayon or tufted look?

I tried a cheap chain on the box cut-out (`evidence/photo-sticker/mac-coreimage-crayon-tufted.png`; left: the
contour sticker, middle: "crayon", right: "tufted").

- Crayon: two median filters, `CIColorPosterize` with 6 levels, multiplied by motion-blurred noise strokes, with
  `CILineOverlay` outlines.
- Tufted: `CIPointillize` multiplied by blurred noise.

**Verdict: no.** Both read as "a photo with a Photoshop filter". The crayon version is a posterized photo with
banded colour, a pink cast and noisy outlines. The tufted version is a speckled, washed-out photo. Neither
simplifies shapes, drops detail, or redraws the object the way a hand would. Tuning would improve the texture but
not the drawing.

**I agree with the coordinator's reading of the DOOD recording: it uses a generative image model.** Three things
point that way:

1. "Retry · Unlimited" gives a _different_ drawing each time. A filter is deterministic, so a retry would return the
   same image.
2. Each illustration is scene-specific and _recomposed_. Toothbrush, bouquet, a sunset building, people with a dog:
   subjects are simplified, backgrounds are dropped or redrawn, and proportions change. A per-pixel filter keeps the
   photo's geometry and detail.
3. The output keeps the photo's palette but draws flat colour areas with a yarn/crayon texture _inside_ redrawn
   shapes. That is texture synthesis conditioned on content, which is what image-to-image models do.

A filter can add _texture_ on top of the CapWords cut-out (paper grain, a subtle crayon edge), which is a plausible
cheap polish. It cannot produce the DOOD redraw.

## Recommendation

1. Build the CapWords-style cut-out in the kit as specified: Vision foreground instance mask, contour-stroke border
   with dilation as the fallback, a soft shadow, a typed result, and the rounded-thumbnail fallback. Before the
   build, run one device check of this spike's scene to get iPhone timings.
2. In verify mode, replace `photoSticker` at the service boundary, because the Simulator cannot run the request.
3. Treat the hand-drawn look as a separate, later layer. It needs a generative model, either Model Studio through an
   Edge Function (cost per image, AI rules, consent) or Apple `ImageCreator` (free, but not on mainland-China
   iPhones, no Malay, fixed non-crayon styles). For intent icons from text, the fixed illustration library (5b) is
   the dependable baseline either way.

## Open questions for the owner (not decided here)

1. Border thickness and shadow strength (the spike uses 3.5 % of the subject's long side and black at 28 %), and
   whether the sticker is tilted at rest and by how much.
2. When the photo has several foreground objects: keep all (the spike's behaviour), keep the largest, or let the user
   tap the one they mean.
3. Whether the user sees the cut-out result before publishing, can redo or crop it, or can choose "use the photo
   as is".
4. Fallback appearance when the cut-out fails or finds no subject: the spec says a rounded thumbnail; whether it also
   gets the white border and shadow.
5. Whether DOOD-style redraw is wanted for v1 at all. If so: cloud (cost per image, consent screen, daily limit,
   retry count) or Apple Image Playground (device and region gaps), and whether a retry button exists.
6. For intent icons from text: a fixed illustration set (how many, which sub-intents, who draws it) vs generated
   per bounty.
7. Whether the date and caption under the sticker (DOOD) belong on Tapiro's card or sticker book.
8. Upload size target for the sticker PNG (512 px vs 1024 px), which depends on the card's largest display size.

## Evidence

- `evidence/photo-sticker/simulator-vision-error.png`: the Debug scene on `Tapiro Verify 2`, showing the Vision
  errors.
- `evidence/photo-sticker/mac-dilate-vs-contour.png`: four stickers, dilate (top) vs contour (bottom), macOS proxy.
- `evidence/photo-sticker/mac-border-zoom.png`: border corner detail, dilate (left) vs contour (right).
- `evidence/photo-sticker/mac-coreimage-crayon-tufted.png`: the cut-out vs the Core Image crayon and tufted
  attempts.
- `evidence/photo-sticker/mac-proxy.swift`: the macOS proxy (render functions generated from the kit file).
