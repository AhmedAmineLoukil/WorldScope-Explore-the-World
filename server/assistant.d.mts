import type { IncomingMessage, ServerResponse } from 'node:http';
export function handleAssistant(req: IncomingMessage, res: ServerResponse, env?: Record<string, string | undefined>): Promise<void>;
