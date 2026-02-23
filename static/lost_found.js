const modal = document.getElementById("reportModal");
const openButton = document.getElementById("openReportModal");
const closeButton = document.getElementById("closeReportModal");

const openModal = () => {
  if (!modal) return;
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
};

const closeModal = () => {
  if (!modal) return;
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
};

if (openButton) {
  openButton.addEventListener("click", openModal);
}

if (closeButton) {
  closeButton.addEventListener("click", closeModal);
}

if (modal) {
  modal.addEventListener("click", (event) => {
    if (event.target === modal) closeModal();
  });
}

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeModal();
});
