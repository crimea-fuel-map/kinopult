(function () {
  "use strict";

  var VERSION = "1.1.1";
  var COMPONENT = "kinopult";
  var SOURCE_COMPONENT = "kinopult_independent_online";
  var script = document.currentScript;
  var API_ROOT = script && script.src ? new URL(script.src).origin : "https://crimea-fuel-map.github.io";

  if (window.kinopultIndependentPlugin) return;
  window.kinopultIndependentPlugin = VERSION;

  var icon =
    '<svg width="128" height="128" viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg">' +
    '<rect x="14" y="24" width="100" height="72" rx="12" stroke="currentColor" stroke-width="9"/>' +
    '<path d="M52 45L84 60L52 77V45Z" fill="currentColor"/>' +
    '<path d="M45 108H83" stroke="currentColor" stroke-width="9" stroke-linecap="round"/>' +
    "</svg>";

  function notify(message) {
    if (window.Lampa && Lampa.Noty) Lampa.Noty.show(message);
  }

  function controllerName() {
    try {
      return Lampa.Controller.enabled().name;
    } catch (error) {
      return "content";
    }
  }

  function select(title, items, onSelect) {
    var previous = controllerName();
    Lampa.Select.show({
      title: title,
      items: items,
      onBack: function () {
        Lampa.Controller.toggle(previous);
      },
      onSelect: function (item) {
        Lampa.Controller.toggle(previous);
        onSelect(item);
      },
    });
  }

  function request(path) {
    return fetch(API_ROOT + path, { headers: { Accept: "application/json" } }).then(function (response) {
      return response.json().then(function (body) {
        if (!response.ok) throw new Error(body.error || "Ошибка сервера");
        return body;
      });
    });
  }

  function nativeJson(url) {
    if (window.Lampa && Lampa.Reguest) {
      return new Promise(function (resolve, reject) {
        var network = new Lampa.Reguest();
        network.timeout(20000);
        network.native(
          url,
          function (data) {
            try {
              resolve(typeof data === "string" ? JSON.parse(data) : data);
            } catch (error) {
              reject(new Error("Сервис вернул некорректный ответ"));
            }
          },
          function () {
            reject(new Error("Сервис недоступен"));
          },
          false,
          { dataType: "json" }
        );
      });
    }

    return fetch(url, { headers: { Accept: "application/json" } }).then(function (response) {
      if (!response.ok) throw new Error("Сервис недоступен");
      return response.json();
    });
  }

  function clean(value, maxLength) {
    return String(value || "")
      .replace(/[\u0000-\u001f\u007f]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, maxLength || 160);
  }

  function first(value) {
    return Array.isArray(value) ? value[0] : value;
  }

  function openLicense(value) {
    var license = clean(first(value), 500).toLowerCase();
    return (
      license.indexOf("publicdomain") !== -1 ||
      license.indexOf("public-domain") !== -1 ||
      license.indexOf("creativecommons.org/licenses/") !== -1
    );
  }

  function archiveQuery(title) {
    var words = clean(title, 80)
      .split(" ")
      .filter(Boolean)
      .slice(0, 8)
      .map(function (word) {
        return '"' + word.replace(/["\\]/g, "") + '"';
      })
      .join(" AND ");

    return 'mediatype:movies AND title:(' + (words || '""') + ") AND (collection:feature_films OR licenseurl:*)";
  }

  function directArchiveSearch(movie) {
    var params = new URLSearchParams();
    params.set("q", archiveQuery(movie.originalTitle || movie.title));
    params.set("output", "json");
    params.set("rows", "18");
    params.set("page", "1");
    ["identifier", "title", "year", "description", "licenseurl", "collection"].forEach(function (field) {
      params.append("fl[]", field);
    });

    return nativeJson("https://archive.org/advancedsearch.php?" + params.toString())
      .then(function (payload) {
        var requestedYear = Number(movie.year);
        var docs = (payload.response && payload.response.docs) || [];
        var items = docs
          .filter(function (doc) {
            return openLicense(doc.licenseurl) || String(doc.collection || "").indexOf("feature_films") !== -1;
          })
          .map(function (doc) {
            return {
              id: clean(doc.identifier, 160),
              title: clean(first(doc.title), 160) || "Без названия",
              year: clean(first(doc.year), 12),
              description: clean(first(doc.description), 260),
              provider: "Internet Archive",
            };
          })
          .filter(function (item) {
            return item.id;
          })
          .sort(function (a, b) {
            if (!requestedYear) return 0;
            return Math.abs(Number(a.year) - requestedYear) - Math.abs(Number(b.year) - requestedYear);
          })
          .slice(0, 12);

        return { items: items };
      });
  }

  function qualityOf(file) {
    var text = [file.name, file.format, file.title].join(" ");
    var explicit = text.match(/(?:^|\D)(2160|1440|1080|720|576|480|360|240)p?(?:\D|$)/i);
    if (explicit) return Number(explicit[1]);

    var height = Number(file.height || 0);
    if (!height && file.resolution && String(file.resolution).indexOf("x") !== -1) {
      height = Number(String(file.resolution).split("x")[1] || 0);
    }
    if (height) return height;
    if (/512kb/i.test(text)) return 360;
    return 0;
  }

  function directArchiveItem(item) {
    return nativeJson("https://archive.org/metadata/" + encodeURIComponent(item.id))
      .then(function (payload) {
        var metadata = payload.metadata || {};
        var allowed =
          openLicense(metadata.licenseurl) ||
          String(metadata.collection || "").indexOf("feature_films") !== -1;
        if (!allowed) throw new Error("У записи нет подтверждённой открытой лицензии");

        var files = (payload.files || [])
          .filter(function (file) {
            var name = String((file && file.name) || "");
            var format = String((file && file.format) || "");
            return name.toLowerCase().slice(-4) === ".mp4" || /mpeg4|h\.?264|internet archive h\.264/i.test(format);
          })
          .map(function (file) {
            var quality = qualityOf(file);
            return {
              title: quality ? quality + "p" : clean(file.format, 50) || "MP4",
              quality: quality,
              size: Number(file.size || 0),
              url:
                "https://archive.org/download/" +
                encodeURIComponent(item.id) +
                "/" +
                encodeURIComponent(file.name),
            };
          })
          .sort(function (a, b) {
            return b.quality - a.quality || b.size - a.size;
          });

        if (!files.length) throw new Error("У фильма нет совместимого MP4-файла");
        return {
          id: item.id,
          title: clean(first(metadata.title), 160) || item.title,
          year: clean(first(metadata.year), 12),
          provider: "Internet Archive",
          files: files.slice(0, 10),
        };
      });
  }

  function searchMovies(movie) {
    var query =
      "/api/search?title=" +
      encodeURIComponent(movie.title || movie.originalTitle) +
      "&original=" +
      encodeURIComponent(movie.originalTitle || "") +
      "&year=" +
      encodeURIComponent(movie.year || "");

    return request(query).catch(function () {
      return directArchiveSearch(movie);
    });
  }

  function resolveMovie(item) {
    return request("/api/item?id=" + encodeURIComponent(item.id)).catch(function () {
      return directArchiveItem(item);
    });
  }

  function movieData(input) {
    var value = input || {};
    if (value.movie) value = value.movie;
    if (value.data) value = value.data;

    return {
      title: value.title || value.name || value.original_title || value.original_name || "",
      originalTitle: value.original_title || value.original_name || "",
      year: value.release_date
        ? String(value.release_date).slice(0, 4)
        : value.first_air_date
          ? String(value.first_air_date).slice(0, 4)
          : String(value.year || ""),
    };
  }

  function playFile(item, file, allFiles) {
    var qualities = {};
    allFiles.forEach(function (entry) {
      var key = entry.quality ? String(entry.quality) : entry.title || "MP4";
      qualities[key] = entry.url;
    });

    var selected = {
      title: item.title + (file.title ? " — " + file.title : ""),
      url: file.url,
      quality: qualities,
    };

    Lampa.Player.play(selected);
    if (Lampa.Player.playlist) Lampa.Player.playlist([selected]);
  }

  function openQualities(item) {
    notify("КиноПульт: получаю доступные качества…");
    resolveMovie(item)
      .then(function (result) {
        var items = result.files.map(function (file) {
          return {
            title: file.title,
            subtitle: file.size ? Math.round(file.size / 1048576) + " МБ" : "",
            file: file,
          };
        });

        select("Качество — " + result.title, items, function (selected) {
          playFile(result, selected.file, result.files);
        });
      })
      .catch(function (error) {
        notify("КиноПульт: " + error.message);
      });
  }

  function searchOpenMovies(movie) {
    var queryTitle = movie.title || movie.originalTitle;
    if (!queryTitle) {
      notify("КиноПульт: у карточки нет названия");
      return;
    }

    notify("КиноПульт: ищу открытые источники…");
    searchMovies(movie)
      .then(function (result) {
        if (!result.items.length) {
          notify("КиноПульт: в открытом каталоге ничего не найдено");
          return;
        }

        var items = result.items.map(function (item) {
          return {
            title: item.title,
            subtitle: [item.year, item.provider].filter(Boolean).join(" • "),
            item: item,
          };
        });

        select("Найдено — " + queryTitle, items, function (selected) {
          openQualities(selected.item);
        });
      })
      .catch(function (error) {
        notify("КиноПульт: " + error.message);
      });
  }

  function launch(movieInput) {
    var movie = movieData(movieInput);
    select(
      "Источник КиноПульта",
      [
        {
          title: "Открытые фильмы",
          subtitle: "Internet Archive • Public Domain / Creative Commons",
          provider: "internet_archive",
        },
      ],
      function () {
        searchOpenMovies(movie);
      }
    );
  }

  var manifest = {
    type: "video",
    version: VERSION,
    name: "КиноПульт",
    description: "Независимый источник открытых и личных медиатек",
    icon: icon,
    component: SOURCE_COMPONENT,
    onContextMenu: function () {
      return {
        name: "КиноПульт",
        description: "Выбрать независимый источник",
      };
    },
    onContextLauch: launch,
  };

  function registerManifest() {
    if (!window.Lampa || !Lampa.Manifest) return false;

    var plugins = Lampa.Manifest.plugins;
    if (Object.prototype.toString.call(plugins) !== "[object Array]") {
      plugins = plugins && typeof plugins === "object" ? [plugins] : [];
    }

    for (var i = plugins.length - 1; i >= 0; i--) {
      if (plugins[i] && plugins[i].component === SOURCE_COMPONENT) plugins.splice(i, 1);
    }

    plugins.unshift(manifest);
    Lampa.Manifest.plugins = plugins;
    return true;
  }

  function addCardButton(event) {
    if (
      !event ||
      event.type !== "complite" ||
      !event.object ||
      !event.object.activity ||
      typeof event.object.activity.render !== "function" ||
      typeof window.$ !== "function"
    ) {
      return false;
    }

    var root = event.object.activity.render();
    if (!root || typeof root.find !== "function") return false;
    if (root.find(".kinopult--button").length) return true;

    var container = root.find(".buttons--container");
    if (container && typeof container.first === "function") container = container.first();

    if (!container || !container.length) {
      var anchor = root.find(".view--torrent");
      if (anchor && typeof anchor.first === "function") anchor = anchor.first();
      if (anchor && anchor.length && typeof anchor.parent === "function") container = anchor.parent();
    }

    if (!container || !container.length || typeof container.append !== "function") return false;

    var movie =
      (event.data && event.data.movie) ||
      event.object.activity.card ||
      event.object.activity.movie ||
      {};
    var button = $(
      '<div class="full-start__button selector view--online kinopult--button" ' +
        'data-subtitle="КиноПульт v' +
        VERSION +
        '">' +
        '<svg width="32" height="32" viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg">' +
        '<rect x="14" y="24" width="100" height="72" rx="12" stroke="currentColor" stroke-width="9"/>' +
        '<path d="M52 45L84 60L52 77V45Z" fill="currentColor"/>' +
        '<path d="M45 108H83" stroke="currentColor" stroke-width="9" stroke-linecap="round"/>' +
        "</svg>" +
        "<span>КиноПульт</span>" +
        "</div>"
    );

    button.on("hover:enter", function () {
      launch(movie);
    });
    container.append(button);
    return true;
  }

  function addButtonToCurrentCard() {
    try {
      if (!Lampa.Activity || typeof Lampa.Activity.active !== "function") return false;
      var active = Lampa.Activity.active();
      if (!active || active.component !== "full" || !active.activity) return false;

      return addCardButton({
        type: "complite",
        object: { activity: active.activity },
        data: { movie: active.card || active.movie || active.activity.card || {} },
      });
    } catch (error) {
      return false;
    }
  }

  function addSettings() {
    if (!Lampa.SettingsApi || window.kinopultIndependentSettings) return;
    window.kinopultIndependentSettings = true;

    Lampa.SettingsApi.addComponent({
      component: COMPONENT,
      name: "КиноПульт",
      icon: icon,
    });

    Lampa.SettingsApi.addParam({
      component: COMPONENT,
      param: {
        name: "kinopult_connection_test",
        type: "trigger",
        default: false,
      },
      field: {
        name: "Проверить подключение",
        description: "Проверить собственный API КиноПульта",
      },
      onChange: function () {
        request("/api/health")
          .then(function () {
            notify("КиноПульт подключён • серверный режим • версия " + VERSION);
          })
          .catch(function () {
            notify("КиноПульт подключён • автономный режим • версия " + VERSION);
          });
      },
    });

    Lampa.SettingsApi.addParam({
      component: COMPONENT,
      param: {
        name: "kinopult_about",
        type: "static",
      },
      field: {
        name: "Независимый режим",
        description: "JS и API принадлежат одному проекту. Lumio и другие чужие серверы не используются.",
      },
    });
  }

  function start() {
    if (!window.Lampa || !Lampa.Manifest || !Lampa.Listener) {
      setTimeout(start, 500);
      return;
    }

    registerManifest();
    addSettings();

    Lampa.Listener.follow("full", function (event) {
      registerManifest();
      addCardButton(event);
    });

    setTimeout(addButtonToCurrentCard, 0);
    setTimeout(addButtonToCurrentCard, 1000);
    notify("КиноПульт установлен");
  }

  start();
})();

