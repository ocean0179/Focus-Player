import { Storage } from "./storage.js";

export class PlaylistManager {
  constructor() {
    Storage.clearLegacyPlaylistData();
    this.playlists = Storage.loadUserPlaylists();
  }

  getAllPlaylists() {
    return this.clone(this.playlists);
  }

  getPlaylist(key) {
    const playlist = Object.hasOwn(this.playlists, key)
      ? this.playlists[key]
      : null;

    return playlist ? this.clone(playlist) : null;
  }

  createPlaylist(key, name) {
    const normalizedKey = this.validateKey(key);
    const normalizedName = this.validateName(name);

    if (Object.hasOwn(this.playlists, normalizedKey)) {
      throw new Error(`Playlist already exists: ${normalizedKey}`);
    }

    this.playlists[normalizedKey] = {
      name: normalizedName,
      tracks: [],
    };

    this.save();

    return this.getPlaylist(normalizedKey);
  }

  createPlaylistFromName(name) {
    const normalizedName = this.validateName(name);
    const hasSameName = Object.values(this.playlists).some(
      (playlist) =>
        playlist.name.toLocaleLowerCase() ===
        normalizedName.toLocaleLowerCase()
    );

    if (hasSameName) {
      throw new Error(`Playlist name already exists: ${normalizedName}`);
    }

    const keyPrefix = `USER_${Date.now().toString(36).toUpperCase()}`;
    let key = keyPrefix;
    let suffix = 1;

    while (Object.hasOwn(this.playlists, key)) {
      key = `${keyPrefix}_${suffix}`;
      suffix += 1;
    }

    this.createPlaylist(key, normalizedName);

    return key;
  }

  renamePlaylist(key, name) {
    const playlist = this.requirePlaylist(key);

    playlist.name = this.validateName(name);
    this.save();

    return this.getPlaylist(key);
  }

  deletePlaylist(key) {
    this.requirePlaylist(key);

    delete this.playlists[key];
    this.save();
  }

  addTrack(key, track) {
    const playlist = this.requirePlaylist(key);
    const validTrack = this.validateTrack(track);

    playlist.tracks.push(validTrack);
    this.save();

    return playlist.tracks.length - 1;
  }

  removeTrack(key, trackIndex) {
    const playlist = this.requirePlaylist(key);

    this.validateTrackIndex(playlist, trackIndex);

    const [removedTrack] = playlist.tracks.splice(trackIndex, 1);
    this.save();

    return this.clone(removedTrack);
  }

  moveTrack(key, fromIndex, toIndex) {
    const playlist = this.requirePlaylist(key);

    this.validateTrackIndex(playlist, fromIndex);
    this.validateTrackIndex(playlist, toIndex);

    if (fromIndex === toIndex) {
      return this.getPlaylist(key);
    }

    const [track] = playlist.tracks.splice(fromIndex, 1);
    playlist.tracks.splice(toIndex, 0, track);
    this.save();

    return this.getPlaylist(key);
  }

  requirePlaylist(key) {
    const playlist = Object.hasOwn(this.playlists, key)
      ? this.playlists[key]
      : null;

    if (!playlist) {
      throw new Error(`Playlist does not exist: ${key}`);
    }

    return playlist;
  }

  validateKey(key) {
    if (
      typeof key !== "string" ||
      !/^[A-Za-z0-9_-]+$/.test(key.trim()) ||
      ["__proto__", "constructor", "prototype"].includes(
        key.trim()
      )
    ) {
      throw new TypeError(
        "Playlist key must contain only letters, numbers, underscores, or hyphens."
      );
    }

    return key.trim();
  }

  validateName(name) {
    if (typeof name !== "string" || name.trim() === "") {
      throw new TypeError("Playlist name cannot be empty.");
    }

    return name.trim();
  }

  validateTrack(track) {
    if (
      !track ||
      typeof track !== "object" ||
      Array.isArray(track) ||
      typeof track.videoId !== "string" ||
      track.videoId.trim() === "" ||
      typeof track.title !== "string" ||
      track.title.trim() === ""
    ) {
      throw new TypeError(
        "Track must have a non-empty videoId and title."
      );
    }

    return {
      videoId: track.videoId.trim(),
      title: track.title.trim(),
    };
  }

  validateTrackIndex(playlist, trackIndex) {
    if (
      !Number.isInteger(trackIndex) ||
      trackIndex < 0 ||
      trackIndex >= playlist.tracks.length
    ) {
      throw new RangeError(`Track index is out of range: ${trackIndex}`);
    }
  }

  save() {
    Storage.saveUserPlaylists(this.playlists);
  }

  clone(value) {
    return JSON.parse(JSON.stringify(value));
  }
}
