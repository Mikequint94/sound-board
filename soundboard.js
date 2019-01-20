window.addEventListener('keydown', (e) => {
  playMusic(e.keyCode);
});
keys.forEach((key) => {
  key.addEventListener('click', (e) => {
    let keyCode = e.target.dataset.key || e.target.parentElement.dataset.key;
    playMusic(keyCode);
  })
})

function playMusic(keyCode) {
  const audio = document.querySelector(`audio[data-key="${keyCode}"]`);
  if(!audio) return;
  audio.currentTime = 0;
  
  const key = document.querySelector(`div[data-key="${keyCode}"]`);
  
  key.classList.add('playing');
  
  if (audio.dataset.key === "32") {
    audio.volume = 0.5;
  } else {
    audio.volume = (parseInt(document.documentElement.style.cssText.slice(9,11)) / 100) || 0.5;
  }
  audio.play();
}

function getKeyCode(char) {
  var keyCode = char.charCodeAt(0);
  if(keyCode > 90) {  // 90 is keyCode for 'z'
    return 32;
  }
  return keyCode;
}
