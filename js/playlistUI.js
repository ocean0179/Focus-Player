export class PlaylistUI {
  constructor() {
    this.mainSelector = document.getElementById(
      "mainPlaylistSelector"
    );
    this.mainSelectorToggle = document.getElementById(
      "mainPlaylistToggle"
    );
    this.mainSelectorName = document.getElementById(
      "currentPlaylistName"
    );
    this.mainSelectorDropdown = document.getElementById(
      "mainPlaylistDropdown"
    );
    this.openBtn = document.getElementById("managePlaylistsBtn");
    this.panel = document.getElementById("playlistManagerPanel");
    this.closeBtn = document.getElementById(
      "closePlaylistManagerBtn"
    );
    this.message = document.getElementById(
      "playlistManagerMessage"
    );
    this.playlistList = document.getElementById(
      "managedPlaylistList"
    );
    this.createForm = document.getElementById(
      "createPlaylistForm"
    );
    this.newPlaylistName = document.getElementById(
      "newPlaylistName"
    );
    this.playlistName = document.getElementById(
      "managedPlaylistName"
    );
    this.deletePlaylistBtn = document.getElementById(
      "deleteManagedPlaylistBtn"
    );
    this.renamePlaylistForm = document.getElementById(
      "renamePlaylistForm"
    );
    this.renamePlaylistInput = document.getElementById(
      "renamePlaylistInput"
    );
    this.trackList = document.getElementById("managedTrackList");
    this.addTrackForm = document.getElementById("addTrackForm");
    this.trackUrlInput = document.getElementById("trackUrlInput");
    this.trackTitleInput = document.getElementById(
      "trackTitleInput"
    );

    this.onOpen = null;
    this.onClose = null;
    this.onMainPlaylistSelect = null;
    this.onCreatePlaylist = null;
    this.onRenamePlaylist = null;
    this.onDeletePlaylist = null;
    this.onSelectPlaylist = null;
    this.onAddTrack = null;
    this.onRemoveTrack = null;
    this.onMoveTrack = null;

    this.draggedTrackIndex = null;

    this.bindEvents();
  }

  bindEvents() {
    this.mainSelectorToggle.addEventListener("click", () => {
      this.toggleMainSelector();
    });

    this.mainSelectorToggle.addEventListener("keydown", (event) => {
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        this.openMainSelector();
        this.focusMainSelectorOption(
          event.key === "ArrowDown" ? "first" : "last"
        );
      }
    });

    this.mainSelectorDropdown.addEventListener("click", (event) => {
      const button = event.target.closest("[data-main-playlist]");

      if (!button) {
        return;
      }

      this.onMainPlaylistSelect?.(button.dataset.mainPlaylist);
      this.closeMainSelector();
      this.mainSelectorToggle.focus();
    });

    this.mainSelectorDropdown.addEventListener("keydown", (event) => {
      if (
        event.key !== "ArrowDown" &&
        event.key !== "ArrowUp" &&
        event.key !== "Home" &&
        event.key !== "End"
      ) {
        return;
      }

      event.preventDefault();
      this.moveMainSelectorFocus(event.key);
    });

    document.addEventListener("click", (event) => {
      if (!this.mainSelector.contains(event.target)) {
        this.closeMainSelector();
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && this.isMainSelectorOpen()) {
        this.closeMainSelector();
        this.mainSelectorToggle.focus();
      }
    });

    this.openBtn.addEventListener("click", () => {
      this.onOpen?.();
    });

    this.closeBtn.addEventListener("click", () => {
      this.requestClose();
    });

    this.panel.addEventListener("click", (event) => {
      if (event.target === this.panel) {
        this.requestClose();
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !this.panel.hidden) {
        this.requestClose();
      }
    });

    this.createForm.addEventListener("submit", (event) => {
      event.preventDefault();
      this.onCreatePlaylist?.(this.newPlaylistName.value);
    });

    this.deletePlaylistBtn.addEventListener("click", () => {
      const shouldDelete = window.confirm(
        `"${this.playlistName.textContent}" 플레이리스트를 삭제하시겠습니까?`
      );

      if (shouldDelete) {
        this.onDeletePlaylist?.();
      }
    });

    this.renamePlaylistForm.addEventListener("submit", (event) => {
      event.preventDefault();
      this.onRenamePlaylist?.(this.renamePlaylistInput.value);
    });

    this.addTrackForm.addEventListener("submit", (event) => {
      event.preventDefault();
      this.onAddTrack?.(
        this.trackUrlInput.value,
        this.trackTitleInput.value
      );
    });

    this.playlistList.addEventListener("click", (event) => {
      const button = event.target.closest("[data-managed-playlist]");

      if (button) {
        this.onSelectPlaylist?.(button.dataset.managedPlaylist);
      }
    });

    this.trackList.addEventListener("click", (event) => {
      const button = event.target.closest("[data-track-index]");

      if (button) {
        this.onRemoveTrack?.(Number(button.dataset.trackIndex));
      }
    });

    this.trackList.addEventListener("dragstart", (event) => {
      const handle = event.target.closest("[data-drag-index]");

      if (!handle) {
        event.preventDefault();
        return;
      }

      this.draggedTrackIndex = Number(handle.dataset.dragIndex);

      const item = handle.closest(".managed-track-item");
      item?.classList.add("dragging");

      if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", handle.dataset.dragIndex);
      }
    });

    this.trackList.addEventListener("dragover", (event) => {
      if (this.draggedTrackIndex === null) {
        return;
      }

      const item = event.target.closest(".managed-track-item");

      if (!item) {
        return;
      }

      event.preventDefault();

      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = "move";
      }

      const rect = item.getBoundingClientRect();
      const position =
        event.clientY < rect.top + rect.height / 2
          ? "before"
          : "after";

      this.clearDropGuides();
      item.classList.add(`drop-${position}`);
    });

    this.trackList.addEventListener("drop", (event) => {
      const item = event.target.closest(".managed-track-item");

      if (this.draggedTrackIndex === null || !item) {
        this.resetTrackDragState();
        return;
      }

      event.preventDefault();

      const targetIndex = Number(item.dataset.trackIndex);
      const rect = item.getBoundingClientRect();
      const insertAfter =
        event.clientY >= rect.top + rect.height / 2;
      const insertionIndex = targetIndex + (insertAfter ? 1 : 0);
      const toIndex =
        insertionIndex > this.draggedTrackIndex
          ? insertionIndex - 1
          : insertionIndex;
      const fromIndex = this.draggedTrackIndex;

      this.resetTrackDragState();

      if (fromIndex !== toIndex) {
        this.onMoveTrack?.(fromIndex, toIndex);
      }
    });

    this.trackList.addEventListener("dragend", () => {
      this.resetTrackDragState();
    });

    this.trackList.addEventListener("dragleave", (event) => {
      if (!this.trackList.contains(event.relatedTarget)) {
        this.clearDropGuides();
      }
    });
  }

  renderMainPlaylistSelector(playlists, selectedKey) {
    this.mainSelectorDropdown.innerHTML = "";

    Object.entries(playlists).forEach(([key, playlist]) => {
      const button = document.createElement("button");
      const name = document.createElement("span");
      const meta = document.createElement("span");
      const isSelected = key === selectedKey;

      button.type = "button";
      button.className = "main-playlist-option";
      button.dataset.mainPlaylist = key;
      button.setAttribute("role", "option");
      button.setAttribute("aria-selected", String(isSelected));
      button.classList.toggle("selected", isSelected);

      name.className = "main-playlist-option-name";
      name.textContent = playlist.name;

      meta.className = "main-playlist-option-meta";
      meta.textContent = `${playlist.tracks.length}곡${
        isSelected ? " ✓" : ""
      }`;

      button.appendChild(name);
      button.appendChild(meta);
      this.mainSelectorDropdown.appendChild(button);
    });

    const selectedPlaylist = playlists[selectedKey];

    this.mainSelectorToggle.disabled = !selectedPlaylist;

    if (!selectedPlaylist) {
      this.closeMainSelector();
    }

    this.mainSelectorName.textContent = selectedPlaylist
      ? selectedPlaylist.name
      : "플레이리스트 없음";
  }

  toggleMainSelector() {
    if (this.isMainSelectorOpen()) {
      this.closeMainSelector();
      return;
    }

    this.openMainSelector();
  }

  openMainSelector() {
    this.mainSelectorDropdown.hidden = false;
    this.mainSelectorToggle.setAttribute("aria-expanded", "true");
  }

  closeMainSelector() {
    this.mainSelectorDropdown.hidden = true;
    this.mainSelectorToggle.setAttribute("aria-expanded", "false");
  }

  isMainSelectorOpen() {
    return !this.mainSelectorDropdown.hidden;
  }

  focusMainSelectorOption(position) {
    const options = Array.from(
      this.mainSelectorDropdown.querySelectorAll(
        "[data-main-playlist]"
      )
    );

    if (options.length === 0) {
      return;
    }

    const selectedOption = this.mainSelectorDropdown.querySelector(
      '[aria-selected="true"]'
    );

    if (position === "last") {
      options[options.length - 1].focus();
      return;
    }

    (selectedOption ?? options[0]).focus();
  }

  moveMainSelectorFocus(key) {
    const options = Array.from(
      this.mainSelectorDropdown.querySelectorAll(
        "[data-main-playlist]"
      )
    );
    const currentIndex = options.indexOf(document.activeElement);

    if (options.length === 0) {
      return;
    }

    if (key === "Home") {
      options[0].focus();
      return;
    }

    if (key === "End") {
      options[options.length - 1].focus();
      return;
    }

    const direction = key === "ArrowDown" ? 1 : -1;
    const nextIndex =
      (currentIndex + direction + options.length) % options.length;

    options[nextIndex].focus();
  }

  open() {
    this.closeMainSelector();
    this.panel.hidden = false;
    this.openBtn.setAttribute("aria-expanded", "true");
    this.closeBtn.focus();
  }

  close() {
    this.panel.hidden = true;
    this.openBtn.setAttribute("aria-expanded", "false");
    this.resetTrackDragState();
  }

  requestClose() {
    this.onClose?.();
    this.openBtn.focus();
  }

  renderPlaylists(playlists, selectedKey) {
    this.playlistList.innerHTML = "";

    if (Object.keys(playlists).length === 0) {
      const emptyMessage = document.createElement("p");

      emptyMessage.className = "managed-playlist-empty";
      emptyMessage.textContent =
        "아직 플레이리스트가 없습니다. 첫 플레이리스트를 만들어보세요.";
      this.playlistList.appendChild(emptyMessage);
      return;
    }

    Object.entries(playlists).forEach(([key, playlist]) => {
      const button = document.createElement("button");

      button.type = "button";
      button.dataset.managedPlaylist = key;
      button.textContent = playlist.name;
      button.classList.toggle("selected", key === selectedKey);

      this.playlistList.appendChild(button);
    });
  }

  renderPlaylistDetails(playlist) {
    this.resetTrackDragState();
    this.trackList.innerHTML = "";

    if (!playlist) {
      this.playlistName.textContent = "플레이리스트 선택";
      this.deletePlaylistBtn.hidden = true;
      this.renamePlaylistForm.hidden = true;
      this.renamePlaylistInput.value = "";
      this.addTrackForm.hidden = true;
      return;
    }

    this.playlistName.textContent = playlist.name;
    this.deletePlaylistBtn.hidden = false;
    this.renamePlaylistForm.hidden = false;
    this.renamePlaylistInput.value = playlist.name;
    this.addTrackForm.hidden = false;

    if (playlist.tracks.length === 0) {
      const emptyItem = document.createElement("li");

      emptyItem.className = "managed-track-empty";
      emptyItem.textContent = "등록된 곡이 없습니다.";
      this.trackList.appendChild(emptyItem);
      return;
    }

    playlist.tracks.forEach((track, index) => {
      const item = document.createElement("li");
      const dragHandle = document.createElement("span");
      const title = document.createElement("span");
      const removeBtn = document.createElement("button");

      item.className = "managed-track-item";
      item.dataset.trackIndex = String(index);

      dragHandle.className = "managed-track-drag-handle";
      dragHandle.dataset.dragIndex = String(index);
      dragHandle.draggable = true;
      dragHandle.textContent = "≡";
      dragHandle.title = "드래그하여 순서 변경";
      dragHandle.setAttribute(
        "aria-label",
        `${track.title} 순서 변경`
      );

      title.className = "managed-track-title";
      title.textContent = track.title;

      removeBtn.type = "button";
      removeBtn.dataset.trackIndex = String(index);
      removeBtn.textContent = "삭제";
      removeBtn.setAttribute("aria-label", `${track.title} 삭제`);

      item.appendChild(dragHandle);
      item.appendChild(title);
      item.appendChild(removeBtn);
      this.trackList.appendChild(item);
    });
  }

  clearDropGuides() {
    this.trackList
      .querySelectorAll(".drop-before, .drop-after")
      .forEach((item) => {
        item.classList.remove("drop-before", "drop-after");
      });
  }

  resetTrackDragState() {
    this.draggedTrackIndex = null;
    this.clearDropGuides();
    this.trackList
      .querySelectorAll(".dragging")
      .forEach((item) => item.classList.remove("dragging"));
  }

  setMessage(message, type = "") {
    this.message.textContent = message;
    this.message.dataset.type = type;
  }

  clearCreateInput() {
    this.newPlaylistName.value = "";
  }

  clearTrackInputs() {
    this.trackUrlInput.value = "";
    this.trackTitleInput.value = "";
  }
}
