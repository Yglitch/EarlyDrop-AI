(function(){

  /* Point this at your backend. Leave empty ('') if the API is served
     from the same origin as this frontend. */
  var API_BASE = '';

  var pages = {
    landing: document.getElementById('page-landing'),
    form: document.getElementById('page-form'),
    result: document.getElementById('page-result'),
    about: document.getElementById('page-about'),
    contact: document.getElementById('page-contact'),
    login: document.getElementById('page-login'),
    register: document.getElementById('page-register')
  };
  var navLinks = document.querySelectorAll('nav.primary a[data-nav], footer .footer-links a[data-nav]');

  /* Pages that require an admin to be logged in. Visiting these while
     logged out redirects to the login page and returns here afterwards. */
  var AUTH_REQUIRED_PAGES = ['form'];
  var pendingRedirect = null;

  function showPage(name){
    Object.keys(pages).forEach(function(key){
      if(pages[key]) pages[key].classList.toggle('active', key === name);
    });
    navLinks.forEach(function(a){
      if(a.dataset.nav) a.classList.toggle('current', a.dataset.nav === name);
    });
    window.scrollTo({top:0, behavior:'auto'});
    if(name === 'landing') loadHighRiskStudents();
  }

  function routeFromHash(){
    var hash = window.location.hash.replace('#','') || 'landing';
    if(AUTH_REQUIRED_PAGES.indexOf(hash) !== -1 && !isLoggedIn()){
      pendingRedirect = hash;
      showPage('login');
      return;
    }
    if(pages[hash]) showPage(hash);
    else showPage('landing');
  }

  /* Navigate directly instead of only relying on the hashchange event.
     Also enforces the auth gate above. */
  function navigateTo(target){
    if(!pages[target]) return;
    if(AUTH_REQUIRED_PAGES.indexOf(target) !== -1 && !isLoggedIn()){
      pendingRedirect = target;
      target = 'login';
    }
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

  /* =========================================================
     ADMIN AUTH
     Talks to your backend (Postgres-backed) at:
       POST /api/auth/register  { name, institution, email, password } -> { token, admin }
       POST /api/auth/login     { email, password }                    -> { token, admin }
     Swap API_BASE / paths above to match your actual backend routes.
  ========================================================= */
  var TOKEN_KEY = 'pulse_token';
  var ADMIN_KEY = 'pulse_admin';

  function getToken(){ return localStorage.getItem(TOKEN_KEY); }
  function getAdmin(){
    try{ return JSON.parse(localStorage.getItem(ADMIN_KEY)); }
    catch(e){ return null; }
  }
  function isLoggedIn(){ return !!getToken(); }

  function setSession(token, admin){
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(ADMIN_KEY, JSON.stringify(admin || {}));
    updateProfileUI();
  }
  function clearSession(){
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(ADMIN_KEY);
    updateProfileUI();
  }

  function updateProfileUI(){
    var admin = getAdmin();
    var guestEl = document.getElementById('profile-guest');
    var userEl = document.getElementById('profile-user');
    var avatar = document.getElementById('profile-avatar');

    if(admin && isLoggedIn()){
      if(guestEl) guestEl.style.display = 'none';
      if(userEl) userEl.style.display = 'block';
      var nameEl = document.getElementById('profile-name');
      var emailEl = document.getElementById('profile-email');
      if(nameEl) nameEl.textContent = admin.name || 'Admin';
      if(emailEl) emailEl.textContent = admin.email || '';
      if(avatar) avatar.textContent = (admin.name || 'A').trim().charAt(0).toUpperCase();
    } else {
      if(guestEl) guestEl.style.display = 'block';
      if(userEl) userEl.style.display = 'none';
      if(avatar) avatar.innerHTML = '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
        '<circle cx="12" cy="8" r="4" stroke="currentColor" stroke-width="1.8"/>' +
        '<path d="M4 20c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
    }
  }

  /* Profile dropdown open/close */
  var profileBtn = document.getElementById('profile-btn');
  var profileDropdown = document.getElementById('profile-dropdown');
  if(profileBtn && profileDropdown){
    profileBtn.addEventListener('click', function(e){
      e.stopPropagation();
      var open = profileDropdown.classList.toggle('open');
      profileBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    profileDropdown.addEventListener('click', function(e){ e.stopPropagation(); });
    document.addEventListener('click', function(){
      profileDropdown.classList.remove('open');
      profileBtn.setAttribute('aria-expanded', 'false');
    });
    document.addEventListener('keydown', function(e){
      if(e.key === 'Escape') profileDropdown.classList.remove('open');
    });
  }

  var logoutBtn = document.getElementById('logout-btn');
  if(logoutBtn){
    logoutBtn.addEventListener('click', function(){
      clearSession();
      navigateTo('landing');
    });
  }

  /* Login */
  var loginForm = document.getElementById('login-form');
  var loginError = document.getElementById('login-error');
  if(loginForm){
    loginForm.addEventListener('submit', function(e){
      e.preventDefault();
      var email = document.getElementById('login-email').value.trim();
      var password = document.getElementById('login-password').value;

      if(!email || !password){
        loginError.textContent = 'Enter your email and password.';
        loginError.classList.add('show');
        return;
      }
      loginError.classList.remove('show');

      fetch(API_BASE + '/api/auth/login', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({email: email, password: password})
      })
      .then(function(res){
        if(!res.ok) throw new Error('Invalid email or password.');
        return res.json();
      })
      .then(function(data){
        // Expected shape: { token: '...', admin: { id, name, email, institution } }
        setSession(data.token, data.admin);
        loginForm.reset();
        var target = pendingRedirect || 'landing';
        pendingRedirect = null;
        navigateTo(target);
      })
      .catch(function(err){
        loginError.textContent = err.message || 'Log in failed — check your details and try again.';
        loginError.classList.add('show');
      });
    });
  }

  /* Register */
  var registerForm = document.getElementById('register-form');
  var registerError = document.getElementById('register-error');
  if(registerForm){
    registerForm.addEventListener('submit', function(e){
      e.preventDefault();
      var name = document.getElementById('register-name').value.trim();
      var institution = document.getElementById('register-institution').value.trim();
      var email = document.getElementById('register-email').value.trim();
      var password = document.getElementById('register-password').value;

      if(!name || !institution || !email || password.length < 8){
        registerError.classList.add('show');
        return;
      }
      registerError.classList.remove('show');

      fetch(API_BASE + '/api/auth/register', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({name: name, institution: institution, email: email, password: password})
      })
      .then(function(res){
        if(!res.ok) return res.json().then(function(body){ throw new Error(body.message || 'Registration failed.'); });
        return res.json();
      })
      .then(function(data){
        // Expected shape: { token: '...', admin: { id, name, email, institution } }
        setSession(data.token, data.admin);
        registerForm.reset();
        navigateTo('landing');
      })
      .catch(function(err){
        registerError.textContent = err.message || 'Registration failed. Try a different email.';
        registerError.classList.add('show');
      });
    });
  }

  /* =========================================================
     HIGH-RISK STUDENTS TABLE (scoped to the logged-in admin)
       GET /api/students/high-risk   (Authorization: Bearer <token>)
       -> [{ roll_no, name, contact }, ...]
  ========================================================= */
  function loadHighRiskStudents(){
    var lockedMsg = document.getElementById('high-risk-locked');
    var table = document.getElementById('high-risk-table');
    var body = document.getElementById('high-risk-body');
    var countEl = document.getElementById('high-risk-count');
    if(!body) return;

    if(!isLoggedIn()){
      if(lockedMsg) lockedMsg.style.display = 'block';
      if(table) table.style.display = 'none';
      if(countEl) countEl.textContent = '— flagged';
      return;
    }

    fetch(API_BASE + '/api/students/high-risk', {
      headers: {'Authorization': 'Bearer ' + getToken()}
    })
    .then(function(res){
      if(res.status === 401){ clearSession(); return []; }
      if(!res.ok) throw new Error('Could not load students.');
      return res.json();
    })
    .then(function(students){
      students = students || [];
      body.innerHTML = '';
      students.forEach(function(s){
        var tr = document.createElement('tr');
        tr.innerHTML = '<td>' + s.roll_no + '</td><td class="name">' + s.name + '</td><td>' + s.contact + '</td>';
        body.appendChild(tr);
      });
      if(lockedMsg) lockedMsg.style.display = 'none';
      if(table) table.style.display = '';
      if(countEl) countEl.textContent = students.length + ' flagged';
    })
    .catch(function(){
      if(countEl) countEl.textContent = '— flagged';
    });
  }

  /* =========================================================
     PREDICTION — plug in your ML model on the backend here.
       POST /api/predict   (Authorization: Bearer <token>)
       body: { co_curricular, marks, assignment, debtor, displaced, income }
       -> { risk: 'Low' | 'Medium' | 'High', desc?: string, solutions?: string[] }

     desc/solutions are optional — if your API doesn't return them,
     the generic copy below is used as a fallback for display only.
  ========================================================= */
  var fallbackCopy = {
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

  function renderResult(level, desc, solutions, data){
    var badge = document.getElementById('risk-badge');
    var label = document.getElementById('risk-label');
    var descEl = document.getElementById('risk-desc');
    var list = document.getElementById('solutions-list');

    badge.className = 'risk-badge ' + level.toLowerCase();
    label.textContent = level + ' risk';
    descEl.textContent = desc;

    document.getElementById('stat-marks').textContent = data.marks + '/100';
    document.getElementById('stat-assignment').textContent = data.assignment;
    document.getElementById('stat-income').textContent = '₹' + data.income.toLocaleString('en-IN');

    list.innerHTML = '';
    (solutions || []).forEach(function(step, i){
      var li = document.createElement('li');
      li.innerHTML = '<span class="num">' + (i + 1) + '</span><span>' + step + '</span>';
      list.appendChild(li);
    });

    navigateTo('result');
  }

  var form = document.getElementById('predict-form');
  var errorBox = document.getElementById('form-error');

  if(form){
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
        errorBox.textContent = 'Please fill in every field before running a prediction.';
        errorBox.classList.add('show');
        return;
      }
      errorBox.classList.remove('show');

      fetch(API_BASE + '/api/predict', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + getToken()
        },
        body: JSON.stringify(data)
      })
      .then(function(res){
        if(res.status === 401){
          clearSession();
          navigateTo('login');
          throw new Error('Session expired — please log in again.');
        }
        if(!res.ok) throw new Error('Prediction failed. Please try again.');
        return res.json();
      })
      .then(function(result){
        var level = result.risk;
        var fallback = fallbackCopy[level] || fallbackCopy.Low;
        renderResult(level, result.desc || fallback.desc, result.solutions || fallback.solutions, data);
      })
      .catch(function(err){
        errorBox.textContent = err.message || 'Could not reach the prediction service.';
        errorBox.classList.add('show');
      });
    });
  }

  /* Contact form (placeholder — wire this to your backend/email service too) */
  var contactForm = document.getElementById('contact-form');
  var contactSuccess = document.getElementById('contact-success');
  if(contactForm){
    contactForm.addEventListener('submit', function(e){
      e.preventDefault();
      var name = document.getElementById('contact-name').value;
      var email = document.getElementById('contact-email').value;
      var message = document.getElementById('contact-message').value;

      if(name && email && message){
        if(contactSuccess) contactSuccess.style.display = 'block';
        contactForm.reset();
        setTimeout(function(){
          if(contactSuccess) contactSuccess.style.display = 'none';
        }, 5000);
      }
    });
  }

  var termsLink = document.getElementById('footer-terms');
  if(termsLink){
    termsLink.addEventListener('click', function(e){
      e.preventDefault();
      alert('Terms & Conditions page — plug in your policy text here.');
    });
  }

  /* ---- init ---- */
  updateProfileUI();
  routeFromHash();
})();