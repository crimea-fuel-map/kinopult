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

    Lampa.SettingsApi.addParam({
      component: "kinopult",
      param: {
        name: "kinopult_default_source",
        type: "select",
        values: {
          auto: "Автоматически",
          rezka: "HDRezka",
          showy: "Showy",
          filmix: "Filmix",
        },
        default: "auto",
      },
      field: {
        name: "Источник по умолчанию",
        description: "Подключение источников будет добавлено следующим этапом",
      },
      onChange: function (value) {
        Lampa.Storage.set("kinopult_default_source", value);
      },
    });

    Lampa.Noty.show("Плагин КиноПульт установлен");
  }

  startPlugin();
})();
