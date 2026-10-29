# Product notes

Facts about Tapiro's users and how they behave, with the date and source. Read before writing a spec or a design
board; a decision that contradicts a note needs the user.

## Payments

- Students pay each other mainly with Alipay, WeChat Pay and TNG; banks are rarely used (user, 2026-10-15).
- Most Chinese students' Alipay and WeChat are mainland accounts that pay in CNY (user, 2026-10-15). Since 2026-10-29
  a bounty is priced in RM or ¥ and the payer may pay in either, at the rate locked when the payment opens; Tapiro
  should not be tied to Malaysia (user, 2026-10-29; `docs/specs/2026-10-29-multi-currency-design.md`).
- Cash in person is settled by the payee's 已收到 alone (user, 2026-10-15).
- A cancelled prepaid item is settled by a reverse payment from the helper, confirmed by the poster (user, 2026-10-15).
- A helper without any payee method cannot apply (user, 2026-10-15).
- The CNY reference uses Bank Negara Malaysia's daily 17:00 middle rate, attributed "Source: Bank Negara Malaysia" with a link to its dataset terms (user, 2026-10-26).

## Stickers

- Visual reference for photo stickers (user, 2026-10-29, a DOOD app screenshot): a real photo becomes a hand-made
  illustration of the same scene on a white rounded card, with a fuzzy yarn or tufted-rug texture, flat colours
  that keep the photo's palette, no background, and a small handwritten date and caption under it. The user wants
  Tapiro's stickers to follow this look later. For bounty step 9 (photo → sticker), which the spec plans as an
  on-device cut-out, a stylised redraw like this needs an image model, so it falls under the AI rules (cloud call
  through an Edge Function, consent, a manual path); a spike decides between on-device cut-out plus a texture
  filter and a cloud redraw.
- The user also points at CapWords' sticker look as the one wanted (canvas comment on 「CapWords 素材库」, page
  07, 2026-10-29): a photographed object cut out along its outline, a thick white die-cut border, a soft drop
  shadow, placed slightly tilted. This matches the spec's on-device cut-out; the DOOD-style redraw above is the
  second, optional layer the step 9 spike weighs.
