export const ATLAS_VOICE = 'en_GB-alba-medium' as const;

type WorkerReply = { id: number; type: 'ready' | 'audio' | 'error'; buffer?: ArrayBuffer; mime?: string; message?: string };
type Pending = { resolve: (value: Blob | undefined) => void; reject: (reason: Error) => void; timer: ReturnType<typeof setTimeout> };
let worker: Worker | null = null;
let requestId = 0;
const pending = new Map<number, Pending>();

function resetWorker(error: Error) {
  worker?.terminate();
  worker = null;
  pending.forEach(request => { clearTimeout(request.timer); request.reject(error); });
  pending.clear();
}

function piperWorker() {
  if (!worker) {
    worker = new Worker(new URL('../workers/piper.worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (event: MessageEvent<WorkerReply>) => {
      const request = pending.get(event.data.id);
      if (!request) return;
      pending.delete(event.data.id);
      clearTimeout(request.timer);
      if (event.data.type === 'error') request.reject(new Error(event.data.message));
      else request.resolve(event.data.buffer ? new Blob([event.data.buffer], { type: event.data.mime || 'audio/wav' }) : undefined);
    };
    worker.onerror = event => {
      resetWorker(new Error(event.message || 'Piper speech worker failed.'));
    };
    worker.onmessageerror = () => resetWorker(new Error('Piper returned an unreadable audio response.'));
  }
  return worker;
}

function send(type: 'load' | 'speak', text?: string) {
  return new Promise<Blob | undefined>((resolve, reject) => {
    const id = ++requestId;
    try {
      const activeWorker = piperWorker();
      const timer = setTimeout(() => resetWorker(new Error('Local speech generation timed out.')), 120_000);
      pending.set(id, { resolve, reject, timer });
      activeWorker.postMessage({ id, type, text });
    } catch (error) {
      resetWorker(error instanceof Error ? error : new Error('Piper could not start.'));
      reject(error);
    }
  });
}

export async function loadPiper() { await send('load'); }
export async function generateAtlasSpeech(text: string) {
  const audio = await send('speak', text);
  if (!audio) throw new Error('Piper returned no audio.');
  return audio;
}
