(function () {
  var script = document.currentScript;
  var track = (script && script.dataset.track) || 'main';
  var base = (script && script.dataset.base) || 'music/';
  var VOLUME = 0.5;
  var EXTENSIONS = ['mp3', 'ogg', 'wav', 'm4a', 'aac', 'opus', 'flac'];
  var MUTE_KEY = 'archive-music-muted';

  var audio = null;
  var started = false;
  var button = null;

  function isMuted() {
    try {
      return localStorage.getItem(MUTE_KEY) === '1';
    } catch (error) {
      return false;
    }
  }

  function saveMuted(value) {
    try {
      localStorage.setItem(MUTE_KEY, value ? '1' : '0');
    } catch (error) {
      return;
    }
  }

  function addStyles() {
    var style = document.createElement('style');
    style.textContent =
      '.music-toggle{position:fixed;right:16px;bottom:16px;z-index:400;min-width:44px;min-height:44px;padding:0 14px;' +
      'font-family:var(--font-mono,monospace);font-size:0.66rem;letter-spacing:0.2em;cursor:pointer;' +
      'color:var(--accent-text,#1fa7ff);background:rgba(var(--overlay-rgb,7,18,43),0.82);' +
      'border:1px solid rgba(var(--accent-rgb,31,167,255),0.6);transition:background 0.25s,color 0.25s}' +
      '.music-toggle:hover{background:var(--electric,#1fa7ff);color:#fff}' +
      '.music-toggle:focus-visible{outline:2px solid var(--electric,#1fa7ff);outline-offset:2px}' +
      '.music-toggle.is-off{opacity:0.7}';
    document.head.appendChild(style);
  }

  function updateButton() {
    if (!button) return;
    var muted = isMuted();
    button.textContent = muted ? 'ЗВУК: ВЫКЛ' : 'ЗВУК: ВКЛ';
    button.classList.toggle('is-off', muted);
    button.setAttribute('aria-pressed', String(!muted));
  }

  function addButton() {
    button = document.createElement('button');
    button.type = 'button';
    button.className = 'music-toggle';
    button.setAttribute('aria-label', 'Включить или выключить музыку');
    button.addEventListener('click', function (event) {
      event.stopPropagation();
      var muted = !isMuted();
      saveMuted(muted);
      updateButton();
      if (!audio) return;
      if (muted) {
        audio.pause();
      } else {
        play();
      }
    });
    updateButton();
    document.body.appendChild(button);
  }

  function play() {
    if (!audio || isMuted()) return;
    var attempt = audio.play();
    if (attempt && typeof attempt.then === 'function') {
      attempt.then(
        function () {
          started = true;
        },
        function () {
          started = false;
        }
      );
    }
  }

  function unlock() {
    ['pointerdown', 'keydown', 'touchstart', 'click'].forEach(function (name) {
      document.removeEventListener(name, onFirstInteraction, true);
    });
  }

  function onFirstInteraction() {
    if (started) {
      unlock();
      return;
    }
    play();
    setTimeout(function () {
      if (started) unlock();
    }, 300);
  }

  function waitForInteraction() {
    ['pointerdown', 'keydown', 'touchstart', 'click'].forEach(function (name) {
      document.addEventListener(name, onFirstInteraction, true);
    });
  }

  function findTrack(index, onFound) {
    if (index >= EXTENSIONS.length) return;
    var probe = new Audio();
    probe.preload = 'auto';
    var done = false;
    probe.addEventListener('loadedmetadata', function () {
      if (done) return;
      done = true;
      onFound(probe);
    });
    probe.addEventListener('error', function () {
      if (done) return;
      done = true;
      findTrack(index + 1, onFound);
    });
    probe.src = base + track + '.' + EXTENSIONS[index];
  }

  function init() {
    addStyles();
    addButton();
    findTrack(0, function (found) {
      audio = found;
      audio.loop = true;
      audio.volume = VOLUME;
      play();
      if (!started) waitForInteraction();
      else if (!audio.paused) started = true;
      audio.addEventListener('play', function () {
        started = true;
      });
    });
  }

  window.addEventListener('pageshow', function (event) {
    if (event.persisted && audio) play();
  });

  if (document.body) {
    init();
  } else {
    document.addEventListener('DOMContentLoaded', init);
  }
})();
