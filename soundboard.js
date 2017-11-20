window.addEventListener('keydown', (e) => {
  const audio = document.querySelector(`audio[data-key="${e.keyCode}"]`);
  if(!audio) return;
  audio.currentTime = 0;

  const key = document.querySelector(`div[data-key="${e.keyCode}"]`);

  key.classList.add('playing');

  if (audio.dataset.key === "32") {
    audio.volume = 0.5;
  } else {
    console.log(document.documentElement.style.cssText.slice(9,11));
    audio.volume = (parseInt(document.documentElement.style.cssText.slice(9,11)) / 100) || 0.5;
  }
  audio.play();
});
