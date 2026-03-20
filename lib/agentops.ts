// AgentOps wrapper — safe for Next.js bundling
// Uses dynamic require to avoid build-time module resolution failures

interface AgentOpsClient {
  init: (opts: { apiKey: string }) => Promise<void>;
}

let _client: AgentOpsClient | null = null;

export const initAgentOps = async () => {
  const apiKey = process.env.AGENTOPS_API_KEY;
  if (!apiKey) {
    console.warn('[AgentOps] API Key missing, skipping initialization');
    return;
  }
  try {
    if (!_client) {
      // Dynamic require to avoid Next.js build failures from agentops internals
      const mod = require('agentops');
      _client = mod.agentops || mod.default || mod;
    }
    await _client!.init({ apiKey });
    console.log('[AgentOps] Initialized');
  } catch (e) {
    console.error('[AgentOps] Init Error:', e);
  }
};

const agentops = {
  init: async (opts: { apiKey: string }) => {
    try {
      if (!_client) {
        const mod = require('agentops');
        _client = mod.agentops || mod.default || mod;
      }
      await _client!.init(opts);
    } catch (e) {
      console.error('[AgentOps] Init Error:', e);
    }
  }
};

export { agentops };
export default agentops;
