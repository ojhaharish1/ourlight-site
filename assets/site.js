/* Ourlight website — small vanilla JS. No trackers, no cookies, no storage.
   Two endpoints, both optional. Leave a constant empty and the matching form
   shows an email address to write to instead. Each endpoint receives a JSON
   POST and should answer with a 2xx status when it has stored the request. */

var WAITLIST_ENDPOINT = ''; // e.g. 'https://example.com/api/waitlist' — receives {email, source}
var DELETE_ENDPOINT = '';   // e.g. 'https://example.com/api/delete-request' — receives {email, note, source}
var CONTACT_EMAIL = 'hello@ourlight.app';

(function () {
  'use strict';

  function validEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
  }

  /* Wires one form. Config:
     endpoint  — URL to POST to, or '' to show the fallback instead
     payload   — function(form) returning the JSON object to send
     done      — message shown on a 2xx answer
     failed    — message shown on any failure (never pretends the request was sent) */
  function wire(form, config) {
    if (!form) return;
    var fallback = form.parentNode.querySelector('[data-fallback]');
    var status = form.querySelector('[data-status]');
    var button = form.querySelector('button[type="submit"]');
    var emailInput = form.querySelector('input[type="email"]');
    var idle = button ? button.textContent : '';

    // Without JavaScript, or without an endpoint, the page shows the email fallback.
    // The form is revealed only when there is somewhere to send it.
    if (!config.endpoint) return;
    form.hidden = false;
    if (fallback) fallback.hidden = true;

    function say(text, state) {
      if (!status) return;
      status.textContent = text;
      status.setAttribute('data-state', state || '');
    }

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      if (form.querySelector('.hp input') && form.querySelector('.hp input').value) return; // honeypot
      if (!emailInput || !validEmail(emailInput.value)) {
        say('Please enter the email address you want us to use.', 'error');
        if (emailInput) emailInput.focus();
        return;
      }
      var body = JSON.stringify(config.payload(form));
      var controller = typeof AbortController === 'function' ? new AbortController() : null;
      var timer = controller ? setTimeout(function () { controller.abort(); }, 15000) : null;

      if (button) { button.disabled = true; button.textContent = 'Sending'; }
      say('', '');

      fetch(config.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: body,
        signal: controller ? controller.signal : undefined
      }).then(function (response) {
        if (!response.ok) throw new Error('HTTP ' + response.status);
        form.reset();
        say(config.done, 'ok');
        var panel = form.parentNode.querySelector('[data-done]');
        if (panel) { panel.style.display = 'block'; form.hidden = true; panel.focus && panel.focus(); }
      }).catch(function () {
        say(config.failed, 'error');
      }).then(function () {
        if (timer) clearTimeout(timer);
        if (button) { button.disabled = false; button.textContent = idle; }
      });
    });
  }

  function ready() {
    var page = (location.pathname.replace(/\/+$/, '').split('/').pop() || 'index').replace(/\.html$/, '');

    wire(document.getElementById('waitlist-form'), {
      endpoint: WAITLIST_ENDPOINT,
      payload: function (form) {
        return { email: form.email.value.trim(), source: 'ourlight.app/' + page + '#waitlist' };
      },
      done: 'You are on the list. We will write when the iPhone version is ready, and once on launch day.',
      failed: 'That did not go through, so you are not on the list yet. Please try again in a moment, or write to ' + CONTACT_EMAIL + ' with "iPhone" in the subject.'
    });

    wire(document.getElementById('delete-form'), {
      endpoint: DELETE_ENDPOINT,
      payload: function (form) {
        return { email: form.email.value.trim(), note: (form.note ? form.note.value.trim() : ''), source: 'ourlight.app/delete-account' };
      },
      done: 'We have your request. You will get a confirmation by email, and the deletion is completed within 30 days.',
      failed: 'That did not go through, so we have not received your request. Please try again, or email ' + CONTACT_EMAIL + ' with "Delete my account" in the subject.'
    });

    // Fill in the contact address wherever the page asks for it, so it lives in one place.
    var links = document.querySelectorAll('[data-email]');
    for (var i = 0; i < links.length; i++) {
      var subject = links[i].getAttribute('data-email');
      links[i].setAttribute('href', 'mailto:' + CONTACT_EMAIL + (subject ? '?subject=' + encodeURIComponent(subject) : ''));
      if (!links[i].textContent.trim()) links[i].textContent = CONTACT_EMAIL;
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready);
  else ready();
})();
