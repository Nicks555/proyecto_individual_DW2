/* ==========================================================
   Simulación de Vista Responsiva | js/layout.js
   Alterna la clase .sim-movil en .catalogo-grid
   ========================================================== */
document.addEventListener('DOMContentLoaded', function () {
  'use strict';

  var btnSimularVista = document.getElementById('btnSimularVista');
  var catalogoGrid = document.querySelector('.catalogo-grid');

  if (!btnSimularVista || !catalogoGrid) return;

  btnSimularVista.addEventListener('click', function () {
    var activo = catalogoGrid.classList.toggle('sim-movil');
    btnSimularVista.classList.toggle('btn-simular-vista--activo', activo);
    btnSimularVista.setAttribute('aria-pressed', String(activo));
  });
});