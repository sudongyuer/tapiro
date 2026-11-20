import { QWEN_PLUS } from './models.ts';

export const RECORDED_SOURCE =
  'live Model Studio Singapore replies to hosted ai-draft request bodies, 2026-11-20';

export const RECORDED_DRAFT_REPLY = {
  id: 'chatcmpl-22481176-566b-9632-81a0-ca2696153879',
  object: 'chat.completion',
  created: 1795174221,
  model: QWEN_PLUS,
  choices: [
    {
      index: 0,
      message: {
        role: 'assistant',
        content: '',
        tool_calls: [
          {
            id: 'call_e6b66748e6c34507a22fcfa6',
            type: 'function',
            function: {
              name: 'draft_bounty',
              arguments:
                '{"title": "Sunway 楼下取快递送至 Sunway Geo 宿舍", "category": "pickup", "rewardMajor": "15", "currency": "MYR", "description": "帮我今晚之前去 Sunway 楼下取个快递，送到 Sunway Geo 宿舍。", "deadlineAt": "2026-11-20T23:59+08:00", "startsAt": null, "endsAt": null, "placeHint": "Sunway 楼下取，送至 Sunway Geo 宿舍", "memory": {"used": [], "remember": null}}',
            },
            index: 0,
          },
        ],
      },
      finish_reason: 'stop',
      logprobs: null,
    },
  ],
  usage: {
    prompt_tokens: 1125,
    total_tokens: 1327,
    completion_tokens: 202,
    prompt_tokens_details: { cached_tokens: 0, text_tokens: 1125 },
  },
};
