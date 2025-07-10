document.addEventListener('DOMContentLoaded', function () {
    // 1. Firebase Configuration & Initialization
    const firebaseConfig = {
      apiKey: "AIzaSyB4YatKHj5oLfGjEKRrw9hDiCYGw779jNk",
      authDomain: "nutrition-clinic-8b6c1.firebaseapp.com",
      databaseURL: "https://nutrition-clinic-8b6c1-default-rtdb.firebaseio.com",
      projectId: "nutrition-clinic-8b6c1",
      storageBucket: "nutrition-clinic-8b6c1.appspot.com",
      messagingSenderId: "19162768170",
      appId: "1:19162768170:web:3ba6a7f0b010a9b54cf453"
    };
    firebase.initializeApp(firebaseConfig);
    const db = firebase.database();

    // 2. DOM Elements
    const cardsContainer = document.getElementById('report-cards-container');
    const loadingState = document.getElementById('loading-state');
    const timePeriodSelect = document.getElementById('timePeriod');
    const generateReportBtn = document.getElementById('generateReportBtn');
    const detailsModal = new bootstrap.Modal(document.getElementById('detailsModal'));
    
    // Global variables to hold all data
    let allPatients = {}, allVisits = [], allRevenues = [];
    let currentReportForExport = [], currentReportTitleForExport = "";

    // 3. Data Fetching Function with Error Handling
    async function fetchAllData() {
        console.log("Attempting to fetch data from Firebase...");
        try {
            // Fetch all data points in parallel for better performance
            const [patientsSnap, revenuesSnap] = await Promise.all([
                db.ref('patients').once('value'),
                db.ref('revenues').once('value')
            ]);
            
            allPatients = patientsSnap.val() || {};
            
            allVisits = [];
            patientsSnap.forEach(pSnap => {
                if (pSnap.hasChild('visits')) {
                    pSnap.child('visits').forEach(vSnap => {
                        allVisits.push({ patientId: pSnap.key, ...vSnap.val() });
                    });
                }
            });
            
            allRevenues = [];
            revenuesSnap.forEach(pRevs => {
                pRevs.forEach(rSnap => {
                    allRevenues.push({ patientId: pRevs.key, ...rSnap.val() });
                });
            });
            
            console.log("Data fetched successfully.");
            // Generate the initial report
            generateReport();

        } catch (error) {
            console.error("Firebase fetch error:", error);
            // Display a user-friendly error message on the screen
            let errorMessage = `<h3>فشل تحميل البيانات</h3><p>حدث خطأ أثناء الاتصال بقاعدة البيانات.</p>`;
            if (error.code === 'PERMISSION_DENIED') {
                errorMessage += `<p class="fw-bold text-danger">السبب: مشكلة في قواعد الأمان (Permission Denied). يرجى مراجعة قواعد Firebase للسماح بالقراءة.</p>`;
            } else {
                errorMessage += `<p>تفاصيل الخطأ: ${error.message}</p>`;
            }
            loadingState.innerHTML = errorMessage;
        }
    }

    // 4. Main Report Generation Function
    function generateReport() {
        const period = timePeriodSelect.value;
        const { start, end } = getDateRange(period);
        if (!start) return; // Exit if date range is invalid (for custom period)

        const filteredPatients = Object.values(allPatients).filter(p => new Date(p.registrationDate) >= start && new Date(p.registrationDate) <= end);
        const filteredVisits = allVisits.filter(v => new Date(v.visitDate) >= start && new Date(v.visitDate) <= end);
        const filteredRevenues = allRevenues.filter(r => new Date(r.date) >= start && new Date(r.date) <= end);

        const checkups = filteredVisits.filter(v => v.visitType === 'كشف');
        const followups = filteredVisits.filter(v => v.visitType === 'متابعة');
        const totalRevenue = filteredRevenues.reduce((sum, r) => sum + r.amount, 0);

        const reportData = {
            revenues: { value: `${totalRevenue.toLocaleString()} ج.م`, data: filteredRevenues },
            checkups: { value: checkups.length, data: checkups },
            followups: { value: followups.length, data: followups },
            patients: { value: filteredPatients.length, data: filteredPatients }
        };

        renderCards(reportData);
    }
    
    // Function to render the main report cards
    function renderCards(data) {
        cardsContainer.innerHTML = `
            <div class="col-md-6 col-lg-3"><div class="report-card card-revenues" data-type="revenues"><i class="fas fa-coins card-icon"></i><h1 class="card-value">${data.revenues.value}</h1><p class="card-title">إجمالي الإيرادات</p></div></div>
            <div class="col-md-6 col-lg-3"><div class="report-card card-checkups" data-type="checkups"><i class="fas fa-stethoscope card-icon"></i><h1 class="card-value">${data.checkups.value}</h1><p class="card-title">عدد الكشوفات</p></div></div>
            <div class="col-md-6 col-lg-3"><div class="report-card card-followups" data-type="followups"><i class="fas fa-redo-alt card-icon"></i><h1 class="card-value">${data.followups.value}</h1><p class="card-title">عدد المتابعات</p></div></div>
            <div class="col-md-6 col-lg-3"><div class="report-card card-patients" data-type="patients"><i class="fas fa-user-plus card-icon"></i><h1 class="card-value">${data.patients.value}</h1><p class="card-title">المرضى الجدد</p></div></div>
        `;
        
        document.querySelectorAll('.report-card').forEach(card => {
            card.addEventListener('click', () => {
                const type = card.dataset.type;
                showDetailsModal(type, data[type].data, card.querySelector('.card-title').textContent);
            });
        });
    }

    // 5. Details Modal and Export Logic
    function showDetailsModal(type, data, title) {
        let headers, rows, exportData;
        const modalTable = document.getElementById('detailsTable');
        document.getElementById('modalTitle').textContent = `تفاصيل: ${title}`;

        // Define headers and format data for table and export
        switch (type) {
            case 'patients':
                headers = ['الاسم', 'الهاتف', 'العمر', 'تاريخ التسجيل'];
                exportData = data.map(p => ({ 'الاسم': p.fullName, 'الهاتف': p.phone, 'العمر': p.age, 'تاريخ التسجيل': new Date(p.registrationDate).toLocaleDateString('ar-EG') }));
                break;
            case 'revenues':
                headers = ['اسم المريض', 'التاريخ', 'الخدمة', 'المبلغ (ج.م)'];
                exportData = data.map(r => ({ 'اسم المريض': allPatients[r.patientId]?.fullName || 'محذوف', 'التاريخ': new Date(r.date).toLocaleDateString('ar-EG'), 'الخدمة': r.service, 'المبلغ': r.amount }));
                break;
            default: // checkups and followups
                headers = ['اسم المريض', 'التاريخ', 'الوزن (كجم)', 'BMI'];
                exportData = data.map(v => ({ 'اسم المريض': allPatients[v.patientId]?.fullName || 'محذوف', 'التاريخ': new Date(v.visitDate).toLocaleDateString('ar-EG'), 'الوزن': v.currentWeight, 'BMI': v.bmi }));
                break;
        }

        rows = exportData.map(row => `<tr>${headers.map(header => `<td>${row[header] || '-'}</td>`).join('')}</tr>`).join('');
        modalTable.innerHTML = `<thead><tr class="table-dark">${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows}</tbody>`;
        
        currentReportForExport = exportData;
        currentReportTitleForExport = title;
        detailsModal.show();
    }

    // Export functions (Excel and PDF)
    document.getElementById('export-excel-btn').addEventListener('click', () => { /* ... same as previous version ... */ });
    document.getElementById('export-pdf-btn').addEventListener('click', () => { /* ... same as previous version ... */ });

    // 6. Event Listeners & Initial Load
    generateReportBtn.addEventListener('click', generateReport);
    timePeriodSelect.addEventListener('change', () => {
        const isCustom = timePeriodSelect.value === 'custom';
        document.querySelectorAll('.custom-date-fields').forEach(el => el.classList.toggle('d-none', !isCustom));
    });

    function getDateRange(period) { /* ... same as previous version ... */ }

    // Start the application
    fetchAllData();

    // --- PASTE THE MISSING FUNCTIONS HERE ---
    // The export and getDateRange functions are identical to the previous answer.
    // I'm pasting them here for completeness.

    document.getElementById('export-excel-btn').addEventListener('click', () => {
        if (!currentReportForExport.length) { alert("لا توجد بيانات لتصديرها."); return; }
        const ws = XLSX.utils.json_to_sheet(currentReportForExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Report");
        XLSX.writeFile(wb, `${currentReportTitleForExport.replace(/ /g, '_')}_Report.xlsx`);
    });

    document.getElementById('export-pdf-btn').addEventListener('click', () => {
        if (!currentReportForExport.length) { alert("لا توجد بيانات لتصديرها."); return; }
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        doc.autoTable({
            head: [Object.keys(currentReportForExport[0])],
            body: currentReportForExport.map(row => Object.values(row)),
            styles: { font: 'Helvetica', halign: 'center' },
            headStyles: { fillColor: [41, 128, 185] }
        });
        doc.save(`${currentReportTitleForExport.replace(/ /g, '_')}_Report.pdf`);
    });

    function getDateRange(period) {
        const now = new Date();
        let start = new Date(now), end = new Date(now);
        start.setHours(0, 0, 0, 0); end.setHours(23, 59, 59, 999);

        switch (period) {
            case 'today': break;
            case 'this_month': start = new Date(now.getFullYear(), now.getMonth(), 1); break;
            case 'this_year': start = new Date(now.getFullYear(), 0, 1); break;
            case 'custom':
                const startDate = document.getElementById('startDate').value;
                const endDate = document.getElementById('endDate').value;
                if (!startDate || !endDate) return {};
                start = new Date(startDate); end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                break;
        }
        return { start, end };
    }
});