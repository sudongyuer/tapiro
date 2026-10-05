# AI-native reference: Musubicho (expense ledger app)

Source: https://x.com/__oQuery/status/2106325021140668756 ("这是一个 AI-native 应用，所以它在任何一个界面都有 AI 的入口"). The founder supplied a 21 s screen recording; frames are in `evidence/2026-10-06-ai-native-reference/`.

## What the recording shows

- One composer is docked at the bottom of every screen: `+` (attachments), a text field, and a send button.
- The placeholder changes with the screen: home "Add an expense, like 'lunch 35'"; New Trip "Describe the trip and I'll fill it in…"; New Ledger "Describe the ledger and I'll fill it in…".
- Forms show what is still missing ("Still needed: Name and Dates"). One sentence fills the form; the user still taps the checkmark.
- A scope chip above the composer ("日本旅行 2026.09 ⌄") shows which ledger the sentence applies to. Inside a ledger the scope switches to that ledger.
- Scanning a receipt opens the ledger chat: "Got it, reading the receipt", then a card with merchant, total and items, and "You paid and since there's no split instruction I put it in as an even split. Confirm".
- AI and manual paths sit side by side ("Tell Me Where" / "Fill It In Myself", "Scan Receipt" / "Add Expense").
- Each ledger keeps its own AI chat history; empty states use the mascot.

## How Tapiro applies it (decisions 2026-10-06)

- A docked "问小貘" composer on every screen, with a ≤32 pt 小貘 head, voice input, a screen-specific placeholder, and a scope chip for the current bounty or carpool.
- v1 abilities: draft a bounty or carpool from one sentence; read a Grab receipt and split it; translate and draft chat replies; find bounties and carpools and answer rule questions.
- Every result is a draft card the user confirms (AGENTS.md, AI). Every flow keeps a manual path.
- Only draft-producing actions count toward the 5 free AI uses per day; questions and translation are covered by the daily cap only.
