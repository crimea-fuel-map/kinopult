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
    { id: "bwa", name: "BWA", match: ["bwa"], urls: ["http://bwa.ad/rc"] },
    { id: "stream", name: "Онлайн Stream", match: ["stream"], urls: ["http://arkmv.ru/vod"] },
    { id: "online_mod", name: "Онлайн Мод", match: ["online mod", "online_mod"], urls: ["https://nb557.github.io/plugins/online_mod.js"] },
    { id: "modss", name: "Онлайн MODS's", match: ["mods", "modss"], urls: ["http://lampa.stream/modss"] },
    { id: "showy", name: "Онлайн SHOWY", match: ["showy"], urls: ["http://showwwy.com/m.js"] },
    { id: "filmix", name: "Онлайн Filmix", match: ["filmix", "fx"], urls: ["https://lampaplugins.github.io/store/fx.js"] },
    { id: "skaz", name: "Онлайн Skaz", match: ["skaz"], urls: ["http://skaz.tv/onlines.js"] },
    { id: "z01", name: "Z01", match: ["z01", "lampac_z"], urls: ["http://z01.online/live"] },
    {
      id: "smotret24",
      name: "Smotret24",
      match: ["smotret24"],
      urls: ["http://smotret24.ru/online.js", "http://smotret24.com/online.js"],
    },
    { id: "wtch", name: "WTCH", match: ["wtch"], urls: ["http://wtch.ch/m"] },
    { id: "lumio", name: "Lumio", match: ["lumio"], urls: ["http://beta.mitsu.tv/plugins/lumio.js"] },
    { id: "mir_kino", name: "Мир Кино", match: ["mir kino", "mir_kino", "мир кино"], urls: ["http://lampa.mir-kino.top/"] },
    { id: "alpac", name: "Alpac", match: ["alpac"], urls: ["https://beta.l-vid.online/on.js"] },
  ];

  function videoPlugins() {
    var plugins = Lampa.Manifest && Lampa.Manifest.plugins;
    var result = [];

    if (Array.isArray(plugins)) return plugins.slice();

    if (plugins && plugins.type) return [plugins];

    if (plugins && typeof plugins === "object") {
      Object.keys(plugins).forEach(function (key) {
        if (plugins[key] && typeof plugins[key] === "object") result.push(plugins[key]);
      });
    }

    return result;
  }

  function matchingPlugin(source, ignored) {
    var skip = ignored || {};
    var found = null;

    videoPlugins().some(function (plugin) {
      if (!plugin || plugin.component === "kinopult_online" || skip[plugin.component]) return false;

      var text = [plugin.name, plugin.description, plugin.component].join(" ").toLowerCase();
      var matches = source.match.some(function (token) {
        return text.indexOf(token) !== -1;
      });

      if (matches && typeof plugin.onContextLauch === "function") {
        found = plugin;
        return true;
      }

      return false;
    });

    return found;
  }

  function loadSource(source, urlIndex, callback) {
    var index = urlIndex || 0;
    var url = source.urls[index];
    var existing = matchingPlugin(source);

    if (existing) {
      if (callback) callback(existing);
      return;
    }

    if (!url) {
      if (callback) callback(null);
      return;
    }

    if (document.getElementById("kinopult-source-" + source.id)) {
      if (callback) callback(source.plugin || null);
      return;
    }

    var before = {};
    videoPlugins().forEach(function (plugin) {
      if (plugin && plugin.component) before[plugin.component] = true;
    });

    var script = document.createElement("script");
    script.id = "kinopult-source-" + source.id;
    script.src = url;
    script.async = true;
    script.onload = function () {
      var attempts = 0;

      function finish() {
        var plugin = matchingPlugin(source, before);

        if (!plugin && attempts < 10) {
          attempts++;
          setTimeout(finish, 250);
          return;
        }

        source.plugin = plugin || matchingPlugin(source);
        Lampa.Noty.show(source.name + ": подключён");
        if (callback) callback(source.plugin || null);
      }

      finish();
    };
    script.onerror = function () {
      script.parentNode.removeChild(script);

      if (source.urls[index + 1]) {
        loadSource(source, index + 1, callback);
      } else {
        Lampa.Noty.show(source.name + ": не удалось загрузить");
        if (callback) callback(null);
      }
    };

    document.head.appendChild(script);
  }

  function launchSource(source, movie) {
    loadSource(source, 0, function (plugin) {
      if (plugin && typeof plugin.onContextLauch === "function") {
        plugin.onContextLauch(movie);
      } else {
        Lampa.Noty.show(source.name + ": подключён. Откройте «Смотреть» ещё раз");
      }
    });
  }

  function showSourceMenu(movie) {
    var controller = Lampa.Controller.enabled().name;
    var items = sources.map(function (source) {
      return {
        title: source.name,
        source: source,
      };
    });

    Lampa.Select.show({
      title: "Источник КиноПульта",
      items: items,
      onBack: function () {
        Lampa.Controller.toggle(controller);
      },
      onSelect: function (item) {
        Lampa.Controller.toggle(controller);
        launchSource(item.source, movie);
      },
    });
  }

  function registerVideoSource() {
    var manifest = {
      type: "video",
      version: "0.3.0",
      name: "КиноПульт",
      description: "Единый выбор онлайн-источников",
      component: "kinopult_online",
      onContextMenu: function () {
        return {
          name: "КиноПульт",
          description: "Выбрать источник",
        };
      },
      onContextLauch: function (movie) {
        showSourceMenu(movie);
      },
    };

    if (Array.isArray(Lampa.Manifest.plugins)) {
      var exists = Lampa.Manifest.plugins.some(function (plugin) {
        return plugin && plugin.component === manifest.component;
      });
      if (!exists) Lampa.Manifest.plugins.push(manifest);
    } else {
      Lampa.Manifest.plugins = manifest;
    }
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

    registerVideoSource();

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
