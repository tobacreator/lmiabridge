if (!process.env.TINYFISH_API_KEY) {
  throw new Error('TINYFISH_API_KEY is not set in environment variables');
}

export const TINYFISH_BASE_URL = 'https://agent.tinyfish.ai/v1/automation/run-sse';

export async function runAgent(url: string, goal: string) {
  const response = await fetch(TINYFISH_BASE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': process.env.TINYFISH_API_KEY || ''
    },
    body: JSON.stringify({ url, goal })
  });

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();
  let resultJson = null;
  let buffer = '';

  if (reader) {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep the last partial line in the buffer

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('data: ')) {
          try {
            const data = JSON.parse(trimmed.slice(6));
            if (data.type === 'COMPLETE' || data.resultJson) {
              resultJson = data.resultJson;
            }
          } catch (e) {
            // ignore malformed JSON or partial chunks
          }
        }
      }
    }
  }

  return resultJson;
}
