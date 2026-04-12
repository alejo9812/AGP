const statusButton = document.getElementById("status-button");
const siteStatus = document.getElementById("site-status");
const footerYear = document.getElementById("footer-year");

if (footerYear) {
  footerYear.textContent = `Actualizado ${new Date().getFullYear()}`;
}

if (statusButton && siteStatus) {
  statusButton.addEventListener("click", () => {
    const now = new Date();
    siteStatus.textContent =
      `Estado del sitio: listo para publicarse. Ultima verificacion local ${now.toLocaleString("es-CO")}.`;
  });
}
