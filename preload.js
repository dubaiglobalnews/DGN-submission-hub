const { contextBridge, ipcRenderer } = require('electron');

// قراءة الوسائط اللي البروسيز الرئيسي بيبعتها لكل نافذة (mode / password)
// طريقة أضمن من الاعتماد على الرابط (hash)، ومفيش أي طلب "login" تاني على السيرفر
function getArg(name) {
  const prefix = `--${name}=`;
  const found = process.argv.find((a) => a.startsWith(prefix));
  return found ? found.slice(prefix.length) : null;
}

contextBridge.exposeInMainWorld('api', {
  openUser: () => ipcRenderer.invoke('open-user'),
  adminLogin: (password) => ipcRenderer.invoke('admin-login', password)
});

contextBridge.exposeInMainWorld('atnBoot', {
  mode: getArg('atn-mode'),
  pwd: getArg('atn-pwd')
});
