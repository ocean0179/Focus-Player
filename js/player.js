export class YouTubePlayer {
  constructor(elementId, volume = 50) {
    this.elementId = elementId;
    this.volume = volume;

    this.player = null;
    this.ready = false;
    this.hasPlaylist = false;

    this.onReady = null;
    this.onStateChange = null;
  }

  initialize(videoId = null) {
    this.loadAPI().then(() => {
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
            this.ready = true;
            this.player.setVolume(this.volume);

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
      this.clearPlaylist();
      return;
    }

    this.hasPlaylist = true;

    if (!this.ready) return;

    this.player.cuePlaylist({
      playlist: videoIds,
      index: 0,
      startSeconds: 0,
    });
  }

  clearPlaylist() {
    this.hasPlaylist = false;

    if (this.ready) {
      this.player.stopVideo();
    }
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
