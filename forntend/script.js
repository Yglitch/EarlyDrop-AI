(function(){
  var pages = {
    landing: document.getElementById('page-landing'),
    form: document.getElementById('page-form'),
    result: document.getElementById('page-result'),
    about: document.getElementById('page-about'),
    contact: document.getElementById('page-contact')
  };
  var navLinks = document.querySelectorAll('nav.primary a[data-nav], footer .footer-links a[data-nav]');

  function showPage(name){
    Object.keys(pages).forEach(function(key){
      if(pages[key]) {
        pages[key].classList.toggle('active', key === name);
      }
    });
    navLinks.forEach(function(a){
      if(a.dataset.nav) {
        a.classList.toggle('current', a.dataset.nav === name);
      }
    });
    window.scrollTo({top:0, behavior:'auto'});
  }

  function routeFromHash(){
    var hash = window.location.hash.replace('#','') || 'landing';
    if(pages[hash]) {
      showPage(hash);
    } else {
      showPage('landing');
    }
  }

  /* Navigate directly instead of only relying on the hashchange event.
     Fixes the "Home" button doing nothing when the hash is already
     '#landing' (or unchanged) — e.g. clicking Home while scrolled down
     on the landing page, or clicking it twice in a row. */
  function navigateTo(target){
    if(!pages[target]) return;
    if(window.location.hash.replace('#','') === target){
      showPage(target);
    } else {
      window.location.hash = target;
    }
  }

  document.querySelectorAll('[data-nav]').forEach(function(el){
    el.addEventListener('click', function(e){
      var target = el.dataset.nav;
      if(pages[target]){
        e.preventDefault();
        navigateTo(target);
      }
    });
  });

  window.addEventListener('hashchange', routeFromHash);
  routeFromHash();

  /* ---------------- Prediction logic ----------------
     Placeholder rule-based scoring — swap this function
     for a real API call to your trained model. */
  function predict(data){
    var score = 0;
    if(data.marks < 50) score += 3;
    else if(data.marks < 67) score += 1;

    if(data.assignment === 'No') score += 2;
    else if(data.assignment === 'Half') score += 1;

    if(data.debtor === 'Yes') score += 2;
    if(data.displaced === 'Yes') score += 1;
    if(data.co_curricular === 'No') score += 1;
    if(data.income < 80000) score += 1;

    if(score >= 6) return 'High';
    if(score >= 3) return 'Medium';
    return 'Low';
  }

  var copy = {
    Low: {
      desc: 'This student shows consistent engagement across the signals provided. No immediate intervention needed.',
      solutions: [
        'Keep the current support routine — check in at the next scheduled review.',
        'Encourage continued participation in co-curricular activities.',
        'Log this result so future dips are easy to spot early.'
      ]
    },
    Medium: {
      desc: 'A few signals are trending the wrong way. Worth a light-touch check-in before it becomes a pattern.',
      solutions: [
        'Schedule a short mentor check-in within the next two weeks.',
        'Review pending assignments together and agree a catch-up plan.',
        'Flag for the financial aid desk if income or debtor status is a factor.'
      ]
    },
    High: {
      desc: 'Multiple risk signals are present together. This student should be prioritised for direct outreach.',
      solutions: [
        'Arrange a direct conversation with the student and guardian this week.',
        'Connect with the financial aid office if fees are a barrier.',
        'Set up a short-term academic recovery plan with weekly check-ins.',
        'Loop in the counselling team if displacement or personal circumstances are involved.'
      ]
    }
  };

  var form = document.getElementById('predict-form');
  var errorBox = document.getElementById('form-error');

  if(form) {
    form.addEventListener('submit', function(e){
      e.preventDefault();

      var data = {
        co_curricular: document.getElementById('co_curricular').value,
        marks: parseFloat(document.getElementById('marks').value),
        assignment: document.getElementById('assignment').value,
        debtor: document.getElementById('debtor').value,
        displaced: document.getElementById('displaced').value,
        income: parseFloat(document.getElementById('income').value)
      };

      var valid = data.co_curricular && data.assignment && data.debtor && data.displaced &&
                  !isNaN(data.marks) && !isNaN(data.income);

      if(!valid){
        errorBox.classList.add('show');
        return;
      }
      errorBox.classList.remove('show');

      var level = predict(data);
      var badge = document.getElementById('risk-badge');
      var label = document.getElementById('risk-label');
      var desc = document.getElementById('risk-desc');
      var list = document.getElementById('solutions-list');

      badge.className = 'risk-badge ' + level.toLowerCase();
      label.textContent = level + ' risk';
      desc.textContent = copy[level].desc;

      document.getElementById('stat-marks').textContent = data.marks + '/100';
      document.getElementById('stat-assignment').textContent = data.assignment;
      document.getElementById('stat-income').textContent = '₹' + data.income.toLocaleString('en-IN');

      list.innerHTML = '';
      copy[level].solutions.forEach(function(step, i){
        var li = document.createElement('li');
        li.innerHTML = '<span class="num">' + (i+1) + '</span><span>' + step + '</span>';
        list.appendChild(li);
      });

      navigateTo('result');
    });
  }

  // Contact form submission handler
  var contactForm = document.getElementById('contact-form');
  var contactSuccess = document.getElementById('contact-success');
  if(contactForm) {
    contactForm.addEventListener('submit', function(e){
      e.preventDefault();
      var name = document.getElementById('contact-name').value;
      var email = document.getElementById('contact-email').value;
      var message = document.getElementById('contact-message').value;

      if(name && email && message) {
        if(contactSuccess) contactSuccess.style.display = 'block';
        contactForm.reset();
        setTimeout(function(){
          if(contactSuccess) contactSuccess.style.display = 'none';
        }, 5000);
      }
    });
  }

  var termsLink = document.getElementById('footer-terms');
  if(termsLink) {
    termsLink.addEventListener('click', function(e){e.preventDefault(); alert('Terms & Conditions page — plug in your policy text here.');});
  }
})();