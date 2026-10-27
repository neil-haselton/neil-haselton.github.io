(function () {
  'use strict';

  var root = document.documentElement;
  var themeToggle = document.querySelector('[data-theme-toggle]');
  var themeTransitionTimer;

  function applyTheme(theme, remember) {
    root.setAttribute('data-theme', theme);
    if (themeToggle) {
      var nextTheme = theme === 'dark' ? 'light' : 'dark';
      themeToggle.setAttribute('aria-label', 'Switch to ' + nextTheme + ' theme');
    }
    if (remember) {
      try { localStorage.setItem('portfolio-theme', theme); } catch (error) { /* The current page theme still works without storage. */ }
    }
  }

  function transitionTheme(theme) {
    root.classList.add('theme-transitioning');
    applyTheme(theme, true);
    window.clearTimeout(themeTransitionTimer);
    themeTransitionTimer = window.setTimeout(function () {
      root.classList.remove('theme-transitioning');
    }, 380);
  }

  if (themeToggle) {
    applyTheme(root.getAttribute('data-theme') || 'light', false);
    themeToggle.addEventListener('click', function () {
      transitionTheme(root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
    });
  }

  document.querySelectorAll('[data-algae-switcher]').forEach(function (switcher) {
    var buttons = Array.from(switcher.querySelectorAll('[data-algae-select]'));
    var views = Array.from(switcher.querySelectorAll('[data-algae-view]'));
    var stage = switcher.querySelector('#algae-mechanism-view');

    function selectMechanism(name) {
      buttons.forEach(function (button) {
        var active = button.dataset.algaeSelect === name;
        button.classList.toggle('is-active', active);
        button.setAttribute('aria-pressed', String(active));
      });
      views.forEach(function (view) {
        var active = view.dataset.algaeView === name;
        view.classList.toggle('is-active', active);
        view.setAttribute('aria-hidden', String(!active));
      });
      if (stage) stage.setAttribute('aria-label', 'Robot with the algae ' + name + ' mechanism highlighted');
    }

    buttons.forEach(function (button) {
      button.addEventListener('click', function () {
        selectMechanism(button.dataset.algaeSelect);
      });
    });
  });

  document.querySelectorAll('[data-subsystem-explorer]').forEach(function (explorer) {
    var lists = Array.from(explorer.querySelectorAll('[data-subsystem-list]'));
    var choices = Array.from(explorer.querySelectorAll('[data-subsystem-choice]'));
    var normalLayer = explorer.querySelector('[data-default-layer]');
    var ghostLayer = explorer.querySelector('[data-ghost-layer]');
    var highlightLayers = Array.from(explorer.querySelectorAll('[data-highlight-layer]'));
    var fallback = explorer.querySelector('[data-stage-fallback]');
    var pinnedIndex = null;
    var pointerIndex = null;
    var focusIndex = null;

    function show(index) {
      var selectedIndex = index === null ? null : String(index);
      var baseMissing = normalLayer && normalLayer.dataset.failed === 'true';
      var overlay = selectedIndex === null ? null : highlightLayers.find(function (layer) {
        return layer.getAttribute('data-highlight-layer') === selectedIndex;
      });
      var overlayMissing = overlay && overlay.dataset.failed === 'true';
      var highlightIsUsable = overlay && !overlayMissing && ghostLayer && ghostLayer.dataset.failed !== 'true';
      if (normalLayer) normalLayer.classList.toggle('is-active', !highlightIsUsable && !baseMissing);
      if (ghostLayer) ghostLayer.classList.toggle('is-active', Boolean(highlightIsUsable));
      highlightLayers.forEach(function (layer) {
        layer.classList.toggle('is-active', Boolean(highlightIsUsable) && layer === overlay);
      });
      if (fallback) fallback.hidden = !baseMissing || Boolean(highlightIsUsable);
      explorer.setAttribute('data-active-subsystem', highlightIsUsable ? selectedIndex : '');
      explorer.querySelector('[data-cad-stage]').setAttribute('aria-label', highlightIsUsable
        ? choices[Number(selectedIndex)].querySelector('.subsystem-choice__name').textContent + ' highlighted in CAD view'
        : 'Complete assembly CAD view');
    }

    function refresh() {
      var selectedIndex = pointerIndex !== null ? pointerIndex : (focusIndex !== null ? focusIndex : pinnedIndex);
      show(selectedIndex);
      choices.forEach(function (choice) {
        choice.setAttribute('aria-pressed', String(pinnedIndex === Number(choice.dataset.subsystemChoice)));
      });
    }

    function markImageFailure(image) {
      image.dataset.failed = 'true';
      image.classList.add('is-missing');
      refresh();
    }

    explorer.querySelectorAll('.cad-stage img').forEach(function (image) {
      image.addEventListener('error', function () { markImageFailure(image); });
      if (image.complete && image.naturalWidth === 0) markImageFailure(image);
    });

    choices.forEach(function (choice) {
      var index = Number(choice.dataset.subsystemChoice);
      choice.addEventListener('pointerenter', function (event) {
        if (event.pointerType === 'touch') return;
        pointerIndex = index;
        focusIndex = null;
        refresh();
      });
      choice.addEventListener('focus', function () {
        if (choice.matches(':focus-visible')) {
          focusIndex = index;
          pointerIndex = null;
        } else if (pointerIndex === null) {
          pointerIndex = index;
        }
        refresh();
      });
      choice.addEventListener('click', function (event) {
        var isTouchSelection = event.pointerType === 'touch' || (event.detail > 0 && window.matchMedia('(hover: none)').matches);
        if (isTouchSelection) {
          pinnedIndex = pinnedIndex === index ? null : index;
          pointerIndex = null;
          focusIndex = null;
        } else {
          pinnedIndex = null;
        }
        refresh();
      });
    });

    lists.forEach(function (list) {
      list.addEventListener('pointerleave', function (event) {
        if (event.pointerType === 'touch') return;
        pointerIndex = null;
        pinnedIndex = null;
        refresh();
      });
      list.addEventListener('focusout', function () {
        window.setTimeout(function () {
          if (!explorer.querySelector('[data-subsystem-choice]:focus')) {
            focusIndex = null;
            pinnedIndex = null;
            refresh();
          }
        }, 0);
      });
    });
    explorer.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') {
        pinnedIndex = null;
        pointerIndex = null;
        focusIndex = null;
        refresh();
      }
    });
    refresh();
  });

  document.querySelectorAll('[data-comparison]').forEach(function (comparison) {
    var range = comparison.querySelector('[data-comparison-range]');
    var leftClip = comparison.querySelector('[data-comparison-clip]');
    var rightClip = comparison.querySelector('[data-comparison-right-clip]');
    var divider = comparison.querySelector('[data-comparison-divider]');
    var stage = comparison.querySelector('[data-comparison-stage]');
    var leftImage = comparison.querySelector('.comparison__image--left');
    var rightImage = comparison.querySelector('.comparison__image--right');
    var errorMessage = comparison.querySelector('[data-comparison-error]');
    var minPosition = Math.max(0, Math.min(99, Number(comparison.dataset.minPosition) || 0));
    var maxPosition = Math.max(minPosition + 1, Math.min(100, Number(comparison.dataset.maxPosition) || 100));
    var animationTimer;
    var leftLabel = comparison.querySelector('.comparison__label--left').textContent;
    var rightLabel = comparison.querySelector('.comparison__label--right').textContent;
    comparison.style.setProperty('--range-start', minPosition + '%');
    comparison.style.setProperty('--range-width', (maxPosition - minPosition) + '%');

    function update(value) {
      var position = Math.max(minPosition, Math.min(maxPosition, Number(value)));
      comparison.style.setProperty('--split', position + '%');
      leftClip.style.clipPath = 'inset(0 ' + (100 - position) + '% 0 0)';
      rightClip.style.clipPath = 'inset(0 0 0 ' + position + '%)';
      divider.style.left = position + '%';
      range.setAttribute('aria-valuetext', Math.round(position) + ' percent ' + leftLabel);
    }

    range.addEventListener('input', function () { update(range.value); });
    comparison.querySelectorAll('[data-comparison-endpoint]').forEach(function (button) {
      button.addEventListener('click', function () {
        var position = button.dataset.comparisonEndpoint === 'max' ? maxPosition : minPosition;
        range.value = String(position);
        comparison.classList.add('is-animating');
        update(position);
        window.clearTimeout(animationTimer);
        animationTimer = window.setTimeout(function () {
          comparison.classList.remove('is-animating');
        }, 500);
      });
    });
    update(range.value);

    stage.addEventListener('pointerdown', function (event) {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      stage.setPointerCapture(event.pointerId);
      var bounds = stage.getBoundingClientRect();
      var position = Math.max(minPosition, Math.min(maxPosition, ((event.clientX - bounds.left) / bounds.width) * 100));
      range.value = String(Math.round(position));
      update(position);
    });
    stage.addEventListener('pointermove', function (event) {
      if (!stage.hasPointerCapture(event.pointerId)) return;
      var bounds = stage.getBoundingClientRect();
      var position = Math.max(minPosition, Math.min(maxPosition, ((event.clientX - bounds.left) / bounds.width) * 100));
      range.value = String(Math.round(position));
      update(position);
    });
    stage.addEventListener('pointerup', function (event) {
      if (stage.hasPointerCapture(event.pointerId)) stage.releasePointerCapture(event.pointerId);
    });

    [leftImage, rightImage].forEach(function (image) {
      image.addEventListener('error', function () {
        image.classList.add('is-missing');
        errorMessage.hidden = false;
      });
      if (image.complete && image.naturalWidth === 0) {
        image.classList.add('is-missing');
        errorMessage.hidden = false;
      }
    });
  });

  document.querySelectorAll('[data-iteration-timeline]').forEach(function (timeline) {
    var range = timeline.querySelector('[data-iteration-range]');
    var images = Array.from(timeline.querySelectorAll('[data-iteration-image]'));
    var captions = Array.from(timeline.querySelectorAll('[data-iteration-caption]'));
    var labels = Array.from(timeline.querySelectorAll('[data-iteration-label]'));
    var version = timeline.querySelector('[data-iteration-version]');

    function selectIteration(value) {
      var index = Math.max(0, Math.min(images.length - 1, Math.round(Number(value) || 0)));
      images.forEach(function (image, imageIndex) {
        var active = imageIndex === index;
        image.classList.toggle('is-active', active);
        image.setAttribute('aria-hidden', String(!active));
      });
      captions.forEach(function (caption, captionIndex) {
        var active = captionIndex === index;
        caption.classList.toggle('is-active', active);
        caption.setAttribute('aria-hidden', String(!active));
      });
      labels.forEach(function (label, labelIndex) {
        label.classList.toggle('is-active', labelIndex === index);
      });
      if (images[index]) {
        var versionText = 'Version ' + (index + 1) + '/' + images.length;
        range.setAttribute('aria-valuetext', versionText);
        if (version) version.textContent = versionText;
      }
    }

    if (range && images.length) {
      range.addEventListener('input', function () { selectIteration(range.value); });
      selectIteration(range.value);
    }
  });

  var dwellSections = Array.prototype.slice.call(document.querySelectorAll('.section-dwell'));
  if (dwellSections.length) {
    var dwellEaseDistance = 36;
    var dwellFrame = null;

    function updateDwellEase() {
      var header = document.querySelector('.site-header');
      var stickyTop = header ? header.getBoundingClientRect().height : 0;
      var scrollPosition = window.scrollY;

      dwellSections.forEach(function (wrapper) {
        var section = wrapper.querySelector(':scope > .content-section');
        var pause = wrapper.querySelector(':scope > .section-dwell__pause');
        if (!section || !pause) return;

        var start = wrapper.getBoundingClientRect().top + scrollPosition - stickyTop;
        var end = start + pause.getBoundingClientRect().height;
        var translate = 0;

        if (scrollPosition >= start - dwellEaseDistance && scrollPosition < start) {
          var approach = (scrollPosition - (start - dwellEaseDistance)) / dwellEaseDistance;
          var easedApproach = approach * approach * (3 - 2 * approach);
          translate = dwellEaseDistance * (approach - easedApproach);
        } else if (scrollPosition >= end && scrollPosition < end + dwellEaseDistance) {
          var departure = (scrollPosition - end) / dwellEaseDistance;
          var easedDeparture = departure * departure * (3 - 2 * departure);
          translate = dwellEaseDistance * (departure - easedDeparture);
        }

        section.style.transform = translate ? 'translateY(' + translate + 'px)' : '';
      });

      dwellFrame = null;
    }

    function scheduleDwellEase() {
      if (dwellFrame !== null) return;
      dwellFrame = window.requestAnimationFrame(updateDwellEase);
    }

    window.addEventListener('scroll', scheduleDwellEase, { passive: true });
    window.addEventListener('resize', scheduleDwellEase);
    updateDwellEase();
  }
}());
