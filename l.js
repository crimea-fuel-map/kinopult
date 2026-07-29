(function () {
  "use strict";

  if (window.kinopultPluginReady) return;
  window.kinopultPluginReady = true;

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
    });

    Lampa.SettingsApi.addParam({
      component: "kinopult",
      param: {
        name: "kinopult_connection_test",
        type: "trigger",
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
