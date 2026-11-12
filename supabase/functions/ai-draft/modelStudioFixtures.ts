export const SOURCES = {
  completion:
    'https://www.alibabacloud.com/help/en/model-studio/compatibility-of-openai-with-dashscope (Non-streaming output, Oct 13, 2026)',
  toolCall:
    'https://www.alibabacloud.com/help/en/model-studio/qwen-function-calling (Nov 11, 2026)',
  error:
    'https://www.alibabacloud.com/help/en/model-studio/compatibility-of-openai-with-dashscope (Error response); https://www.alibabacloud.com/help/en/model-studio/error-code (Nov 12, 2026)',
} as const;

export type Usage = { prompt_tokens: number; completion_tokens: number };

export function toolCompletion(
  model: string,
  name: string,
  args: unknown,
  usage: Usage = { prompt_tokens: 1200, completion_tokens: 180 },
) {
  return {
    id: 'chatcmpl-fixture',
    choices: [
      {
        finish_reason: 'tool_calls',
        index: 0,
        logprobs: null,
        message: {
          content: '',
          refusal: null,
          role: 'assistant',
          audio: null,
          function_call: null,
          tool_calls: [
            {
              id: 'call_6596dafa2a6a46f7a217da',
              function: {
                arguments: typeof args === 'string' ? args : JSON.stringify(args),
                name,
              },
              type: 'function',
              index: 0,
            },
          ],
        },
      },
    ],
    created: 1716430652,
    model,
    object: 'chat.completion',
    system_fingerprint: null,
    usage: { ...usage, total_tokens: usage.prompt_tokens + usage.completion_tokens },
  };
}

export function textCompletion(
  model: string,
  content: string,
  usage: Usage = { prompt_tokens: 22, completion_tokens: 18 },
) {
  return {
    id: 'chatcmpl-fixture',
    choices: [
      {
        finish_reason: 'stop',
        index: 0,
        logprobs: null,
        message: { content, role: 'assistant', function_call: null, tool_calls: null },
      },
    ],
    created: 1716430652,
    model,
    object: 'chat.completion',
    system_fingerprint: null,
    usage: { ...usage, total_tokens: usage.prompt_tokens + usage.completion_tokens },
  };
}

export function errorBody(code: string, message: string, type = 'invalid_request_error') {
  return { error: { message, type, param: null, code } };
}

export const ERRORS = {
  invalidApiKey: {
    status: 401,
    body: errorBody('invalid_api_key', 'Incorrect API key provided. '),
  },
  throttled: {
    status: 429,
    body: errorBody(
      'Throttling.RateQuota',
      'Requests rate limit exceeded, please try again later.',
    ),
  },
  quota: {
    status: 429,
    body: errorBody(
      'insufficient_quota',
      'You exceeded your current quota, please check your plan and billing details.',
    ),
  },
  arrearage: {
    status: 400,
    body: errorBody(
      'Arrearage',
      'Access denied, please make sure your account is in good standing.',
    ),
  },
  inspection: {
    status: 400,
    body: errorBody('data_inspection_failed', 'Input data may contain inappropriate content.'),
  },
  internal: {
    status: 500,
    body: errorBody(
      'internal_error',
      'An internal error has occured, please try again later or contact service support.',
    ),
  },
  overloaded: {
    status: 503,
    body: errorBody(
      'ServiceUnavailable',
      'Too many requests. Your requests are being throttled due to system capacity limits. Please try again later.',
    ),
  },
  modelNotFound: { status: 404, body: errorBody('ModelNotFound', 'Model not exist.') },
} as const;

export const ASR_SOURCE =
  'https://www.alibabacloud.com/help/en/model-studio/qwen-audio-asr-http-api (Non-streaming response, Nov 03, 2026)';

export function asrResult(text: string, duration: number) {
  return {
    output: {
      sentence: {
        begin_time: 760,
        channel_id: 0,
        end_time: 3800,
        sentence_end: true,
        sentence_id: 1,
        text,
        words: [],
      },
      text,
    },
    usage: { duration },
    request_id: '40e0734d-096f-9ae3-86c1-a8c013287561',
  };
}
