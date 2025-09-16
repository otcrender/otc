// Main JavaScript - OTC Sports Center (Static Version)

// DOM Content Loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing static site...');
    
    // Initialize page-specific functionality
    initPageSpecific();
    
    // Initialize contact form
    initContactForm();
    
    // Initialize reservation form
    initReservationForm();
    
    // Initialize mobile menu
    initMobileMenu();
    
    // Initialize smooth scrolling
    initSmoothScrolling();
    
    // Initialize animations
    initAnimations();
    
    console.log('All modules initialized');
});

// Initialize page-specific functionality
function initPageSpecific() {
    const currentPage = window.location.pathname;
    console.log('initPageSpecific called, current page:', currentPage);
    
    // Initialize schedule page with static data
    if (currentPage.includes('schedule') || document.getElementById('scheduleTableContainer')) {
        console.log('Schedule page detected, initializing...');
        initializeStaticSchedule();
    }
}

// Initialize static schedule (no API calls)
function initializeStaticSchedule() {
    console.log('Initializing static schedule...');
    
    // Show a message that this is a static demo
    const scheduleContainer = document.getElementById('scheduleTableContainer');
    if (scheduleContainer) {
        scheduleContainer.innerHTML = `
            <div class="text-center py-5">
                <div class="text-primary mb-3">
                    <i class="fas fa-calendar-alt" style="font-size: 3rem;"></i>
                </div>
                <h5>Schedule Coming Soon</h5>
                <p class="text-muted mb-4">This is a static demo site. The live schedule will be available soon.</p>
                <div class="d-flex flex-wrap justify-content-center gap-3">
                    <a href="reservations.html" class="btn btn-primary">
                        <i class="fas fa-calendar-plus me-2"></i>Reserve Court
                    </a>
                    <a href="contact.html" class="btn btn-outline-primary">
                        <i class="fas fa-phone me-2"></i>Call for Schedule
                    </a>
                </div>
            </div>
        `;
    }
}

// Initialize contact form (static version)
function initContactForm() {
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Show success message
            const submitBtn = contactForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Sending...';
            submitBtn.disabled = true;
            
            // Simulate form submission
            setTimeout(() => {
                alert('Thank you for your message! We\'ll get back to you soon.');
                contactForm.reset();
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            }, 1500);
        });
    }
}

// Initialize reservation form (static version)
function initReservationForm() {
    const reservationForm = document.getElementById('reservationForm');
    if (reservationForm) {
        reservationForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Show success message
            const submitBtn = reservationForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Processing...';
            submitBtn.disabled = true;
            
            // Simulate form submission
            setTimeout(() => {
                alert('Reservation request submitted! We\'ll contact you to confirm.');
                reservationForm.reset();
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            }, 1500);
        });
    }
}

// Initialize mobile menu
function initMobileMenu() {
    const navbarToggler = document.querySelector('.navbar-toggler');
    const navbarCollapse = document.querySelector('.navbar-collapse');
    
    if (navbarToggler && navbarCollapse) {
        // Close mobile menu when clicking on a link
        const navLinks = navbarCollapse.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                if (navbarCollapse.classList.contains('show')) {
                    navbarToggler.click();
                }
            });
        });
    }
}

// Initialize smooth scrolling
function initSmoothScrolling() {
    const links = document.querySelectorAll('a[href^="#"]');
    links.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href').substring(1);
            const targetElement = document.getElementById(targetId);
            
            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

// Initialize animations
function initAnimations() {
    // Simple fade-in animation for cards
    const cards = document.querySelectorAll('.card, .feature-card');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    });
    
    cards.forEach(card => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(card);
    });
}