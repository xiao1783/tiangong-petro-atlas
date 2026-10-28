/* Thirteen decorative process vignettes; CSS motion runs only on visible cards. */
(function (global) {
  'use strict';
  var drawings = {
    geology: '<path d="M7 43l19-23 17 13 18-18 20 28Z" fill="#b3a184"/><path d="M7 43v12h74V43M8 49h73" fill="#d4c09a" stroke="#9a876a"/><path d="M23 30l16 13m8-15 14 15M15 43h54" fill="none" stroke="#7d7568"/><g class="sm-scan"><path d="M30 10v42" stroke="var(--jade)" stroke-width="2"/><path d="M24 10h12m-12 42h12" stroke="var(--jade)"/></g>',
    seismic: '<path d="M7 35h74M7 53h74" stroke="#b8a17d"/><path d="M9 55h70" stroke="#d8c7a6" stroke-width="5"/><g fill="#758b96"><path d="M15 26h10v9H15zm24 0h10v9H39zm24 0h10v9H63z"/></g><path d="M20 26v-9m24 9v-9m24 9v-9" stroke="#7a8e98" stroke-width="2"/><g class="sm-wave" fill="none" stroke="var(--jade)" stroke-width="1.6"><path d="M15 37q29 28 58 0M22 36q22 18 44 0M31 36q13 10 26 0"/></g><path d="M8 13h18l4-5 5 13 5-13 5 5h35" fill="none" stroke="var(--blue,#41699b)"/>',
    drilling: '<path d="M12 49L24 8h12l13 41M18 30h24M21 18h18M16 39h29M18 30l27 9M21 18l21 12" fill="none" stroke="#788b93" stroke-width="2.6"/><path d="M8 51h70" stroke="#b5a181" stroke-width="4"/><path d="M59 24h15v26H57" fill="#b46d55" stroke="#8d5544"/><path class="sm-flow" d="M58 29H31v29" fill="none" stroke="var(--jade)" stroke-width="2" stroke-dasharray="3 5"/><g class="sm-drill"><path d="M30 8v44" stroke="#c3ab68" stroke-width="3"/><path d="M25 50h10l-2 8h-6Z" fill="#657b86"/><path d="M26 56h8" stroke="#d1af60" stroke-width="3"/></g>',
    mudlogging: '<path d="M8 40h48v15H8z" fill="#8f9ea5"/><path d="M12 40l5-12 10 3 5 9m-1-1 8-14 11 8 3 7" fill="#c2a77e" stroke="#8b795e"/><path d="M7 55h72" stroke="#b3a184"/><path d="M60 14h21v28H60z" fill="var(--card)" stroke="#90a5af"/><path d="M63 33l3-2 3-10 3 16 3-7h4" fill="none" stroke="var(--jade)" stroke-width="1.7"/><g class="sm-scan"><path d="M16 19v28" stroke="var(--jade)" stroke-width="2"/><circle cx="16" cy="17" r="3" fill="var(--jade)"/></g>',
    welllog: '<path d="M19 7v51m22-51v51" stroke="#b49f7d" stroke-width="5"/><path d="M27 5v51" stroke="#8196a1"/><g class="sm-probe"><rect x="23" y="23" width="9" height="22" rx="3" fill="#c4a661"/><path d="M25 28h5m-5 5h5m-5 5h5" stroke="#f1dfb7"/></g><path d="M52 9v47h30M52 18h29M52 32h29M52 46h29" fill="none" stroke="var(--line-3)"/><path d="M65 9l-5 7 10 4-8 6 13 8-17 6 10 8-5 8" fill="none" stroke="var(--jade)" stroke-width="2"/><path class="sm-log-cursor" d="M48 16h34" stroke="var(--blue,#41699b)" stroke-dasharray="2 2"/>',
    cementing: '<path d="M18 9v49h37V9" fill="#d1c1a3" stroke="#9b896e"/><path class="sm-cement" d="M23 15h7v39h-7zm20 0h7v39h-7z" fill="#c99159"/><path d="M31 8v48h11V8" fill="var(--card)" stroke="#7e929c" stroke-width="2"/><path d="M60 15h20v18H60z" fill="#ae6c55"/><path class="sm-flow" d="M70 33v8H37V14" fill="none" stroke="var(--jade)" stroke-width="2" stroke-dasharray="3 5"/><path d="M12 58h68" stroke="#ad9b7f"/>',
    completion: '<path d="M24 8v48h36V8" fill="#bda98a"/><path d="M34 7v50h16V7" fill="var(--card)" stroke="#7d929c" stroke-width="2"/><path d="M21 18h43m-43 31h43" stroke="#667d89" stroke-width="4"/><g class="sm-valves" fill="#c9ab64"><path d="M30 25h8v5h-8zm16 0h8v5h-8zM30 37h8v5h-8zm16 0h8v5h-8z"/></g><path class="sm-flow" d="M42 53V12" stroke="var(--jade)" stroke-width="2" stroke-dasharray="3 4"/>',
    perforation: '<path d="M17 9v48m54-48v48" stroke="#b6a080" stroke-width="8"/><path d="M36 6h16v51H36z" fill="#7e929c" stroke="#5a717d"/><path d="M44 1v8" stroke="#879da6"/><g class="sm-jets" stroke="#d29b57" stroke-width="2.8"><path d="M35 20H18m35 0h17M35 32H18m35 0h17M35 44H18m35 0h17"/></g><g fill="#dcc18a"><circle cx="44" cy="20" r="2.6"/><circle cx="44" cy="32" r="2.6"/><circle cx="44" cy="44" r="2.6"/></g>',
    production: '<path d="M8 55h72M28 52l14-30 14 30" fill="none" stroke="#798e98" stroke-width="3"/><path d="M70 22v35" stroke="#97aab2" stroke-width="2"/><g class="sm-beam"><path d="M20 22h47" stroke="#8398a2" stroke-width="5"/><path d="M64 15q13 5 9 15l-8-2Z" fill="#c6a15d"/><circle cx="43" cy="22" r="4" fill="#5f7885"/></g><g class="sm-crank"><circle cx="19" cy="43" r="10" fill="none" stroke="#7b919c" stroke-width="3"/><path d="M19 43l7-5" stroke="#bc9b57" stroke-width="4"/></g><path d="M25 39l8-15" stroke="#a8b8bf" stroke-width="2"/>',
    workover: '<path d="M17 53L29 9h13l13 44M24 29h23M21 42h30M27 18h18M24 29l27 13M27 18l20 11" fill="none" stroke="#7e949e" stroke-width="2.6"/><path d="M10 55h69" stroke="#b49e7b" stroke-width="3"/><g class="sm-hoist"><path d="M36 9v23" stroke="#bc9f62" stroke-width="2"/><path d="M31 31h10v6h-10z" fill="#778e9a"/><path d="M36 37v5q5 0 5-5" fill="none" stroke="#5f7885" stroke-width="2"/></g><path d="M63 25v31m6-28v28m6-26v26" stroke="#af795b" stroke-width="3"/>',
    eor: '<path d="M8 39h72v18H8z" fill="#c4b28e"/><path d="M19 11v38m50-38v38" stroke="#8197a1" stroke-width="5"/><path d="M12 13h14m36 0h14" stroke="#bd9f59" stroke-width="3"/><path d="M12 46l14 5 17-7 15 7 18-6" fill="none" stroke="#a28f70"/><path class="sm-flow" d="M19 16v30q25 16 50 0V16" fill="none" stroke="var(--jade)" stroke-width="2.4" stroke-dasharray="3 5"/><path class="sm-front" d="M40 41l-5 5 7 6m6-12 6 6-5 7" fill="none" stroke="#d8ae62" stroke-width="2"/>',
    transport: '<path d="M8 16h21v27H8z" fill="#a7b7be" stroke="#718a96"/><ellipse cx="18.5" cy="16" rx="10.5" ry="4" fill="#c7d2d6" stroke="#718a96"/><path d="M29 37h45v15" fill="none" stroke="#8ca1ab" stroke-width="9"/><path class="sm-flow" d="M13 37h60v15" fill="none" stroke="var(--jade)" stroke-width="2.2" stroke-dasharray="3 6"/><circle cx="49" cy="37" r="7" fill="#c5a665" stroke="#8b7547"/><path d="M49 30v-7m-7 0h14" stroke="#6b8390" stroke-width="2"/><path d="M7 57h74" stroke="#b6a586"/>',
    refining: '<path d="M15 15h20v40H15z" fill="#9cafb8" stroke="#708996"/><ellipse cx="25" cy="15" rx="10" ry="4" fill="#c8d3d8" stroke="#708996"/><path d="M17 25h16m-16 9h16m-16 9h16" stroke="#6e8997" stroke-width="2"/><path d="M54 30h22v24H54z" fill="#b18b62" stroke="#8c7156"/><path d="M34 25h31v7M35 46h20" fill="none" stroke="#879ea9" stroke-width="4"/><path class="sm-flow" d="M24 49V21h40v15" fill="none" stroke="var(--jade)" stroke-width="2" stroke-dasharray="3 5"/><g class="sm-vapor" fill="#aabfc9"><circle cx="25" cy="6" r="2.7"/><circle cx="31" cy="9" r="2"/></g><path d="M9 57h72" stroke="#b6a586"/>'
  };
  function svg(id) {
    if (!Object.prototype.hasOwnProperty.call(drawings, id)) return '';
    return '<svg class="stage-mini" data-mini-stage="' + id + '" viewBox="0 0 88 64" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">' + drawings[id] + '</svg>';
  }
  function bind(view) {
    var section = view.querySelector('.home-chain');
    if (!section) return function () {};
    var cards = [].slice.call(section.querySelectorAll('.tg-node')), button = view.querySelector('.home-motion');
    function sync() { section.classList.toggle('mini-paused', !!document.hidden || !!(button && button.getAttribute('data-user-paused') === 'true')); }
    var observer;
    if (global.IntersectionObserver) {
      observer = new global.IntersectionObserver(function (entries) {
        entries.forEach(function (entry) { entry.target.classList.toggle('mini-visible', entry.isIntersecting); });
      }, { threshold: 0 });
      cards.forEach(function (card) { observer.observe(card); });
    } else cards.forEach(function (card) { card.classList.add('mini-visible'); });
    document.addEventListener('visibilitychange', sync);
    if (button) button.addEventListener('click', sync);
    sync();
    return function () {
      if (observer) observer.disconnect();
      document.removeEventListener('visibilitychange', sync);
      if (button) button.removeEventListener('click', sync);
      section.classList.add('mini-paused');
    };
  }
  global.HomeChainMotion = { svg: svg, bind: bind };
})(window);
