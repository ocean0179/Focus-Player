export class YouTubePlayer {
  constructor(elementId, volume = 50) {
    this.elementId = elementId;
    this.volume = volume;

    this.player = null;
    this.ready = false;

    this.onReady = null;
    this.onStateChange = null;
  }

  initialize(videoId) {
    this.loadAPI().then(() => {
      this.player = new YT.Player(this.elementId, {
        width: "100%",
        height: "100%",
        videoId,

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
      });
    });
  }
  

  loadPlaylist(videoIds) {
    if (!this.ready) return;

    this.player.cuePlaylist({
      playlist: videoIds,
      index: 0,
      startSeconds: 0,
    });
  }

getPlaylistIndex() {
  if (!this.ready) {
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
    if (!this.ready) {
      return null;
    }

    return this.player.getPlayerState();
  }

  togglePlayPause() {
    if (!this.ready) return;

    const state = this.player.getPlayerState();

    if (state === YT.PlayerState.PLAYING) {
      this.pause();
      return;
    }

    this.play();
  }

  play() {
    if (!this.ready) return;

    this.player.playVideo();
  }

  pause() {
    if (!this.ready) return;

    this.player.pauseVideo();
  }

  next() {
    if (!this.ready) return;

    this.player.nextVideo();
  }

  previous() {
    if (!this.ready) return;

    this.player.previousVideo();
  }

  setVolume(volume) {
    this.volume = volume;

    if (this.ready) {
      this.player.setVolume(volume);
    }
  }
}