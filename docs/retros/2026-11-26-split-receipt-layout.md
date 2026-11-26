---
branch: fix/ride-split-receipt-layout
date: 2026-11-26
topic: split-receipt-layout
---

# Retro: split sheet rows below the half sheet, two footers run together

- What happened: #245 put the read button, progress row and read note in the receipt section between the total and the
  rider rows. With a receipt attached the rider rows fell below the medium detent. The PR recorded this as RR13 and
  moved `ride_settle_split`'s receipt tap after the row edits so the case could still type into the rows; the read
  result was appended to the privacy footer with one `\n`, so both read as one paragraph.
- Cost: two defects reached the owner's review; one fix PR.
- Root-cause class: a case was reordered around a layout regression instead of asserting the layout it hurt; the
  regression was then written up as a decision. Tag: `case-bent-around-defect`.
- Landed here (lowest layer, a check): `ride_settle_receipt_read` reopens the filled sheet at the medium detent and
  asserts the total, the read note and all three rider rows are on screen (`rows_in_view`); `ride_settle_split`
  attaches the receipt before the edits again. Story-map criterion `ride.split.receipt-layout` names the case.
- Not escalated to a rule: first occurrence of the tag in `docs/retros`.
