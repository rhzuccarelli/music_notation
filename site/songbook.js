import { moveSketch, normalizeSongbookState, removeSketch } from "./songbook-model.mjs";

const main = document.querySelector("main");
const cover = document.querySelector(".cover");
const pages = [...document.querySelectorAll(".idea-page")];
const pageById = new Map(pages.map((page) => [page.dataset.sketchId, page]));
const allIds = pages.map((page) => page.dataset.sketchId);
const storageKey = `music-notation-songbook-${document.body.dataset.songbookId}`;

function readState() {
  try {
    return normalizeSongbookState(allIds, JSON.parse(localStorage.getItem(storageKey) ?? "{}"));
  } catch {
    return normalizeSongbookState(allIds);
  }
}

let state = readState();

function saveAndRender() {
  localStorage.setItem(storageKey, JSON.stringify(state));
  render();
}

function render() {
  main.replaceChildren(cover, ...state.order.map((id) => pageById.get(id)));
  const total = state.order.length;
  document.querySelector("[data-idea-count]").textContent = `${total} musical ${total === 1 ? "idea" : "ideas"}`;
  state.order.forEach((id, index) => {
    const page = pageById.get(id);
    page.querySelector("[data-idea-label]").textContent = `Idea ${String(index + 1).padStart(2, "0")}`;
    page.querySelector("[data-page-number]").textContent = `${index + 1} / ${total}`;
    page.querySelector('[data-action="up"]').disabled = index === 0;
    page.querySelector('[data-action="down"]').disabled = index === total - 1;
  });
}

main.addEventListener("click", (event) => {
  const button = event.target.closest("[data-action]");
  const page = button?.closest(".idea-page");
  if (!button || !page) return;
  const id = page.dataset.sketchId;
  if (button.dataset.action === "up") state.order = moveSketch(state.order, id, -1);
  if (button.dataset.action === "down") state.order = moveSketch(state.order, id, 1);
  if (button.dataset.action === "remove") state = removeSketch(state, id);
  saveAndRender();
});

document.querySelector("#reset-songbook").addEventListener("click", () => {
  localStorage.removeItem(storageKey);
  state = normalizeSongbookState(allIds);
  render();
});

document.querySelector("#print-songbook").addEventListener("click", async () => {
  const images = [...document.querySelectorAll(".idea-page img")];
  await Promise.all(images.map((image) => image.complete ? Promise.resolve() : new Promise((resolve) => {
    image.addEventListener("load", resolve, { once: true });
    image.addEventListener("error", resolve, { once: true });
  })));
  window.print();
});

render();
