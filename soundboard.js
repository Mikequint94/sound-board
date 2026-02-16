(() => {
  const state = {
    // 0.0 - 1.0
    volume: 0.5,
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

  function setBackgroundVolumeIfPlaying() {
    const bg = getAudioForKeyCode(32);
    if (!bg || bg.paused) return;
    bg.volume = Math.min(state.volume, 0.5);
  }

  function toggleBackgroundBeat() {
    const keyCode = 32;
    const audio = getAudioForKeyCode(keyCode);
    const button = getButtonForKeyCode(keyCode);
    if (!audio || !button) return;

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
    if (!audio || !button) return;

    button.classList.add('playing');
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
    document.addEventListener('click', (e) => {
      const btn = e.target.closest && e.target.closest('button.key');
      if (!btn) return;
      const keyCode = Number(btn.dataset.key);
      if (!Number.isFinite(keyCode)) return;
      playSound(keyCode);
    });

    // Keyboard
    window.addEventListener('keydown', (e) => {
      const keyCode = keyEventToKeyCode(e);
      if (!keyCode) return;
      if (keyCode === 32) e.preventDefault(); // prevent page scroll
      playSound(keyCode);
    });

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
