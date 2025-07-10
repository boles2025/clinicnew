document.addEventListener('DOMContentLoaded', () => {
    const navbarContainer = document.createElement('div');
    navbarContainer.className = 'top-navbar';

    const logo = document.createElement('div');
    logo.className = 'logo';
    logo.textContent = 'عيادة التغذية';

    const navLinks = document.createElement('div');
    navLinks.className = 'nav-links';

    const links = {
        'الرئيسية': 'index.html',
        'تسجيل مريض': 'patients_register.html',
        'الزيارات': 'visits.html',
        'الإيرادات': 'revenues.html',
        'التقارير': 'reports.html',
        'التقويم': 'calendar.html',
        'النسخ الاحتياطي': 'backup.html',
        'المحذوفات': 'deleted.html'
    };

    const currentPage = window.location.pathname.split('/').pop();

    for (const [text, url] of Object.entries(links)) {
        const link = document.createElement('a');
        link.textContent = text;
        link.href = url;
        if (url === currentPage) {
            link.classList.add('active');
        }
        navLinks.appendChild(link);
    }

    navbarContainer.appendChild(logo);
    navbarContainer.appendChild(navLinks);

    document.body.prepend(navbarContainer);
});