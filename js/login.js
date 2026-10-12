const ACCOUNTS = [
  { login: 'Крих Вейль', password: '7.TGE3128TGF', role: 'full' },
  { login: 'Гость', password: '676767', role: 'limited' }
];
const ACCESS_KEY = 'archive-access';
const GRANTED_MS = 900;

let userRole = null;

const loginScreen = document.getElementById('login');
const loginForm = document.getElementById('login-form');
const loginName = document.getElementById('login-name');
const loginPassword = document.getElementById('login-password');
const loginMessage = document.getElementById('login-message');

const normalizeName = (value) => value.trim().replace(/\s+/g, ' ').toLowerCase();

function findAccount(name, password) {
  return (
    ACCOUNTS.find(
      (account) => normalizeName(account.login) === normalizeName(name) && account.password === password
    ) || null
  );
}

function readSession() {
  try {
    const stored = JSON.parse(sessionStorage.getItem(ACCESS_KEY));
    return ACCOUNTS.find((account) => account.login === stored.name && account.role === stored.role) || null;
  } catch (error) {
    return null;
  }
}

function rememberSession(account) {
  try {
    sessionStorage.setItem(ACCESS_KEY, JSON.stringify({ name: account.login, role: account.role }));
  } catch (error) {
    return;
  }
}

function forgetSession() {
  try {
    sessionStorage.removeItem(ACCESS_KEY);
    sessionStorage.removeItem('archive-tech-notice');
  } catch (error) {
    return;
  }
}

function applyAccount(account) {
  userRole = account.role;
  document.body.classList.toggle('theme-full', account.role === 'full');
  document.getElementById('operator-name').textContent = account.login;
  document.getElementById('access-level').textContent = account.role === 'full' ? 'FULL ACCESS' : 'RESTRICTED';
  if (typeof selectTab === 'function') selectTab(state.tab);
}

function unlock() {
  document.body.classList.remove('is-locked');
  loginScreen.classList.add('is-granted');
  setTimeout(() => loginScreen.remove(), GRANTED_MS);
  setTimeout(() => {
    if (typeof maybeShowTechNotice === 'function') maybeShowTechNotice();
  }, GRANTED_MS);
}

function deny() {
  loginMessage.textContent = 'ДОСТУП ЗАПРЕЩЁН // НЕВЕРНЫЕ ДАННЫЕ';
  loginPassword.value = '';
  loginForm.classList.remove('is-denied');
  void loginForm.offsetWidth;
  loginForm.classList.add('is-denied');
  loginPassword.focus();
}

document.getElementById('logout').addEventListener('click', () => {
  forgetSession();
  window.location.reload();
});

const remembered = readSession();

if (remembered) {
  applyAccount(remembered);
  document.body.classList.remove('is-locked');
  loginScreen.remove();
} else {
  loginName.focus();
  loginForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const account = findAccount(loginName.value, loginPassword.value);
    if (account) {
      loginMessage.textContent = 'ДОСТУП РАЗРЕШЁН';
      rememberSession(account);
      applyAccount(account);
      unlock();
    } else {
      deny();
    }
  });
}
