/**
 * Sanpi Order Notification Audio & TTS Service
 * Speaks "Sanpi" using Web Speech API + Web Audio API Chime Tone
 * Protected against AbortError, interrupted SpeechSynthesis states, and AudioContext restrictions.
 */

let activeAudioCtx: AudioContext | null = null;

export function playSanpiChimeSound() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    
    // Reuse or create AudioContext safely
    if (!activeAudioCtx || activeAudioCtx.state === 'closed') {
      activeAudioCtx = new AudioCtx();
    }

    if (activeAudioCtx.state === 'suspended') {
      activeAudioCtx.resume().catch(() => {
        // Autoplay policy prevented resuming before user interaction; ignore silently
      });
    }

    const ctx = activeAudioCtx;
    
    // Play dual-tone pleasant Sanpi notification chime
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sine';
    osc2.type = 'triangle';

    // Frequencies for a pleasant chord (E5 to B5)
    osc1.frequency.setValueAtTime(659.25, ctx.currentTime); // E5
    osc1.frequency.exponentialRampToValueAtTime(987.77, ctx.currentTime + 0.15); // B5

    osc2.frequency.setValueAtTime(329.63, ctx.currentTime); // E4
    osc2.frequency.exponentialRampToValueAtTime(493.88, ctx.currentTime + 0.15); // B4

    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(ctx.currentTime);
    osc2.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.5);
    osc2.stop(ctx.currentTime + 0.5);
  } catch (e) {
    // Suppress audio context restrictions
    console.debug('AudioContext chime notification ignored:', e);
  }
}

export function speakSanpi(onEnd?: () => void) {
  // First play the audio chime
  try {
    playSanpiChimeSound();
  } catch {
    // Ignore chime sound errors
  }

  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      const utterance = new SpeechSynthesisUtterance("Sanpi");
      utterance.lang = 'es-DO'; // Dominican Spanish / Spanish
      utterance.rate = 1.0;
      utterance.pitch = 1.1;
      utterance.volume = 0.9;
      
      // Try to find Spanish voice
      try {
        const voices = window.speechSynthesis.getVoices();
        const esVoice = voices.find(v => v.lang && v.lang.toLowerCase().startsWith('es'));
        if (esVoice) {
          utterance.voice = esVoice;
        }
      } catch {
        // Ignore getVoices errors
      }

      utterance.onend = () => {
        if (onEnd) onEnd();
      };

      // Suppress speech synthesis cancellation and abort events
      utterance.onerror = (event) => {
        // Normal browser events like 'interrupted', 'canceled', 'audio-busy', 'network'
        if (onEnd) onEnd();
      };

      // Avoid canceling immediately right before speaking on Chrome, as it cancels the new utterance with AbortError
      if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
        try {
          window.speechSynthesis.cancel();
        } catch {
          // Ignore cancel error
        }
      }

      // Small tick delay to let previous cancel flush cleanly without aborting new utterance
      setTimeout(() => {
        try {
          window.speechSynthesis.speak(utterance);
        } catch (err) {
          console.debug("TTS Speech Synthesis speak prevented:", err);
          if (onEnd) onEnd();
        }
      }, 50);

    } catch (err) {
      console.debug("TTS Speech Synthesis initialization prevented:", err);
      if (onEnd) onEnd();
    }
  } else {
    if (onEnd) onEnd();
  }
}

