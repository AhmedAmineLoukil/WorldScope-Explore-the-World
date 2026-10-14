import { useEffect, useRef, useState } from 'react';
import { ArrowUp, ArrowUpRight, AudioLines, Compass, Leaf, Mic, MicOff, RotateCcw, Sparkles, Volume2, VolumeX, Waves } from 'lucide-react';
import { destinations, photo } from '../data/countries';
import type { Country } from '../data/countries';
import { useStoredState } from '../lib/storage';
import { previewRecommendation } from '../lib/recommendations';
import type { Message } from '../lib/recommendations';

interface Recognition {
  lang: string; interimResults: boolean; continuous: boolean;
  start: () => void; stop: () => void; abort: () => void;
  onresult: ((e: { results: { [key: number]: { isFinal: boolean; [key: number]: { transcript: string } }; length: number } }) => void) | null;
  onerror: ((e: { error: string }) => void) | null; onend: (() => void) | null;
}
type VoiceWindow = Window & { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
interface Props { onExplore: (name: string) => void; initialPrompt: string; onPromptConsumed: () => void; countries: Country[] }

export default function Assistant({ onExplore, initialPrompt, onPromptConsumed, countries }: Props) {
  const [messages, setMessages] = useStoredState<Message[]>('worldscope-conversation', []);
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<'live' | 'preview'>('preview');
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [voiceReplies, setVoiceReplies] = useState(false);
  const [error, setError] = useState('');
  const end = useRef<HTMLDivElement>(null);
  const orb = useRef<HTMLDivElement>(null);
  const recognition = useRef<Recognition | null>(null);
  const audio = useRef<{ stream: MediaStream; context: AudioContext; frame: number } | null>(null);
  const abort = useRef<AbortController | null>(null);
  const submitRef = useRef<(text: string) => Promise<void>>(async () => {});
  const mounted = useRef(true);
  const busyRef = useRef(false);
  const consumed = useRef(false);
  useEffect(() => { mounted.current = true; const controller = new AbortController(); fetch('/api/assistant', { signal: controller.signal }).then(r => r.json()).then(d => setMode(d.mode === 'live' ? 'live' : 'preview')).catch(() => {}); return () => { mounted.current = false; controller.abort(); abort.current?.abort(); recognition.current?.abort(); stopAudio(); window.speechSynthesis?.cancel(); }; }, []);
  useEffect(() => { if (messages.length) end.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, [messages, busy]);
  useEffect(() => {
    if (initialPrompt && !consumed.current) {
      const timeout = setTimeout(() => { consumed.current = true; onPromptConsumed(); void submitRef.current(initialPrompt); }, 0);
      return () => clearTimeout(timeout);
    }
  }, [initialPrompt, onPromptConsumed]);
  function stopAudio() { if (audio.current) { cancelAnimationFrame(audio.current.frame); audio.current.stream.getTracks().forEach(track => track.stop()); void audio.current.context.close(); audio.current = null; } orb.current?.style.setProperty('--voice-level', '0'); }
  function speak(text: string) {
    if (!('speechSynthesis' in window)) { setError('Spoken replies are not available in this browser. You can still read every response.'); return; }
    window.speechSynthesis.cancel(); const utterance = new SpeechSynthesisUtterance(text); utterance.lang = 'en-US'; utterance.rate = 0.97;
    utterance.onstart = () => { if (mounted.current) setSpeaking(true); }; utterance.onend = utterance.onerror = () => { if (mounted.current) setSpeaking(false); }; window.speechSynthesis.speak(utterance);
  }
  async function submit(text: string) {
    if (!text.trim() || busyRef.current) return;
    const conversation: Message[] = [...messages, { role: 'user', content: text.trim().slice(0, 2000) }];
    setMessages(conversation); setInput(''); setError(''); busyRef.current = true; setBusy(true); window.speechSynthesis?.cancel(); setSpeaking(false);
    abort.current = new AbortController();
    try {
      const response = await fetch('/api/assistant', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: conversation.slice(-20).map(({ role, content }) => ({ role, content })) }), signal: abort.current.signal });
      if (!response.ok) { const failure = await response.json(); throw new Error(failure.error || 'The assistant is unavailable. Please try again.'); }
      const data = await response.json();
      const reply: Message = data.mode === 'live' ? { role: 'assistant', content: data.reply, suggestions: destinations.filter(c => data.reply.includes(c.name)).map(c => c.name).slice(0, 3) } : previewRecommendation(conversation, countries);
      if (!mounted.current) return;
      setMode(data.mode === 'live' ? 'live' : 'preview'); setMessages([...conversation, reply]); if (voiceReplies) speak(reply.content);
    } catch (err) { if (mounted.current && !(err instanceof DOMException && err.name === 'AbortError')) { setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.'); setInput(text); } }
    finally { busyRef.current = false; if (mounted.current) setBusy(false); }
  }
  submitRef.current = submit;
  async function toggleVoice() {
    if (listening) { recognition.current?.stop(); return; }
    const Constructor = (window as VoiceWindow).SpeechRecognition || (window as VoiceWindow).webkitSpeechRecognition;
    if (!Constructor) { setError('Voice input is not supported in this browser. Try Chrome or Edge, or type your message below.'); return; }
    window.speechSynthesis?.cancel(); setSpeaking(false); setError('');
    let transcript = '', failed = false;
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('Microphone access requires localhost or a secure HTTPS connection.');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!mounted.current) { stream.getTracks().forEach(track => track.stop()); return; }
      const context = new AudioContext(); const analyser = context.createAnalyser(); analyser.fftSize = 256; context.createMediaStreamSource(stream).connect(analyser);
      const samples = new Uint8Array(analyser.frequencyBinCount); audio.current = { stream, context, frame: 0 };
      const animate = () => { if (!audio.current) return; analyser.getByteTimeDomainData(samples); const level = Math.min(1, Math.sqrt(samples.reduce((sum, value) => sum + ((value - 128) / 128) ** 2, 0) / samples.length) * 6); orb.current?.style.setProperty('--voice-level', level.toFixed(3)); audio.current.frame = requestAnimationFrame(animate); }; animate();
      const recognizer = new Constructor(); recognizer.lang = 'en-US'; recognizer.interimResults = true; recognizer.continuous = false; recognition.current = recognizer;
      recognizer.onresult = e => { transcript = Array.from({ length: e.results.length }, (_, i) => e.results[i][0].transcript).join(' '); setInput(transcript); };
      recognizer.onerror = e => { failed = true; setError(e.error === 'not-allowed' ? 'Microphone permission was denied. You can enable it in your browser or type below.' : 'I couldn’t catch that. Try again or type your message.'); };
      recognizer.onend = () => { stopAudio(); if (mounted.current) { setListening(false); if (transcript.trim() && !failed) void submitRef.current(transcript); } };
      recognizer.start(); setListening(true);
    } catch (err) { stopAudio(); setListening(false); setError(err instanceof Error ? err.message : 'Microphone access was unavailable. Please type your message.'); }
  }
  const lastReply = messages.filter(m => m.role === 'assistant').at(-1);
  const state = listening ? 'listening' : busy ? 'thinking' : speaking ? 'speaking' : 'idle';
  return <div className="assistant-page section-page">
    <div className="page-heading"><div><div className="eyebrow"><span className="tiny-line" /> A LITTLE GUIDANCE. ENDLESS POSSIBILITY.</div><h1>Your next adventure starts with a conversation<span>.</span></h1><p>Meet Atlas. A thoughtful companion for your next chapter.</p></div><span className="mode-pill"><span className="live-dot" />{mode === 'live' ? 'AI assistant' : 'Curated preview'}</span></div>
    <div className="assistant-layout"><section className="voice-space" aria-label="Atlas voice companion">
      <div className={`voice-orb-wrap ${state}`} ref={orb}><div className="voice-orbit orbit-a" /><div className="voice-orbit orbit-b" /><div className="voice-orb"><div className="orb-light light-one" /><div className="orb-light light-two" /><div className="orb-light light-three" /><div className="orb-inner" /></div><span className="orb-star star-one">+</span><span className="orb-star star-two">+</span></div>
      <div className="atlas-name">ATLAS <span>YOUR TRAVEL COMPANION</span></div><h2>{listening ? 'I’m listening.' : busy ? 'Finding your somewhere.' : speaking ? 'A little inspiration for you.' : 'Let’s find your somewhere.'}</h2><p>{listening ? 'Tell me what your perfect trip feels like.' : 'A feeling, a place, a wild idea. Start anywhere.'}</p>
      <div className={`voice-wave ${state}`} aria-hidden="true">{Array.from({ length: 23 }, (_, i) => <i key={i} style={{ '--bar-height': `${7 + Math.sin(i * 1.8) ** 2 * 20}px`, '--bar-delay': `${i * .06}s` } as React.CSSProperties} />)}</div>
      <button className={`voice-main-button ${listening ? 'is-listening' : ''}`} onClick={() => void toggleVoice()} disabled={busy}>{listening ? <MicOff size={17} /> : <Mic size={17} />}{listening ? 'Finish speaking' : 'Talk to Atlas'}</button><span className="voice-hint">{listening ? 'Your microphone is on' : 'Or keep it quiet and type a message'}</span>
      <div className="atlas-footnote"><Compass size={15} /><p>Less searching.<br /><strong>More finding your kind of place.</strong></p></div>
    </section><section className="conversation-panel" aria-label="Conversation with Atlas"><div className="conversation-header"><span><Sparkles size={17} /><strong>Atlas</strong><span className="live-dot" /><small>{state === 'idle' ? 'Here to help' : state}</small></span><div><button className="icon-button" aria-label={voiceReplies ? 'Turn off spoken replies' : 'Turn on spoken replies'} aria-pressed={voiceReplies} onClick={() => { setVoiceReplies(!voiceReplies); if (voiceReplies) { window.speechSynthesis?.cancel(); setSpeaking(false); } }}>{voiceReplies ? <Volume2 size={16} /> : <VolumeX size={16} />}</button><button className="icon-button" aria-label="Start a new conversation" disabled={busy || listening} onClick={() => { setMessages([]); setError(''); setInput(''); window.speechSynthesis?.cancel(); setSpeaking(false); }}><RotateCcw size={14} /></button></div></div>
      <div className="conversation-messages" role="log" aria-live="polite">
        {!messages.length && <div className="welcome-message"><span className="message-avatar"><Sparkles size={16} /></span><div><span className="message-author">ATLAS</span><h3>The world is full of places that feel like you.</h3><p>Tell me what you’re dreaming of. A quiet coast? A city full of stories? A little adventure?</p><p>We’ll find a good place to start.</p><div className="prompt-grid">{[{ Icon: Leaf, title: 'Somewhere wild', prompt: 'I want a nature-filled adventure with beautiful hikes.' }, { Icon: Waves, title: 'Time to slow down', prompt: 'I want a relaxing trip by the coast.' }, { Icon: Compass, title: 'Culture & good food', prompt: 'Help me find a destination for culture and amazing food.' }, { Icon: Sparkles, title: 'Surprise me', prompt: 'Surprise me with a destination for my next trip.' }].map(({ Icon, title, prompt }) => <button key={title} onClick={() => void submit(prompt)}><Icon size={16} /><span>{title}</span><ArrowUpRight size={12} /></button>)}</div></div></div>}
        {messages.map((message, i) => <div className={`chat-message ${message.role}`} key={i}><span className="message-avatar">{message.role === 'assistant' ? <Sparkles size={14} /> : 'You'}</span><div><span className="message-author">{message.role === 'assistant' ? 'ATLAS' : 'YOU'}</span><p>{message.content}</p>{message.suggestions && <div className="reply-destinations">{message.suggestions.map(name => { const c = destinations.find(d => d.name === name); return c && <button key={name} onClick={() => onExplore(name)}><img src={photo(c.image!, 220)} alt="" /><span><small>{c.region}</small><strong>{name}</strong></span><ArrowUpRight size={14} /></button>; })}</div>}{message.role === 'assistant' && <button className="read-reply text-button" onClick={() => speak(message.content)}><Volume2 size={12} /> Listen to reply</button>}</div></div>)}
        {busy && <div className="thinking-indicator" role="status"><span /><span /><span /><small>Atlas is thinking</small></div>}<div ref={end} />
      </div>
      <div className="conversation-compose">{error && <p className="inline-error" role="alert">{error}</p>}<form onSubmit={e => { e.preventDefault(); void submit(input); }}><input aria-label="Message Atlas" placeholder={listening ? 'Listening to your adventure…' : 'What does your next adventure look like?'} value={input} onChange={e => setInput(e.target.value)} maxLength={2000} disabled={busy || listening} /><button className={`compose-mic ${listening ? 'active' : ''}`} type="button" aria-label={listening ? 'Stop voice input' : 'Use voice input'} disabled={busy} onClick={() => void toggleVoice()}><AudioLines size={18} /></button><button className="send-button" type="submit" aria-label="Send message" disabled={!input.trim() || busy || listening}><ArrowUp size={18} /></button></form><p>{mode === 'preview' ? 'Curated suggestions · Preview mode' : 'AI recommendations · A starting point for your own discovery'}</p></div>
    </section></div>
    {lastReply && <div className="assistant-followup"><Sparkles size={14} /><span>A good trip begins with curiosity.</span><button className="text-button" onClick={() => void submit('Can you help me narrow down the options?')} disabled={busy}>Help me narrow it down <ArrowUpRight size={13} /></button></div>}
  </div>;
}
