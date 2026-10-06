/**
 * WANDERLUST PRO — MAIN APPLICATION ENGINE
 * Full-featured Single Page Application (SPA) Controller
 */

class WanderlustApp {
  constructor() {
    this.currentView = 'dashboard';
    this.currency = 'USD';
    this.currencyRates = {
      USD: { symbol: '$', rate: 1.0 },
      EUR: { symbol: '€', rate: 0.92 },
      GBP: { symbol: '£', rate: 0.79 },
      JPY: { symbol: '¥', rate: 152.4 },
      AUD: { symbol: 'A$', rate: 1.54 }
    };

    // State data
    this.destinations = [];
    this.trips = [];
    this.customers = [];
    this.bookings = [];
    this.settings = {};

    // Filters and View Modes
    this.destViewMode = 'grid';
    this.tripViewMode = 'grid';
    this.custViewMode = 'grid';
    
    // Pagination states
    this.bookingPage = 1;
    this.bookingPageSize = 8;
    this.bookingTab = 'all';
    this.bookingSortCol = 'bookingDate';
    this.bookingSortAsc = false;

    this.tripPage = 1;
    this.tripPageSize = 8;

    this.custPage = 1;
    this.custPageSize = 8;

    // Calendar state
    this.calendarDate = new Date(2026, 9, 1); // October 2026 (Month is 0-indexed)

    // Chart instances
    this.charts = {};

    // Confirmation Promise resolver
    this.confirmResolver = null;

    // Wizard state
    this.wizardStep = 1;
  }

  // =========================================================================
  // INITIALIZATION
  // =========================================================================
  init() {
    // 1. Initialize data from LocalStorage or seeds
    this.loadAllData();

    // 2. Setup event listeners & router
    this.setupRouter();
    this.setupTheme();
    this.setupGlobalSearch();
    this.setupSidebar();
    this.setupCurrency();

    // 3. Render initial view
    this.navigateTo(window.location.hash.replace('#', '') || 'dashboard');
    this.updateNotificationBadge();
  }

  loadAllData() {
    this.destinations = WanderlustData.getDestinations();
    this.trips = WanderlustData.getTrips();
    this.customers = WanderlustData.getCustomers();
    this.bookings = WanderlustData.getBookings();
    this.settings = WanderlustData.getSettings();

    this.updateNavCounters();
    this.populateDestinationDropdowns();
  }

  updateNavCounters() {
    const elDest = document.getElementById('navCountDestinations');
    const elTrips = document.getElementById('navCountTrips');
    const elBook = document.getElementById('navCountBookings');
    const elCust = document.getElementById('navCountCustomers');

    if (elDest) elDest.textContent = this.destinations.length;
    if (elTrips) elTrips.textContent = this.trips.length;
    if (elBook) elBook.textContent = this.bookings.length;
    if (elCust) elCust.textContent = this.customers.length;

    // DB stats in settings
    const dbDest = document.getElementById('dbCountDest');
    const dbTrips = document.getElementById('dbCountTrips');
    const dbCust = document.getElementById('dbCountCust');
    const dbBook = document.getElementById('dbCountBook');
    if (dbDest) dbDest.textContent = this.destinations.length;
    if (dbTrips) dbTrips.textContent = this.trips.length;
    if (dbCust) dbCust.textContent = this.customers.length;
    if (dbBook) dbBook.textContent = this.bookings.length;
  }

  populateDestinationDropdowns() {
    const dropdowns = ['tripDestFilter', 'bookingDestFilter', 'calendarDestFilter', 'tripDestInput'];
    dropdowns.forEach(id => {
      const select = document.getElementById(id);
      if (!select) return;

      const currentValue = select.value;
      let html = id === 'tripDestInput' ? '<option value="">-- Select Destination --</option>' : '<option value="all">All Destinations</option>';
      
      this.destinations.forEach(d => {
        html += `<option value="${d.id}">${d.name}, ${d.country}</option>`;
      });
      select.innerHTML = html;
      if (currentValue) select.value = currentValue;
    });
  }

  // =========================================================================
  // ROUTER & NAVIGATION
  // =========================================================================
  setupRouter() {
    window.addEventListener('hashchange', () => {
      const view = window.location.hash.replace('#', '') || 'dashboard';
      this.navigateTo(view, false);
    });

    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', (e) => {
        const view = link.getAttribute('data-view');
        if (view) {
          this.navigateTo(view);
          // Close mobile sidebar if open
          document.getElementById('appSidebar').classList.remove('mobile-open');
        }
      });
    });
  }

  navigateTo(viewName, updateHash = true) {
    const validViews = ['dashboard', 'destinations', 'trips', 'bookings', 'customers', 'calendar', 'payments', 'analytics', 'settings'];
    if (!validViews.includes(viewName)) viewName = 'dashboard';

    this.currentView = viewName;
    if (updateHash) window.location.hash = viewName;

    // Update active nav links
    document.querySelectorAll('.nav-link').forEach(link => {
      link.classList.toggle('active', link.getAttribute('data-view') === viewName);
    });

    // Update view sections
    document.querySelectorAll('.view-section').forEach(sec => {
      sec.classList.toggle('active', sec.id === `view-${viewName}`);
    });

    // Update breadcrumb title
    const titles = {
      dashboard: 'Dashboard Overview',
      destinations: 'Destinations Portfolio',
      trips: 'Trips & Tour Packages',
      bookings: 'Bookings & Reservations',
      customers: 'Travelers Directory',
      calendar: 'Trip Schedule Calendar',
      payments: 'Payments & Invoices',
      analytics: 'Analytics & Intelligence',
      settings: 'Settings & Data Control'
    };
    const titleEl = document.getElementById('currentViewTitle');
    if (titleEl) titleEl.textContent = titles[viewName] || 'Dashboard';

    // Render corresponding view data
    this.renderCurrentView();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  renderCurrentView() {
    switch (this.currentView) {
      case 'dashboard':
        this.renderDashboard();
        break;
      case 'destinations':
        this.renderDestinations();
        break;
      case 'trips':
        this.renderTrips();
        break;
      case 'bookings':
        this.renderBookings();
        break;
      case 'customers':
        this.renderCustomers();
        break;
      case 'calendar':
        this.renderCalendar();
        break;
      case 'payments':
        this.renderPayments();
        break;
      case 'analytics':
        this.renderAnalytics();
        break;
      case 'settings':
        this.renderSettings();
        break;
    }
  }

  // =========================================================================
  // CURRENCY & FORMATTING
  // =========================================================================
  setupCurrency() {
    const select = document.getElementById('currencySelect');
    if (select) {
      select.value = this.currency;
      select.addEventListener('change', (e) => {
        this.currency = e.target.value;
        this.showToast(`Display currency switched to ${this.currency}`, 'info');
        this.renderCurrentView();
      });
    }
  }

  formatMoney(amountInUSD) {
    const curr = this.currencyRates[this.currency] || this.currencyRates['USD'];
    const converted = amountInUSD * curr.rate;
    
    if (this.currency === 'JPY') {
      return `${curr.symbol}${Math.round(converted).toLocaleString()}`;
    }
    return `${curr.symbol}${converted.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  }

  formatDate(dateStr) {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  }

  // =========================================================================
  // THEME & SIDEBAR
  // =========================================================================
  setupTheme() {
    const savedTheme = localStorage.getItem('wanderlust_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);

    const toggleBtn = document.getElementById('themeToggleBtn');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme');
        const next = current === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('wanderlust_theme', next);
        this.showToast(`Switched to ${next} theme mode`, 'info');
        
        // Re-render active charts with updated theme palette
        if (this.currentView === 'dashboard' || this.currentView === 'analytics') {
          this.renderCurrentView();
        }
      });
    }
  }

  setupSidebar() {
    const collapseBtn = document.getElementById('sidebarCollapseBtn');
    const sidebar = document.getElementById('appSidebar');
    if (collapseBtn && sidebar) {
      collapseBtn.addEventListener('click', () => {
        sidebar.classList.toggle('collapsed');
      });
    }

    const mobileToggle = document.getElementById('mobileMenuToggle');
    if (mobileToggle && sidebar) {
      mobileToggle.addEventListener('click', () => {
        sidebar.classList.toggle('mobile-open');
      });
    }
  }

  setupGlobalSearch() {
    const input = document.getElementById('globalSearchInput');
    const dropdown = document.getElementById('globalSearchResults');

    // Global keyboard shortcut '/'
    document.addEventListener('keydown', (e) => {
      if (e.key === '/' && document.activeElement !== input && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
        e.preventDefault();
        input.focus();
      }
    });

    if (!input || !dropdown) return;

    input.addEventListener('input', (e) => {
      const q = e.target.value.trim().toLowerCase();
      if (!q) {
        dropdown.classList.remove('show');
        return;
      }

      // Search trips, bookings, customers, destinations
      const matchedTrips = this.trips.filter(t => t.title.toLowerCase().includes(q) || t.destinationName.toLowerCase().includes(q)).slice(0, 3);
      const matchedBookings = this.bookings.filter(b => b.id.toLowerCase().includes(q) || b.customerName.toLowerCase().includes(q) || b.tripTitle.toLowerCase().includes(q)).slice(0, 3);
      const matchedCustomers = this.customers.filter(c => c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q)).slice(0, 3);
      const matchedDestinations = this.destinations.filter(d => d.name.toLowerCase().includes(q) || d.country.toLowerCase().includes(q)).slice(0, 2);

      let html = '';

      if (matchedBookings.length > 0) {
        html += `<div class="nav-section-label">Bookings</div>`;
        matchedBookings.forEach(b => {
          html += `
            <div class="search-item" onclick="app.viewBookingDetails('${b.id}'); document.getElementById('globalSearchResults').classList.remove('show');">
              <div class="search-item-icon bg-tag-adventure"><i class="fa-solid fa-ticket text-white"></i></div>
              <div class="search-item-info">
                <span class="search-item-title">${b.id} — ${b.customerName}</span>
                <span class="search-item-sub">${b.tripTitle} (${b.bookingStatus})</span>
              </div>
            </div>`;
        });
      }

      if (matchedTrips.length > 0) {
        html += `<div class="nav-section-label">Trips & Tours</div>`;
        matchedTrips.forEach(t => {
          html += `
            <div class="search-item" onclick="app.viewTripDetails('${t.id}'); document.getElementById('globalSearchResults').classList.remove('show');">
              <div class="search-item-icon bg-tag-luxury"><i class="fa-solid fa-plane-departure text-white"></i></div>
              <div class="search-item-info">
                <span class="search-item-title">${t.title}</span>
                <span class="search-item-sub">${t.destinationName} • ${this.formatMoney(t.pricePerPerson)}</span>
              </div>
            </div>`;
        });
      }

      if (matchedCustomers.length > 0) {
        html += `<div class="nav-section-label">Travelers</div>`;
        matchedCustomers.forEach(c => {
          html += `
            <div class="search-item" onclick="app.navigateTo('customers'); document.getElementById('globalSearchResults').classList.remove('show');">
              <div class="search-item-icon bg-tag-cultural"><i class="fa-solid fa-user text-white"></i></div>
              <div class="search-item-info">
                <span class="search-item-title">${c.name} (${c.tier})</span>
                <span class="search-item-sub">${c.email} • ${c.nationality}</span>
              </div>
            </div>`;
        });
      }

      if (matchedDestinations.length > 0) {
        html += `<div class="nav-section-label">Destinations</div>`;
        matchedDestinations.forEach(d => {
          html += `
            <div class="search-item" onclick="app.navigateTo('destinations'); document.getElementById('globalSearchResults').classList.remove('show');">
              <div class="search-item-icon bg-tag-wildlife"><i class="fa-solid fa-earth-americas text-white"></i></div>
              <div class="search-item-info">
                <span class="search-item-title">${d.name}, ${d.country}</span>
                <span class="search-item-sub">${d.season}</span>
              </div>
            </div>`;
        });
      }

      if (!html) {
        html = `<div style="padding: 1rem; text-align: center; font-size: 0.82rem; color: var(--text-muted);">No results found for "${q}"</div>`;
      }

      dropdown.innerHTML = html;
      dropdown.classList.add('show');
    });

    document.addEventListener('click', (e) => {
      if (!input.contains(e.target) && !dropdown.contains(e.target)) {
        dropdown.classList.remove('show');
      }
    });
  }

  // =========================================================================
  // VIEW 1: DASHBOARD OVERVIEW
  // =========================================================================
  renderDashboard() {
    // 1. Calculate Metrics
    const totalRev = this.bookings.reduce((sum, b) => b.paymentStatus !== 'Refunded' ? sum + b.totalPrice : sum, 0);
    const confirmedCount = this.bookings.filter(b => b.bookingStatus === 'Confirmed').length;
    const pendingCount = this.bookings.filter(b => b.bookingStatus === 'Pending').length;
    const totalSeats = this.trips.reduce((sum, t) => sum + t.maxCapacity, 0);
    const bookedSeats = this.trips.reduce((sum, t) => sum + t.bookedSeats, 0);
    const occupancyRate = totalSeats > 0 ? Math.round((bookedSeats / totalSeats) * 100) : 0;

    // Set KPI Card values
    const kpiRev = document.getElementById('kpiTotalRevenue');
    if (kpiRev) kpiRev.textContent = this.formatMoney(totalRev);

    const kpiBook = document.getElementById('kpiTotalBookings');
    if (kpiBook) kpiBook.textContent = this.bookings.length;

    const kpiConf = document.getElementById('kpiConfirmedCount');
    if (kpiConf) kpiConf.textContent = `${confirmedCount} Confirmed`;

    const kpiPend = document.getElementById('kpiPendingCount');
    if (kpiPend) kpiPend.textContent = `${pendingCount} Pending`;

    const kpiTrips = document.getElementById('kpiActiveTrips');
    if (kpiTrips) kpiTrips.textContent = this.trips.length;

    const kpiDestCount = document.getElementById('kpiDestinationsCount');
    if (kpiDestCount) kpiDestCount.textContent = `${this.destinations.length} destinations`;

    const kpiOcc = document.getElementById('kpiOccupancyRate');
    if (kpiOcc) kpiOcc.textContent = `${occupancyRate}% average occupancy rate`;

    const kpiCust = document.getElementById('kpiTotalCustomers');
    if (kpiCust) kpiCust.textContent = this.customers.length;

    // 2. Render Charts
    this.renderDashboardCharts();

    // 3. Render Recent Bookings Table Widget
    const recentBookings = [...this.bookings].sort((a, b) => new Date(b.bookingDate) - new Date(a.bookingDate)).slice(0, 5);
    const tbody = document.getElementById('recentBookingsTableBody');
    if (tbody) {
      tbody.innerHTML = recentBookings.map(b => `
        <tr>
          <td><strong class="font-mono text-primary">${b.id}</strong></td>
          <td>
            <div style="display: flex; align-items: center; gap: 8px;">
              <img src="${b.customerAvatar}" class="user-avatar" style="width: 28px; height: 28px;">
              <span>${b.customerName}</span>
            </div>
          </td>
          <td>
            <div style="max-width: 220px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${b.tripTitle}">
              <strong>${b.tripTitle}</strong>
              <div style="font-size: 0.72rem; color: var(--text-muted);">${b.destination}</div>
            </div>
          </td>
          <td><span style="font-size: 0.78rem;">${this.formatDate(b.departureDate)}</span></td>
          <td><strong>${this.formatMoney(b.totalPrice)}</strong></td>
          <td><span class="badge-status badge-${b.bookingStatus.toLowerCase()}">${b.bookingStatus}</span></td>
          <td><span class="badge-status badge-${b.paymentStatus.toLowerCase()}">${b.paymentStatus}</span></td>
          <td class="text-right">
            <button class="btn btn-secondary btn-xs" onclick="app.viewBookingDetails('${b.id}')" title="View Voucher / Manage">
              <i class="fa-solid fa-receipt"></i>
            </button>
          </td>
        </tr>
      `).join('');
    }

    // 4. Render Upcoming Trips Widget
    const upcomingTrips = [...this.trips].sort((a, b) => new Date(a.departureDate) - new Date(b.departureDate)).slice(0, 3);
    const tripsWidget = document.getElementById('upcomingTripsWidgetList');
    if (tripsWidget) {
      tripsWidget.innerHTML = upcomingTrips.map(t => {
        const pct = Math.round((t.bookedSeats / t.maxCapacity) * 100);
        return `
          <div class="agenda-trip-item" style="margin-bottom: 0.75rem;">
            <div style="display: flex; gap: 0.85rem; align-items: center;">
              <img src="${t.image}" style="width: 54px; height: 50px; border-radius: var(--radius-sm); object-fit: cover;">
              <div>
                <h4 style="font-size: 0.88rem; font-weight: 700; margin-bottom: 2px;">${t.title}</h4>
                <div style="font-size: 0.74rem; color: var(--text-muted);">
                  <i class="fa-regular fa-calendar me-1"></i> ${this.formatDate(t.departureDate)} • ${t.durationDays} Days
                </div>
              </div>
            </div>
            <div style="text-align: right;">
              <span class="badge-status badge-confirmed mb-1">${t.bookedSeats}/${t.maxCapacity} seats</span>
              <div style="font-size: 0.85rem; font-weight: 800; color: var(--primary-500);">${this.formatMoney(t.pricePerPerson)}</div>
            </div>
          </div>
        `;
      }).join('');
    }
  }

  renderDashboardCharts() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)';
    const textColor = isDark ? '#94a3b8' : '#64748b';

    // Chart 1: Revenue & Volume Dynamics
    const ctx1 = document.getElementById('revenueBookingsChart');
    if (ctx1) {
      if (this.charts.revenue) this.charts.revenue.destroy();

      const months = ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const revenueData = [42000, 68000, 94000, 112000, 138000, 164000, 125000, 145000];
      const bookingsCount = [8, 14, 18, 22, 28, 35, 24, 29];

      this.charts.revenue = new Chart(ctx1, {
        type: 'line',
        data: {
          labels: months,
          datasets: [
            {
              label: 'Revenue ($)',
              data: revenueData,
              borderColor: '#6366f1',
              backgroundColor: 'rgba(99, 102, 241, 0.15)',
              fill: true,
              tension: 0.4,
              borderWidth: 3,
              pointBackgroundColor: '#6366f1',
              pointRadius: 4,
              yAxisID: 'y'
            },
            {
              label: 'Bookings Volume',
              data: bookingsCount,
              borderColor: '#06b6d4',
              backgroundColor: 'transparent',
              borderDash: [5, 5],
              tension: 0.3,
              borderWidth: 2,
              pointBackgroundColor: '#06b6d4',
              pointRadius: 4,
              yAxisID: 'y1'
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: 'index', intersect: false },
          plugins: {
            legend: {
              labels: { color: textColor, font: { family: 'Plus Jakarta Sans', weight: '600' } }
            },
            tooltip: {
              callbacks: {
                label: (ctx) => ctx.datasetIndex === 0 ? ` Revenue: $${ctx.parsed.y.toLocaleString()}` : ` Bookings: ${ctx.parsed.y}`
              }
            }
          },
          scales: {
            x: { grid: { color: gridColor }, ticks: { color: textColor } },
            y: {
              grid: { color: gridColor },
              ticks: {
                color: textColor,
                callback: (val) => `$${val / 1000}k`
              }
            },
            y1: {
              position: 'right',
              grid: { drawOnChartArea: false },
              ticks: { color: textColor }
            }
          }
        }
      });
    }

    // Chart 2: Category Donut Chart
    const ctx2 = document.getElementById('categoryDonutChart');
    if (ctx2) {
      if (this.charts.category) this.charts.category.destroy();

      const catCounts = { Luxury: 0, Adventure: 0, Cultural: 0, Wildlife: 0, Wellness: 0, Cruise: 0 };
      this.trips.forEach(t => {
        if (catCounts[t.category] !== undefined) catCounts[t.category]++;
        else catCounts.Adventure++;
      });

      const labels = Object.keys(catCounts);
      const data = Object.values(catCounts);
      const colors = ['#8b5cf6', '#06b6d4', '#f59e0b', '#10b981', '#ec4899', '#3b82f6'];

      this.charts.category = new Chart(ctx2, {
        type: 'doughnut',
        data: {
          labels: labels,
          datasets: [{
            data: data,
            backgroundColor: colors,
            borderWidth: 0,
            hoverOffset: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false }
          },
          cutout: '70%'
        }
      });

      // Render custom HTML legend
      const legendWrap = document.getElementById('categoryLegendWrap');
      if (legendWrap) {
        legendWrap.innerHTML = labels.map((l, i) => `
          <div class="cat-legend-item">
            <span class="cat-legend-color" style="background: ${colors[i]};"></span>
            <span>${l} (<strong>${data[i]}</strong>)</span>
          </div>
        `).join('');
      }
    }
  }

  updateChartPeriod(period) {
    document.querySelectorAll('.chart-controls .btn-pill').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    this.showToast(`Updated analytics range to ${period === 'year' ? 'Current Fiscal Year' : 'Last 6 Months'}`, 'info');
  }

  // =========================================================================
  // VIEW 2: DESTINATIONS MANAGEMENT
  // =========================================================================
  setDestViewMode(mode) {
    this.destViewMode = mode;
    document.getElementById('destViewGridBtn').classList.toggle('active', mode === 'grid');
    document.getElementById('destViewTableBtn').classList.toggle('active', mode === 'table');
    document.getElementById('destinationsGridContainer').style.display = mode === 'grid' ? 'grid' : 'none';
    document.getElementById('destinationsTableContainer').style.display = mode === 'table' ? 'block' : 'none';
  }

  handleDestinationsFilter() {
    this.renderDestinations();
  }

  resetDestinationFilters() {
    document.getElementById('destSearchInput').value = '';
    document.getElementById('destRegionFilter').value = 'all';
    document.getElementById('destTagFilter').value = 'all';
    document.getElementById('destSortFilter').value = 'trips-desc';
    this.renderDestinations();
  }

  renderDestinations() {
    const search = (document.getElementById('destSearchInput')?.value || '').toLowerCase().trim();
    const region = document.getElementById('destRegionFilter')?.value || 'all';
    const tag = document.getElementById('destTagFilter')?.value || 'all';
    const sort = document.getElementById('destSortFilter')?.value || 'trips-desc';

    let filtered = this.destinations.filter(d => {
      const matchSearch = d.name.toLowerCase().includes(search) || d.country.toLowerCase().includes(search) || d.description.toLowerCase().includes(search);
      const matchRegion = region === 'all' || d.region === region;
      const matchTag = tag === 'all' || d.tags.includes(tag);
      return matchSearch && matchRegion && matchTag;
    });

    // Sort
    filtered.sort((a, b) => {
      if (sort === 'rating-desc') return b.rating - a.rating;
      if (sort === 'name-asc') return a.name.localeCompare(b.name);
      if (sort === 'price-asc') return a.avgPrice - b.avgPrice;
      if (sort === 'price-desc') return b.avgPrice - a.avgPrice;
      // trips-desc default
      const tripsA = this.trips.filter(t => t.destinationId === a.id).length;
      const tripsB = this.trips.filter(t => t.destinationId === b.id).length;
      return tripsB - tripsA;
    });

    const gridContainer = document.getElementById('destinationsGridContainer');
    const tableBody = document.getElementById('destinationsTableBody');
    const emptyState = document.getElementById('destinationsEmptyState');

    if (filtered.length === 0) {
      if (gridContainer) gridContainer.innerHTML = '';
      if (tableBody) tableBody.innerHTML = '';
      if (emptyState) emptyState.style.display = 'block';
      return;
    }
    if (emptyState) emptyState.style.display = 'none';

    // Render Grid
    if (gridContainer) {
      gridContainer.innerHTML = filtered.map(d => {
        const tripCount = this.trips.filter(t => t.destinationId === d.id).length;
        return `
          <div class="dest-card">
            <div class="dest-card-media">
              <img src="${d.image}" alt="${d.name}" class="dest-card-img" loading="lazy">
              <div class="dest-card-overlay"></div>
              <span class="dest-region-badge">${d.region}</span>
              <span class="dest-rating-badge"><i class="fa-solid fa-star"></i> ${d.rating}</span>
              <div class="dest-card-title-wrap">
                <h3 class="dest-card-title">${d.name}</h3>
                <span class="dest-card-country">${d.country} • Best Season: ${d.season}</span>
              </div>
            </div>
            <div class="dest-card-body">
              <p class="dest-card-desc">${d.description}</p>
              <div class="dest-tags-wrap">
                ${d.tags.map(tg => `<span class="dest-tag">${tg}</span>`).join('')}
              </div>
              <div class="dest-card-footer">
                <div class="dest-price-info">
                  <span class="dest-price-label">Avg. Package Price</span>
                  <span class="dest-price-value">${this.formatMoney(d.avgPrice)}</span>
                </div>
                <div class="dest-actions">
                  <button class="btn btn-secondary btn-xs" onclick="app.editDestination('${d.id}')" title="Edit Destination">
                    <i class="fa-solid fa-pen-to-square"></i>
                  </button>
                  <button class="btn btn-secondary btn-xs" onclick="app.deleteDestination('${d.id}')" title="Delete Destination">
                    <i class="fa-solid fa-trash text-rose"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>
        `;
      }).join('');
    }

    // Render Table
    if (tableBody) {
      tableBody.innerHTML = filtered.map(d => {
        const tripCount = this.trips.filter(t => t.destinationId === d.id).length;
        return `
          <tr>
            <td>
              <div style="display: flex; align-items: center; gap: 10px;">
                <img src="${d.image}" style="width: 44px; height: 38px; border-radius: 6px; object-fit: cover;">
                <strong>${d.name}</strong>
              </div>
            </td>
            <td>${d.region} / ${d.country}</td>
            <td>${d.season}</td>
            <td><span class="badge-counter">${tripCount} active trips</span></td>
            <td><strong>${this.formatMoney(d.avgPrice)}</strong></td>
            <td><i class="fa-solid fa-star text-amber"></i> ${d.rating}</td>
            <td>
              <div class="dest-tags-wrap" style="margin: 0;">
                ${d.tags.map(tg => `<span class="dest-tag">${tg}</span>`).join('')}
              </div>
            </td>
            <td class="text-right">
              <button class="btn btn-secondary btn-xs me-1" onclick="app.editDestination('${d.id}')"><i class="fa-solid fa-pen"></i></button>
              <button class="btn btn-secondary btn-xs" onclick="app.deleteDestination('${d.id}')"><i class="fa-solid fa-trash text-rose"></i></button>
            </td>
          </tr>
        `;
      }).join('');
    }
  }

  openDestinationModal(destId = null) {
    const modal = document.getElementById('destModalBackdrop');
    const form = document.getElementById('destForm');
    form.reset();

    if (destId) {
      const d = this.destinations.find(item => item.id === destId);
      if (!d) return;
      document.getElementById('destModalTitle').textContent = 'Edit Destination';
      document.getElementById('destFormId').value = d.id;
      document.getElementById('destNameInput').value = d.name;
      document.getElementById('destCountryInput').value = d.country;
      document.getElementById('destRegionInput').value = d.region;
      document.getElementById('destSeasonInput').value = d.season;
      document.getElementById('destAvgPriceInput').value = d.avgPrice;
      document.getElementById('destTagsInput').value = d.tags.join(', ');
      document.getElementById('destImageInput').value = d.image;
      document.getElementById('destDescriptionInput').value = d.description;
    } else {
      document.getElementById('destModalTitle').textContent = 'Add New Destination';
      document.getElementById('destFormId').value = '';
    }

    modal.classList.add('show');
  }

  closeDestinationModal() {
    document.getElementById('destModalBackdrop').classList.remove('show');
  }

  editDestination(id) {
    this.openDestinationModal(id);
  }

  handleDestFormSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('destFormId').value;
    const name = document.getElementById('destNameInput').value.trim();
    const country = document.getElementById('destCountryInput').value.trim();
    const region = document.getElementById('destRegionInput').value;
    const season = document.getElementById('destSeasonInput').value.trim();
    const avgPrice = parseFloat(document.getElementById('destAvgPriceInput').value) || 2000;
    const tags = document.getElementById('destTagsInput').value.split(',').map(s => s.trim()).filter(Boolean);
    const image = document.getElementById('destImageInput').value.trim() || 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=800&q=80';
    const description = document.getElementById('destDescriptionInput').value.trim();

    if (id) {
      // Update
      const index = this.destinations.findIndex(d => d.id === id);
      if (index !== -1) {
        this.destinations[index] = { ...this.destinations[index], name, country, region, season, avgPrice, tags, image, description };
        this.showToast(`Updated destination "${name}"`, 'success');
      }
    } else {
      // Create
      const newDest = {
        id: `dest-${Date.now()}`,
        name,
        country,
        region,
        season,
        avgPrice,
        rating: 4.9,
        tags: tags.length ? tags : ['Popular'],
        image,
        description
      };
      this.destinations.unshift(newDest);
      this.showToast(`Added new destination "${name}"`, 'success');
    }

    WanderlustData.saveDestinations(this.destinations);
    this.closeDestinationModal();
    this.loadAllData();
    this.renderDestinations();
  }

  async deleteDestination(id) {
    const dest = this.destinations.find(d => d.id === id);
    if (!dest) return;

    const confirmed = await this.confirm(
      'Delete Destination?',
      `Are you sure you want to delete "${dest.name}"? Active tours linked to this destination will need reassignment.`
    );
    if (!confirmed) return;

    this.destinations = this.destinations.filter(d => d.id !== id);
    WanderlustData.saveDestinations(this.destinations);
    this.showToast(`Deleted destination "${dest.name}"`, 'warning');
    this.loadAllData();
    this.renderDestinations();
  }

  // =========================================================================
  // VIEW 3: TRIPS & TOURS MANAGEMENT
  // =========================================================================
  setTripViewMode(mode) {
    this.tripViewMode = mode;
    document.getElementById('tripViewGridBtn').classList.toggle('active', mode === 'grid');
    document.getElementById('tripViewTableBtn').classList.toggle('active', mode === 'table');
    document.getElementById('tripsGridContainer').style.display = mode === 'grid' ? 'grid' : 'none';
    document.getElementById('tripsTableContainer').style.display = mode === 'table' ? 'block' : 'none';
  }

  handleTripsFilter() {
    this.tripPage = 1;
    this.renderTrips();
  }

  resetTripFilters() {
    document.getElementById('tripSearchInput').value = '';
    document.getElementById('tripDestFilter').value = 'all';
    document.getElementById('tripCategoryFilter').value = 'all';
    document.getElementById('tripStatusFilter').value = 'all';
    document.getElementById('tripDifficultyFilter').value = 'all';
    document.getElementById('tripSortFilter').value = 'date-asc';
    this.tripPage = 1;
    this.renderTrips();
  }

  renderTrips() {
    const search = (document.getElementById('tripSearchInput')?.value || '').toLowerCase().trim();
    const dest = document.getElementById('tripDestFilter')?.value || 'all';
    const category = document.getElementById('tripCategoryFilter')?.value || 'all';
    const status = document.getElementById('tripStatusFilter')?.value || 'all';
    const diff = document.getElementById('tripDifficultyFilter')?.value || 'all';
    const sort = document.getElementById('tripSortFilter')?.value || 'date-asc';

    let filtered = this.trips.filter(t => {
      const matchSearch = t.title.toLowerCase().includes(search) || t.destinationName.toLowerCase().includes(search) || t.description.toLowerCase().includes(search);
      const matchDest = dest === 'all' || t.destinationId === dest;
      const matchCat = category === 'all' || t.category === category;
      const matchStatus = status === 'all' || t.status === status;
      const matchDiff = diff === 'all' || t.difficulty === diff;
      return matchSearch && matchDest && matchCat && matchStatus && matchDiff;
    });

    // Sort
    filtered.sort((a, b) => {
      if (sort === 'date-asc') return new Date(a.departureDate) - new Date(b.departureDate);
      if (sort === 'price-asc') return a.pricePerPerson - b.pricePerPerson;
      if (sort === 'price-desc') return b.pricePerPerson - a.pricePerPerson;
      if (sort === 'seats-desc') return (b.maxCapacity - b.bookedSeats) - (a.maxCapacity - a.bookedSeats);
      if (sort === 'rating-desc') return b.rating - a.rating;
      return 0;
    });

    const totalItems = filtered.length;
    const totalPages = Math.ceil(totalItems / this.tripPageSize) || 1;
    if (this.tripPage > totalPages) this.tripPage = totalPages;

    const startIndex = (this.tripPage - 1) * this.tripPageSize;
    const paginated = filtered.slice(startIndex, startIndex + this.tripPageSize);

    const gridContainer = document.getElementById('tripsGridContainer');
    const tableBody = document.getElementById('tripsTableBody');
    const emptyState = document.getElementById('tripsEmptyState');
    const pagBar = document.getElementById('tripsPaginationBar');

    if (totalItems === 0) {
      if (gridContainer) gridContainer.innerHTML = '';
      if (tableBody) tableBody.innerHTML = '';
      if (emptyState) emptyState.style.display = 'block';
      if (pagBar) pagBar.style.display = 'none';
      return;
    }
    if (emptyState) emptyState.style.display = 'none';
    if (pagBar) pagBar.style.display = 'flex';

    // Render Grid
    if (gridContainer) {
      gridContainer.innerHTML = paginated.map(t => {
        const availableSeats = t.maxCapacity - t.bookedSeats;
        const seatPercent = Math.round((t.bookedSeats / t.maxCapacity) * 100);
        let statusBadgeClass = 'badge-confirmed';
        if (t.status === 'Almost Full') statusBadgeClass = 'badge-pending';
        if (t.status === 'Sold Out') statusBadgeClass = 'badge-cancelled';
        if (t.status === 'Draft') statusBadgeClass = 'badge-refunded';

        return `
          <div class="trip-card">
            <div class="trip-card-media">
              <img src="${t.image}" alt="${t.title}" class="trip-card-img" loading="lazy">
              <div class="trip-card-overlay"></div>
              <span class="badge-status ${statusBadgeClass} trip-status-badge">${t.status}</span>
              <span class="trip-duration-pill"><i class="fa-regular fa-clock me-1"></i> ${t.durationDays} Days / ${t.durationDays - 1} Nights</span>
            </div>
            <div class="trip-card-body">
              <div class="trip-category-row">
                <span class="trip-dest-sub">${t.destinationName}</span>
                <span class="trip-difficulty-badge">${t.difficulty}</span>
              </div>
              <h3 class="trip-card-title" onclick="app.viewTripDetails('${t.id}')">${t.title}</h3>
              <div class="trip-schedule-row">
                <i class="fa-regular fa-calendar-check text-primary"></i>
                <span>${this.formatDate(t.departureDate)} — ${this.formatDate(t.returnDate)}</span>
              </div>
              <div class="trip-seats-metric">
                <div class="trip-seats-label">
                  <span>Seats Booked: ${t.bookedSeats} / ${t.maxCapacity}</span>
                  <strong>${availableSeats} left</strong>
                </div>
                <div class="progress-bar-track">
                  <div class="progress-bar-fill ${seatPercent > 80 ? 'cyan' : 'indigo'}" style="width: ${seatPercent}%;"></div>
                </div>
              </div>
              <div class="trip-card-footer">
                <div class="trip-price-val">${this.formatMoney(t.pricePerPerson)} <span>/ traveler</span></div>
                <div style="display: flex; gap: 6px;">
                  <button class="btn btn-secondary btn-xs" onclick="app.viewTripDetails('${t.id}')" title="View Itinerary">
                    <i class="fa-solid fa-eye"></i> Details
                  </button>
                  <button class="btn btn-secondary btn-xs" onclick="app.editTrip('${t.id}')" title="Edit Trip">
                    <i class="fa-solid fa-pen"></i>
                  </button>
                  <button class="btn btn-secondary btn-xs" onclick="app.deleteTrip('${t.id}')" title="Delete Trip">
                    <i class="fa-solid fa-trash text-rose"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>
        `;
      }).join('');
    }

    // Render Table
    if (tableBody) {
      tableBody.innerHTML = paginated.map(t => `
        <tr>
          <td>
            <div style="display: flex; align-items: center; gap: 10px;">
              <img src="${t.image}" style="width: 44px; height: 38px; border-radius: 6px; object-fit: cover;">
              <div>
                <strong>${t.title}</strong>
                <div style="font-size: 0.72rem; color: var(--text-muted);">${t.category} • ${t.difficulty}</div>
              </div>
            </div>
          </td>
          <td>${t.destinationName}</td>
          <td><span style="font-size: 0.8rem;">${this.formatDate(t.departureDate)}</span></td>
          <td>${t.durationDays} Days</td>
          <td>
            <div style="font-size: 0.8rem; font-weight: 700;">${t.bookedSeats}/${t.maxCapacity}</div>
            <div class="progress-bar-track" style="width: 80px; height: 4px;">
              <div class="progress-bar-fill cyan" style="width: ${(t.bookedSeats / t.maxCapacity) * 100}%;"></div>
            </div>
          </td>
          <td><strong>${this.formatMoney(t.pricePerPerson)}</strong></td>
          <td><span class="badge-status badge-${t.status === 'Available' ? 'confirmed' : t.status === 'Almost Full' ? 'pending' : 'cancelled'}">${t.status}</span></td>
          <td class="text-right">
            <button class="btn btn-secondary btn-xs me-1" onclick="app.viewTripDetails('${t.id}')"><i class="fa-solid fa-eye"></i></button>
            <button class="btn btn-secondary btn-xs me-1" onclick="app.editTrip('${t.id}')"><i class="fa-solid fa-pen"></i></button>
            <button class="btn btn-secondary btn-xs" onclick="app.deleteTrip('${t.id}')"><i class="fa-solid fa-trash text-rose"></i></button>
          </td>
        </tr>
      `).join('');
    }

    // Render Pagination
    this.renderPaginationControls('tripsPaginationInfo', 'tripsPaginationControls', totalItems, this.tripPage, totalPages, 'tripPage', 'renderTrips');
  }

  openTripModal(tripId = null) {
    const modal = document.getElementById('tripModalBackdrop');
    const form = document.getElementById('tripForm');
    form.reset();

    const container = document.getElementById('itineraryDaysContainer');
    container.innerHTML = '';

    if (tripId) {
      const t = this.trips.find(item => item.id === tripId);
      if (!t) return;
      document.getElementById('tripModalTitle').textContent = 'Edit Travel Package';
      document.getElementById('tripFormId').value = t.id;
      document.getElementById('tripTitleInput').value = t.title;
      document.getElementById('tripDestInput').value = t.destinationId;
      document.getElementById('tripCategoryInput').value = t.category;
      document.getElementById('tripDifficultyInput').value = t.difficulty;
      document.getElementById('tripStatusInput').value = t.status;
      document.getElementById('tripDepartureInput').value = t.departureDate;
      document.getElementById('tripReturnInput').value = t.returnDate;
      document.getElementById('tripPriceInput').value = t.pricePerPerson;
      document.getElementById('tripCapacityInput').value = t.maxCapacity;
      document.getElementById('tripImageInput').value = t.image;
      document.getElementById('tripDescriptionInput').value = t.description;
      document.getElementById('tripInclusionsInput').value = t.inclusions || '';
      document.getElementById('tripExclusionsInput').value = t.exclusions || '';

      if (t.itinerary && t.itinerary.length > 0) {
        t.itinerary.forEach((it, idx) => {
          this.addItineraryDayRow(idx + 1, it.title, it.desc);
        });
      } else {
        this.addItineraryDayRow(1, 'Arrival & Welcome Dinner', 'Airport greeting and check-in.');
      }
    } else {
      document.getElementById('tripModalTitle').textContent = 'Create Travel Package';
      document.getElementById('tripFormId').value = '';
      document.getElementById('tripDepartureInput').value = '2026-11-01';
      document.getElementById('tripReturnInput').value = '2026-11-08';
      this.addItineraryDayRow(1, 'Arrival & Welcome Reception', 'Check-in and evening banquet.');
      this.addItineraryDayRow(2, 'City Landmark Guided Tour', 'Historic temple and museum visits.');
      this.addItineraryDayRow(3, 'Scenic Nature & Farewell Dinner', 'Panoramic viewpoints and gala.');
    }

    modal.classList.add('show');
  }

  closeTripModal() {
    document.getElementById('tripModalBackdrop').classList.remove('show');
  }

  addItineraryDayRow(dayNum = null, titleVal = '', descVal = '') {
    const container = document.getElementById('itineraryDaysContainer');
    const count = container.children.length + 1;
    const num = dayNum || count;

    const row = document.createElement('div');
    row.className = 'itinerary-day-row';
    row.innerHTML = `
      <span class="day-badge-sm">Day ${num}</span>
      <input type="text" class="styled-input day-title-input" placeholder="Day Title (e.g. Kyoto Golden Pavilion)" value="${titleVal}" style="flex: 1;" required>
      <input type="text" class="styled-input day-desc-input" placeholder="Brief schedule activity description" value="${descVal}" style="flex: 2;">
      <button type="button" class="btn btn-secondary btn-xs" onclick="this.parentElement.remove()" title="Remove Day"><i class="fa-solid fa-xmark"></i></button>
    `;
    container.appendChild(row);
  }

  handleTripFormSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('tripFormId').value;
    const title = document.getElementById('tripTitleInput').value.trim();
    const destinationId = document.getElementById('tripDestInput').value;
    const category = document.getElementById('tripCategoryInput').value;
    const difficulty = document.getElementById('tripDifficultyInput').value;
    const status = document.getElementById('tripStatusInput').value;
    const departureDate = document.getElementById('tripDepartureInput').value;
    const returnDate = document.getElementById('tripReturnInput').value;
    const pricePerPerson = parseFloat(document.getElementById('tripPriceInput').value) || 1500;
    const maxCapacity = parseInt(document.getElementById('tripCapacityInput').value, 10) || 12;
    const image = document.getElementById('tripImageInput').value.trim() || 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=800&q=80';
    const description = document.getElementById('tripDescriptionInput').value.trim();
    const inclusions = document.getElementById('tripInclusionsInput').value.trim();
    const exclusions = document.getElementById('tripExclusionsInput').value.trim();

    // Calculate duration in days
    const dep = new Date(departureDate);
    const ret = new Date(returnDate);
    const diffTime = Math.abs(ret - dep);
    const durationDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1 || 7;

    // Destination name
    const destObj = this.destinations.find(d => d.id === destinationId);
    const destinationName = destObj ? `${destObj.name}, ${destObj.country}` : 'Global';

    // Parse itinerary rows
    const dayRows = document.querySelectorAll('.itinerary-day-row');
    const itinerary = [];
    dayRows.forEach((row, i) => {
      const dayTitle = row.querySelector('.day-title-input')?.value || `Day ${i + 1}`;
      const dayDesc = row.querySelector('.day-desc-input')?.value || '';
      itinerary.push({ day: i + 1, title: dayTitle, desc: dayDesc });
    });

    if (id) {
      const idx = this.trips.findIndex(t => t.id === id);
      if (idx !== -1) {
        this.trips[idx] = {
          ...this.trips[idx],
          title, destinationId, destinationName, category, difficulty, status,
          departureDate, returnDate, durationDays, pricePerPerson, maxCapacity,
          image, description, inclusions, exclusions, itinerary
        };
        this.showToast(`Updated travel package "${title}"`, 'success');
      }
    } else {
      const newTrip = {
        id: `TRIP-${Math.floor(100 + Math.random() * 900)}`,
        title, destinationId, destinationName, category, difficulty, status,
        departureDate, returnDate, durationDays, pricePerPerson, maxCapacity,
        bookedSeats: 0, rating: 4.95, image, description, inclusions, exclusions, itinerary
      };
      this.trips.unshift(newTrip);
      this.showToast(`Created new trip "${title}"`, 'success');
    }

    WanderlustData.saveTrips(this.trips);
    this.closeTripModal();
    this.loadAllData();
    this.renderTrips();
  }

  editTrip(id) {
    this.openTripModal(id);
  }

  async deleteTrip(id) {
    const trip = this.trips.find(t => t.id === id);
    if (!trip) return;

    const confirmed = await this.confirm('Delete Travel Package?', `Are you sure you want to delete "${trip.title}"?`);
    if (!confirmed) return;

    this.trips = this.trips.filter(t => t.id !== id);
    WanderlustData.saveTrips(this.trips);
    this.showToast(`Deleted trip package "${trip.title}"`, 'warning');
    this.loadAllData();
    this.renderTrips();
  }

  viewTripDetails(id) {
    const trip = this.trips.find(t => t.id === id);
    if (!trip) return;

    const modal = document.getElementById('tripDetailsModalBackdrop');
    document.getElementById('tripViewModalTitle').textContent = trip.title;
    document.getElementById('tripViewModalSubtitle').textContent = `${trip.destinationName} • ${trip.durationDays} Days • ${this.formatMoney(trip.pricePerPerson)} / person`;

    const content = document.getElementById('tripViewModalContent');
    content.innerHTML = `
      <div style="display: flex; gap: 1.5rem; flex-wrap: wrap; margin-bottom: 1.5rem;">
        <img src="${trip.image}" style="width: 100%; max-height: 260px; object-fit: cover; border-radius: var(--radius-md);">
      </div>

      <div class="kpi-grid" style="margin-bottom: 1.25rem;">
        <div class="kpi-card" style="padding: 0.85rem;">
          <span class="kpi-label">Schedule Dates</span>
          <strong style="font-size: 1.05rem; margin-top: 4px;">${this.formatDate(trip.departureDate)} — ${this.formatDate(trip.returnDate)}</strong>
        </div>
        <div class="kpi-card" style="padding: 0.85rem;">
          <span class="kpi-label">Availability</span>
          <strong style="font-size: 1.05rem; margin-top: 4px;" class="text-primary">${trip.bookedSeats} / ${trip.maxCapacity} Booked (${trip.maxCapacity - trip.bookedSeats} Left)</strong>
        </div>
        <div class="kpi-card" style="padding: 0.85rem;">
          <span class="kpi-label">Experience Rating</span>
          <strong style="font-size: 1.05rem; margin-top: 4px;" class="text-amber"><i class="fa-solid fa-star"></i> ${trip.rating} / 5.0</strong>
        </div>
      </div>

      <h4 style="font-size: 1rem; font-weight: 700; margin-bottom: 0.5rem;">Expedition Overview</h4>
      <p style="font-size: 0.88rem; color: var(--text-secondary); line-height: 1.5; margin-bottom: 1.5rem;">${trip.description}</p>

      <h4 style="font-size: 1rem; font-weight: 700; margin-bottom: 0.75rem;">Day-by-Day Journey Schedule</h4>
      <div style="display: flex; flex-direction: column; gap: 0.75rem; margin-bottom: 1.5rem;">
        ${(trip.itinerary || []).map(it => `
          <div style="display: flex; gap: 0.85rem; padding: 0.75rem; background: var(--bg-surface-elevated); border-radius: var(--radius-sm); border: 1px solid var(--border-color);">
            <div style="width: 55px; height: 32px; background: var(--primary-gradient); color: #fff; font-size: 0.75rem; font-weight: 700; border-radius: 4px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
              Day ${it.day}
            </div>
            <div>
              <strong style="font-size: 0.9rem; color: var(--text-primary);">${it.title}</strong>
              <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 2px;">${it.desc}</p>
            </div>
          </div>
        `).join('')}
      </div>

      <div class="voucher-grid-2">
        <div class="voucher-info-box">
          <div class="voucher-section-title text-emerald"><i class="fa-solid fa-circle-check me-1"></i> What's Included</div>
          <p style="font-size: 0.82rem; color: var(--text-secondary);">${trip.inclusions || 'All accommodations, transport, breakfast, licensed guide'}</p>
        </div>
        <div class="voucher-info-box">
          <div class="voucher-section-title text-rose"><i class="fa-solid fa-circle-xmark me-1"></i> What's Excluded</div>
          <p style="font-size: 0.82rem; color: var(--text-secondary);">${trip.exclusions || 'International flights, personal expenses, visas'}</p>
        </div>
      </div>
    `;

    const bookBtn = document.getElementById('tripViewBookBtn');
    bookBtn.onclick = () => {
      this.closeTripDetailsModal();
      this.openNewBookingModal(trip.id);
    };

    modal.classList.add('show');
  }

  closeTripDetailsModal() {
    document.getElementById('tripDetailsModalBackdrop').classList.remove('show');
  }

  // =========================================================================
  // VIEW 4: BOOKINGS MANAGEMENT
  // =========================================================================
  filterBookingsByTab(tab) {
    this.bookingTab = tab;
    document.querySelectorAll('.status-tab').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-status') === tab);
    });
    this.bookingPage = 1;
    this.renderBookings();
  }

  toggleBookingSort(col) {
    if (this.bookingSortCol === col) {
      this.bookingSortAsc = !this.bookingSortAsc;
    } else {
      this.bookingSortCol = col;
      this.bookingSortAsc = true;
    }
    this.renderBookings();
  }

  handleBookingsFilter() {
    this.bookingPage = 1;
    this.renderBookings();
  }

  resetBookingFilters() {
    document.getElementById('bookingSearchInput').value = '';
    document.getElementById('bookingPaymentFilter').value = 'all';
    document.getElementById('bookingDestFilter').value = 'all';
    document.getElementById('bookingStartDateFilter').value = '';
    document.getElementById('bookingEndDateFilter').value = '';
    document.getElementById('bookingSortFilter').value = 'bookingDate-desc';
    this.filterBookingsByTab('all');
  }

  changeBookingPageSize(size) {
    this.bookingPageSize = parseInt(size, 10) || 8;
    this.bookingPage = 1;
    this.renderBookings();
  }

  renderBookings() {
    // Update tab count badges
    const countAll = this.bookings.length;
    const countConf = this.bookings.filter(b => b.bookingStatus === 'Confirmed').length;
    const countPend = this.bookings.filter(b => b.bookingStatus === 'Pending').length;
    const countComp = this.bookings.filter(b => b.bookingStatus === 'Completed').length;
    const countCanc = this.bookings.filter(b => b.bookingStatus === 'Cancelled').length;

    if (document.getElementById('tabCountAll')) document.getElementById('tabCountAll').textContent = countAll;
    if (document.getElementById('tabCountConfirmed')) document.getElementById('tabCountConfirmed').textContent = countConf;
    if (document.getElementById('tabCountPending')) document.getElementById('tabCountPending').textContent = countPend;
    if (document.getElementById('tabCountCompleted')) document.getElementById('tabCountCompleted').textContent = countComp;
    if (document.getElementById('tabCountCancelled')) document.getElementById('tabCountCancelled').textContent = countCanc;

    const search = (document.getElementById('bookingSearchInput')?.value || '').toLowerCase().trim();
    const payment = document.getElementById('bookingPaymentFilter')?.value || 'all';
    const dest = document.getElementById('bookingDestFilter')?.value || 'all';
    const startDate = document.getElementById('bookingStartDateFilter')?.value || '';
    const endDate = document.getElementById('bookingEndDateFilter')?.value || '';
    const sort = document.getElementById('bookingSortFilter')?.value || 'bookingDate-desc';

    let filtered = this.bookings.filter(b => {
      const matchTab = this.bookingTab === 'all' || b.bookingStatus === this.bookingTab;
      const matchSearch = b.id.toLowerCase().includes(search) || b.customerName.toLowerCase().includes(search) || b.customerEmail.toLowerCase().includes(search) || b.tripTitle.toLowerCase().includes(search);
      const matchPayment = payment === 'all' || b.paymentStatus === payment;
      const matchDest = dest === 'all' || b.destination.toLowerCase().includes(dest.toLowerCase());
      
      let matchDate = true;
      if (startDate) matchDate = matchDate && new Date(b.departureDate) >= new Date(startDate);
      if (endDate) matchDate = matchDate && new Date(b.departureDate) <= new Date(endDate);

      return matchTab && matchSearch && matchPayment && matchDest && matchDate;
    });

    // Sorting
    filtered.sort((a, b) => {
      let valA = a[this.bookingSortCol];
      let valB = b[this.bookingSortCol];

      if (this.bookingSortCol === 'customer') {
        valA = a.customerName;
        valB = b.customerName;
      }
      if (this.bookingSortCol === 'travelDate') {
        valA = new Date(a.departureDate);
        valB = new Date(b.departureDate);
      }
      if (this.bookingSortCol === 'bookingDate') {
        valA = new Date(a.bookingDate);
        valB = new Date(b.bookingDate);
      }

      if (valA < valB) return this.bookingSortAsc ? -1 : 1;
      if (valA > valB) return this.bookingSortAsc ? 1 : -1;
      return 0;
    });

    const totalItems = filtered.length;
    const totalPages = Math.ceil(totalItems / this.bookingPageSize) || 1;
    if (this.bookingPage > totalPages) this.bookingPage = totalPages;

    const startIndex = (this.bookingPage - 1) * this.bookingPageSize;
    const paginated = filtered.slice(startIndex, startIndex + this.bookingPageSize);

    const tbody = document.getElementById('bookingsTableBody');
    const emptyState = document.getElementById('bookingsEmptyState');

    if (totalItems === 0) {
      if (tbody) tbody.innerHTML = '';
      if (emptyState) emptyState.style.display = 'block';
      return;
    }
    if (emptyState) emptyState.style.display = 'none';

    if (tbody) {
      tbody.innerHTML = paginated.map(b => `
        <tr>
          <td><strong class="font-mono text-primary">${b.id}</strong></td>
          <td>
            <div style="display: flex; align-items: center; gap: 9px;">
              <img src="${b.customerAvatar}" class="user-avatar" style="width: 32px; height: 32px;">
              <div>
                <strong>${b.customerName}</strong>
                <div style="font-size: 0.72rem; color: var(--text-muted);">${b.customerEmail}</div>
              </div>
            </div>
          </td>
          <td>
            <div style="max-width: 220px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${b.tripTitle}">
              <strong>${b.tripTitle}</strong>
              <div style="font-size: 0.72rem; color: var(--text-muted);">${b.destination}</div>
            </div>
          </td>
          <td>
            <div style="font-size: 0.8rem; font-weight: 600;">${this.formatDate(b.departureDate)}</div>
            <div style="font-size: 0.7rem; color: var(--text-muted);">to ${this.formatDate(b.returnDate)}</div>
          </td>
          <td><span class="badge-counter">${b.guestsCount} guests</span></td>
          <td><strong>${this.formatMoney(b.totalPrice)}</strong></td>
          <td>
            <select class="styled-select-xs" onchange="app.updateBookingStatusDirect('${b.id}', this.value)" style="border-radius: var(--radius-full);">
              <option value="Confirmed" ${b.bookingStatus === 'Confirmed' ? 'selected' : ''}>Confirmed</option>
              <option value="Pending" ${b.bookingStatus === 'Pending' ? 'selected' : ''}>Pending</option>
              <option value="Completed" ${b.bookingStatus === 'Completed' ? 'selected' : ''}>Completed</option>
              <option value="Cancelled" ${b.bookingStatus === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
            </select>
          </td>
          <td>
            <span class="badge-status badge-${b.paymentStatus.toLowerCase()}">${b.paymentStatus}</span>
          </td>
          <td class="text-right">
            <button class="btn btn-secondary btn-xs me-1" onclick="app.viewBookingDetails('${b.id}')" title="Voucher / Invoice">
              <i class="fa-solid fa-receipt"></i>
            </button>
            <button class="btn btn-secondary btn-xs" onclick="app.deleteBooking('${b.id}')" title="Delete Booking">
              <i class="fa-solid fa-trash text-rose"></i>
            </button>
          </td>
        </tr>
      `).join('');
    }

    this.renderPaginationControls('bookingsPaginationInfo', 'bookingsPaginationControls', totalItems, this.bookingPage, totalPages, 'bookingPage', 'renderBookings');
  }

  updateBookingStatusDirect(id, newStatus) {
    const booking = this.bookings.find(b => b.id === id);
    if (!booking) return;

    booking.bookingStatus = newStatus;
    WanderlustData.saveBookings(this.bookings);
    this.showToast(`Updated booking ${id} status to ${newStatus}`, 'success');
    this.renderBookings();
  }

  async deleteBooking(id) {
    const b = this.bookings.find(item => item.id === id);
    if (!b) return;

    const confirmed = await this.confirm('Delete Reservation?', `Are you sure you want to remove reservation ${b.id} for ${b.customerName}?`);
    if (!confirmed) return;

    this.bookings = this.bookings.filter(item => item.id !== id);
    WanderlustData.saveBookings(this.bookings);
    this.showToast(`Reservation ${b.id} deleted`, 'warning');
    this.loadAllData();
    this.renderBookings();
  }

  // =========================================================================
  // MULTI-STEP BOOKING WIZARD
  // =========================================================================
  openNewBookingModal(preselectedTripId = null) {
    this.wizardStep = 1;
    this.updateWizardView();

    // Populate Trip select
    const tripSelect = document.getElementById('wzTripSelect');
    tripSelect.innerHTML = '<option value="">-- Choose an available package --</option>' + 
      this.trips.filter(t => t.status !== 'Sold Out').map(t => `<option value="${t.id}">${t.title} (${this.formatMoney(t.pricePerPerson)})</option>`).join('');

    if (preselectedTripId) {
      tripSelect.value = preselectedTripId;
      this.handleWizardTripChange();
    }

    // Populate Customer select
    const custSelect = document.getElementById('wzCustomerSelect');
    custSelect.innerHTML = '<option value="">-- Select from customer directory --</option>' +
      this.customers.map(c => `<option value="${c.id}">${c.name} (${c.email})</option>`).join('') +
      '<option value="NEW_CUSTOMER">+ Add New Customer Now...</option>';

    document.getElementById('newBookingModalBackdrop').classList.add('show');
  }

  closeNewBookingModal() {
    document.getElementById('newBookingModalBackdrop').classList.remove('show');
  }

  handleWizardTripChange() {
    const tripId = document.getElementById('wzTripSelect').value;
    const previewCard = document.getElementById('wzTripPreviewCard');

    if (!tripId) {
      previewCard.style.display = 'none';
      return;
    }

    const trip = this.trips.find(t => t.id === tripId);
    if (!trip) return;

    document.getElementById('wzTripPreviewImg').src = trip.image;
    document.getElementById('wzTripPreviewTitle').textContent = trip.title;
    document.getElementById('wzTripPreviewDest').innerHTML = `<i class="fa-solid fa-location-dot"></i> ${trip.destinationName}`;
    document.getElementById('wzTripPreviewDates').innerHTML = `<i class="fa-regular fa-calendar"></i> ${this.formatDate(trip.departureDate)} (${trip.durationDays}d)`;
    document.getElementById('wzTripPreviewSeats').innerHTML = `<i class="fa-solid fa-chair"></i> ${trip.maxCapacity - trip.bookedSeats} seats left`;
    document.getElementById('wzTripPreviewPrice').textContent = this.formatMoney(trip.pricePerPerson);

    previewCard.style.display = 'block';
    this.recalculateWizardTotal();
  }

  handleWizardCustomerSelect() {
    const val = document.getElementById('wzCustomerSelect').value;
    const newCustFields = document.getElementById('wzNewCustomerFields');
    newCustFields.style.display = val === 'NEW_CUSTOMER' ? 'block' : 'none';
  }

  recalculateWizardTotal() {
    const tripId = document.getElementById('wzTripSelect').value;
    const guests = parseInt(document.getElementById('wzGuestCountInput').value, 10) || 1;
    const roomPref = document.getElementById('wzRoomPrefSelect').value;

    const trip = this.trips.find(t => t.id === tripId);
    const basePerPerson = trip ? trip.pricePerPerson : 2500;
    
    let baseTotal = basePerPerson * guests;
    if (roomPref.includes('+15%')) baseTotal *= 1.15;

    // Addons
    let addonsTotal = 0;
    if (document.getElementById('wzAddonInsurance').checked) addonsTotal += 149 * guests;
    if (document.getElementById('wzAddonTransfer').checked) addonsTotal += 120;
    if (document.getElementById('wzAddonGuide').checked) addonsTotal += 280;

    const tax = (baseTotal + addonsTotal) * 0.085;
    const grandTotal = baseTotal + addonsTotal + tax;

    document.getElementById('wzSummaryGuestCount').textContent = guests;
    document.getElementById('wzSummaryBasePrice').textContent = this.formatMoney(basePerPerson);
    document.getElementById('wzSummaryBaseTotal').textContent = this.formatMoney(baseTotal);

    const addonsRow = document.getElementById('wzSummaryAddonsRow');
    if (addonsTotal > 0) {
      addonsRow.style.display = 'flex';
      document.getElementById('wzSummaryAddonsTotal').textContent = `+${this.formatMoney(addonsTotal)}`;
    } else {
      addonsRow.style.display = 'none';
    }

    document.getElementById('wzSummaryTaxTotal').textContent = this.formatMoney(tax);
    document.getElementById('wzSummaryGrandTotal').textContent = this.formatMoney(grandTotal);

    return { baseTotal, addonsTotal, tax, grandTotal, guests };
  }

  nextWizardStep() {
    if (this.wizardStep === 1) {
      const tripId = document.getElementById('wzTripSelect').value;
      if (!tripId) {
        this.showToast('Please select a travel package to continue', 'warning');
        return;
      }
      this.wizardStep = 2;
    } else if (this.wizardStep === 2) {
      const custVal = document.getElementById('wzCustomerSelect').value;
      if (!custVal) {
        this.showToast('Please select an existing customer or enter new traveler details', 'warning');
        return;
      }
      if (custVal === 'NEW_CUSTOMER') {
        const name = document.getElementById('wzCustName').value.trim();
        const email = document.getElementById('wzCustEmail').value.trim();
        if (!name || !email) {
          this.showToast('Name and email are required for the new traveler', 'warning');
          return;
        }
      }
      this.wizardStep = 3;
    } else if (this.wizardStep === 3) {
      this.finalizeWizardBooking();
      return;
    }

    this.updateWizardView();
  }

  prevWizardStep() {
    if (this.wizardStep > 1) {
      this.wizardStep--;
      this.updateWizardView();
    }
  }

  updateWizardView() {
    document.getElementById('wzStep1').style.display = this.wizardStep === 1 ? 'block' : 'none';
    document.getElementById('wzStep2').style.display = this.wizardStep === 2 ? 'block' : 'none';
    document.getElementById('wzStep3').style.display = this.wizardStep === 3 ? 'block' : 'none';

    document.getElementById('wzStep1Indicator').classList.toggle('active', this.wizardStep >= 1);
    document.getElementById('wzStep2Indicator').classList.toggle('active', this.wizardStep >= 2);
    document.getElementById('wzStep3Indicator').classList.toggle('active', this.wizardStep >= 3);

    document.getElementById('wzPrevBtn').style.display = this.wizardStep > 1 ? 'inline-flex' : 'none';
    document.getElementById('wzNextBtn').textContent = this.wizardStep === 3 ? 'Confirm & Finalize Reservation' : 'Continue Next';
  }

  finalizeWizardBooking() {
    const tripId = document.getElementById('wzTripSelect').value;
    const trip = this.trips.find(t => t.id === tripId);
    if (!trip) return;

    let custId = document.getElementById('wzCustomerSelect').value;
    let customer = this.customers.find(c => c.id === custId);

    if (custId === 'NEW_CUSTOMER') {
      const name = document.getElementById('wzCustName').value.trim();
      const email = document.getElementById('wzCustEmail').value.trim();
      const phone = document.getElementById('wzCustPhone').value.trim() || '+1 (555) 000-0000';
      const nationality = document.getElementById('wzCustNationality').value.trim() || 'Global';

      customer = {
        id: `CUST-${Math.floor(100 + Math.random() * 900)}`,
        name,
        email,
        phone,
        nationality,
        tier: 'Bronze',
        passport: 'US-NEW',
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=160&q=80',
        totalBookings: 0,
        lifetimeSpend: 0,
        notes: document.getElementById('wzSpecialRequests').value.trim(),
        createdDate: new Date().toISOString().split('T')[0]
      };
      this.customers.unshift(customer);
      WanderlustData.saveCustomers(this.customers);
      custId = customer.id;
    }

    const totals = this.recalculateWizardTotal();
    const paymentStatus = document.getElementById('wzPaymentStatusSelect').value;
    const paymentMethod = document.getElementById('wzPaymentMethodSelect').value;
    const specialRequests = document.getElementById('wzSpecialRequests').value.trim();
    const roomPref = document.getElementById('wzRoomPrefSelect').value;

    const addons = [];
    if (document.getElementById('wzAddonInsurance').checked) addons.push('Travel Insurance');
    if (document.getElementById('wzAddonTransfer').checked) addons.push('VIP Airport Transfers');
    if (document.getElementById('wzAddonGuide').checked) addons.push('Private Photography Guide');

    const newBooking = {
      id: `BK-${Math.floor(8000 + Math.random() * 1999)}`,
      tripId: trip.id,
      tripTitle: trip.title,
      destination: trip.destinationName,
      customerId: customer.id,
      customerName: customer.name,
      customerEmail: customer.email,
      customerAvatar: customer.avatar,
      guestsCount: totals.guests,
      roomPreference: roomPref,
      departureDate: trip.departureDate,
      returnDate: trip.returnDate,
      bookingDate: new Date().toISOString().split('T')[0],
      basePrice: totals.baseTotal,
      addons: addons,
      addonsCost: totals.addonsTotal,
      taxAmount: totals.tax,
      totalPrice: totals.grandTotal,
      bookingStatus: 'Confirmed',
      paymentStatus: paymentStatus,
      paymentMethod: paymentMethod,
      specialRequests: specialRequests
    };

    // Update state
    this.bookings.unshift(newBooking);
    trip.bookedSeats = Math.min(trip.maxCapacity, trip.bookedSeats + totals.guests);
    customer.totalBookings++;
    customer.lifetimeSpend += totals.grandTotal;

    WanderlustData.saveBookings(this.bookings);
    WanderlustData.saveTrips(this.trips);
    WanderlustData.saveCustomers(this.customers);

    this.closeNewBookingModal();
    this.showToast(`Reservation ${newBooking.id} created successfully!`, 'success');
    this.loadAllData();
    this.renderCurrentView();
    this.viewBookingDetails(newBooking.id);
  }

  // =========================================================================
  // VIEW BOOKING VOUCHER DETAILS MODAL
  // =========================================================================
  viewBookingDetails(id) {
    const booking = this.bookings.find(b => b.id === id);
    if (!booking) return;

    const modal = document.getElementById('bookingDetailsModalBackdrop');
    const voucher = document.getElementById('bookingVoucherContent');

    voucher.innerHTML = `
      <div class="voucher-header">
        <div class="voucher-logo">
          <h2>WANDERLUST <span>PRO</span></h2>
          <span style="font-size: 0.78rem; color: var(--text-muted);">Official Itinerary & Travel Confirmation Voucher</span>
        </div>
        <div class="voucher-code-badge">
          <div class="voucher-code">${booking.id}</div>
          <span class="badge-status badge-${booking.bookingStatus.toLowerCase()}">${booking.bookingStatus}</span>
        </div>
      </div>

      <div class="voucher-grid-2">
        <div class="voucher-info-box">
          <div class="voucher-section-title">Traveler Information</div>
          <div style="display: flex; gap: 10px; align-items: center; margin-bottom: 6px;">
            <img src="${booking.customerAvatar}" class="user-avatar" style="width: 36px; height: 36px;">
            <div>
              <strong>${booking.customerName}</strong>
              <div style="font-size: 0.75rem; color: var(--text-muted);">${booking.customerEmail}</div>
            </div>
          </div>
          <div style="font-size: 0.78rem; color: var(--text-secondary);">
            <strong>Guests:</strong> ${booking.guestsCount} Traveler(s) • <strong>Room:</strong> ${booking.roomPreference || 'Double Bed'}
          </div>
        </div>

        <div class="voucher-info-box">
          <div class="voucher-section-title">Expedition & Dates</div>
          <strong style="font-size: 0.95rem; color: var(--primary-500); display: block; margin-bottom: 2px;">${booking.tripTitle}</strong>
          <div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 6px;"><i class="fa-solid fa-location-dot"></i> ${booking.destination}</div>
          <div style="font-size: 0.8rem;">
            <strong>Depart:</strong> ${this.formatDate(booking.departureDate)} — <strong>Return:</strong> ${this.formatDate(booking.returnDate)}
          </div>
        </div>
      </div>

      <div class="checkout-summary-box mb-3">
        <div class="voucher-section-title">Itemized Financial Ledger</div>
        <div class="summary-line">
          <span>Base Tour Package (${booking.guestsCount} Travelers)</span>
          <strong>${this.formatMoney(booking.basePrice)}</strong>
        </div>
        ${booking.addons && booking.addons.length > 0 ? `
          <div class="summary-line">
            <span>Selected Add-ons (${booking.addons.join(', ')})</span>
            <strong>+${this.formatMoney(booking.addonsCost || 0)}</strong>
          </div>
        ` : ''}
        <div class="summary-line">
          <span>Estimated VAT / Tourism Taxes</span>
          <strong>${this.formatMoney(booking.taxAmount || 0)}</strong>
        </div>
        <div class="summary-divider"></div>
        <div class="summary-line summary-grand-total">
          <span>Total Invoiced Amount</span>
          <span class="total-highlight">${this.formatMoney(booking.totalPrice)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-top: 8px; font-size: 0.78rem;">
          <span>Payment Status: <strong class="badge-status badge-${booking.paymentStatus.toLowerCase()}">${booking.paymentStatus}</strong></span>
          <span>Payment Method: <strong>${booking.paymentMethod}</strong></span>
        </div>
      </div>

      ${booking.specialRequests ? `
        <div class="voucher-info-box">
          <div class="voucher-section-title">Special Traveler Instructions / Emergency Notes</div>
          <p style="font-size: 0.82rem; color: var(--text-secondary);">${booking.specialRequests}</p>
        </div>
      ` : ''}
    `;

    // Quick status toggles in footer
    const toggles = document.getElementById('voucherQuickToggles');
    toggles.innerHTML = `
      <button class="btn btn-secondary btn-xs me-1" onclick="app.setBookingStatusModal('${booking.id}', 'Confirmed')">Mark Confirmed</button>
      <button class="btn btn-secondary btn-xs me-1" onclick="app.setBookingPaymentModal('${booking.id}', 'Paid')">Mark Paid (100%)</button>
      <button class="btn btn-danger btn-xs" onclick="app.setBookingStatusModal('${booking.id}', 'Cancelled')">Cancel Booking</button>
    `;

    modal.classList.add('show');
  }

  closeBookingDetailsModal() {
    document.getElementById('bookingDetailsModalBackdrop').classList.remove('show');
  }

  setBookingStatusModal(id, status) {
    this.updateBookingStatusDirect(id, status);
    this.viewBookingDetails(id);
  }

  setBookingPaymentModal(id, payStatus) {
    const b = this.bookings.find(item => item.id === id);
    if (!b) return;
    b.paymentStatus = payStatus;
    WanderlustData.saveBookings(this.bookings);
    this.showToast(`Booking ${b.id} marked as ${payStatus}`, 'success');
    this.viewBookingDetails(id);
    this.renderCurrentView();
  }

  // =========================================================================
  // VIEW 5: CUSTOMERS MANAGEMENT
  // =========================================================================
  setCustViewMode(mode) {
    this.custViewMode = mode;
    document.getElementById('custViewGridBtn').classList.toggle('active', mode === 'grid');
    document.getElementById('custViewTableBtn').classList.toggle('active', mode === 'table');
    document.getElementById('customersGridContainer').style.display = mode === 'grid' ? 'grid' : 'none';
    document.getElementById('customersTableContainer').style.display = mode === 'table' ? 'block' : 'none';
  }

  handleCustomersFilter() {
    this.custPage = 1;
    this.renderCustomers();
  }

  resetCustomerFilters() {
    document.getElementById('customerSearchInput').value = '';
    document.getElementById('customerTierFilter').value = 'all';
    document.getElementById('customerSortFilter').value = 'spend-desc';
    this.custPage = 1;
    this.renderCustomers();
  }

  renderCustomers() {
    const search = (document.getElementById('customerSearchInput')?.value || '').toLowerCase().trim();
    const tier = document.getElementById('customerTierFilter')?.value || 'all';
    const sort = document.getElementById('customerSortFilter')?.value || 'spend-desc';

    let filtered = this.customers.filter(c => {
      const matchSearch = c.name.toLowerCase().includes(search) || c.email.toLowerCase().includes(search) || c.phone.toLowerCase().includes(search) || c.nationality.toLowerCase().includes(search);
      const matchTier = tier === 'all' || c.tier === tier;
      return matchSearch && matchTier;
    });

    filtered.sort((a, b) => {
      if (sort === 'spend-desc') return b.lifetimeSpend - a.lifetimeSpend;
      if (sort === 'bookings-desc') return b.totalBookings - a.totalBookings;
      if (sort === 'name-asc') return a.name.localeCompare(b.name);
      if (sort === 'recent-desc') return new Date(b.createdDate) - new Date(a.createdDate);
      return 0;
    });

    const totalItems = filtered.length;
    const totalPages = Math.ceil(totalItems / this.custPageSize) || 1;
    if (this.custPage > totalPages) this.custPage = totalPages;

    const startIndex = (this.custPage - 1) * this.custPageSize;
    const paginated = filtered.slice(startIndex, startIndex + this.custPageSize);

    const gridContainer = document.getElementById('customersGridContainer');
    const tableBody = document.getElementById('customersTableBody');
    const emptyState = document.getElementById('customersEmptyState');
    const pagBar = document.getElementById('customersPaginationBar');

    if (totalItems === 0) {
      if (gridContainer) gridContainer.innerHTML = '';
      if (tableBody) tableBody.innerHTML = '';
      if (emptyState) emptyState.style.display = 'block';
      if (pagBar) pagBar.style.display = 'none';
      return;
    }
    if (emptyState) emptyState.style.display = 'none';
    if (pagBar) pagBar.style.display = 'flex';

    if (gridContainer) {
      gridContainer.innerHTML = paginated.map(c => `
        <div class="customer-card">
          <span class="badge-status badge-vip customer-tier-corner">${c.tier}</span>
          <img src="${c.avatar}" class="customer-avatar-lg tier-${c.tier.toLowerCase().replace(' ', '-')}" alt="${c.name}">
          <h3 class="customer-card-name">${c.name}</h3>
          <span class="customer-card-country"><i class="fa-solid fa-flag me-1"></i> ${c.nationality}</span>
          
          <div class="customer-stats-row">
            <div class="customer-stat-box">
              <span class="customer-stat-val">${c.totalBookings}</span>
              <span class="customer-stat-lbl">Bookings</span>
            </div>
            <div class="customer-stat-box">
              <span class="customer-stat-val">${this.formatMoney(c.lifetimeSpend)}</span>
              <span class="customer-stat-lbl">Lifetime Spend</span>
            </div>
          </div>

          <div class="customer-contact-info">
            <div><i class="fa-solid fa-envelope me-1 text-muted"></i> ${c.email}</div>
            <div><i class="fa-solid fa-phone me-1 text-muted"></i> ${c.phone}</div>
          </div>

          <div class="customer-card-actions">
            <button class="btn btn-secondary btn-xs flex-1" onclick="app.editCustomer('${c.id}')">
              <i class="fa-solid fa-pen"></i> Edit Profile
            </button>
            <button class="btn btn-secondary btn-xs" onclick="app.deleteCustomer('${c.id}')">
              <i class="fa-solid fa-trash text-rose"></i>
            </button>
          </div>
        </div>
      `).join('');
    }

    if (tableBody) {
      tableBody.innerHTML = paginated.map(c => `
        <tr>
          <td>
            <div style="display: flex; align-items: center; gap: 10px;">
              <img src="${c.avatar}" class="user-avatar" style="width: 34px; height: 34px;">
              <strong>${c.name}</strong>
            </div>
          </td>
          <td>
            <div>${c.email}</div>
            <div style="font-size: 0.72rem; color: var(--text-muted);">${c.phone}</div>
          </td>
          <td>${c.nationality}</td>
          <td><span class="badge-status badge-vip">${c.tier}</span></td>
          <td><strong>${c.totalBookings} trips</strong></td>
          <td><strong>${this.formatMoney(c.lifetimeSpend)}</strong></td>
          <td><span style="font-size: 0.78rem;">${this.formatDate(c.createdDate)}</span></td>
          <td class="text-right">
            <button class="btn btn-secondary btn-xs me-1" onclick="app.editCustomer('${c.id}')"><i class="fa-solid fa-pen"></i></button>
            <button class="btn btn-secondary btn-xs" onclick="app.deleteCustomer('${c.id}')"><i class="fa-solid fa-trash text-rose"></i></button>
          </td>
        </tr>
      `).join('');
    }

    this.renderPaginationControls('customersPaginationInfo', 'customersPaginationControls', totalItems, this.custPage, totalPages, 'custPage', 'renderCustomers');
  }

  openCustomerModal(custId = null) {
    const modal = document.getElementById('customerModalBackdrop');
    const form = document.getElementById('customerForm');
    form.reset();

    if (custId) {
      const c = this.customers.find(item => item.id === custId);
      if (!c) return;
      document.getElementById('customerModalTitle').textContent = 'Edit Traveler Profile';
      document.getElementById('customerFormId').value = c.id;
      document.getElementById('custNameInput').value = c.name;
      document.getElementById('custEmailInput').value = c.email;
      document.getElementById('custPhoneInput').value = c.phone;
      document.getElementById('custNationalityInput').value = c.nationality;
      document.getElementById('custTierInput').value = c.tier;
      document.getElementById('custPassportInput').value = c.passport;
      document.getElementById('custAvatarInput').value = c.avatar;
      document.getElementById('custNotesInput').value = c.notes || '';
    } else {
      document.getElementById('customerModalTitle').textContent = 'Add Traveler Profile';
      document.getElementById('customerFormId').value = '';
    }

    modal.classList.add('show');
  }

  closeCustomerModal() {
    document.getElementById('customerModalBackdrop').classList.remove('show');
  }

  editCustomer(id) {
    this.openCustomerModal(id);
  }

  handleCustomerFormSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('customerFormId').value;
    const name = document.getElementById('custNameInput').value.trim();
    const email = document.getElementById('custEmailInput').value.trim();
    const phone = document.getElementById('custPhoneInput').value.trim();
    const nationality = document.getElementById('custNationalityInput').value.trim();
    const tier = document.getElementById('custTierInput').value;
    const passport = document.getElementById('custPassportInput').value.trim() || 'US-999';
    const avatar = document.getElementById('custAvatarInput').value.trim() || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=160&q=80';
    const notes = document.getElementById('custNotesInput').value.trim();

    if (id) {
      const idx = this.customers.findIndex(c => c.id === id);
      if (idx !== -1) {
        this.customers[idx] = { ...this.customers[idx], name, email, phone, nationality, tier, passport, avatar, notes };
        this.showToast(`Updated profile for ${name}`, 'success');
      }
    } else {
      const newCust = {
        id: `CUST-${Math.floor(100 + Math.random() * 900)}`,
        name, email, phone, nationality, tier, passport, avatar, notes,
        totalBookings: 0,
        lifetimeSpend: 0,
        createdDate: new Date().toISOString().split('T')[0]
      };
      this.customers.unshift(newCust);
      this.showToast(`Added customer profile ${name}`, 'success');
    }

    WanderlustData.saveCustomers(this.customers);
    this.closeCustomerModal();
    this.loadAllData();
    this.renderCustomers();
  }

  async deleteCustomer(id) {
    const cust = this.customers.find(c => c.id === id);
    if (!cust) return;

    const confirmed = await this.confirm('Delete Customer Profile?', `Are you sure you want to remove traveler ${cust.name}?`);
    if (!confirmed) return;

    this.customers = this.customers.filter(c => c.id !== id);
    WanderlustData.saveCustomers(this.customers);
    this.showToast(`Customer profile ${cust.name} removed`, 'warning');
    this.loadAllData();
    this.renderCustomers();
  }

  // =========================================================================
  // VIEW 6: INTERACTIVE CALENDAR
  // =========================================================================
  calendarJumpToday() {
    this.calendarDate = new Date(2026, 9, 1); // Oct 2026
    this.renderCalendar();
  }

  prevCalendarMonth() {
    this.calendarDate = new Date(this.calendarDate.getFullYear(), this.calendarDate.getMonth() - 1, 1);
    this.renderCalendar();
  }

  nextCalendarMonth() {
    this.calendarDate = new Date(this.calendarDate.getFullYear(), this.calendarDate.getMonth() + 1, 1);
    this.renderCalendar();
  }

  renderCalendar() {
    const year = this.calendarDate.getFullYear();
    const month = this.calendarDate.getMonth();

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const monthLabel = document.getElementById('calendarMonthLabel');
    if (monthLabel) monthLabel.textContent = `${monthNames[month]} ${year}`;

    const destFilter = document.getElementById('calendarDestFilter')?.value || 'all';

    // First day of month & total days
    const firstDayIndex = new Date(year, month, 1).getDay();
    const lastDayCurrentMonth = new Date(year, month + 1, 0).getDate();
    const lastDayPrevMonth = new Date(year, month, 0).getDate();

    const grid = document.getElementById('calendarDaysGrid');
    if (!grid) return;
    grid.innerHTML = '';

    // Prev month padding days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = lastDayPrevMonth - i;
      const cell = document.createElement('div');
      cell.className = 'cal-day-cell other-month';
      cell.innerHTML = `<div class="cal-day-header"><span class="cal-day-num">${dayNum}</span></div>`;
      grid.appendChild(cell);
    }

    // Current month days
    for (let day = 1; day <= lastDayCurrentMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const cell = document.createElement('div');
      cell.className = 'cal-day-cell';

      // Check today indicator
      if (year === 2026 && month === 9 && day === 5) {
        cell.classList.add('today');
      }

      // Find departures on this date
      const tripsOnDate = this.trips.filter(t => {
        const matchDest = destFilter === 'all' || t.destinationId === destFilter;
        return matchDest && t.departureDate === dateStr;
      });

      let eventsHtml = '';
      tripsOnDate.forEach(t => {
        const catClass = `bg-tag-${t.category.toLowerCase()}`;
        eventsHtml += `
          <div class="cal-event-chip ${catClass}" title="${t.title} (${t.bookedSeats}/${t.maxCapacity} seats)" onclick="event.stopPropagation(); app.viewTripDetails('${t.id}')">
            <i class="fa-solid fa-plane-departure"></i> ${t.title}
          </div>
        `;
      });

      cell.innerHTML = `
        <div class="cal-day-header">
          <span class="cal-day-num">${day}</span>
          ${tripsOnDate.length > 0 ? `<span class="badge-counter">${tripsOnDate.length}</span>` : ''}
        </div>
        <div class="cal-events-container">${eventsHtml}</div>
      `;

      cell.addEventListener('click', () => {
        this.openCalendarAgenda(dateStr, tripsOnDate);
      });

      grid.appendChild(cell);
    }

    // Next month padding days to round up to 35 or 42
    const totalRendered = firstDayIndex + lastDayCurrentMonth;
    const remaining = (7 - (totalRendered % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const cell = document.createElement('div');
      cell.className = 'cal-day-cell other-month';
      cell.innerHTML = `<div class="cal-day-header"><span class="cal-day-num">${i}</span></div>`;
      grid.appendChild(cell);
    }
  }

  openCalendarAgenda(dateStr, trips) {
    const panel = document.getElementById('calendarDayAgendaPanel');
    document.getElementById('calendarSelectedDateLabel').textContent = `Trips & Departures for ${this.formatDate(dateStr)}`;
    document.getElementById('calendarSelectedDateSub').textContent = `${trips.length} active departures scheduled`;

    const list = document.getElementById('calendarAgendaList');
    if (trips.length === 0) {
      list.innerHTML = `
        <div style="padding: 1rem; text-align: center; color: var(--text-muted);">
          <p>No departures scheduled for this date.</p>
          <button class="btn btn-primary btn-xs mt-2" onclick="app.openTripModal()">+ Schedule Trip on this Date</button>
        </div>`;
    } else {
      list.innerHTML = trips.map(t => `
        <div class="agenda-trip-item">
          <div style="display: flex; gap: 1rem; align-items: center;">
            <img src="${t.image}" style="width: 60px; height: 50px; border-radius: 6px; object-fit: cover;">
            <div>
              <strong style="font-size: 0.92rem;">${t.title}</strong>
              <div style="font-size: 0.75rem; color: var(--text-muted);">${t.destinationName} • ${t.durationDays} Days</div>
            </div>
          </div>
          <div style="display: flex; gap: 8px; align-items: center;">
            <span class="badge-status badge-confirmed">${t.bookedSeats}/${t.maxCapacity} seats</span>
            <button class="btn btn-primary btn-xs" onclick="app.openNewBookingModal('${t.id}')">Book Seats</button>
            <button class="btn btn-secondary btn-xs" onclick="app.viewTripDetails('${t.id}')">View Details</button>
          </div>
        </div>
      `).join('');
    }

    panel.style.display = 'block';
  }

  closeCalendarAgenda() {
    document.getElementById('calendarDayAgendaPanel').style.display = 'none';
  }

  // =========================================================================
  // VIEW 7: PAYMENTS & FINANCIALS
  // =========================================================================
  handlePaymentsFilter() {
    this.renderPayments();
  }

  renderPayments() {
    const totalCollected = this.bookings.reduce((sum, b) => b.paymentStatus === 'Paid' ? sum + b.totalPrice : b.paymentStatus === 'Partial' ? sum + (b.totalPrice * 0.3) : sum, 0);
    const pendingAmount = this.bookings.reduce((sum, b) => b.paymentStatus === 'Unpaid' ? sum + b.totalPrice : b.paymentStatus === 'Partial' ? sum + (b.totalPrice * 0.7) : sum, 0);
    const refundsAmount = this.bookings.reduce((sum, b) => b.paymentStatus === 'Refunded' ? sum + b.totalPrice : sum, 0);
    const aov = this.bookings.length > 0 ? totalCollected / this.bookings.length : 0;

    document.getElementById('kpiCollectedAmount').textContent = this.formatMoney(totalCollected);
    document.getElementById('kpiPendingInvoicesAmount').textContent = this.formatMoney(pendingAmount);
    document.getElementById('kpiRefundsAmount').textContent = this.formatMoney(refundsAmount);
    document.getElementById('kpiAOV').textContent = this.formatMoney(aov);

    const statusFilter = document.getElementById('paymentsFilterStatus')?.value || 'all';
    const methodFilter = document.getElementById('paymentsFilterMethod')?.value || 'all';

    let filtered = this.bookings.filter(b => {
      const matchStatus = statusFilter === 'all' || b.paymentStatus === statusFilter;
      const matchMethod = methodFilter === 'all' || b.paymentMethod === methodFilter;
      return matchStatus && matchMethod;
    });

    const tbody = document.getElementById('paymentsTableBody');
    if (tbody) {
      tbody.innerHTML = filtered.map(b => `
        <tr>
          <td><strong class="font-mono">INV-${b.id.replace('BK-', '')}</strong></td>
          <td><a href="javascript:void(0)" onclick="app.viewBookingDetails('${b.id}')" class="text-primary font-mono font-semibold">${b.id}</a></td>
          <td>${b.customerName}</td>
          <td><span class="badge-status badge-vip">${b.paymentMethod}</span></td>
          <td><strong>${this.formatMoney(b.totalPrice)}</strong></td>
          <td><span class="badge-status badge-${b.paymentStatus.toLowerCase()}">${b.paymentStatus}</span></td>
          <td><span style="font-size: 0.78rem;">${this.formatDate(b.bookingDate)}</span></td>
          <td class="text-right">
            <button class="btn btn-secondary btn-xs" onclick="app.viewBookingDetails('${b.id}')" title="Print Invoice">
              <i class="fa-solid fa-file-invoice-dollar"></i> Invoice
            </button>
          </td>
        </tr>
      `).join('');
    }

    const counter = document.getElementById('paymentLedgerCounter');
    if (counter) counter.textContent = `${filtered.length} records`;
  }

  // =========================================================================
  // VIEW 8: ANALYTICS & REPORTS
  // =========================================================================
  renderAnalytics() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)';
    const textColor = isDark ? '#94a3b8' : '#64748b';

    // Chart 1: Bookings by Destination Bar Chart
    const ctx1 = document.getElementById('destBookingsBarChart');
    if (ctx1) {
      if (this.charts.destBar) this.charts.destBar.destroy();

      const destCounts = {};
      this.destinations.forEach(d => { destCounts[d.name.split('&')[0].trim()] = 0; });
      this.bookings.forEach(b => {
        const destKey = Object.keys(destCounts).find(k => b.destination.includes(k));
        if (destKey) destCounts[destKey] += b.guestsCount;
      });

      this.charts.destBar = new Chart(ctx1, {
        type: 'bar',
        data: {
          labels: Object.keys(destCounts).slice(0, 8),
          datasets: [{
            label: 'Total Travelers',
            data: Object.values(destCounts).slice(0, 8),
            backgroundColor: '#6366f1',
            borderRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { grid: { color: gridColor }, ticks: { color: textColor } },
            y: { grid: { color: gridColor }, ticks: { color: textColor } }
          }
        }
      });
    }

    // Chart 2: Payment Status Doughnut
    const ctx2 = document.getElementById('paymentStatusDoughnutChart');
    if (ctx2) {
      if (this.charts.payDoughnut) this.charts.payDoughnut.destroy();

      const payCounts = { Paid: 0, Partial: 0, Unpaid: 0, Refunded: 0 };
      this.bookings.forEach(b => {
        if (payCounts[b.paymentStatus] !== undefined) payCounts[b.paymentStatus]++;
      });

      this.charts.payDoughnut = new Chart(ctx2, {
        type: 'doughnut',
        data: {
          labels: ['Paid in Full', 'Partial Deposit', 'Unpaid', 'Refunded'],
          datasets: [{
            data: Object.values(payCounts),
            backgroundColor: ['#10b981', '#a855f7', '#f43f5e', '#94a3b8'],
            borderWidth: 0
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { labels: { color: textColor } }
          },
          cutout: '65%'
        }
      });
    }

    // Top Performing Trips Table
    const topTrips = [...this.trips].sort((a, b) => (b.bookedSeats * b.pricePerPerson) - (a.bookedSeats * a.pricePerPerson)).slice(0, 5);
    const tbody = document.getElementById('analyticsTopTripsTableBody');
    if (tbody) {
      tbody.innerHTML = topTrips.map((t, idx) => {
        const gross = t.bookedSeats * t.pricePerPerson;
        const occ = Math.round((t.bookedSeats / t.maxCapacity) * 100);
        return `
          <tr>
            <td><strong class="badge-counter font-bold">#${idx + 1}</strong></td>
            <td><strong>${t.title}</strong></td>
            <td>${t.destinationName}</td>
            <td>${t.bookedSeats} booked</td>
            <td><span class="badge-status badge-${occ > 70 ? 'confirmed' : 'pending'}">${occ}%</span></td>
            <td><strong>${this.formatMoney(gross)}</strong></td>
            <td><i class="fa-solid fa-star text-amber"></i> ${t.rating}</td>
          </tr>
        `;
      }).join('');
    }

    // Loyalty Demographics
    const tiers = { 'Platinum VIP': 0, 'Gold': 0, 'Silver': 0, 'Bronze': 0 };
    this.customers.forEach(c => { if (tiers[c.tier] !== undefined) tiers[c.tier]++; });
    const loyaltyList = document.getElementById('loyaltyBreakdownList');
    if (loyaltyList) {
      loyaltyList.innerHTML = Object.entries(tiers).map(([tier, count]) => {
        const pct = Math.round((count / this.customers.length) * 100);
        return `
          <div class="loyalty-item">
            <div class="loyalty-item-header">
              <span>${tier}</span>
              <strong>${count} travelers (${pct}%)</strong>
            </div>
            <div class="progress-bar-track">
              <div class="progress-bar-fill indigo" style="width: ${pct}%;"></div>
            </div>
          </div>
        `;
      }).join('');
    }
  }

  // =========================================================================
  // VIEW 9: SETTINGS & DATA CONTROLS
  // =========================================================================
  renderSettings() {
    const s = this.settings;
    if (document.getElementById('settingAgencyName')) document.getElementById('settingAgencyName').value = s.agencyName || 'Horizon Travel Global LLC';
    if (document.getElementById('settingAgencyEmail')) document.getElementById('settingAgencyEmail').value = s.agencyEmail || 'ops@horizontravel.com';
    if (document.getElementById('settingAgencyPhone')) document.getElementById('settingAgencyPhone').value = s.agencyPhone || '+1 (800) 555-8747';
  }

  saveAgencySettings() {
    this.settings = {
      agencyName: document.getElementById('settingAgencyName').value.trim(),
      agencyEmail: document.getElementById('settingAgencyEmail').value.trim(),
      agencyPhone: document.getElementById('settingAgencyPhone').value.trim(),
      baseCurrency: document.getElementById('settingBaseCurrency').value,
      taxRate: parseFloat(document.getElementById('settingTaxRate').value) || 8.5
    };
    WanderlustData.saveSettings(this.settings);
    this.showToast('Agency profile & settings saved successfully!', 'success');
  }

  generateRandomBooking() {
    const randomTrip = this.trips[Math.floor(Math.random() * this.trips.length)];
    const randomCust = this.customers[Math.floor(Math.random() * this.customers.length)];
    const guests = Math.floor(1 + Math.random() * 3);
    const base = randomTrip.pricePerPerson * guests;
    const tax = base * 0.085;

    const newBooking = {
      id: `BK-${Math.floor(8000 + Math.random() * 1999)}`,
      tripId: randomTrip.id,
      tripTitle: randomTrip.title,
      destination: randomTrip.destinationName,
      customerId: randomCust.id,
      customerName: randomCust.name,
      customerEmail: randomCust.email,
      customerAvatar: randomCust.avatar,
      guestsCount: guests,
      roomPreference: 'Double / Queen Bed',
      departureDate: randomTrip.departureDate,
      returnDate: randomTrip.returnDate,
      bookingDate: new Date().toISOString().split('T')[0],
      basePrice: base,
      addons: ['Travel Insurance (+$149)'],
      addonsCost: 149 * guests,
      taxAmount: tax,
      totalPrice: base + (149 * guests) + tax,
      bookingStatus: 'Confirmed',
      paymentStatus: 'Paid',
      paymentMethod: 'Credit Card',
      specialRequests: 'Generated automated test reservation.'
    };

    this.bookings.unshift(newBooking);
    randomTrip.bookedSeats = Math.min(randomTrip.maxCapacity, randomTrip.bookedSeats + guests);
    randomCust.totalBookings++;
    randomCust.lifetimeSpend += newBooking.totalPrice;

    WanderlustData.saveBookings(this.bookings);
    WanderlustData.saveTrips(this.trips);
    WanderlustData.saveCustomers(this.customers);

    this.showToast(`Simulated booking ${newBooking.id} added!`, 'success');
    this.loadAllData();
    this.renderCurrentView();
  }

  async confirmResetDatabase() {
    const confirmed = await this.confirm(
      'Reset All Demo Data?',
      'This will restore all destinations, trips, customers, and bookings back to their rich default seed state.'
    );
    if (!confirmed) return;

    WanderlustData.resetDefaults();
    this.loadAllData();
    this.showToast('Database restored to default demo state!', 'info');
    this.renderCurrentView();
  }

  exportDatabaseJSON() {
    const backup = {
      destinations: this.destinations,
      trips: this.trips,
      customers: this.customers,
      bookings: this.bookings,
      settings: this.settings,
      exportedAt: new Date().toISOString()
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backup, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute("href", dataStr);
    dlAnchor.setAttribute("download", `wanderlust_backup_${new Date().toISOString().split('T')[0]}.json`);
    dlAnchor.click();
    this.showToast('Database JSON backup downloaded', 'success');
  }

  // =========================================================================
  // EXPORT TOOLS (CSV & REPORTS)
  // =========================================================================
  exportTripsCSV() {
    let csv = "Trip ID,Title,Destination,Category,Difficulty,Departure Date,Return Date,Duration Days,Price Per Person,Booked Seats,Max Capacity,Status\n";
    this.trips.forEach(t => {
      csv += `"${t.id}","${t.title}","${t.destinationName}","${t.category}","${t.difficulty}","${t.departureDate}","${t.returnDate}",${t.durationDays},${t.pricePerPerson},${t.bookedSeats},${t.maxCapacity},"${t.status}"\n`;
    });
    this.downloadCSV(csv, 'wanderlust_trips_export.csv');
  }

  exportBookingsCSV() {
    let csv = "Booking ID,Customer Name,Customer Email,Trip Title,Destination,Departure Date,Return Date,Guests,Total Price,Booking Status,Payment Status,Payment Method\n";
    this.bookings.forEach(b => {
      csv += `"${b.id}","${b.customerName}","${b.customerEmail}","${b.tripTitle}","${b.destination}","${b.departureDate}","${b.returnDate}",${b.guestsCount},${b.totalPrice},"${b.bookingStatus}","${b.paymentStatus}","${b.paymentMethod}"\n`;
    });
    this.downloadCSV(csv, 'wanderlust_bookings_export.csv');
  }

  exportCustomersCSV() {
    let csv = "Customer ID,Name,Email,Phone,Nationality,Tier,Total Bookings,Lifetime Spend\n";
    this.customers.forEach(c => {
      csv += `"${c.id}","${c.name}","${c.email}","${c.phone}","${c.nationality}","${c.tier}",${c.totalBookings},${c.lifetimeSpend}\n`;
    });
    this.downloadCSV(csv, 'wanderlust_travelers_export.csv');
  }

  exportPaymentsCSV() {
    let csv = "Invoice Ref,Booking ID,Customer,Payment Method,Amount,Status,Date\n";
    this.bookings.forEach(b => {
      csv += `"INV-${b.id}","${b.id}","${b.customerName}","${b.paymentMethod}",${b.totalPrice},"${b.paymentStatus}","${b.bookingDate}"\n`;
    });
    this.downloadCSV(csv, 'wanderlust_payment_ledger.csv');
  }

  downloadCSV(csvContent, filename) {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    this.showToast(`Exported ${filename}`, 'success');
  }

  exportFullReportModal() {
    this.showToast('Generating executive PDF report...', 'info');
    setTimeout(() => {
      window.print();
    }, 500);
  }

  // =========================================================================
  // PAGINATION CONTROLS GENERATOR
  // =========================================================================
  renderPaginationControls(infoId, controlsId, totalItems, currentPage, totalPages, pageStateProp, renderMethodName) {
    const infoEl = document.getElementById(infoId);
    const controlsEl = document.getElementById(controlsId);

    if (infoEl) {
      const start = (currentPage - 1) * this[pageStateProp === 'bookingPage' ? 'bookingPageSize' : pageStateProp === 'tripPage' ? 'tripPageSize' : 'custPageSize'] + 1;
      const end = Math.min(totalItems, currentPage * this[pageStateProp === 'bookingPage' ? 'bookingPageSize' : pageStateProp === 'tripPage' ? 'tripPageSize' : 'custPageSize']);
      infoEl.textContent = `Showing ${start} to ${end} of ${totalItems} items`;
    }

    if (controlsEl) {
      let html = `
        <button class="page-btn" ${currentPage <= 1 ? 'disabled' : ''} onclick="app['${pageStateProp}']--; app['${renderMethodName}']();">
          <i class="fa-solid fa-chevron-left"></i>
        </button>
      `;

      for (let p = 1; p <= totalPages; p++) {
        html += `
          <button class="page-btn ${p === currentPage ? 'active' : ''}" onclick="app['${pageStateProp}'] = ${p}; app['${renderMethodName}']();">
            ${p}
          </button>
        `;
      }

      html += `
        <button class="page-btn" ${currentPage >= totalPages ? 'disabled' : ''} onclick="app['${pageStateProp}']++; app['${renderMethodName}']();">
          <i class="fa-solid fa-chevron-right"></i>
        </button>
      `;

      controlsEl.innerHTML = html;
    }
  }

  // =========================================================================
  // NOTIFICATIONS SYSTEM
  // =========================================================================
  updateNotificationBadge() {
    const list = document.getElementById('notificationsList');
    if (!list) return;

    const notifs = [
      { id: 1, title: 'New VIP Reservation', msg: 'Gokilavani confirmed booking for Kyoto Autumn.', time: '10m ago', icon: 'fa-ticket', color: 'bg-tag-adventure' },
      { id: 2, title: 'Payment Finalized', msg: 'Marcus Aurelius Thorne paid $11,911 via Wire Transfer.', time: '1h ago', icon: 'fa-circle-dollar-to-slot', color: 'bg-tag-wildlife' },
      { id: 3, title: 'Trip Near Capacity', msg: 'Amalfi Coast Dolce Vita has only 1 seat remaining.', time: '3h ago', icon: 'fa-triangle-exclamation', color: 'bg-tag-cultural' }
    ];

    list.innerHTML = notifs.map(n => `
      <div class="notif-item">
        <div class="notif-icon ${n.color}">
          <i class="fa-solid ${n.icon} text-white"></i>
        </div>
        <div class="notif-content">
          <p><strong>${n.title}:</strong> ${n.msg}</p>
          <span class="notif-time">${n.time}</span>
        </div>
      </div>
    `).join('');

    const btn = document.getElementById('notificationsBtn');
    const menu = document.getElementById('notificationsMenu');
    if (btn && menu && !btn.dataset.listenerAttached) {
      btn.dataset.listenerAttached = 'true';
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        menu.classList.toggle('show');
      });
      document.addEventListener('click', (e) => {
        if (!menu.contains(e.target)) menu.classList.remove('show');
      });
    }
  }

  clearNotifications() {
    const list = document.getElementById('notificationsList');
    if (list) list.innerHTML = '<div style="padding: 1.5rem; text-align: center; color: var(--text-muted);">All caught up! No unread notifications.</div>';
    this.showToast('All notifications marked as read', 'info');
  }

  // =========================================================================
  // TOAST NOTIFICATIONS & CONFIRMATION MODALS
  // =========================================================================
  showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const icons = {
      success: 'fa-solid fa-circle-check',
      error: 'fa-solid fa-circle-xmark',
      warning: 'fa-solid fa-triangle-exclamation',
      info: 'fa-solid fa-circle-info'
    };

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <div class="toast-icon"><i class="${icons[type] || icons.info}"></i></div>
      <div class="toast-message">${message}</div>
      <button class="toast-close" onclick="this.parentElement.remove()"><i class="fa-solid fa-xmark"></i></button>
      <div class="toast-progress"></div>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('hide');
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  confirm(title, message) {
    return new Promise((resolve) => {
      this.confirmResolver = resolve;
      document.getElementById('confirmModalTitle').textContent = title;
      document.getElementById('confirmModalMessage').textContent = message;
      document.getElementById('confirmModalBackdrop').classList.add('show');
    });
  }

  closeConfirmModal(result) {
    document.getElementById('confirmModalBackdrop').classList.remove('show');
    if (this.confirmResolver) {
      this.confirmResolver(result);
      this.confirmResolver = null;
    }
  }
}

// Global App instantiation
window.app = new WanderlustApp();
document.addEventListener('DOMContentLoaded', () => {
  window.app.init();
});
