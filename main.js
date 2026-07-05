const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

// نفس الرابط المستخدم بالضبط داخل submission-hub.html (submissions_api.php المشترك)
const API_URL = 'https://www.arabiantravelsnews.com/tourism-data/submissions_api.php';

let gatewayWindow;

function createGatewayWindow() {
  gatewayWindow = new BrowserWindow({
    width: 480,
    height: 560,
    resizable: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  gatewayWindow.setMenuBarVisibility(false);
  gatewayWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

app.whenReady().then(() => {
  createGatewayWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createGatewayWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ---------- نافذة المستخدم (تسجيل بيانات) ----------
// بتحمّل submission-hub.html نفسه (الفورم الموحد الحقيقي، مش iframes)
// وبتخطى شاشة الدخول تلقائيًا عن طريق #mode=user

function openUserWindow() {
  const win = new BrowserWindow({
    width: 1050,
    height: 880,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false,
      additionalArguments: ['--atn-mode=user']
    }
  });
  win.setMenuBarVisibility(false);
  win.loadFile(path.join(__dirname, 'submission-hub.html'));
  if (gatewayWindow && !gatewayWindow.isDestroyed()) gatewayWindow.hide();
  win.on('closed', () => {
    if (gatewayWindow && !gatewayWindow.isDestroyed()) gatewayWindow.show();
  });
  return win;
}

// ---------- نافذة الأدمن ----------
// تسجيل دخول واحد بس (بيتحقق من كلمة السر مرة واحدة من العملية الرئيسية)، وبعدين
// submission-hub.html بيستقبل الباسورد عن طريق #mode=admin&pwd=... ويدخل مباشرة
// على لوحة الأدمن في التابين (فنادق + معالم) من غير أي طلب "login" إضافي للسيرفر.

function openAdminWindow(password) {
  const win = new BrowserWindow({
    width: 1150,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false,
      additionalArguments: ['--atn-mode=admin', `--atn-pwd=${password}`]
    }
  });
  win.setMenuBarVisibility(false);
  win.loadFile(path.join(__dirname, 'submission-hub.html'));
  if (gatewayWindow && !gatewayWindow.isDestroyed()) gatewayWindow.hide();
  win.on('closed', () => {
    if (gatewayWindow && !gatewayWindow.isDestroyed()) gatewayWindow.show();
  });
  return win;
}

// ---------- IPC ----------

ipcMain.handle('open-user', () => {
  openUserWindow();
});

// تحقق واحد فقط من كلمة سر الأدمن، من العملية الرئيسية مباشرة (نفس آلية curl المضمونة)
ipcMain.handle('admin-login', async (evt, rawPassword) => {
  const password = String(rawPassword || '').trim();
  if (!password) return { ok: false, error: 'أدخل كلمة السر' };
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'login', password })
    });
    if (!res.ok) return { ok: false, error: `تعذر الاتصال بالسيرفر (HTTP ${res.status})` };
    const data = await res.json();
    if (!data.ok) return { ok: false, error: 'كلمة السر غير صحيحة' };
    openAdminWindow(password);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: 'تعذر الاتصال بالسيرفر: ' + err.message };
  }
});
