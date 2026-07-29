(function () {
  "use strict";

  if (window.kinopultInstallerLoaded) return;
  window.kinopultInstallerLoaded = true;

  var current = document.currentScript && document.currentScript.src;
  var base = current ? new URL(".", current).href : "https://crimea-fuel-map.github.io/kinopult/";
  var script = document.createElement("script");

  script.src = base + "kinopult.js?v=" + Date.now();
  script.async = true;
  script.onerror = function () {
    if (window.Lampa && Lampa.Noty) {
      Lampa.Noty.show("КиноПульт: не удалось загрузить свежую версию");
    }
  };

  document.head.appendChild(script);
})();

