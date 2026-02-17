(() => {
  const state = {
    // 0.0 - 1.0
    volume: 0.5,
  };

  const audioEngine = {
    context: null,
    masterGain: null,
    buffers: new Map(), // keyCode -> AudioBuffer
    bg: null, // { source, gain }
    ready: false,
    initializing: null,
  };

  function clamp(n, min, max) {
    return Math.min(max, Math.max(min, n));
  }

  function keyEventToKeyCode(e) {
    // Modern: prefer `code`
    if (e && typeof e.code === 'string') {
      if (e.code === 'Space') return 32;
      if (e.code.startsWith('Key') && e.code.length === 4) {
        return e.code.charCodeAt(3);
      }
    }

    // Fallback: `key`
    if (e && typeof e.key === 'string') {
      if (e.key === ' ') return 32;
      if (e.key.length === 1) return e.key.toUpperCase().charCodeAt(0);
    }

    // Legacy: `keyCode`
    if (e && typeof e.keyCode === 'number') return e.keyCode;

    return null;
  }

  function removeTransition(e) {
    // Only end the animation when the transform finishes.
    if (e.propertyName && e.propertyName !== 'transform') return;
    e.currentTarget.classList.remove('playing');
    e.currentTarget.classList.remove('playingbackground');
  }

  function setCssVar(name, value) {
    document.documentElement.style.setProperty(name, value);
  }

  function getButtonForKeyCode(keyCode) {
    return document.querySelector(`button.key[data-key="${keyCode}"]`);
  }

  function getAudioForKeyCode(keyCode) {
    return document.querySelector(`audio[data-key="${keyCode}"]`);
  }

  function setMasterVolume() {
    if (!audioEngine.masterGain) return;
    const now = audioEngine.context?.currentTime ?? 0;
    const target = clamp(state.volume, 0, 1);
    try {
      audioEngine.masterGain.gain.cancelScheduledValues(now);
      audioEngine.masterGain.gain.setTargetAtTime(target, now, 0.015);
    } catch {
      audioEngine.masterGain.gain.value = target;
    }
  }

  function setBackgroundVolumeWebAudio() {
    if (!audioEngine.bg || !audioEngine.bg.gain) return;
    const now = audioEngine.context?.currentTime ?? 0;
    const target = Math.min(state.volume, 0.5);
    try {
      audioEngine.bg.gain.gain.cancelScheduledValues(now);
      audioEngine.bg.gain.gain.setTargetAtTime(target, now, 0.02);
    } catch {
      audioEngine.bg.gain.gain.value = target;
    }
  }

  function setBackgroundVolumeIfPlaying() {
    const bg = getAudioForKeyCode(32);
    if (!bg || bg.paused) return;
    bg.volume = Math.min(state.volume, 0.5);
  }

  async function ensureAudioEngine() {
    if (audioEngine.ready) return;
    if (audioEngine.initializing) return audioEngine.initializing;

    audioEngine.initializing = (async () => {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;

      const context = new Ctx({ latencyHint: 'interactive' });
      audioEngine.context = context;
      audioEngine.masterGain = context.createGain();
      audioEngine.masterGain.connect(context.destination);
      setMasterVolume();

      // Some browsers start suspended until a gesture.
      if (context.state === 'suspended') {
        try {
          await context.resume();
        } catch {
          // ignore
        }
      }

      // Warm up HTMLAudio elements too (helps Safari sometimes).
      document.querySelectorAll('audio[data-key]').forEach((el) => {
        try {
          el.load();
        } catch {
          // ignore
        }
      });

      const audioEls = Array.from(document.querySelectorAll('audio[data-key]'));
      await Promise.allSettled(
        audioEls.map(async (el) => {
          const key = Number(el.dataset.key);
          const srcAttr = el.getAttribute('src');
          if (!Number.isFinite(key) || !srcAttr) return;

          const url = new URL(srcAttr, window.location.href).toString();
          const res = await fetch(url, { cache: 'force-cache' });
          const buf = await res.arrayBuffer();
          const audioBuffer = await context.decodeAudioData(buf);
          audioEngine.buffers.set(key, audioBuffer);
        })
      );

      audioEngine.ready = true;
    })();

    return audioEngine.initializing;
  }

  function playWebAudioOneShot(keyCode) {
    const buffer = audioEngine.buffers.get(keyCode);
    if (!audioEngine.context || !audioEngine.masterGain || !buffer) return false;

    const source = audioEngine.context.createBufferSource();
    source.buffer = buffer;
    source.connect(audioEngine.masterGain);
    source.start(0);
    return true;
  }

  function startWebAudioBackgroundBeat() {
    const keyCode = 32;
    const buffer = audioEngine.buffers.get(keyCode);
    if (!audioEngine.context || !audioEngine.masterGain || !buffer) return false;

    // Stop existing if any.
    if (audioEngine.bg?.source) {
      try {
        audioEngine.bg.source.stop();
      } catch {
        // ignore
      }
      audioEngine.bg = null;
    }

    const source = audioEngine.context.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const gain = audioEngine.context.createGain();
    gain.gain.value = Math.min(state.volume, 0.5);

    source.connect(gain);
    gain.connect(audioEngine.masterGain);

    source.start(0);
    audioEngine.bg = { source, gain };
    return true;
  }

  function stopWebAudioBackgroundBeat() {
    if (!audioEngine.bg?.source) return;
    try {
      audioEngine.bg.source.stop();
    } catch {
      // ignore
    }
    audioEngine.bg = null;
  }

  function toggleBackgroundBeat() {
    const keyCode = 32;
    const audio = getAudioForKeyCode(keyCode);
    const button = getButtonForKeyCode(keyCode);
    if (!button) return;

    // Prefer WebAudio if ready.
    if (audioEngine.ready && audioEngine.buffers.has(keyCode)) {
      const isPlaying = Boolean(audioEngine.bg);
      if (isPlaying) {
        stopWebAudioBackgroundBeat();
        button.classList.remove('playingbackground');
      } else {
        startWebAudioBackgroundBeat();
        button.classList.add('playingbackground');
      }
      return;
    }

    if (!audio) return;

    audio.loop = true;
    audio.volume = Math.min(state.volume, 0.5);

    if (!audio.paused) {
      audio.pause();
      audio.currentTime = 0;
      button.classList.remove('playingbackground');
      return;
    }

    audio.currentTime = 0;
    button.classList.add('playingbackground');
    audio.play().catch(() => {});
  }

  function playSound(keyCode) {
    if (keyCode === 32) {
      toggleBackgroundBeat();
      return;
    }

    const audio = getAudioForKeyCode(keyCode);
    const button = getButtonForKeyCode(keyCode);
    if (!button) return;

    button.classList.add('playing');

    // Prefer WebAudio if ready.
    if (audioEngine.ready && audioEngine.buffers.has(keyCode)) {
      playWebAudioOneShot(keyCode);
      return;
    }

    if (!audio) return;
    audio.currentTime = 0;
    audio.volume = state.volume;
    audio.play().catch(() => {});
  }

  function init() {
    // Initial CSS vars
    const baseInput = document.getElementById('base');
    if (baseInput) setCssVar('--base', baseInput.value);

    const volumeInput = document.getElementById('volume');
    if (volumeInput) {
      state.volume = clamp(Number(volumeInput.value) / 100, 0, 1);
      setCssVar('--volume', String(state.volume));
    }

    // Animate keys
    document.querySelectorAll('button.key').forEach((btn) => {
      btn.addEventListener('transitionend', removeTransition);
    });

    // Mouse / touch
    document.addEventListener(
      'pointerdown',
      (e) => {
        // Kick off low-latency audio on first gesture (don’t block the tap).
        ensureAudioEngine().then(() => {
          setMasterVolume();
          setBackgroundVolumeWebAudio();
        });

        const btn = e.target.closest && e.target.closest('button.key');
        if (!btn) return;
        const keyCode = Number(btn.dataset.key);
        if (!Number.isFinite(keyCode)) return;
        playSound(keyCode);
      },
      { passive: true }
    );

    // Keyboard
    window.addEventListener('keydown', (e) => {
      // Kick off low-latency audio on first gesture.
      ensureAudioEngine().then(() => {
        setMasterVolume();
        setBackgroundVolumeWebAudio();
      });

      const keyCode = keyEventToKeyCode(e);
      if (!keyCode) return;
      if (keyCode === 32) e.preventDefault(); // prevent page scroll
      playSound(keyCode);
    });

    // (Old click handler removed – pointerdown is faster on mobile.)

    // Customization controls
    if (baseInput) {
      baseInput.addEventListener('input', () => {
        setCssVar('--base', baseInput.value);
      });
    }

    if (volumeInput) {
      const updateVolume = () => {
        state.volume = clamp(Number(volumeInput.value) / 100, 0, 1);
        setCssVar('--volume', String(state.volume));
        setBackgroundVolumeIfPlaying();
        setMasterVolume();
        setBackgroundVolumeWebAudio();
      };
      volumeInput.addEventListener('input', updateVolume);
      volumeInput.addEventListener('change', updateVolume);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
