/* ==========================================================
   Simulación de Alto Contraste | js/accesibilidad.js
   Alterna la clase .alto-contraste en document.body
   ========================================================== */
document.addEventListener('DOMContentLoaded', function () {
  'use strict';

  var btnContraste = document.getElementById('btnSimularContraste');
  if (!btnContraste) return;

  btnContraste.addEventListener('click', function () {
    var activo = document.body.classList.toggle('alto-contraste');
    btnContraste.setAttribute('aria-pressed', String(activo));
  });
});