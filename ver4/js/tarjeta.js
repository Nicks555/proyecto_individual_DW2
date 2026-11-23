/* ==========================================================
   Componente Encapsulado: .card-item | js/tarjeta.js
   Simulación interactiva independiente con delegación de eventos
   ========================================================== */
document.addEventListener('click', function (e) {
  'use strict';

  var boton = e.target.closest('.card-item__simular, .btn-simular');
  if (!boton) return;

  var tarjeta = boton.closest('.card-item');
  if (!tarjeta) return;

  var estado = tarjeta.querySelector('.card-item__estado');
  var activo = tarjeta.classList.toggle('card-item--activo');

  if (estado) {
    estado.textContent = activo
      ? 'Estado: Seleccionado (Simulación)'
      : 'Estado: Disponible';
  }
});