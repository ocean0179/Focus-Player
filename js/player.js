export class YouTubePlayer {
  constructor(elementId, volume = 50) {
    this.elementId = elementId;
    this.volume = volume;

    const mountElement = document.getElementById(elementId);
    this.mountParent = mountElement?.parentElement ?? null;

    this.player = null;
    this.ready = false;
    this.hasPlaylist = false;
    this.initializing = false;
    this.initializationGeneration = 0;
    this.pendingVideoIds = null;

    this.onReady = null;
    this.onStateChange = null;
  }

  initialize(videoId = null) {
    if (this.ready || this.initializing) return;

    this.initializing = true;
    const generation = this.initializationGeneration;

    this.loadAPI().then(() => {
      if (generation !== this.initializationGeneration) return;

      this.ensureMountElement();

      const playerOptions = {
        width: "100%",
        height: "100%",

        playerVars: {
          autoplay: 0,
          controls: 1,
          rel: 0,
        },

        events: {
          onReady: () => {
            if (generation !== this.initializationGeneration) return;

            this.ready = true;
            this.initializing = false;
            this.player.setVolume(this.volume);

            if (this.pendingVideoIds) {
              this.cuePlaylist(this.pendingVideoIds);
              this.pendingVideoIds = null;
            }

            if (this.onReady) {
              this.onReady();
            }
          },

          onStateChange: (event) => {
            if (this.onStateChange) {
              this.onStateChange(event.data);
            }
          },
        },
      };

      if (videoId) {
        playerOptions.videoId = videoId;
      }

      this.player = new YT.Player(this.elementId, playerOptions);
    });
  }
  

  loadPlaylist(videoIds) {
    if (!Array.isArray(videoIds) || videoIds.length === 0) {
      this.clear();
      return;
    }

    this.hasPlaylist = true;
    this.pendingVideoIds = [...videoIds];

    if (!this.ready) {
      this.initialize();
      return;
    }

    this.cuePlaylist(this.pendingVideoIds);
    this.pendingVideoIds = null;
  }

  cuePlaylist(videoIds) {
    this.player.cuePlaylist({
      playlist: videoIds,
      index: 0,
      startSeconds: 0,
    });
  }

  syncPlaylistOrder(videoIds) {
    if (!Array.isArray(videoIds) || videoIds.length === 0) {
      this.clear();
      return;
    }

    this.hasPlaylist = true;

    if (!this.ready) return;

    const videoData = this.player.getVideoData();
    const currentVideoId = videoData?.video_id ?? null;
    const preservedIndex = videoIds.indexOf(currentVideoId);
    const nextIndex = preservedIndex >= 0 ? preservedIndex : 0;
    const currentTime =
      preservedIndex >= 0 ? this.player.getCurrentTime() : 0;
    const state = this.player.getPlayerState();
    const playlistOptions = {
      playlist: videoIds,
      index: nextIndex,
      startSeconds: currentTime,
    };

    if (
      state === YT.PlayerState.PLAYING ||
      state === YT.PlayerState.BUFFERING
    ) {
      this.player.loadPlaylist(playlistOptions);
      return;
    }

    this.player.cuePlaylist(playlistOptions);
  }

  clear() {
    this.hasPlaylist = false;
    this.pendingVideoIds = null;
    this.initializationGeneration += 1;
    this.initializing = false;

    if (this.player && typeof this.player.destroy === "function") {
      this.player.destroy();
    }

    this.player = null;
    this.ready = false;
    this.ensureMountElement();
  }

  clearPlaylist() {
    this.clear();
  }

  ensureMountElement() {
    const currentElement = document.getElementById(this.elementId);

    if (currentElement && currentElement.tagName !== "IFRAME") return;

    if (currentElement) {
      currentElement.remove();
    }

    if (!this.mountParent) return;

    const mountElement = document.createElement("div");
    mountElement.id = this.elementId;
    mountElement.textContent = "YouTube Player";
    this.mountParent.appendChild(mountElement);
  }

getPlaylistIndex() {
  if (!this.ready || !this.hasPlaylist) {
    return -1;
  }

  return this.player.getPlaylistIndex();
}

  loadAPI() {
    return new Promise((resolve) => {
      if (window.YT && window.YT.Player) {
        resolve();
        return;
      }

      const existingScript = document.querySelector(
        'script[src="https://www.youtube.com/iframe_api"]'
      );

      if (!existingScript) {
        const script = document.createElement("script");
        script.src = "https://www.youtube.com/iframe_api";

        document.head.appendChild(script);
      }

      window.onYouTubeIframeAPIReady = () => {
        resolve();
      };
    });
  }

  getState() {
    if (!this.ready || !this.hasPlaylist) {
      return null;
    }

    return this.player.getPlayerState();
  }

  togglePlayPause() {
    if (!this.ready || !this.hasPlaylist) return;

    const state = this.player.getPlayerState();

    if (state === YT.PlayerState.PLAYING) {
      this.pause();
      return;
    }

    this.play();
  }

  play() {
    if (!this.ready || !this.hasPlaylist) return;

    this.player.playVideo();
  }

  pause() {
    if (!this.ready || !this.hasPlaylist) return;

    this.player.pauseVideo();
  }

  next() {
    if (!this.ready || !this.hasPlaylist) return;

    this.player.nextVideo();
  }

  previous() {
    if (!this.ready || !this.hasPlaylist) return;

    this.player.previousVideo();
  }

  setVolume(volume) {
    this.volume = volume;

    if (this.ready) {
      this.player.setVolume(volume);
    }
  }
}
