# AI-native response patterns: where AI output appears

Question: where and how should 小貘's responses appear in Tapiro, and how do confirm and undo work?
Scope: 14 apps, 40 images, all real UI from App Store listings (商店) or official sites (官网).
No third-party recordings were used. Images and `refs.json` live in the session scratchpad
(`ai-native-refs/`), not in the repo. Musubicho is covered in `2026-10-06-ai-native-reference.md`.

## Patterns

### Inline (result replaces content in place)

- Apple Intelligence Writing Tools rewrites the selected text where it sits. The panel keeps
  undo/redo arrows, so the original is one tap away. Messages shows one contextual suggestion
  ("Create Poll") above the keyboard; nothing happens until it is tapped.
  https://www.apple.com/newsroom/2024/06/introducing-apple-intelligence-for-iphone-ipad-and-mac/,
  https://www.apple.com/newsroom/2024/09/apple-introduces-iphone-16-and-iphone-16-plus/,
  https://www.apple.com/newsroom/2025/06/apple-intelligence-gets-even-more-powerful-with-new-capabilities-across-apple-devices/
- Notion AI builds the page in place while the side panel shows "Thinking". The reply ends with an
  `Undo` button that rolls back the whole change. Desktop only in the official material.
  https://www.notion.com/product/ai
- Raycast's keyboard extension runs "Improve Writing" on the current text field.
  https://apps.apple.com/us/app/raycast-ai-notes-and-more/id6503428327
- Confirm/undo: the edit applies at once; safety comes from one-step undo, not from a confirm step.

### Draft / confirm card

- 支付宝 蚂蚁阿宝 (the assistant formerly branded 支小宝): "打车去…" returns a card with map, car type and
  price range, and a primary `确认` button. The ride is not booked until the tap.
  https://apps.apple.com/cn/app/id333206289
- Lazada LazzieChat (Malaysia listing): an "AI Picked" side-by-side comparison card with add-on chips.
  https://apps.apple.com/my/app/lazada-10-10-sale/id785385147
- 千问: "每天 9 点整理简报" creates a task card ("设置成功 | 每天09:00"). Results return later as a
  notification card with `查看详情`. https://apps.apple.com/cn/app/id6466733523
- ChatGPT: a drafted email appears as a card in the thread with edit and send controls.
  https://apps.apple.com/us/app/chatgpt/id6448311069
- Gemini: place answers arrive as a map card. https://apps.apple.com/us/app/google-gemini/id6477489729
- Confirm/undo: one primary button on the card; editing happens on the card before confirm.

### Conversation thread

- ChatGPT, Perplexity, Gemini, 千问 and 豆包 use a full-screen thread with a docked composer.
- Perplexity lists sources above the answer and "Related" follow-ups below it.
  https://apps.apple.com/us/app/perplexity-ai-search-chat/id1668000334
- 豆包 task mode lists the tools it used and the completed steps. https://apps.apple.com/cn/app/id6459478672
- Confirm/undo: none in the thread itself. Actions under each answer: copy, rate, retry.

### Sheet

- 飞猪 puts its mascot 飞猪帮帮 in the centre of the tab bar. Tapping raises an "AI 服务面板" half
  sheet over the home screen, grouped into 帮我想 / 帮我订 / 帮我办. https://apps.apple.com/cn/app/id453691481
- Raycast's system "Ask AI" panel has only `Cancel` and `Done`.
- Confirm/undo: the sheet is dismissible; the underlying screen stays intact.

### Suggestion chips

- Perplexity Pro Search asks a clarifying question with option chips plus `Skip` / `Continue`.
- 美团 问小团 shows hot and recommended tags above the composer; the result states what was done
  ("共领到 7 张券") and offers "猜你想问". https://apps.apple.com/cn/app/id423084029
- 豆包 "买前问豆包" shows six scenario tiles and scrolling example questions.
- Duolingo Roleplay shows suggested reply words above the keyboard. https://blog.duolingo.com/duolingo-max/
- Confirm/undo: chips only fill or send text; they never act.

### Entry point

- Arc Search puts a "Browse for Me" button next to each search suggestion; pinching a page summarises it.
  The AI path sits beside the normal path. https://apps.apple.com/us/app/arc-search-find-it-faster/id6472513080
- 飞猪's search box accepts a full sentence ("一句话就出发"). Lazada docks "Ask Lazzie anything" above the
  tab bar on the Message tab. Raycast docks "Ask Raycast AI…" with a model picker.

### Mascot / character

- 蚂蚁阿宝: a large avatar greets the user on the empty state, then shrinks to a small avatar beside each reply.
- 飞猪: the mascot appears in the tab bar and as a small dismissible hint bubble inside an ordinary
  train-ticket form ("选择意向车次后推荐更准确哦 ×").
- Duolingo Max: the character avatar speaks each line; feedback comes on a separate review screen.
  https://blog.duolingo.com/video-call/

## Recommendation for Tapiro

1. Default placement follows what the request touches:
   - A form or draft on screen (bounty, carpool, chat reply): fill it in place, highlight the
     changed fields, and offer one `撤销` that restores the whole previous state. The user still
     submits with the form's own button. Sources: Apple Writing Tools, Notion AI, Musubicho.
   - Anything with a side effect (publish, accept, split a receipt, message another user): a draft
     card with the facts to check and one primary `确认` button. Sources: 蚂蚁阿宝, Lazada, ChatGPT.
   - Questions (rules, nearby bounties): a half sheet above the docked composer. It holds a short
     thread and can be swiped away without leaving the screen. Source: 飞猪 AI 服务面板.
2. Ask before guessing: when a sentence is ambiguous, reply with 2–4 chips plus `跳过`
   (Perplexity, 美团). Chips never act on their own.
3. 小貘 presentation: a large greeting only on empty states. Elsewhere, a ≤32 pt head beside replies,
   plus an optional one-line dismissible hint inside forms (飞猪). It never covers content.
4. Long-running requests (for example, carpool matching) return as a status card, then a
   notification card (千问).
5. Avoid a full-screen chat as the main surface. Every surveyed super-app keeps it, but Tapiro's
   value is in bounty and carpool screens. The thread stays one sheet away.
