(function () {
  "use strict";

  if (window.kinopultPluginReady) return;
  window.kinopultPluginReady = true;

  var kinopultIcon =
    '<svg width="128" height="128" viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg">' +
    '<rect x="14" y="24" width="100" height="72" rx="12" stroke="currentColor" stroke-width="9"/>' +
    '<path d="M52 45L84 60L52 77V45Z" fill="currentColor"/>' +
    '<path d="M45 108H83" stroke="currentColor" stroke-width="9" stroke-linecap="round"/>' +
    "</svg>";

  var sources = [
    { id: "bwa", name: "BWA", urls: ["http://bwa.ad/rc"] },
    { id: "stream", name: "Онлайн Stream", urls: ["http://arkmv.ru/vod"] },
    { id: "online_mod", name: "Онлайн Мод", urls: ["https://nb557.github.io/plugins/online_mod.js"] },
    { id: "modss", name: "Онлайн MODS's", urls: ["http://lampa.stream/modss"] },
    { id: "showy", name: "Онлайн SHOWY", urls: ["http://showwwy.com/m.js"] },
    { id: "filmix", name: "Онлайн Filmix", urls: ["https://lampaplugins.github.io/store/fx.js"] },
    { id: "skaz", name: "Онлайн Skaz", urls: ["http://skaz.tv/onlines.js"] },
    { id: "z01", name: "Z01", urls: ["http://z01.online/live"] },
    {
      id: "smotret24",
      name: "Smotret24",
      urls: ["http://smotret24.ru/online.js", "http://smotret24.com/online.js"],
    },
    { id: "wtch", name: "WTCH", urls: ["http://wtch.ch/m"] },
    { id: "lumio", name: "Lumio", urls: ["http://beta.mitsu.tv/plugins/lumio.js"] },
    { id: "mir_kino", name: "Мир Кино", urls: ["http://lampa.mir-kino.top/"] },
    { id: "alpac", name: "Alpac", urls: ["https://beta.l-vid.online/on.js"] },
  ];

  function loadSource(source, urlIndex) {
    var index = urlIndex || 0;
    var url = source.urls[index];

    if (!url || document.getElementById("kinopult-source-" + source.id)) return;

    var script = document.createElement("script");
    script.id = "kinopult-source-" + source.id;
    script.src = url;
    script.async = true;
    script.onload = function () {
      Lampa.Noty.show(source.name + ": подключён");
    };
    script.onerror = function () {
      script.parentNode.removeChild(script);

      if (source.urls[index + 1]) {
        loadSource(source, index + 1);
      } else {
        Lampa.Noty.show(source.name + ": не удалось загрузить");
      }
    };

    document.head.appendChild(script);
  }

  function addSourceSetting(source) {
    var storageName = "kinopult_source_" + source.id;

    Lampa.SettingsApi.addParam({
      component: "kinopult",
      param: {
        name: storageName,
        type: "select",
        values: {
          off: "Выключен",
          on: "Включён",
        },
        default: "off",
      },
      field: {
        name: source.name,
        description: "Сторонний источник. Для отключения потребуется перезапуск Lampa",
      },
      onChange: function (value) {
        Lampa.Storage.set(storageName, value);

        if (value === "on") {
          loadSource(source);
        } else {
          Lampa.Noty.show(source.name + ": выключится после перезапуска");
        }
      },
    });

    if (Lampa.Storage.get(storageName, "off") === "on") {
      loadSource(source);
    }
  }

  function startPlugin() {
    if (!window.Lampa || !Lampa.SettingsApi) {
      setTimeout(startPlugin, 500);
      return;
    }

    if (window.kinopultSettingsAdded) return;
    window.kinopultSettingsAdded = true;

    Lampa.SettingsApi.addComponent({
      component: "kinopult",
      name: "КиноПульт",
      icon: kinopultIcon,
    });

    Lampa.SettingsApi.addParam({
      component: "kinopult",
      param: {
        name: "kinopult_connection_test",
        type: "trigger",
        default: false,
      },
      field: {
        name: "Проверить подключение",
        description: "Нажмите, чтобы убедиться, что плагин работает",
      },
      onChange: function () {
        Lampa.Noty.show("КиноПульт подключён");
      },
    });

    sources.forEach(addSourceSetting);

    Lampa.Noty.show("Плагин КиноПульт установлен");
  }

  startPlugin();
})();
