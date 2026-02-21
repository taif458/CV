const tabs = Array.from(document.querySelectorAll(".module-tab"));
const panels = Array.from(document.querySelectorAll(".module-panel"));
const container = document.querySelector(".module-panels");

if (tabs.length > 0 && panels.length > 0 && container) {
  const activate = (target) => {
    tabs.forEach((tab) => {
      tab.classList.toggle("active", tab.dataset.target === target);
    });

    panels.forEach((panel) => {
      const isActive = panel.id === `panel-${target}`;
      panel.classList.toggle("active", isActive);
    });

    container.dataset.active = target;
  };

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      activate(tab.dataset.target);
    });
  });

  const current = container.dataset.active || "report";
  activate(current);
}
