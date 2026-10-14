const fs = require('fs');

const filePath = 'd:/Development/Projects/Formo/mobile/src/i18n/index.js';
const content = fs.readFileSync(filePath, 'utf-8');

const uzKeys = `    login: 'Kirish', register: "Ro'yxatdan o'tish", phone: 'Telefon', password: 'Parol', confirmPassword: 'Parolni tasdiqlang', fullName: "To'liq ism", loginButton: 'Kirish', registerButton: "Ro'yxatdan o'tish", loginError: "Telefon yoki parol noto'g'ri", networkError: 'Tarmoq xatosi', loggingIn: 'Kirilmoqda...', registering: "Ro'yxatdan o'tilmoqda...", noAccount: "Akkauntingiz yo'qmi?", haveAccount: 'Akkauntingiz bormi?', welcome: 'Xush kelibsiz', welcomeSub: 'Formo ga qaytib keling', logoutConfirm: 'Chiqishni tasdiqlaysizmi?', deleteConfirm: "O'chirishni tasdiqlaysizmi?", deleteAccountConfirmSub: "Bu amal qaytarib bo'lmaydi", confirmQuestion: 'Tasdiqlash?', authError: 'Kirish xatosi',`;

const ruKeys = `    login: 'Войти', register: 'Регистрация', phone: 'Телефон', password: 'Пароль', confirmPassword: 'Подтвердите пароль', fullName: 'Полное имя', loginButton: 'Войти', registerButton: 'Зарегистрироваться', loginError: 'Неверный телефон или пароль', networkError: 'Ошибка сети', loggingIn: 'Вход...', registering: 'Регистрация...', noAccount: 'Нет аккаунта?', haveAccount: 'Уже есть аккаунт?', welcome: 'Добро пожаловать', welcomeSub: 'Рады вас видеть в Formo', logoutConfirm: 'Выйти из аккаунта?', deleteConfirm: 'Удалить аккаунт?', deleteAccountConfirmSub: 'Это действие нельзя отменить', confirmQuestion: 'Подтвердить?', authError: 'Ошибка входа',`;

const enKeys = `    login: 'Login', register: 'Register', phone: 'Phone', password: 'Password', confirmPassword: 'Confirm password', fullName: 'Full name', loginButton: 'Login', registerButton: 'Register', loginError: 'Wrong phone or password', networkError: 'Network error', loggingIn: 'Logging in...', registering: 'Registering...', noAccount: 'No account?', haveAccount: 'Have an account?', welcome: 'Welcome', welcomeSub: 'Good to see you at Formo', logoutConfirm: 'Log out?', deleteConfirm: 'Delete account?', deleteAccountConfirmSub: 'This cannot be undone', confirmQuestion: 'Confirm?', authError: 'Login error',`;

const lines = content.split('\n');
const newLines = [];
let uzDone = false, ruDone = false, enDone = false;

for (const line of lines) {
  newLines.push(line);
  if (!uzDone && line.includes("helpSub:") && line.includes("24/7 aloqa")) {
    newLines.push(uzKeys);
    uzDone = true;
  } else if (!ruDone && line.includes("helpSub:") && line.includes("\u041f\u043e\u0434\u0434\u0435\u0440\u0436\u043a\u0430")) {
    newLines.push(ruKeys);
    ruDone = true;
  } else if (!enDone && line.includes("helpSub:") && line.includes("24/7 support")) {
    newLines.push(enKeys);
    enDone = true;
  }
}

fs.writeFileSync(filePath, newLines.join('\n'), 'utf-8');
console.log('uz:', uzDone, 'ru:', ruDone, 'en:', enDone);
