(function(){

  /* Point this at your FastAPI backend. Leave empty ('') if the API is
     served from the same origin as this frontend (e.g. both behind one
     reverse proxy). Otherwise set it to e.g. 'http://localhost:8000' —
     note the backend currently has no CORS middleware configured, so a
     different-origin frontend will need that added to main.py first. */
  var API_BASE = 'http://localhost:8000';

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
    if(pages[hash]) showPage(hash);
    else showPage('landing');
  }

  /* Navigate directly instead of only relying on the hashchange event —
     fixes nav links doing nothing when the hash isn't actually changing. */
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

  /* =========================================================
     STUDENT SEARCH (header)
       GET {API_BASE}/students/{student_id}
       -> StudentResponse on success
       -> 404 { detail: "Student not found" } if no match
     (matches controller.py's get_student — no auth required)
  ========================================================= */
  var searchForm = document.getElementById('student-search-form');
  var searchInput = document.getElementById('student-search-input');
  var searchResults = document.getElementById('search-results');

  function closeSearchResults(){
    if(searchResults){
      searchResults.classList.remove('open');
      searchResults.innerHTML = '';
    }
  }

  function renderSearchResult(student){
    var badgeClass = (student.prediction || 'low').toLowerCase();
    searchResults.innerHTML =
      '<div class="sr-title">' +
        '<h4>' + student.name + '</h4>' +
        '<button type="button" class="sr-close" aria-label="Close">✕</button>' +
      '</div>' +
      '<div class="sr-row"><span class="k">Student ID</span><span class="v">' + student.student_id + '</span></div>' +
      '<div class="sr-row"><span class="k">Prediction</span><span class="v risk-pill ' + badgeClass + '">' + student.prediction + '</span></div>' +
      '<div class="sr-row"><span class="k">Marks</span><span class="v">' + student.marks + ' / 100</span></div>' +
      '<div class="sr-row"><span class="k">Attendance</span><span class="v">' + student.attendance + '%</span></div>';
    searchResults.classList.add('open');

    var closeBtn = searchResults.querySelector('.sr-close');
    if(closeBtn) closeBtn.addEventListener('click', closeSearchResults);
  }

  function renderSearchEmpty(message){
    searchResults.innerHTML =
      '<div class="sr-title"><h4>Not found</h4><button type="button" class="sr-close" aria-label="Close">✕</button></div>' +
      '<p class="sr-empty">' + message + '</p>';
    searchResults.classList.add('open');

    var closeBtn = searchResults.querySelector('.sr-close');
    if(closeBtn) closeBtn.addEventListener('click', closeSearchResults);
  }

  function runStudentSearch(){
    var id = searchInput.value.trim();
    if(!id){ closeSearchResults(); return; }

    fetch(API_BASE + '/students/' + encodeURIComponent(id))
      .then(function(res){
        if(res.status === 404) return null; // handled below as "not found"
        if(!res.ok) throw new Error('Search failed. Please try again.');
        return res.json();
      })
      .then(function(student){
        if(student) renderSearchResult(student);
        else renderSearchEmpty('No student found with ID "' + id + '".');
      })
      .catch(function(err){
        renderSearchEmpty(err.message || 'Could not reach the server.');
      });
  }

  if(searchForm){
    searchForm.addEventListener('submit', function(e){
      e.preventDefault();
      runStudentSearch();
    });
  }

  // Close the dropdown when clicking anywhere outside it
  document.addEventListener('click', function(e){
    if(!searchResults) return;
    var clickedInsideSearch = e.target.closest('.search');
    if(!clickedInsideSearch) closeSearchResults();
  });
  document.addEventListener('keydown', function(e){
    if(e.key === 'Escape') closeSearchResults();
  });

  /* =========================================================
     HIGH-RISK STUDENTS TABLE
       GET {API_BASE}/students/?prediction=High&limit=10
       -> { total: number, items: StudentResponse[] }
     (matches controller.py's list_students — no auth required)
  ========================================================= */
  function loadHighRiskStudents(){
    var emptyMsg = document.getElementById('high-risk-empty');
    var errorMsg = document.getElementById('high-risk-error');
    var table = document.getElementById('high-risk-table');
    var body = document.getElementById('high-risk-body');
    var countEl = document.getElementById('high-risk-count');
    if(!body) return;

    if(emptyMsg) emptyMsg.style.display = 'none';
    if(errorMsg) errorMsg.style.display = 'none';
    if(table) table.style.display = '';

    fetch(API_BASE + '/students/?prediction=High&limit=10')
      .then(function(res){
        if(!res.ok) throw new Error('Could not load students.');
        return res.json();
      })
      .then(function(data){
        var students = (data && data.items) || [];
        body.innerHTML = '';
        students.forEach(function(s){
          var tr = document.createElement('tr');
          tr.innerHTML = '<td>' + s.student_id + '</td><td class="name">' + s.name + '</td><td>' + s.marks + '</td>';
          body.appendChild(tr);
        });
        if(countEl) countEl.textContent = (data.total || students.length) + ' flagged';
        if(students.length === 0){
          if(table) table.style.display = 'none';
          if(emptyMsg) emptyMsg.style.display = 'block';
        }
      })
      .catch(function(){
        if(countEl) countEl.textContent = '— flagged';
        if(table) table.style.display = 'none';
        if(errorMsg) errorMsg.style.display = 'block';
      });
  }

  /* =========================================================
     PREDICTION
       POST {API_BASE}/students/predict
       body: {
         name, student_id, age, gender, attendance, scholarship,
         co_curricular_activities, marks, assignment_submission,
         debtor, displaced, income
       }
       -> StudentResponse, including "prediction": "Low" | "Medium" | "High"

     controller.py's /predict endpoint doesn't return a description or
     next-step suggestions — just the saved record + prediction — so the
     copy below fills that in for display purposes only.
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
    var studentEl = document.getElementById('result-student');

    badge.className = 'risk-badge ' + level.toLowerCase();
    label.textContent = level + ' risk';
    descEl.textContent = desc;
    if(studentEl) studentEl.textContent = data.name + ' · ' + data.student_id;

    document.getElementById('stat-marks').textContent = data.marks + '/100';
    document.getElementById('stat-attendance').textContent = data.attendance + '%';
    document.getElementById('stat-assignment').textContent = data.assignment_submission;
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
        name: document.getElementById('name').value.trim(),
        student_id: document.getElementById('student_id').value.trim(),
        age: parseInt(document.getElementById('age').value, 10),
        gender: document.getElementById('gender').value,
        attendance: parseFloat(document.getElementById('attendance').value),
        scholarship: document.getElementById('scholarship').value,
        co_curricular_activities: document.getElementById('co_curricular_activities').value,
        marks: parseFloat(document.getElementById('marks').value),
        assignment_submission: document.getElementById('assignment_submission').value,
        debtor: document.getElementById('debtor').value,
        displaced: document.getElementById('displaced').value,
        income: parseFloat(document.getElementById('income').value)
      };

      var valid = data.name && data.student_id && data.gender && data.scholarship &&
                  data.co_curricular_activities && data.assignment_submission &&
                  data.debtor && data.displaced &&
                  !isNaN(data.age) && !isNaN(data.attendance) &&
                  !isNaN(data.marks) && !isNaN(data.income);

      if(!valid){
        errorBox.textContent = 'Please fill in every field before running a prediction.';
        errorBox.classList.add('show');
        return;
      }
      errorBox.classList.remove('show');

      fetch(API_BASE + '/students/predict', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(data)
      })
      .then(function(res){
        if(!res.ok){
          return res.json()
            .then(function(body){ throw new Error(body.detail || 'Prediction failed. Please try again.'); })
            .catch(function(){ throw new Error('Prediction failed. Please try again.'); });
        }
        return res.json();
      })
      .then(function(result){
        var level = result.prediction;
        var fallback = fallbackCopy[level] || fallbackCopy.Low;
        renderResult(level, fallback.desc, fallback.solutions, data);
      })
      .catch(function(err){
        errorBox.textContent = err.message || 'Could not reach the prediction service.';
        errorBox.classList.add('show');
      });
    });
  }

  /* Contact form — purely client-side for now, no backend endpoint exists for this yet */
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
  routeFromHash();
})();