document.addEventListener('DOMContentLoaded', function () {
    // 1. Firebase Configuration & Initialization
    // هنا تم وضع إعدادات Firebase الخاصة بك
    const firebaseConfig = {
      apiKey: "AIzaSyB4YatKHj5oLfGjEKRrw9hDiCYGw779jNk",
      authDomain: "nutrition-clinic-8b6c1.firebaseapp.com",
      databaseURL: "https://nutrition-clinic-8b6c1-default-rtdb.firebaseio.com",
      projectId: "nutrition-clinic-8b6c1",
      storageBucket: "nutrition-clinic-8b6c1.appspot.com",
      messagingSenderId: "19162768170",
      appId: "1:19162768170:web:3ba6a7f0b010a9b54cf453"
    };

    // Initialize Firebase
    firebase.initializeApp(firebaseConfig);
    const db = firebase.database();

    // 2. DOM Elements
    const agendaDateInput = document.getElementById('agendaDate');
    const checkupsGrid = document.getElementById('checkupsGrid');
    const followupsGrid = document.getElementById('followupsGrid');
    const loadingSpinner = document.getElementById('loading-spinner');
    const patientDetailsModal = new bootstrap.Modal(document.getElementById('patientDetailsModal'));

    // Global variables to hold all data
    let allPatients = {};
    let allVisits = [];

    // 3. Data Fetching Function
    async function fetchAllData() {
        console.log("Fetching data from Firebase...");
        try {
            const patientsSnap = await db.ref('patients').once('value');
            allPatients = patientsSnap.val() || {};
            
            // Extract all visits from all patients into a single array
            allVisits = [];
            patientsSnap.forEach(pSnap => {
                if (pSnap.hasChild('visits')) {
                    const patientId = pSnap.key;
                    pSnap.child('visits').forEach(vSnap => {
                        const visit = vSnap.val();
                        // Add patient info to each visit for easy access
                        visit.patientId = patientId;
                        visit.patientName = allPatients[patientId]?.fullName || "مريض محذوف";
                        allVisits.push(visit);
                    });
                }
            });
            
            console.log(`Data fetched: ${Object.keys(allPatients).length} patients, ${allVisits.length} visits.`);
            
            // Hide spinner and show content
            loadingSpinner.classList.add('d-none');
            document.getElementById('checkups-col').classList.remove('d-none');
            document.getElementById('followups-col').classList.remove('d-none');
            
            // Display today's agenda initially
            displayAgendaForDate(agendaDateInput.value);

        } catch (error) {
            console.error("Error fetching data:", error);
            loadingSpinner.innerHTML = `<div class="text-danger"><h3>فشل تحميل البيانات</h3><p>تأكد من صحة إعدادات Firebase وقواعد الأمان.</p><p>${error.message}</p></div>`;
        }
    }

    // 4. Main Function to Display Agenda for a Specific Date
    function displayAgendaForDate(dateString) {
        if (!dateString) return;
        
        const visitsForDay = allVisits.filter(visit => visit.visitDate === dateString);
        const checkups = visitsForDay.filter(v => v.visitType === 'كشف');
        const followups = visitsForDay.filter(v => v.visitType === 'متابعة');

        document.getElementById('checkups-count').textContent = checkups.length;
        document.getElementById('followups-count').textContent = followups.length;
        
        populateGrid(checkupsGrid, checkups);
        populateGrid(followupsGrid, followups);
    }

    // 5. Helper to Populate Grids with Mini-Cards
    function populateGrid(gridElement, data) {
        gridElement.innerHTML = '';
        if (data.length === 0) {
            gridElement.innerHTML = `<div class="empty-list-placeholder col-12"><i class="fas fa-calendar-times fa-2x"></i><p class="mt-2">لا توجد مواعيد مسجلة لهذا اليوم.</p></div>`;
            return;
        }

        data.forEach(visit => {
            const patient = allPatients[visit.patientId];
            if (!patient) return;

            const card = document.createElement('div');
            card.className = 'patient-mini-card animate__animated animate__fadeIn';
            card.dataset.patientId = visit.patientId;
            
            card.innerHTML = `
                <div class="patient-header">
                    <span class="patient-name">${patient.fullName}</span>
                    <div class="patient-actions">
                        <a href="https://wa.me/${patient.phone}" target="_blank" title="تواصل واتساب" onclick="event.stopPropagation();"><i class="fab fa-whatsapp text-success"></i></a>
                    </div>
                </div>
                <div class="patient-stats">
                    <div class="stat-item"><div class="stat-value">${visit.currentWeight || '-'}</div><span>الوزن</span></div>
                    <div class="stat-item"><div class="stat-value">${visit.bmi || '-'}</div><span>BMI</span></div>
                    <div class="stat-item"><div class="stat-value">${visit.bf || '-'}%</div><span>BF</span></div>
                    <div class="stat-item"><div class="stat-value">${visit.amr || '-'}</div><span>AMR</span></div>
                </div>
            `;
            
            card.addEventListener('click', () => {
                showPatientDetailsModal(visit.patientId);
            });
            
            gridElement.appendChild(card);
        });
    }

    // 6. Function to Show Patient Details Modal
    function showPatientDetailsModal(patientId) {
        const patient = allPatients[patientId];
        if (!patient) return;

        document.getElementById('modalPatientName').textContent = patient.fullName;
        document.getElementById('modalPatientAge').textContent = patient.age || '-';
        document.getElementById('modalPatientHeight').textContent = patient.height || '-';
        document.getElementById('modalPatientPhone').textContent = patient.phone || '-';

        const patientVisits = allVisits.filter(v => v.patientId === patientId)
                                     .sort((a, b) => new Date(b.visitDate) - new Date(a.visitDate));

        const tableBody = document.getElementById('modalVisitsTableBody');
        tableBody.innerHTML = '';
        if (patientVisits.length > 0) {
            patientVisits.forEach(visit => {
                const row = `
                    <tr>
                        <td>${new Date(visit.visitDate).toLocaleDateString('ar-EG')}</td>
                        <td><span class="badge bg-${visit.visitType === 'كشف' ? 'warning text-dark' : 'info'}">${visit.visitType}</span></td>
                        <td>${visit.currentWeight || '-'}</td>
                        <td>${visit.bmi || '-'}</td>
                        <td>${visit.bf || '-'}</td>
                        <td>${visit.amr || '-'}</td>
                    </tr>
                `;
                tableBody.innerHTML += row;
            });
        } else {
            tableBody.innerHTML = '<tr><td colspan="6" class="text-center">لا يوجد سجل زيارات لهذا المريض.</td></tr>';
        }
        
        patientDetailsModal.show();
    }

    // 7. Initial Setup and Event Listeners
    function initialize() {
        const today = new Date().toISOString().split('T')[0];
        agendaDateInput.value = today;
        
        agendaDateInput.addEventListener('change', (e) => {
            displayAgendaForDate(e.target.value);
        });

        fetchAllData();
    }

    initialize();
});