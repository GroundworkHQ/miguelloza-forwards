(function(){
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function themedColor(varName, fallback){
    var v = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
    return v || fallback;
  }

  /* ---------------- Services dropdown ---------------- */
  var trigger = document.querySelector('.nav-trigger');
  var panel = document.querySelector('.dropdown-panel');
  if (trigger && panel) {
    trigger.addEventListener('click', function(e){
      e.stopPropagation();
      var open = panel.classList.toggle('open');
      trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    document.addEventListener('click', function(e){
      if (!panel.contains(e.target) && e.target !== trigger) {
        panel.classList.remove('open');
        trigger.setAttribute('aria-expanded', 'false');
      }
    });
    document.addEventListener('keydown', function(e){
      if (e.key === 'Escape') {
        panel.classList.remove('open');
        trigger.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* ---------------- Big ambient hero wave (homepage only) ---------------- */
  var heroCanvas = document.querySelector('[data-hero-wave]');
  if (heroCanvas) {
    var heroCtx = heroCanvas.getContext('2d');
    var heroSection = heroCanvas.closest('section');

    function sizeHero(){
      var rect = heroSection.getBoundingClientRect();
      heroCanvas.width = rect.width * devicePixelRatio;
      heroCanvas.height = rect.height * devicePixelRatio;
      heroCanvas.style.width = rect.width + 'px';
      heroCanvas.style.height = rect.height + 'px';
    }
    sizeHero();
    window.addEventListener('resize', sizeHero);

    function drawHero(t){
      var w = heroCanvas.width, h = heroCanvas.height;
      heroCtx.clearRect(0,0,w,h);
      var layers = [
        {amp:0.045, freq:0.9, speed:0.00035, color:'rgba(143,214,196,0.5)', width:1.6, base:0.62},
        {amp:0.03,  freq:1.6, speed:0.0005,  color:'rgba(143,214,196,0.3)', width:1.2, base:0.72},
        {amp:0.02,  freq:2.6, speed:0.0007,  color:'rgba(240,162,114,0.35)', width:1.4, base:0.82}
      ];
      layers.forEach(function(layer){
        heroCtx.beginPath();
        for(var x=0;x<=w;x+=6){
          var y = h*layer.base + Math.sin(x*0.01*layer.freq + t*layer.speed)*h*layer.amp;
          if(x===0) heroCtx.moveTo(x,y); else heroCtx.lineTo(x,y);
        }
        heroCtx.strokeStyle = layer.color;
        heroCtx.lineWidth = layer.width * devicePixelRatio;
        heroCtx.stroke();
      });
    }

    if (reduced) {
      drawHero(0);
    } else {
      requestAnimationFrame(function loop(t){
        drawHero(t);
        requestAnimationFrame(loop);
      });
    }
  }

  /* ---------------- Mini waveforms (directory rows + service-page hero accent) ---------------- */
  var miniEls = document.querySelectorAll('[data-mini-wave]');
  if (miniEls.length) {
    var miniCanvases = Array.prototype.map.call(miniEls, function(cv){
      return {
        canvas: cv,
        freq: parseFloat(cv.getAttribute('data-freq')) || 2,
        amp: parseFloat(cv.getAttribute('data-amp')) || 0.4
      };
    });

    function sizeMinis(){
      miniCanvases.forEach(function(m){
        var rect = m.canvas.getBoundingClientRect();
        m.canvas.width = Math.max(rect.width,1) * devicePixelRatio;
        m.canvas.height = Math.max(rect.height,1) * devicePixelRatio;
      });
    }
    sizeMinis();
    window.addEventListener('resize', sizeMinis);

    function drawMinis(t){
      var kelp = themedColor('--kelp-bright', '#8FD6C4');
      miniCanvases.forEach(function(m){
        var ctx = m.canvas.getContext('2d');
        var w = m.canvas.width, h = m.canvas.height;
        if (w===0||h===0) return;
        ctx.clearRect(0,0,w,h);
        ctx.beginPath();
        for (var x=0;x<=w;x+=4){
          var y = h/2 + Math.sin(x*0.04*m.freq + t*0.0009)*h*0.35*m.amp;
          if (x===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
        }
        ctx.strokeStyle = kelp;
        ctx.lineWidth = 1.5*devicePixelRatio;
        ctx.stroke();
      });
    }

    if (reduced) {
      drawMinis(0);
    } else {
      requestAnimationFrame(function loop(t){
        drawMinis(t);
        requestAnimationFrame(loop);
      });
    }
  }
})();
