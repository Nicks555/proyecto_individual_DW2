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

/* ---------- EVENTO DE INSTALACIÓN PWA ---------- */
var deferredPrompt = null;
window.addEventListener('beforeinstallprompt', function (e) {
  e.preventDefault();
  deferredPrompt = e;
});

$(document).ready(function () {
  'use strict';

  var RECARGO = 5; // Recargo fijo por reserva (BOB)
  var WHATSAPP_NUMERO = '59162369099'; // Reemplaza con tu número de WhatsApp (código país + número, sin +)

  /* ---------- DATOS DE PRODUCTOS ---------- */
  var productos = [
    { id: 1,  nombre: 'Supercera Machimbre',          cat: 'Ceras',        tag: 'MACHIMBRE',   imgHtml: '', v: [{ t: '1 Litro', p: 28 }, { t: '5 Litros', p: 120 }] },
    { id: 2,  nombre: 'Supercera Parket',             cat: 'Ceras',        tag: 'PARKET',      imgHtml: '', v: [{ t: '1 Litro', p: 28, antes: 32 }, { t: '5 Litros', p: 120, antes: 135 }] },
    { id: 3,  nombre: 'Supercera Neutra',             cat: 'Ceras',        tag: 'NEUTRA',      imgHtml: '', v: [{ t: '1 Litro', p: 26 }, { t: '5 Litros', p: 110 }] },
    { id: 4,  nombre: 'Virulim Intermedia',           cat: 'Virulim',      tag: 'INTERMEDIA',  imgHtml: '', v: [{ t: '100 grs', p: 9 }] },
    { id: 5,  nombre: 'Virulim Gruesa',               cat: 'Virulim',      tag: 'GRUESA',      imgHtml: '', v: [{ t: '100 grs', p: 9 }] },
    { id: 6,  nombre: 'Virulim Extragruesa',          cat: 'Virulim',      tag: 'EXTRAGRUESA', imgHtml: '', v: [{ t: '100 grs', p: 10, antes: 12 }] },
    { id: 7,  nombre: 'Lavandina Bom Bril 8x1',       cat: 'Lavandinas',   tag: 'LAVANDINA',   imgHtml: '', v: [{ t: '1 Litro', p: 8, antes: 10 }, { t: '5 Litros', p: 30, antes: 36 }] },
    { id: 8,  nombre: 'Supercera Especial',           cat: 'Ceras',        tag: 'ESPECIAL',    imgHtml: '', v: [{ t: '1 Litro', p: 32 }, { t: '5 Litros', p: 135 }] },
    { id: 9,  nombre: 'Virutilla Líquida',            cat: 'Líquidos',     tag: 'VIRUTILLA',   imgHtml: '', v: [{ t: '1 Litro', p: 22 }] },
    { id: 10, nombre: 'Destapacaños (Nueva Fórmula)', cat: 'Destapacaños', tag: 'DESTAPA',     imgHtml: '', v: [{ t: '1 Litro', p: 25 }, { t: '5 Litros', p: 95, antes: 110 }] },
    { id: 11, nombre: 'Eliminador de Sarro',          cat: 'Líquidos',     tag: 'SARRO',       imgHtml: '', v: [{ t: '1 Litro', p: 24 }, { t: '5 Litros', p: 90 }] }
  ];

  /* ---------- GALERÍA DE RESULTADOS DE USAR LOS PRODUCTOS ---------- */
  var galeriaResultados = [
    {
      titulo: 'Pisos de madera y parquet brillantes con Supercera',
      src: 'https://images.unsplash.com/photo-1581858726788-75bc0f6a952d?auto=format&fit=crop&w=1000&q=80',
      alt: 'Piso de madera limpio y brillante en sala moderna tras encerar'
    },
    {
      titulo: 'Cocina limpia y desengrasada en mesones y lavaplatos',
      src: 'https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=1000&q=80',
      alt: 'Cocina ordenada y limpia con superficies relucientes'
    },
    {
      titulo: 'Baño higienizado y cerámicas impecables con lavandina y antisarro',
      src: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=1000&q=80',
      alt: 'Baño limpio con azulejos y lavamanos en buen estado'
    },
    {
      titulo: 'Limpieza profunda de ollas y utensilios con Virulim',
      src: 'https://images.unsplash.com/photo-1585421514738-01798e348b17?auto=format&fit=crop&w=1000&q=80',
      alt: 'Limpieza doméstica de superficies y utensilios del hogar'
    }
  ];

  var colores = { 'Ceras': '#ff6b00', 'Lavandinas': '#1d6fd1', 'Virulim': '#00a86b', 'Destapacaños': '#00a86b', 'Líquidos': '#2aa3d6' };

  /* ---------- ESTADO ---------- */
  var carrito = [];          // [{key, nombre, size, precio, qty}]
  var pedidos = [];          // Mis Reservas en sesión
  var filtro = 'Todos';
  var soloOfertas = false;

  /* ---------- REFERENCIAS ---------- */
  var $grid = $('#productGrid'), $lista = $('#cartList'), $toast = $('#toast');
  var $menu = $('#menuDropdown'), $modal = $('#checkoutModal'), $cartPanel = $('#cartPanel');
  var $catalogPanel = $('#catalogPanel'), $galleryPanel = $('#galleryPanel');
  var $lightbox = $('#lightboxModal'), $filters = $('#filters'), $btnToggleFilters = $('#btnToggleFilters');

  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) { $.fx.off = true; }

  /* ---------- UTILIDADES ---------- */
  function bob(n) { return 'BOB ' + n.toFixed(2); }
  function esMovil() { return $(window).width() <= 1024; }

  function renderHtmlSeguro($target, htmlDesdeServidor) {
    var limpio = window.DOMPurify
      ? window.DOMPurify.sanitize(htmlDesdeServidor, {
          ADD_ATTR: ['data-i', 'data-cat', 'data-key', 'data-id', 'data-tab', 'data-bnav', 'data-action', 'aria-pressed', 'aria-expanded', 'aria-controls', 'aria-label', 'role', 'tabindex']
        })
      : htmlDesdeServidor;
    $target.html(limpio);
  }

  // Lee las etiquetas <img data-prod-id="..."> de #plantilla-imagenes-productos en index.html
  function aplicarPlantillaHtmlProductos() {
    var tpl = document.getElementById('plantilla-imagenes-productos');
    if (!tpl || !tpl.content) return;
    productos.forEach(function (p) {
      var imgEl = tpl.content.querySelector('img[data-prod-id="' + p.id + '"]');
      if (imgEl && imgEl.getAttribute('src') && imgEl.getAttribute('src').trim()) {
        p.imgHtml = imgEl.outerHTML;
      }
    });
  }

  function imagenSvg(p) {
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

  function renderImagenProducto(p, altDesc) {
    if (p.imgHtml && p.imgHtml.trim()) {
      return p.imgHtml;
    }
    return '<img class="card-item__imagen tarjeta-ods__imagen" src="' + imagenSvg(p) + '" alt="' + altDesc + '">';
  }

  /* ---------- CAMBIO ENTRE SECCIÓN CATÁLOGO Y SECCIÓN GALERÍA ---------- */
  function mostrarSeccionPrincipal(seccion) {
    if (seccion === 'galeria') {
      $catalogPanel.addClass('section-hidden');
      $galleryPanel.removeClass('section-hidden');
    } else {
      $galleryPanel.addClass('section-hidden');
      $catalogPanel.removeClass('section-hidden');
    }
  }

  /* ---------- RENDER CATÁLOGO ---------- */
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
        var altDesc = p.nombre + ' - Bom Bril (' + p.cat + ')';
        return '<article class="card-item" data-id="' + p.id + '">' +
          '<div class="card-item__media">' + renderImagenProducto(p, altDesc) + (oferta ? '<span class="tag-offer">Oferta</span>' : '') + '</div>' +
          '<div class="card-item__body card-cuerpo"><h3 class="card-item__titulo">' + p.nombre + '</h3>' +
          '<p class="card-item__estado">Estado: Disponible</p>' +
          '<div class="sizes">' + tamanos + '</div>' +
          '<div class="card-item__footer"><div class="card-item__price"><span class="price">' + bob(v0.p) + '</span><s class="price-old">' + (v0.antes ? bob(v0.antes) : '') + '</s></div>' +
          '<button class="btn btn--add btn-add">🛒 Reservar / Añadir</button></div></div></article>';
      }).join(''));
    }
    var gridEl = $grid[0];
    if (gridEl) { gridEl.scrollLeft = 0; }
  }

  /* ---------- FLECHAS DE DESLIZAMIENTO HORIZONTAL EN CELULAR ---------- */
  function deslizarCarrusel(direccion) {
    var gridEl = $grid[0];
    if (!gridEl) return;
    var firstCard = gridEl.querySelector('.card-item');
    var paso = firstCard ? (firstCard.offsetWidth + 12) : Math.max(180, Math.round(gridEl.clientWidth * 0.5));
    var maxScroll = Math.max(0, gridEl.scrollWidth - gridEl.clientWidth);
    var destino = gridEl.scrollLeft + (paso * direccion);
    if (destino < 0) destino = 0;
    if (destino > maxScroll) destino = maxScroll;

    if (typeof gridEl.scrollTo === 'function') {
      gridEl.scrollTo({ left: destino, behavior: 'smooth' });
    } else {
      gridEl.scrollLeft = destino;
    }
  }

  $(document).on('click', '#btnSlideNext', function (e) {
    e.preventDefault();
    e.stopPropagation();
    deslizarCarrusel(1);
  });

  $(document).on('click', '#btnSlidePrev', function (e) {
    e.preventDefault();
    e.stopPropagation();
    deslizarCarrusel(-1);
  });

  /* ---------- RENDER GALERÍA DE RESULTADOS ---------- */
  function renderGaleria() {
    var $gal = $('#galleryGrid');
    renderHtmlSeguro($gal, galeriaResultados.map(function (item) {
      return '<article class="gallery-card">' +
        '<img class="gallery-card__img" src="' + item.src + '" alt="' + item.alt + '" data-caption="' + item.titulo + '">' +
        '<p class="gallery-card__caption">' + item.titulo + '</p>' +
        '</article>';
    }).join(''));
  }

  /* ---------- VISOR DE IMAGEN COMPLETA (LIGHTBOX) ---------- */
  function abrirLightbox(src, alt, titulo) {
    if (!src) return;
    $('#lightboxImg').attr({ src: src, alt: alt || titulo || 'Imagen ampliada' });
    $('#lightboxCaption').text(titulo || alt || 'Vista completa');
    $lightbox.fadeIn(180);
  }
  function cerrarLightbox() { $lightbox.fadeOut(180); }

  $(document).on('click', '.card-item__imagen, .gallery-card__img', function () {
    var src = $(this).attr('src');
    var alt = $(this).attr('alt');
    var caption = $(this).data('caption') || $(this).closest('.card-item').find('.card-item__titulo').text() || alt;
    abrirLightbox(src, alt, caption);
  });

  $('#btnCloseLightbox').on('click', cerrarLightbox);
  $lightbox.on('click', function (e) { if (e.target === this) { cerrarLightbox(); } });

  // Cambio de presentación: actualiza el precio de la tarjeta
  $grid.on('click', '.size-btn', function () {
    var $card = $(this).closest('.card-item');
    var p = productos.filter(function (x) { return x.id === Number($card.data('id')); })[0];
    var v = p.v[$(this).data('i')];
    $card.find('.size-btn').removeClass('active');
    $(this).addClass('active');
    $card.find('.price').text(bob(v.p));
    $card.find('.price-old').text(v.antes ? bob(v.antes) : '');
  });

  /* ---------- MENÚ DESPLEGABLE DE FILTROS HACIA ABAJO ---------- */
  function setFiltrosAbiertos(abierto) {
    if (abierto) {
      $filters.addClass('open').css('display', 'flex');
      $btnToggleFilters.attr('aria-expanded', 'true');
    } else {
      $filters.removeClass('open').css('display', 'none');
      $btnToggleFilters.attr('aria-expanded', 'false');
    }
  }

  $(document).on('click', '#btnToggleFilters', function (e) {
    e.preventDefault();
    e.stopPropagation();
    var estaAbierto = $filters.hasClass('open') || $filters.css('display') === 'flex';
    setFiltrosAbiertos(!estaAbierto);
  });

  function aplicarFiltro(catSeleccionado, cerrarDespues) {
    if (catSeleccionado === 'Ofertas') {
      soloOfertas = true;
      filtro = 'Ofertas';
      $('#activeFilterLabel').text('· 🔥 Ofertas');
    } else {
      soloOfertas = false;
      filtro = catSeleccionado || 'Todos';
      $('#activeFilterLabel').text('· ' + filtro);
    }
    $('#filters .chip').removeClass('active');
    $('#filters .chip[data-cat="' + filtro + '"]').addClass('active');
    if (cerrarDespues) { setFiltrosAbiertos(false); }
    cambiarVista();
  }

  $(document).on('click', '#filters .chip', function (e) {
    e.preventDefault();
    aplicarFiltro($(this).data('cat'), esMovil());
  });

  function cambiarVista() {
    mostrarSeccionPrincipal('catalogo');
    $grid.stop(true, true).fadeOut(120, function () { renderProductos(); $grid.fadeIn(180); });
  }

  /* ---------- LÓGICA DEL CARRITO ---------- */
  function agregar(p, v) {
    var key = p.id + '|' + v.t;
    var item = carrito.filter(function (i) { return i.key === key; })[0];
    if (item) { item.qty = Math.min(item.qty + 1, 99); }
    else { carrito.push({ key: key, nombre: p.nombre, size: v.t, precio: v.p, qty: 1 }); }
    renderCarrito();
  }

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
    $('#cartBadge, #bottomCartBadge').text(cant);
    $('#btnCheckout, #btnClear').prop('disabled', !carrito.length);
  }

  function totalActual() {
    return carrito.reduce(function (s, i) { return s + i.precio * i.qty; }, 0) + (carrito.length ? RECARGO : 0);
  }

  function buscar($el) {
    var key = $el.closest('.cart-item').attr('data-key');
    return carrito.filter(function (i) { return i.key === key; })[0];
  }

  $grid.on('click', '.btn-add', function () {
    var $card = $(this).closest('.card-item'), $btn = $(this);
    var p = productos.filter(function (x) { return x.id === Number($card.data('id')); })[0];
    agregar(p, p.v[$card.find('.size-btn.active').data('i')]);
    $('#cartBadge').removeClass('badge--bump'); void $('#cartBadge')[0].offsetWidth; $('#cartBadge').addClass('badge--bump');
    $btn.addClass('btn--add--done').text('✔ Añadido');
    setTimeout(function () { $btn.removeClass('btn--add--done').text('🛒 Reservar / Añadir'); }, 900);
  });

  $lista.on('click', '.qty-plus', function () { var it = buscar($(this)); if (it && it.qty < 99) { it.qty++; renderCarrito(); } });
  $lista.on('click', '.qty-minus', function () { var it = buscar($(this)); if (it && it.qty > 1) { it.qty--; renderCarrito(); } });
  $lista.on('click', '.ci__del', function () {
    var it = buscar($(this));
    $(this).closest('.cart-item').fadeOut(200, function () { carrito.splice(carrito.indexOf(it), 1); renderCarrito(); });
  });

  /* ---------- PANEL LATERAL Y MENÚ INFERIOR MÓVIL ---------- */
  function abrirCarrito() { $cartPanel.addClass('open'); }
  function cerrarCarrito() { $cartPanel.removeClass('open'); }
  $('#btnCloseCart').on('click', cerrarCarrito);

  function marcarBottomNav(key) {
    $('.bottom-nav__btn').removeClass('active').filter('[data-bnav="' + key + '"]').addClass('active');
  }

  $('#btnCart').on('click', function () {
    cambiarTab('tabCart');
    if (esMovil()) {
      $cartPanel.toggleClass('open');
      marcarBottomNav($cartPanel.hasClass('open') ? 'carrito' : 'catalogo');
    } else {
      $cartPanel.addClass('cart--pulse');
      setTimeout(function () { $cartPanel.removeClass('cart--pulse'); }, 800);
    }
  });

  $('.bottom-nav').on('click', '.bottom-nav__btn', function () {
    var accion = $(this).data('bnav');
    marcarBottomNav(accion);
    if (accion === 'inicio' || accion === 'catalogo') {
      cerrarCarrito();
      aplicarFiltro('Todos', false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (accion === 'galeria') {
      cerrarCarrito();
      mostrarSeccionPrincipal('galeria');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (accion === 'carrito') {
      cambiarTab('tabCart');
      abrirCarrito();
    } else if (accion === 'reservas') {
      cambiarTab('tabLog');
      abrirCarrito();
    }
  });

  /* ---------- MENÚ HAMBURGUESA (CON BOTÓN INSTALAR APP INTACTO) ---------- */
  function cerrarMenu() { $menu.fadeOut(150); $('#btnMenu').attr('aria-expanded', 'false'); }
  $('#btnMenu').on('click', function (e) {
    e.stopPropagation();
    if ($menu.is(':visible')) { cerrarMenu(); } else { $menu.fadeIn(150); $(this).attr('aria-expanded', 'true'); }
  });
  $(document).on('click', function (e) {
    if (!$(e.target).closest('#menuDropdown, #btnMenu').length) { cerrarMenu(); }
  });
  $('[data-action]').on('click', function (e) {
    e.preventDefault();
    var accion = $(this).data('action');
    if (accion === 'inicio' || accion === 'catalogo') {
      aplicarFiltro('Todos', false);
    } else if (accion === 'ofertas') {
      aplicarFiltro('Ofertas', false);
    } else if (accion === 'galeria') {
      mostrarSeccionPrincipal('galeria');
    } else if (accion === 'reservas') {
      cambiarTab('tabLog');
      if (esMovil()) abrirCarrito();
    } else if (accion === 'contacto') {
      mostrarToast('📞 Star Chemical · WhatsApp +' + WHATSAPP_NUMERO);
    } else if (accion === 'instalar') {
      instalarApp();
    }
    cerrarMenu();
  });

  /* ---------- TOAST ---------- */
  function mostrarToast(msg, tipo) {
    var claseModificador = tipo === 'error' ? 'toast--error' : '';
    $toast.stop(true, true).hide().removeClass('toast--error').addClass(claseModificador).text(msg)
      .slideDown(300).delay(3200).fadeOut(400);
  }

  /* ---------- WHATSAPP: MENSAJES DE RESERVA Y CANCELACIÓN ---------- */
  function abrirWhatsApp(texto) {
    var url = 'https://wa.me/' + WHATSAPP_NUMERO + '?text=' + encodeURIComponent(texto);
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  function armarMensajeReserva(reserva, itemsSnapshot) {
    var detalle = itemsSnapshot.map(function (i) {
      return '• ' + i.nombre + ' (' + i.size + ') x ' + i.qty + ' = ' + bob(i.precio * i.qty);
    }).join('\n');

    return [
      'Hola, quiero realizar la siguiente reserva en *Star Chemical (Bom Bril)*:',
      '',
      '👤 *Cliente:* ' + reserva.cliente,
      '📱 *Celular:* ' + reserva.celular,
      '🏪 *Sucursal:* ' + reserva.sucursal,
      '📅 *Fecha de recojo:* ' + reserva.recojo,
      '💳 *Método de pago:* ' + reserva.pago,
      '',
      '📋 *DETALLE DE LA RESERVA:*',
      detalle,
      '• Recargo por reserva = ' + bob(RECARGO),
      '',
      '💰 *TOTAL A PAGAR:* ' + bob(reserva.total),
      '',
      '🔖 *Código:* ' + reserva.id
    ].join('\n');
  }

  function armarMensajeCancelacion(reserva) {
    return [
      'Hola, quiero *CANCELAR* la siguiente reserva en *Star Chemical (Bom Bril)*:',
      '',
      '🔖 *Código:* ' + reserva.id,
      '👤 *Cliente:* ' + reserva.cliente,
      '📱 *Celular:* ' + reserva.celular,
      '🏪 *Sucursal:* ' + reserva.sucursal,
      '📋 *Detalle:* ' + reserva.resumen,
      '💰 *Total:* ' + bob(reserva.total)
    ].join('\n');
  }

  /* ---------- MODAL + VALIDACIONES (CELULAR MÁX. 8 DÍGITOS) ---------- */
  function setError($inp, msg) { $inp.toggleClass('invalid', !!msg).nextAll('.error-msg').first().text(msg || ''); }
  var reNombre = /[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s]/g;

  function validarNombre() {
    var v = $('#fName').val().trim();
    if (!v) { setError($('#fName'), 'Escribe tu nombre completo.'); return false; }
    if (v.length < 3) { setError($('#fName'), 'El nombre es demasiado corto.'); return false; }
    setError($('#fName'), ''); return true;
  }
  function validarTelefono() {
    var v = $('#fPhone').val().replace(/\D/g, '').slice(0, 8);
    $('#fPhone').val(v);
    if (!v) { setError($('#fPhone'), 'Escribe tu número de celular.'); return false; }
    if (v.length < 7 || v.length > 8) { setError($('#fPhone'), 'Debe tener entre 7 y 8 dígitos.'); return false; }
    setError($('#fPhone'), ''); return true;
  }
  function hoyISO() {
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

  $('#fName').on('input', function () {
    var limpio = this.value.replace(reNombre, '');
    if (limpio !== this.value) { this.value = limpio; setError($(this), 'Solo se permiten letras y espacios.'); }
    else { setError($(this), ''); }
  }).on('blur', validarNombre);

  $('#fPhone').on('input', function () {
    var limpio = this.value.replace(/\D/g, '').slice(0, 8);
    if (this.value !== limpio) { this.value = limpio; }
    if (limpio.length === 8) {
      setError($(this), '');
    } else if (limpio.length > 0 && limpio.length < 7) {
      setError($(this), 'Ingresa entre 7 y 8 dígitos.');
    } else {
      setError($(this), '');
    }
  }).on('blur', validarTelefono);

  $('#fBranch').on('change blur', validarSucursal);
  $('#fDate').on('change blur', validarFecha);

  $('#btnCheckout').on('click', function () {
    if (!carrito.length) { return; }
    $('#modalTotal').text(bob(totalActual()));
    $('#fDate').attr('min', hoyISO());
    $modal.fadeIn(200, function () { $('#fName').trigger('focus'); });
  });

  function cerrarModal() { $modal.fadeOut(200); }
  $('#btnCloseModal').on('click', cerrarModal);
  $modal.on('click', function (e) { if (e.target === this) { cerrarModal(); } });
  $(document).on('keydown', function (e) {
    if (e.key === 'Escape') { cerrarModal(); cerrarLightbox(); cerrarMenu(); cerrarCarrito(); $('#installModal').fadeOut(200); }
  });

  $('#checkoutForm').on('submit', function (e) {
    e.preventDefault();
    var ok = [validarNombre(), validarTelefono(), validarSucursal(), validarFecha()].every(Boolean);
    if (!ok) { mostrarToast('⚠️ Revisa los campos marcados', 'error'); return; }

    var itemsCopia = carrito.map(function (i) { return $.extend({}, i); });
    var total = totalActual();
    var sucursal = $('#fBranch').val();
    var cliente = $('#fName').val().trim();
    var celular = $('#fPhone').val().trim();
    var pago = $('input[name=pago]:checked').val();
    var fechaRecojo = $('#fDate').val();

    var nuevaReserva = registrarReserva(itemsCopia, cliente, celular, total, pago, sucursal, fechaRecojo);
    var mensajeWa = armarMensajeReserva(nuevaReserva, itemsCopia);

    carrito = [];
    renderCarrito();
    this.reset();
    $(this).find('.invalid').removeClass('invalid');
    $(this).find('.error-msg').text('');
    cerrarModal();
    cambiarTab('tabLog');
    if (esMovil()) { abrirCarrito(); marcarBottomNav('reservas'); }

    mostrarToast('✅ Reserva registrada. Abriendo WhatsApp...');
    abrirWhatsApp(mensajeWa);
  });

  /* ---------- PESTAÑAS (Carrito / Mis Reservas) ---------- */
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

  /* ---------- MIS RESERVAS ---------- */
  function registrarReserva(itemsCopia, cliente, celular, total, pago, sucursal, recojo) {
    var resumen = itemsCopia.map(function (i) { return i.qty + 'x ' + i.nombre + ' ' + i.size; }).join(', ');
    var n = pedidos.length + 1;
    var f = recojo.split('-');
    var reserva = {
      id: '#RES-' + ('00' + n).slice(-3),
      fecha: new Date().toLocaleString('es-BO', { dateStyle: 'short', timeStyle: 'short' }),
      cliente: cliente,
      celular: celular,
      resumen: resumen,
      sucursal: sucursal,
      recojo: f[2] + '/' + f[1] + '/' + f[0],
      total: total,
      pago: pago,
      estado: '🟢 Confirmado / Listo para recoger',
      cancelada: false
    };
    pedidos.push(reserva);
    renderBitacora();
    return reserva;
  }

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
        '<p class="log__branch">👤 ' + p.cliente + ' · 📱 ' + p.celular + '</p>' +
        '<p class="log__branch">📍 ' + p.sucursal + ' · Recojo: ' + p.recojo + '</p>' +
        '<div class="log__bottom"><span class="log__total">' + bob(p.total) + ' · ' + p.pago + '</span><span class="log__state">' + (p.cancelada ? '🔴 Cancelada' : p.estado) + '</span></div>' +
        (p.cancelada ? '' : '<div class="log__actions"><button class="btn-cancel-res">Cancelar reserva</button></div>') + '</li>';
    }).join(''));
  }

  /* ---------- CANCELAR RESERVA + ENVÍO POR WHATSAPP ---------- */
  var AVISO = '<span class="log__ask">¿Cancelar y avisar por WhatsApp?</span><button class="btn-cancel-yes">Sí, cancelar</button><button class="btn-cancel-no">No</button>';
  $('#logList').on('click', '.btn-cancel-res', function () {
    renderHtmlSeguro($(this).parent(), AVISO);
  }).on('click', '.btn-cancel-no', function () {
    renderHtmlSeguro($(this).parent(), '<button class="btn-cancel-res">Cancelar reserva</button>');
  }).on('click', '.btn-cancel-yes', function () {
    var id = $(this).closest('.log-item').attr('data-id');
    var r = pedidos.filter(function (p) { return p.id === id; })[0];
    if (r) {
      r.cancelada = true;
      renderBitacora();
      mostrarToast('🚫 Reserva ' + id + ' cancelada. Abriendo WhatsApp...', 'error');
      abrirWhatsApp(armarMensajeCancelacion(r));
    }
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

  /* ---------- TEMA CLARO / OSCURO ---------- */
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
  if (yaInstalada()) { $('#menuInstall').hide(); }

  function instalarApp() {
    if (deferredPrompt) {
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

  $('#btnInstallOk').on('click', function () { $('#installModal').fadeOut(200); });
  $('#installModal').on('click', function (e) { if (e.target === this) { $(this).fadeOut(200); } });
  window.addEventListener('appinstalled', function () { deferredPrompt = null; $('#menuInstall').hide(); $('#installModal').fadeOut(200); });

  /* ---------- INICIO ---------- */
  setFiltrosAbiertos(!esMovil());
  aplicarPlantillaHtmlProductos();
  renderProductos();
  renderGaleria();
  renderCarrito();
  renderBitacora();
});