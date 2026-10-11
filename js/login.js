const ACCESS_LOGIN = 'Крих Вейль';
const ACCESS_PASSWORD = '7.TGE3128TGF';
const ACCESS_KEY = 'archive-access';
const GRANTED_MS = 900;

const loginScreen = document.getElementById('login');
const loginForm = document.getElementById('login-form');
const loginName = document.getElementById('login-name');
const loginPassword = document.getElementById('login-password');
const loginMessage = document.getElementById('login-message');

const normalizeName = (value) => value.trim().replace(/\s+/g, ' ').toLowerCase();

function accessRemembered() {
  try {
    return sessionStorage.getItem(ACCESS_KEY) === 'granted';
  } catch (error) {
    return false;
  }
}

function rememberAccess() {
  try {
    sessionStorage.setItem(ACCESS_KEY, 'granted');
  } catch (error) {
    return;
  }
}

function unlock() {
  document.body.classList.remove('is-locked');
  loginScreen.classList.add('is-granted');
  setTimeout(() => loginScreen.remove(), GRANTED_MS);
}

function deny() {
  loginMessage.textContent = 'ДОСТУП ЗАПРЕЩЁН // НЕВЕРНЫЕ ДАННЫЕ';
  loginPassword.value = '';
  loginForm.classList.remove('is-denied');
  void loginForm.offsetWidth;
  loginForm.classList.add('is-denied');
  loginPassword.focus();
}

if (accessRemembered()) {
  document.body.classList.remove('is-locked');
  loginScreen.remove();
} else {
  loginName.focus();
  loginForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const nameMatches = normalizeName(loginName.value) === normalizeName(ACCESS_LOGIN);
    const passwordMatches = loginPassword.value === ACCESS_PASSWORD;
    if (nameMatches && passwordMatches) {
      loginMessage.textContent = 'ДОСТУП РАЗРЕШЁН';
      rememberAccess();
      unlock();
    } else {
      deny();
    }
  });
}
