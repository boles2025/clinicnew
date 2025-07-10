document.addEventListener('DOMContentLoaded', () => {
    // تبديل الشريط الجانبي
    $('#sidebarCollapse').on('click', function () {
        $('#sidebar').toggleClass('active');
        $(this).toggleClass('active');
    });
    
    // تسجيل الخروج
    $('#logoutBtn').on('click', function() {
        signOut(auth).then(() => {
            // Sign-out successful.
            window.location.href = 'login.html';
        }).catch((error) => {
            // An error happened.
            console.error('Sign out error', error);
        });
    });
    
    // تأثيرات عند التحميل
    setTimeout(() => {
        $('.dashboard-cards .card').each(function(index) {
            $(this).css('animation-delay', `${index * 0.2}s`);
        });
    }, 500);
});