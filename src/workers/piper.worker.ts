import { TtsSession } from '@mintplex-labs/piper-tts-web';
import ortModuleUrl from '../assets/onnx/ort-wasm-simd-threaded.mjs?url';
import ortWasmUrl from '../assets/onnx/ort-wasm-simd-threaded.wasm?url';

const VOICE_ID = 'en_GB-alba-medium';
const MODEL_ROOT = `/models/piper/${VOICE_ID}`;
let sessionPromise: Promise<TtsSession> | null = null;
const onnxWasmPaths = {
  mjs: new URL(ortModuleUrl, self.location.origin).href,
  wasm: new URL(ortWasmUrl, self.location.origin).href,
};

async function cacheLocalVoice() {
  if (!navigator.storage?.getDirectory) throw new Error('Persistent browser storage is unavailable.');
  const root = await navigator.storage.getDirectory();
  const directory = await root.getDirectoryHandle('piper', { create: true });
  const files: Array<[string, string, number]> = [
    ['en_GB-alba-medium.onnx', `${MODEL_ROOT}/en_GB-alba-medium.onnx`, 63_201_294],
    ['en_GB-alba-medium.onnx.json', `${MODEL_ROOT}/en_GB-alba-medium.onnx.json`, 4_888],
  ];
  await Promise.all(files.map(async ([name, url, expectedSize]) => {
    try {
      const cached = await (await directory.getFileHandle(name)).getFile();
      if (cached.size === expectedSize) return;
    } catch {
      // The cache is empty; populate it from the bundled model below.
    }
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Could not load ${name} (${response.status}).`);
    const blob = await response.blob();
    if (blob.size !== expectedSize) throw new Error(`The local ${name} file is incomplete.`);
    const file = await directory.getFileHandle(name, { create: true });
    const writable = await file.createWritable();
    await writable.write(blob);
    await writable.close();
  }));
}

async function loadSession() {
  if (!sessionPromise) {
    sessionPromise = cacheLocalVoice().then(() => TtsSession.create({
      voiceId: VOICE_ID,
      wasmPaths: {
        // The upstream option is typed as a string, but ORT 1.30 accepts { mjs, wasm }.
        onnxWasm: onnxWasmPaths as unknown as string,
        piperData: '/wasm/piper/piper_phonemize.data',
        piperWasm: '/wasm/piper/piper_phonemize.wasm',
      },
    })).catch(error => { sessionPromise = null; TtsSession._instance = null; throw error; });
  }
  return sessionPromise;
}

type Request = { id: number; type: 'load' | 'speak'; text?: string };
async function handleRequest({ id, type, text }: Request) {
  try {
    const session = await loadSession();
    if (type === 'load') { self.postMessage({ id, type: 'ready' }); return; }
    const blob = await session.predict(text || '');
    const buffer = await blob.arrayBuffer();
    self.postMessage({ id, type: 'audio', buffer, mime: blob.type });
  } catch (error) {
    self.postMessage({ id, type: 'error', message: error instanceof Error ? error.message : 'Piper speech generation failed.' });
  }
}

// Phonemization and inference share one session; never run them concurrently.
let queue = Promise.resolve();
self.onmessage = (event: MessageEvent<Request>) => {
  queue = queue.then(() => handleRequest(event.data));
};
