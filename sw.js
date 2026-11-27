const VERSAO = "v2";
const ARQUIVOS = [
  "./", "index.html", "css/style.css", "manifest.webmanifest",
  "js/app.js", "js/config.js", "js/calculos.js", "js/formato.js", "js/armazenamento.js",
  "js/dom.js", "js/dividas.js", "js/ui-dividas.js",
  "icons/icon-192.png", "icons/icon-512.png",
];

// Instalação: guarda os arquivos do app no aparelho.
self.addEventListener("install", (evento) => {
  evento.waitUntil(caches.open(VERSAO).then((cache) => cache.addAll(ARQUIVOS)));
  self.skipWaiting();
});

// Ativação: apaga guardados de versões antigas.
self.addEventListener("activate", (evento) => {
  evento.waitUntil(
    caches.keys().then((chaves) =>
      Promise.all(chaves.filter((c) => c !== VERSAO).map((c) => caches.delete(c))),
    ),
  );
  self.clients.claim();
});

// Uso: tenta a internet primeiro (assim você sempre recebe a versão mais nova)
// e, sem internet, usa a cópia guardada.
self.addEventListener("fetch", (evento) => {
  if (evento.request.method !== "GET") return;
  evento.respondWith(
    fetch(evento.request)
      .then((resposta) => {
        const copia = resposta.clone();
        caches.open(VERSAO).then((cache) => cache.put(evento.request, copia));
        return resposta;
      })
      .catch(() => caches.match(evento.request)),
  );
});