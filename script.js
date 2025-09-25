// Minimal helpers (fa-IR / RTL)
(function () {
  function qs(id) { return document.getElementById(id); }
  function getParam(name) { return new URLSearchParams(location.search).get(name); }

  // Config: remote host
  const ORIGIN = 'http://dl40.zedschibebinm3.sbs/';

  // Seed first series (can be overridden by data.json or a <script> before this file)
  if (!Array.isArray(window.SERIES)) {
    window.SERIES = [
      {
        id: 'Serie3/A.Cruel.Love.The.Ruth.Ellis.Story',
        title: 'A Cruel Love: The Ruth Ellis Story',
        cover: 'assets/images%20(1).jpg'
      }
    ];
  }

  // Optional manual data override structure (keep empty to auto-mirror remote folders).
  // Example to fill later:
  // window.MANUAL = {
  //   'Serie3/A.Cruel.Love.The.Ruth.Ellis.Story': {
  //     seasons: ['S01'],
  //     // Either episodes per season (no quality):
  //     // episodes: { 'S01': [ { id: 'E01', src: '...' } ] }
  //     // Or episodes grouped by quality per season:
  //     // episodesByQuality: { 'S01': { '720p': [ { id, src } ], '480p': [ { id, src } ] } }
  //   }
  // };
  window.MANUAL = {};

  // Load external data.json if present (non-blocking promise)
  window.DATA_READY = (async function () {
    try {
      const res = await fetch('data.json?' + Date.now(), { 
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      if (res.ok) {
        const data = await res.json();
        console.log('Loaded data.json:', data);
        if (Array.isArray(data.series)) {
          window.SERIES = data.series;
          console.log('Updated SERIES with', data.series.length, 'items');
        }
        if (data.manual && typeof data.manual === 'object') {
          window.MANUAL = data.manual;
        }
      } else {
        console.log('Failed to load data.json, status:', res.status);
      }
    } catch (error) {
      console.log('Error loading data.json:', error);
    }
  })();

  // Navigation helpers for later wiring
  window.goToSeries = function (seriesId) {
    location.href = `season.html?series=${encodeURIComponent(seriesId)}`;
  };
  window.goToSeason = function (seriesId, seasonId) {
    location.href = `season.html?series=${encodeURIComponent(seriesId)}&season=${encodeURIComponent(seasonId)}`;
  };
  window.goToEpisode = function (seriesId, seasonId, episodeId, src) {
    const url = new URL('episode.html', location.href);
    url.searchParams.set('series', seriesId);
    if (seasonId) url.searchParams.set('season', seasonId);
    if (episodeId) url.searchParams.set('episode', episodeId);
    if (src) url.searchParams.set('src', src);
    location.href = url.toString();
  };

  // Directory listing fetcher (Apache-style index)
  async function fetchDirectoryListing(url) {
    const res = await fetch(url, { credentials: 'omit', mode: 'cors' });
    const text = await res.text();
    const doc = new DOMParser().parseFromString(text, 'text/html');
    const anchors = Array.from(doc.querySelectorAll('a'));
    const items = anchors
      .map(a => a.getAttribute('href'))
      .filter(Boolean)
      .map(h => h.split('?')[0])
      .filter(h => h !== '/' && h !== '../');
    return items;
  }

  function makeEmpty(message) {
    const div = document.createElement('div');
    div.className = 'empty';
    div.textContent = message;
    return div;
  }

  function attachEnterSpace(el, handler) {
    el.tabIndex = 0;
    el.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handler();
      }
    });
  }

  // Episode page: hydrate player if src is provided
  if (location.pathname.endsWith('episode.html')) {
    const title = qs('episode-title');
    const video = qs('player');
    const source = qs('video-source');
    const series = getParam('series');
    const season = getParam('season');
    const episode = getParam('episode');
    const src = getParam('src');
    if (series || season || episode) {
      title.textContent = [series, season, episode].filter(Boolean).join(' / ');
    }
    if (src) {
      source.src = src;
      video.load();
      // Fallback: if playback fails, show a direct link
      video.addEventListener('error', function () {
        let fallback = document.getElementById('player-fallback');
        if (!fallback) {
          fallback = document.createElement('div');
          fallback.id = 'player-fallback';
          fallback.className = 'empty';
          const a = document.createElement('a');
          a.href = src;
          a.textContent = 'باز کردن لینک مستقیم ویدیو';
          a.target = '_blank';
          fallback.appendChild(a);
          video.parentNode && video.parentNode.appendChild(fallback);
        }
      }, { once: true });
    }
  }

  // Series page: render from SERIES array (await external data if available)
  if (location.pathname.endsWith('series.html')) {
    (async function () {
      // Wait for data to load with timeout
      if (window.DATA_READY && typeof window.DATA_READY.then === 'function') {
        try { 
          await Promise.race([
            window.DATA_READY,
            new Promise(resolve => setTimeout(resolve, 2000))
          ]);
        } catch (_) {}
      }
      
      const listEl = qs('series-list');
      if (listEl) {
        const seriesData = Array.isArray(window.SERIES) && window.SERIES.length ? window.SERIES : [];
        
        // Debug: log series data
        console.log('Series data:', seriesData);
        console.log('Window SERIES:', window.SERIES);

        listEl.innerHTML = '';
        if (!seriesData.length) {
          console.log('No series data found, trying to load data.json manually...');
          // Try to load data.json manually
          try {
            const response = await fetch('data.json?' + Date.now(), {
              cache: 'no-store',
              headers: {
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
              }
            });
            if (response.ok) {
              const data = await response.json();
              if (Array.isArray(data.series) && data.series.length > 0) {
                window.SERIES = data.series;
                window.MANUAL = data.manual || {};
                console.log('Manually loaded data.json with', data.series.length, 'series');
                // Re-render with new data
                const newSeriesData = data.series;
                newSeriesData.forEach(function (item) {
                  const card = document.createElement('div');
                  card.className = 'card';
                  attachEnterSpace(card, function () { window.goToSeries(item.id); });
                  card.onclick = function () { window.goToSeries(item.id); };

                  const img = document.createElement('img');
                  img.className = 'card-cover';
                  img.alt = item.title || item.id;
                  img.src = item.cover || '';

                  const title = document.createElement('div');
                  title.className = 'card-title';
                  title.textContent = item.title || item.id;
                  title.title = item.title || item.id;

                  card.appendChild(img);
                  card.appendChild(title);
                  listEl.appendChild(card);
                });
                return;
              }
            }
          } catch (error) {
            console.log('Failed to manually load data.json:', error);
          }
          
          console.log('No series data found, showing empty message');
          listEl.appendChild(makeEmpty('فعلاً سریالی ثبت نشده.'));
          return;
        }
        
        console.log('Rendering', seriesData.length, 'series');

        seriesData.forEach(function (item) {
          console.log('Creating card for:', item.title);
          const card = document.createElement('div');
          card.className = 'card';
          attachEnterSpace(card, function () { window.goToSeries(item.id); });
          card.onclick = function () { window.goToSeries(item.id); };

          const img = document.createElement('img');
          img.className = 'card-cover';
          img.alt = item.title || item.id;
          img.src = item.cover || '';

          const title = document.createElement('div');
          title.className = 'card-title';
          title.textContent = item.title || item.id;
          title.title = item.title || item.id;

          card.appendChild(img);
          card.appendChild(title);
          listEl.appendChild(card);
        });
      }
    })();
  }

  // Season page: manual override OR fetch from server, with optional quality tabs
  if (location.pathname.endsWith('season.html')) {
    (async function () {
      if (window.DATA_READY && typeof window.DATA_READY.then === 'function') {
        try { await window.DATA_READY; } catch (_) {}
      }
      const container = qs('season-list');
      const titleEl = qs('series-title');
      if (!container) return;

      const seriesId = getParam('series');
      const seasonId = getParam('season');
      if (!seriesId) return;

      const manual = window.MANUAL && window.MANUAL[seriesId];

      async function insertTrailerIfExists(seriesPath, seasonId) {
        try {
          const itemsRoot = await fetchDirectoryListing(seriesPath);
          const trailer = itemsRoot.find(function (f) {
            return /Trailer/i.test(f) && /\.(mp4|mkv)$/i.test(f);
          });
          if (!trailer) return;
          const src = seriesPath + trailer;
          const row = document.createElement('div');
          row.className = 'list-item';
          const title = document.createElement('div');
          title.textContent = 'تریلر';
          row.appendChild(title);
          const actions = document.createElement('div');
          const playBtn = document.createElement('button');
          playBtn.className = 'btn btn-primary';
          playBtn.textContent = 'پخش';
          playBtn.onclick = function () { window.goToEpisode(seriesId, seasonId, 'Trailer', src); };
          actions.appendChild(playBtn);
          const link = document.createElement('a');
          link.className = 'btn btn-ghost';
          link.href = src;
          link.target = '_blank';
          link.rel = 'noopener';
          link.textContent = 'دانلود';
          actions.appendChild(link);
          row.appendChild(actions);
          container.appendChild(row);
        } catch (_) {}
      }
      if (manual) {
        // Manual seasons list
        if (!seasonId) {
          titleEl && (titleEl.textContent = 'فصل‌ها');
          container.innerHTML = '';
          const seasons = Array.isArray(manual.seasons) ? manual.seasons : [];
          if (!seasons.length) {
            container.appendChild(makeEmpty('فصلی ثبت نشده.'));
            return;
          }
          seasons.forEach(function (folder) {
            const el = document.createElement('div');
            el.className = 'list-item';
            el.textContent = `فصل ${folder}`;
            attachEnterSpace(el, function () { window.goToSeason(seriesId, folder); });
            el.onclick = function () { window.goToSeason(seriesId, folder); };
            container.appendChild(el);
          });
          // Add trailer row under season list (manual mode too)
          const seriesPathManual = `${ORIGIN}${seriesId}/`;
          insertTrailerIfExists(seriesPathManual, '');
          return;
        }

        // Manual episodes list for a season (with quality selector support)
        container.innerHTML = '';
        titleEl && (titleEl.textContent = `قسمت‌ها - ${seasonId}`);

        const qualityMap = manual.episodesByQuality && manual.episodesByQuality[seasonId];
        let currentQuality = '1080p';

        function renderEpisodeList(list, isSubtitle) {
          // Remove old list items and empty states (keep tabs and play button if any)
          const old = Array.from(container.querySelectorAll('.list-item, .empty'));
          old.forEach(n => n.remove());

          if (!Array.isArray(list) || !list.length) {
            container.appendChild(makeEmpty('قسمتی ثبت نشده.'));
            return;
          }

          // Play first button (skip for subtitles)
          if (!isSubtitle) {
            const first = list[0];
            if (first && first.src) {
              let playFirst = container.querySelector('.btn.btn-primary');
              if (!playFirst) {
                playFirst = document.createElement('button');
                playFirst.className = 'btn btn-primary';
                container.insertBefore(playFirst, container.firstChild);
              }
              playFirst.textContent = 'پخش آنلاین قسمت ۱';
              playFirst.onclick = function () {
                window.goToEpisode(seriesId, seasonId, first.id || 'E01', first.src);
              };
            }
          }

          list.forEach(function (e) {
            const el = document.createElement('div');
            el.className = 'list-item';

            const title = document.createElement('div');
            title.textContent = e.id || 'Episode';
            el.appendChild(title);

            const actions = document.createElement('div');

            const src = e.src;
            if (src) {
              if (!isSubtitle) {
                const playBtn = document.createElement('button');
                playBtn.className = 'btn btn-primary';
                playBtn.textContent = 'پخش';
                playBtn.onclick = function () { window.goToEpisode(seriesId, seasonId, e.id || 'Episode', src); };
                attachEnterSpace(playBtn, function () { window.goToEpisode(seriesId, seasonId, e.id || 'Episode', src); });
                actions.appendChild(playBtn);
              }

              const link = document.createElement('a');
              link.className = 'btn btn-ghost';
              link.href = src;
              link.target = '_blank';
              link.rel = 'noopener';
              link.textContent = isSubtitle ? 'دانلود زیرنویس' : 'دانلود';
              actions.appendChild(link);
            }

            el.appendChild(actions);
            container.appendChild(el);
          });
        }

        if (qualityMap && (qualityMap['1080p'] || qualityMap['720p'] || qualityMap['480p'] || qualityMap['Dub'] || qualityMap['Sub'])) {
          // Render tabs
          const tabs = document.createElement('div');
          tabs.className = 'tabs';

          function makeTab(q) {
            const b = document.createElement('button');
            b.className = 'btn-tab' + (q === currentQuality ? ' active' : '');
            b.textContent = q;
            b.onclick = function () {
              currentQuality = q;
              tabs.querySelectorAll('.btn-tab').forEach(el => el.classList.remove('active'));
              b.classList.add('active');
              renderEpisodeList(qualityMap[q] || [], q === 'Sub');
            };
            return b;
          }

          if (qualityMap['1080p']) { tabs.appendChild(makeTab('1080p')); }
          if (qualityMap['720p']) { tabs.appendChild(makeTab('720p')); }
          if (qualityMap['480p']) { tabs.appendChild(makeTab('480p')); }
          if (qualityMap['Dub']) { tabs.appendChild(makeTab('Dub')); }
          if (qualityMap['Sub']) { tabs.appendChild(makeTab('Sub')); }
          container.appendChild(tabs);

          renderEpisodeList(qualityMap[currentQuality] || [], currentQuality === 'Sub');
        } else {
          // Old schema: episodes array
          const eps = manual.episodes && manual.episodes[seasonId];
          renderEpisodeList(eps || [], false);
        }
        return;
      }

      // Fallback to remote directory parsing (unchanged)
      const seriesPath = `${ORIGIN}${seriesId}/`;

      try {
        if (!seasonId) {
          titleEl && (titleEl.textContent = 'فصل‌ها');
          container.innerHTML = '';
          const items = await fetchDirectoryListing(seriesPath);
          const folders = items.filter(h => /\/$/.test(h)).map(h => h.replace(/\/$/, ''));
          const rootVideos = items.filter(h => /\.mp4$/i.test(h));

          if (!folders.length && !rootVideos.length) {
            container.appendChild(makeEmpty('موردی پیدا نشد.'));
          }

          folders.forEach(function (folder) {
            const el = document.createElement('div');
            el.className = 'list-item';
            el.textContent = `فصل ${folder}`;
            attachEnterSpace(el, function () { window.goToSeason(seriesId, folder); });
            el.onclick = function () { window.goToSeason(seriesId, folder); };
            container.appendChild(el);
          });

          // Add trailer row under season list (if exists)
          insertTrailerIfExists(seriesPath, '');

          // Then list other root videos (if any) excluding trailer to avoid duplicate
          rootVideos.filter(function (file) { return !(/Trailer/i.test(file)); }).forEach(function (file) {
            const el = document.createElement('div');
            el.className = 'list-item';
            el.textContent = file.replace(/\.mp4$/i, '');
            const src = `${seriesPath}${file}`;
            attachEnterSpace(el, function () { window.goToEpisode(seriesId, '', file.replace(/\.mp4$/i, ''), src); });
            el.onclick = function () { window.goToEpisode(seriesId, '', file.replace(/\.mp4$/i, ''), src); };
            container.appendChild(el);
          });
        } else {
          titleEl && (titleEl.textContent = `قسمت‌ها - ${seasonId}`);
          container.innerHTML = '';
          const seasonPath = `${seriesPath}${encodeURIComponent(seasonId)}/`;

          // Try root files first
          let basePath = seasonPath;
          let items = await fetchDirectoryListing(seasonPath);
          let episodes = items.filter(h => /\.mp4$/i.test(h));

          // If none, try quality folders by priority
          if (!episodes.length) {
            const qualityDirs = ['720p/', '480p/'];
            for (let i = 0; i < qualityDirs.length && !episodes.length; i++) {
              const qPath = seasonPath + qualityDirs[i];
              try {
                const qItems = await fetchDirectoryListing(qPath);
                const qEpisodes = qItems.filter(h => /\.mp4$/i.test(h));
                if (qEpisodes.length) {
                  basePath = qPath;
                  episodes = qEpisodes;
                }
              } catch (_) {}
            }
          }

          if (!episodes.length) {
            container.appendChild(makeEmpty('قسمتی یافت نشد.'));
            return;
          }

          // Play first button
          const firstSrc = `${basePath}${episodes[0]}`;
          const playFirst = document.createElement('button');
          playFirst.className = 'btn btn-primary';
          playFirst.textContent = 'پخش آنلاین قسمت ۱';
          playFirst.onclick = function () {
            const epId = episodes[0].replace(/\.mp4$/i, '');
            window.goToEpisode(seriesId, seasonId, epId, firstSrc);
          };
          container.appendChild(playFirst);

          // Episode list
          episodes.forEach(function (file) {
            const episodeId = file.replace(/\.mp4$/i, '');
            const el = document.createElement('div');
            el.className = 'list-item';
            el.textContent = episodeId;
            const src = `${basePath}${file}`;
            attachEnterSpace(el, function () { window.goToEpisode(seriesId, seasonId, episodeId, src); });
            el.onclick = function () { window.goToEpisode(seriesId, seasonId, episodeId, src); };
            container.appendChild(el);
          });

        }
      } catch (e) {
        console.error('Failed to load directory', e);
        container.appendChild(makeEmpty('خطا در دریافت اطلاعات.'));
      }
    })();
  }
})();