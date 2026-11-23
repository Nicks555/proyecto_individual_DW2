/* ==========================================================
   Star Chemical – Tienda Bom Bril | script.js
   PATRÓN jQuery: todo dentro de $(document).ready(...)
   ========================================================== */

/* ---------- REGISTRO DEL SERVICE WORKER (PWA) ---------- */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('./sw.js')
      .then(function (reg) { console.log('Service Worker registrado:', reg.scope); })
      .catch(function (err) { console.log('Error al registrar el Service Worker:', err); });
  });
}

/* ---------- EVENTO DE INSTALACIÓN (se escucha desde el inicio) ---------- */
var deferredPrompt = null;
window.addEventListener('beforeinstallprompt', function (e) {
  e.preventDefault();
  deferredPrompt = e;
});

$(document).ready(function () {
  'use strict';

  var RECARGO = 5; // Recargo fijo por reserva (BOB)

  /* ---------- DATOS ----------
     Cada producto tiene variantes (presentación + precio).
     "antes" = precio anterior (marca el producto como oferta). */
  var productos = [
    { id: 1,  nombre: 'Supercera Machimbre',          cat: 'Ceras',        tag: 'MACHIMBRE',   v: [{ t: '1 Litro', p: 28 }, { t: '5 Litros', p: 120 }] },
    { id: 2,  nombre: 'Supercera Parket',             cat: 'Ceras',        tag: 'PARKET',      v: [{ t: '1 Litro', p: 28, antes: 32 }, { t: '5 Litros', p: 120, antes: 135 }] },
    { id: 3,  nombre: 'Supercera Neutra',             cat: 'Ceras',        tag: 'NEUTRA',      v: [{ t: '1 Litro', p: 26 }, { t: '5 Litros', p: 110 }] },
    { id: 4,  nombre: 'Virulim Intermedia',           cat: 'Virulim',      tag: 'INTERMEDIA',  v: [{ t: '100 grs', p: 9 }] },
    { id: 5,  nombre: 'Virulim Gruesa',               cat: 'Virulim',      tag: 'GRUESA',      v: [{ t: '100 grs', p: 9 }] },
    { id: 6,  nombre: 'Virulim Extragruesa',          cat: 'Virulim',      tag: 'EXTRAGRUESA', v: [{ t: '100 grs', p: 10, antes: 12 }] },
    { id: 7,  nombre: 'Lavandina Bom Bril 8x1',       cat: 'Lavandinas',   tag: 'LAVANDINA',   v: [{ t: '1 Litro', p: 8, antes: 10 }, { t: '5 Litros', p: 30, antes: 36 }] },
    { id: 8,  nombre: 'Supercera Especial',           cat: 'Ceras',        tag: 'ESPECIAL',    v: [{ t: '1 Litro', p: 32 }, { t: '5 Litros', p: 135 }] },
    { id: 9,  nombre: 'Virutilla Líquida',            cat: 'Líquidos',     tag: 'VIRUTILLA',   v: [{ t: '1 Litro', p: 22 }] },
    { id: 10, nombre: 'Destapacaños (Nueva Fórmula)', cat: 'Destapacaños', tag: 'DESTAPA',     v: [{ t: '1 Litro', p: 25 }, { t: '5 Litros', p: 95, antes: 110 }] },
    { id: 11, nombre: 'Eliminador de Sarro',          cat: 'Líquidos',     tag: 'SARRO',       v: [{ t: '1 Litro', p: 24 }, { t: '5 Litros', p: 90 }] }
  ];
  var colores = { 'Ceras': '#ff6b00', 'Lavandinas': '#1d6fd1', 'Virulim': '#00a86b', 'Destapacaños': '#00a86b', 'Líquidos': '#2aa3d6' };

  /* ---------- ESTADO ---------- */
  var carrito = [];          // [{key, nombre, size, precio, qty}]
  var pedidos = [];          // Bitácora en sesión
  var filtro = 'Todos';
  var soloOfertas = false;

  /* ---------- REFERENCIAS ---------- */
  var $grid = $('#productGrid'), $lista = $('#cartList'), $toast = $('#toast');
  var $menu = $('#menuDropdown'), $modal = $('#checkoutModal'), $cartPanel = $('#cartPanel');

  // Respeta "reducir movimiento": desactiva animaciones jQuery
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) { $.fx.off = true; }

  /* ---------- UTILIDADES ---------- */
  function bob(n) { return 'BOB ' + n.toFixed(2); }
  function esMovil() { return $(window).width() <= 1024; }

  // Sanitización obligatoria con DOMPurify antes de inyectar HTML dinámico
  function renderHtmlSeguro($target, htmlDesdeServidor) {
    var limpio = window.DOMPurify
      ? window.DOMPurify.sanitize(htmlDesdeServidor)
      : htmlDesdeServidor;
    $target.html(limpio);
  }

  // Imagen representativa (SVG embebido): botella o paquete de virulina
  function imagen(p) {
    var c = colores[p.cat], s;
    if (p.cat === 'Virulim') {
      s = '<rect x="38" y="52" width="124" height="96" rx="12" fill="#d5dbe0"/>' +
          '<path d="M48 78q30-18 60 0t44 0M48 98q30-18 60 0t44 0M48 118q30-18 60 0t44 0" stroke="#9aa5ae" stroke-width="3" fill="none"/>' +
          '<rect x="38" y="112" width="124" height="40" rx="10" fill="' + c + '"/>' +
          '<text x="100" y="138" font-size="14" font-weight="800" fill="#fff" text-anchor="middle">VIRULIM</text>';
    } else {
      s = '<rect x="82" y="16" width="36" height="20" rx="4" fill="#0b1a3d"/><rect x="88" y="36" width="24" height="16" fill="' + c + '"/>' +
          '<rect x="52" y="50" width="96" height="136" rx="20" fill="' + c + '"/>' +
          '<rect x="62" y="58" width="6" height="118" rx="3" fill="#fff" opacity=".35"/>' +
          '<rect x="62" y="90" width="76" height="66" rx="6" fill="#fff"/>' +
          '<text x="100" y="114" font-size="12" font-weight="800" fill="#0b1a3d" text-anchor="middle">BOM BRIL</text>' +
          '<text x="100" y="134" font-size="9" font-weight="700" fill="' + c + '" text-anchor="middle">' + p.tag + '</text>';
    }
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" font-family="Arial,sans-serif"><rect width="200" height="200" fill="#fff"/>' + s + '</svg>';
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }

  /* ---------- FLECHAS DEL CARRUSEL (solo visibles en móvil/tablet por CSS) ---------- */
  var $prev = $('#arrowPrev'), $next = $('#arrowNext');
  function actualizarFlechas() {
    var el = $grid[0], max = el.scrollWidth - el.clientWidth;
    $prev.toggleClass('carousel-arrow--hidden', el.scrollLeft <= 4);
    $next.toggleClass('carousel-arrow--hidden', max <= 4 || el.scrollLeft >= max - 4);
  }
  function moverCarrusel(dir) {
    var el = $grid[0], gap = parseFloat(getComputedStyle(el).columnGap) || 0;
    el.scrollBy({ left: dir * (el.clientWidth + gap), behavior: 'smooth' });
  }
  $prev.on('click', function () { moverCarrusel(-1); });
  $next.on('click', function () { moverCarrusel(1); });
  $grid.on('scroll', actualizarFlechas);
  $(window).on('resize orientationchange', function () { setTimeout(actualizarFlechas, 150); });

  /* ---------- RENDER CATÁLOGO ----------
     PATRÓN jQuery + DOMPurify: renderHtmlSeguro() para renderizar las tarjetas */
  function renderProductos() {
    var lista = productos.filter(function (p) {
      var esOferta = p.v.some(function (x) { return x.antes; });
      return soloOfertas ? esOferta : (filtro === 'Todos' || p.cat === filtro);
    });
    if (!lista.length) {
      renderHtmlSeguro($grid, '<p class="empty">No hay productos en esta categoría.</p>');
    } else {
      renderHtmlSeguro($grid, lista.map(function (p) {
        var oferta = p.v.some(function (x) { return x.antes; });
        var v0 = p.v[0];
        var tamanos = p.v.map(function (x, i) {
          return '<button class="size-btn' + (i === 0 ? ' active' : '') + '" data-i="' + i + '">' + x.t + '</button>';
        }).join('');
        return '<article class="card" data-id="' + p.id + '">' +
          '<div class="card__media"><img class="tarjeta-ods__imagen" src="' + imagen(p) + '" alt="' + p.nombre + '">' + (oferta ? '<span class="tag-offer">Oferta</span>' : '') + '</div>' +
          '<div class="card__body"><h3 class="card__name">' + p.nombre + '</h3>' +
          '<div class="sizes">' + tamanos + '</div>' +
          '<div class="card__price"><span class="price">' + bob(v0.p) + '</span><s class="price-old">' + (v0.antes ? bob(v0.antes) : '') + '</s></div>' +
          '<button class="btn btn--add btn-add">🛒 Reservar / Añadir</button></div></article>';
      }).join(''));
    }
    $grid.scrollLeft(0);
    requestAnimationFrame(actualizarFlechas);
  }

  // Cambio de presentación: actualiza el precio de la tarjeta
  $grid.on('click', '.size-btn', function () {
    var $card = $(this).closest('.card');
    var p = productos.filter(function (x) { return x.id === Number($card.data('id')); })[0];
    var v = p.v[$(this).data('i')];
    $card.find('.size-btn').removeClass('active');
    $(this).addClass('active');
    $card.find('.price').text(bob(v.p));
    $card.find('.price-old').text(v.antes ? bob(v.antes) : '');
  });

  /* ---------- FILTROS ----------
     PATRÓN jQuery: .removeClass('active') / .addClass('active') */
  $('#filters').on('click', '.chip', function () {
    filtro = $(this).data('cat');
    soloOfertas = false;
    $('#filters .chip').removeClass('active');
    $(this).addClass('active');
    cambiarVista();
  });
  // Transición con fadeOut / fadeIn al cambiar de vista
  function cambiarVista() {
    $grid.stop(true, true).fadeOut(120, function () { renderProductos(); $grid.fadeIn(180, actualizarFlechas); });
    $('#catalogBody').scrollTop(0);
  }

  /* ---------- LÓGICA DEL CARRITO ---------- */
  function agregar(p, v) {
    var key = p.id + '|' + v.t;
    var item = carrito.filter(function (i) { return i.key === key; })[0];
    if (item) { item.qty = Math.min(item.qty + 1, 99); }
    else { carrito.push({ key: key, nombre: p.nombre, size: v.t, precio: v.p, qty: 1 }); }
    renderCarrito();
  }

  // PATRÓN jQuery + DOMPurify: renderHtmlSeguro() para renderizar los ítems del carrito
  function renderCarrito() {
    if (!carrito.length) {
      renderHtmlSeguro($lista, '<li class="cart__empty">Tu carrito está vacío</li>');
    } else {
      renderHtmlSeguro($lista, carrito.map(function (i) {
        return '<li class="cart-item" data-key="' + i.key + '">' +
          '<div><p class="ci__name">' + i.nombre + '</p><p class="ci__size">' + i.size + ' · ' + bob(i.precio) + '</p></div>' +
          '<div class="ci__side"><strong class="ci__sub">' + bob(i.precio * i.qty) + '</strong>' +
          '<button class="ci__del" aria-label="Eliminar ' + i.nombre + '">❌</button></div>' +
          '<div class="ci__qty"><button class="qty-minus" aria-label="Quitar uno"' + (i.qty <= 1 ? ' disabled' : '') + '>−</button>' +
          '<span class="qty">' + i.qty + '</span><button class="qty-plus" aria-label="Agregar uno">+</button></div></li>';
      }).join(''));
    }
    var sub = carrito.reduce(function (s, i) { return s + i.precio * i.qty; }, 0);
    var cant = carrito.reduce(function (s, i) { return s + i.qty; }, 0);
    var envio = carrito.length ? RECARGO : 0;
    $('#subtotal').text(bob(sub));
    $('#recargo').text(bob(envio));
    $('#total').text(bob(sub + envio));
    $('#cartBadge').text(cant);
    $('#btnCheckout, #btnClear').prop('disabled', !carrito.length);
  }
  function totalActual() {
    return carrito.reduce(function (s, i) { return s + i.precio * i.qty; }, 0) + (carrito.length ? RECARGO : 0);
  }
  function buscar($el) {
    var key = $el.closest('.cart-item').attr('data-key');
    return carrito.filter(function (i) { return i.key === key; })[0];
  }

  // Añadir desde el catálogo (delegación de eventos)
  $grid.on('click', '.btn-add', function () {
    var $card = $(this).closest('.card'), $btn = $(this);
    var p = productos.filter(function (x) { return x.id === Number($card.data('id')); })[0];
    agregar(p, p.v[$card.find('.size-btn.active').data('i')]);
    $('#cartBadge').removeClass('badge--bump'); void $('#cartBadge')[0].offsetWidth; $('#cartBadge').addClass('badge--bump');
    $btn.addClass('btn--add--done').text('✔ Añadido');
    setTimeout(function () { $btn.removeClass('btn--add--done').text('🛒 Reservar / Añadir'); }, 900);
  });

  // Controles del carrito: [-] [+] ❌
  $lista.on('click', '.qty-plus', function () { var it = buscar($(this)); if (it && it.qty < 99) { it.qty++; renderCarrito(); } });
  $lista.on('click', '.qty-minus', function () { var it = buscar($(this)); if (it && it.qty > 1) { it.qty--; renderCarrito(); } });
  $lista.on('click', '.ci__del', function () {
    var it = buscar($(this));
    $(this).closest('.cart-item').fadeOut(200, function () { carrito.splice(carrito.indexOf(it), 1); renderCarrito(); });
  });

  /* ---------- PANEL LATERAL DESLIZANTE (móvil/tablet) ---------- */
  function abrirCarrito() { $cartPanel.addClass('open'); }
  function cerrarCarrito() { $cartPanel.removeClass('open'); }
  $('#btnCloseCart').on('click', cerrarCarrito);

  // Ícono del carrito en la navbar: abre el panel (móvil) o lo resalta (PC)
  $('#btnCart').on('click', function () {
    cambiarTab('tabCart');
    if (esMovil()) { $cartPanel.toggleClass('open'); }
    else { $cartPanel.addClass('cart--pulse'); setTimeout(function () { $cartPanel.removeClass('cart--pulse'); }, 800); }
  });

  /* ---------- MENÚ HAMBURGUESA ---------- */
  function cerrarMenu() { $menu.fadeOut(150); $('#btnMenu').attr('aria-expanded', 'false'); }
  $('#btnMenu').on('click', function (e) {
    e.stopPropagation();
    if ($menu.is(':visible')) { cerrarMenu(); } else { $menu.fadeIn(150); $(this).attr('aria-expanded', 'true'); }
  });
  // Cerrar el menú al hacer clic fuera (rúbrica)
  $(document).on('click', function (e) {
    if (!$(e.target).closest('#menuDropdown, #btnMenu').length) { cerrarMenu(); }
  });
  $('[data-action]').on('click', function (e) {
    e.preventDefault();
    var accion = $(this).data('action');
    if (accion === 'inicio' || accion === 'catalogo') {
      filtro = 'Todos'; soloOfertas = false;
      $('#filters .chip').removeClass('active').filter('[data-cat="Todos"]').addClass('active');
      cambiarVista();
    } else if (accion === 'ofertas') {
      soloOfertas = true;
      $('#filters .chip').removeClass('active');
      cambiarVista();
    } else if (accion === 'contacto') {
      mostrarToast('📞 Star Chemical · WhatsApp +591 7000 0000');
    } else if (accion === 'instalar') {
      instalarApp();
    }
    cerrarMenu();
  });

  /* ---------- TOAST ----------
     PATRÓN jQuery: .slideDown() para entrar y .fadeOut() para salir */
  function mostrarToast(msg, tipo) {
    var claseModificador = tipo === 'error' ? 'toast--error' : '';
    $toast.stop(true, true).hide().removeClass('toast--error').addClass(claseModificador).text(msg)
      .slideDown(300).delay(3200).fadeOut(400);
  }

  /* ---------- MODAL + VALIDACIÓN ---------- */
  function setError($inp, msg) { $inp.toggleClass('invalid', !!msg).nextAll('.error-msg').first().text(msg || ''); }
  var reNombre = /[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s]/g;

  function validarNombre() {
    var v = $('#fName').val().trim();
    if (!v) { setError($('#fName'), 'Escribe tu nombre completo.'); return false; }
    if (v.length < 3) { setError($('#fName'), 'El nombre es demasiado corto.'); return false; }
    setError($('#fName'), ''); return true;
  }
  function validarTelefono() {
    var v = $('#fPhone').val();
    if (!v) { setError($('#fPhone'), 'Escribe tu número de teléfono.'); return false; }
    if (v.length < 7 || v.length > 8) { setError($('#fPhone'), 'Ingresa un número de 7 u 8 dígitos.'); return false; }
    setError($('#fPhone'), ''); return true;
  }
  function hoyISO() { // fecha local de hoy en formato yyyy-mm-dd
    var d = new Date();
    return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
  }
  function validarSucursal() {
    if (!$('#fBranch').val()) { setError($('#fBranch'), 'Selecciona una sucursal.'); return false; }
    setError($('#fBranch'), ''); return true;
  }
  function validarFecha() {
    var v = $('#fDate').val();
    if (!v) { setError($('#fDate'), 'Elige la fecha de recojo.'); return false; }
    if (v < hoyISO()) { setError($('#fDate'), 'La fecha no puede ser anterior a hoy.'); return false; }
    setError($('#fDate'), ''); return true;
  }

  // PATRÓN jQuery: .on('input') filtra en tiempo real; .on('blur') valida al salir del campo
  $('#fName').on('input', function () {
    var limpio = this.value.replace(reNombre, '');
    if (limpio !== this.value) { this.value = limpio; setError($(this), 'Solo se permiten letras y espacios.'); }
    else { setError($(this), ''); }
  }).on('blur', validarNombre);

  $('#fPhone').on('input', function () {
    var limpio = this.value.replace(/\D/g, '');
    if (limpio !== this.value) { this.value = limpio; setError($(this), 'Solo se permiten números.'); }
    else { setError($(this), ''); }
  }).on('blur', validarTelefono);

  $('#fBranch').on('change blur', validarSucursal);
  $('#fDate').on('change blur', validarFecha);

  // Abrir modal con .fadeIn()
  $('#btnCheckout').on('click', function () {
    if (!carrito.length) { return; }
    $('#modalTotal').text(bob(totalActual()));
    $('#fDate').attr('min', hoyISO());
    $modal.fadeIn(200, function () { $('#fName').trigger('focus'); });
  });
  // Cerrar modal con .fadeOut()
  function cerrarModal() { $modal.fadeOut(200); }
  $('#btnCloseModal').on('click', cerrarModal);
  $modal.on('click', function (e) { if (e.target === this) { cerrarModal(); } });
  $(document).on('keydown', function (e) {
    if (e.key === 'Escape') { cerrarModal(); cerrarMenu(); cerrarCarrito(); $('#installModal').fadeOut(200); }
  });

  // Confirmar pedido
  $('#checkoutForm').on('submit', function (e) {
    e.preventDefault();
    var ok = [validarNombre(), validarTelefono(), validarSucursal(), validarFecha()].every(Boolean);
    if (!ok) { mostrarToast('⚠️ Revisa los campos marcados', 'error'); return; }
    var total = totalActual();
    var sucursal = $('#fBranch').val();
    mostrarToast('✅ ¡Reserva confirmada! Te esperamos en ' + sucursal);
    registrarReserva(total, $('input[name=pago]:checked').val(), sucursal, $('#fDate').val());
    carrito = [];
    renderCarrito();
    this.reset();
    $(this).find('.invalid').removeClass('invalid');
    $(this).find('.error-msg').text('');
    cerrarModal();
    cambiarTab('tabLog');                 // cambia a la Bitácora
    if (esMovil()) { abrirCarrito(); }    // en móvil, muestra el panel con la Bitácora
  });

  /* ---------- PESTAÑAS (Carrito / Bitácora) ----------
     PATRÓN jQuery: .removeClass('active') / .addClass('active') + .fadeOut() / .fadeIn() */
  function cambiarTab(id) {
    var $btn = $('.tab[data-tab="' + id + '"]');
    if ($btn.hasClass('active')) { return; }
    $('.tab').removeClass('active');
    $btn.addClass('active');
    var $actual = $('.tab-pane.active'), $nuevo = $('#' + id);
    $actual.fadeOut(120, function () {
      $actual.removeClass('active').css('display', '');
      $nuevo.addClass('active').hide().fadeIn(180);
    });
  }
  $('.tab').on('click', function () { cambiarTab($(this).data('tab')); });

  /* ---------- BITÁCORA DE RESERVAS ---------- */
  function registrarReserva(total, pago, sucursal, recojo) {
    var resumen = carrito.map(function (i) { return i.qty + 'x ' + i.nombre + ' ' + i.size; }).join(', ');
    var n = pedidos.length + 1;
    var f = recojo.split('-'); // yyyy-mm-dd -> dd/mm/yyyy
    pedidos.push({
      id: '#RES-' + ('00' + n).slice(-3),
      fecha: new Date().toLocaleString('es-BO', { dateStyle: 'short', timeStyle: 'short' }),
      resumen: resumen, sucursal: sucursal, recojo: f[2] + '/' + f[1] + '/' + f[0],
      total: total, pago: pago, estado: '🟢 Confirmado / Listo para recoger', cancelada: false
    });
    renderBitacora();
  }

  // PATRÓN jQuery + DOMPurify: renderHtmlSeguro() para renderizar la bitácora
  function renderBitacora() {
    var $logList = $('#logList');
    if (!pedidos.length) {
      renderHtmlSeguro($logList, '<li class="cart__empty">Aún no tienes reservas</li>');
      return;
    }
    renderHtmlSeguro($logList, pedidos.slice().reverse().map(function (p) {
      return '<li class="log-item' + (p.cancelada ? ' log-item--cancelled' : '') + '" data-id="' + p.id + '">' +
        '<div class="log__top"><span class="log__id">' + p.id + '</span><span class="log__date">' + p.fecha + '</span></div>' +
        '<p class="log__items">' + p.resumen + '</p>' +
        '<p class="log__branch">📍 ' + p.sucursal + ' · Recojo: ' + p.recojo + '</p>' +
        '<div class="log__bottom"><span class="log__total">' + bob(p.total) + ' · ' + p.pago + '</span><span class="log__state">' + (p.cancelada ? '🔴 Cancelada' : p.estado) + '</span></div>' +
        (p.cancelada ? '' : '<div class="log__actions"><button class="btn-cancel-res">Cancelar reserva</button></div>') + '</li>';
    }).join(''));
  }

  /* ---------- CANCELAR RESERVA (confirmación en dos pasos, delegación de eventos) ---------- */
  var AVISO = '<span class="log__ask">¿Cancelar esta reserva?</span><button class="btn-cancel-yes">Sí, cancelar</button><button class="btn-cancel-no">No</button>';
  $('#logList').on('click', '.btn-cancel-res', function () {
    renderHtmlSeguro($(this).parent(), AVISO);
  }).on('click', '.btn-cancel-no', function () {
    renderHtmlSeguro($(this).parent(), '<button class="btn-cancel-res">Cancelar reserva</button>');
  }).on('click', '.btn-cancel-yes', function () {
    var id = $(this).closest('.log-item').attr('data-id');
    var r = pedidos.filter(function (p) { return p.id === id; })[0];
    if (r) { r.cancelada = true; renderBitacora(); mostrarToast('🚫 Reserva ' + id + ' cancelada', 'error'); }
  });

  /* ---------- VACIAR CARRITO ---------- */
  $('#btnClear').on('click', function () {
    if (!carrito.length) { return; }
    $lista.fadeOut(150, function () {
      carrito = [];
      renderCarrito();
      $lista.fadeIn(150);
      mostrarToast('🗑️ Carrito vaciado');
    });
  });

  /* ---------- TEMA CLARO / OSCURO ----------
     PATRÓN jQuery + DOMPurify: .toggleClass('dark-mode') en el body + renderHtmlSeguro() para el ícono */
  var $body = $('body'), $btnTheme = $('#btnTheme');
  function actualizarIconoTema() {
    var oscuro = $body.hasClass('dark-mode');
    renderHtmlSeguro($btnTheme, oscuro ? '☀️' : '🌙');
    $btnTheme.attr({
      'aria-label': oscuro ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro',
      'aria-pressed': oscuro
    });
  }
  $btnTheme.on('click', function () {
    $body.toggleClass('dark-mode');
    actualizarIconoTema();
    try { localStorage.setItem('sc-theme', $body.hasClass('dark-mode') ? 'dark' : 'light'); } catch (err) { /* sin almacenamiento */ }
  });
  try { if (localStorage.getItem('sc-theme') === 'dark') { $body.addClass('dark-mode'); } } catch (err) { /* sin almacenamiento */ }
  actualizarIconoTema();

  /* ---------- INSTALAR LA APP (PWA) ---------- */
  function yaInstalada() {
    return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  }
  if (yaInstalada()) { $('#btnInstall, #menuInstall').hide(); }

  function instalarApp() {
    if (deferredPrompt) {                       // el navegador permite instalar: ventana nativa
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(function () { deferredPrompt = null; });
      return;
    }
    var ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    $('#installInfo').text(ios
      ? 'En Safari toca el botón Compartir y elige “Agregar a pantalla de inicio”.'
      : 'Abre el menú del navegador (⋮) y elige “Instalar aplicación” o “Agregar a pantalla de inicio”. Si no aparece, recarga la página e inténtalo de nuevo.');
    $('#installModal').fadeIn(200);
    diagnosticarPWA();
  }
  // Diagnóstico: muestra qué ve el navegador de la PWA
  function diagnosticarPWA() {
    function existe(u) { return fetch(u, { cache: 'no-store' }).then(function (r) { return r.ok; }).catch(function () { return false; }); }
    var link = document.querySelector('link[rel="manifest"]'), estado = [];
    var pManifest = link ? fetch(link.href, { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }) : Promise.resolve(null);
    pManifest.then(function (m) {
      estado.push(m ? '✅ manifest.json encontrado' : '❌ manifest.json no se encontró o no es válido');
      var iconos = (m && m.icons) ? m.icons : [];
      return Promise.all(iconos.map(function (ic) {
        return existe(new URL(ic.src, link.href).href).then(function (ok) { if (!ok) { estado.push('❌ falta el ícono ' + ic.src); } });
      }));
    }).then(function () {
      return existe('sw.js');
    }).then(function (okSw) {
      estado.push(okSw ? '✅ sw.js encontrado' : '❌ sw.js no se encontró');
      return 'serviceWorker' in navigator ? navigator.serviceWorker.getRegistration() : null;
    }).then(function (reg) {
      estado.push(reg && reg.active ? '✅ service worker activo' : '❌ service worker no activo');
      estado.push(window.isSecureContext ? '✅ conexión segura (https)' : '❌ la página no está en una conexión segura');
      $('#installInfo').text($('#installInfo').text() + '\n\nDiagnóstico:\n' + estado.join('\n'));
    });
  }
  $('#btnInstall').on('click', instalarApp);
  $('#btnInstallOk').on('click', function () { $('#installModal').fadeOut(200); });
  $('#installModal').on('click', function (e) { if (e.target === this) { $(this).fadeOut(200); } });
  window.addEventListener('appinstalled', function () { deferredPrompt = null; $('#btnInstall, #menuInstall').hide(); $('#installModal').fadeOut(200); });

  /* ---------- INICIO ---------- */
  renderProductos();
  renderCarrito();
  renderBitacora();
});