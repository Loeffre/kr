const signalImage = document.getElementById('signal-image');
const signalPlaceholder = document.getElementById('signal-placeholder');
const signalCaption = document.getElementById('signal-caption');
const signalExit = document.getElementById('signal-exit');

const revealCaption = () => signalCaption.classList.add('is-visible');

findImage(
  '../images/',
  'secret-image',
  (url) => {
    signalImage.onload = revealCaption;
    signalImage.src = url;
    signalImage.classList.add('is-ready');
  },
  () => {
    signalPlaceholder.classList.add('is-ready');
    revealCaption();
  }
);

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    window.location.href = signalExit.href;
  }
});
