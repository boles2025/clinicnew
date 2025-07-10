document.addEventListener('DOMContentLoaded', function () {
    // 1. Firebase Configuration & Initialization
    // هذا هو إعداد Firebase الذي زودتنا به
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
    try {
        firebase.initializeApp(firebaseConfig);
    } catch(e) {
        console.error("Firebase initialization error:", e);
        alert("فشل تهيئة Firebase. يرجى التحقق من إعداداتك.");
    }
    const db = firebase.database();

    // 2. DOM Elements Access
    const patientForm = document.getElementById('patientForm');
    const saveBtn = document.getElementById('saveBtn');
    const clearBtn = document.getElementById('clearBtn');
    const patientsTableBody = document.getElementById('patientsTableBody');

    // 3. Helper Functions
    function showToast(message, type = 'success') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast-notification ${type} animate__animated animate__fadeInUp`;
        toast.textContent = message;
        container.appendChild(toast);

        setTimeout(() => {
            toast.classList.remove('animate__fadeInUp');
            toast.classList.add('animate__fadeOutDown');
            setTimeout(() => toast.remove(), 500);
        }, 4000);
    }

    function clearForm() {
        patientForm.reset();
        document.getElementById('patientId').value = '';
        saveBtn.innerHTML = '<i class="fas fa-save"></i> حفظ البيانات';
        saveBtn.classList.remove('btn-warning');
        saveBtn.classList.add('btn-success');
    }

    // 4. Firebase Save/Update Logic (The Core of Your Request)
    patientForm.addEventListener('submit', (e) => {
        e.preventDefault();

        // Disable button to prevent multiple submissions
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> جاري الحفظ...';

        const patientId = document.getElementById('patientId').value;
        const patientData = {
            fullName: document.getElementById('fullName').value,
            phone: document.getElementById('phone').value,
            age: document.getElementById('age').value,
            gender: document.getElementById('gender').value,
            height: document.getElementById('height').value,
            weight: document.getElementById('weight').value,
            medicalHistory: document.getElementById('medicalHistory').value,
            notes: document.getElementById('notes').value,
        };

        if (patientId) {
            // Update mode
            db.ref('patients/' + patientId).update(patientData)
                .then(() => {
                    showToast('تم تحديث بيانات المريض بنجاح!', 'info');
                    clearForm();
                })
                .catch(error => {
                    console.error("Error updating data: ", error);
                    showToast(`فشل التحديث: ${error.message}`, 'error');
                })
                .finally(() => {
                    saveBtn.disabled = false; // Re-enable button
                });
        } else {
            // Create new patient mode
            patientData.registrationDate = new Date().toISOString(); // Add registration date

            const newPatientRef = db.ref('patients').push();
            newPatientRef.set(patientData)
                .then(() => {
                    showToast('تم حفظ البيانات بنجاح!');
                    clearForm();
                })
                .catch((error) => {
                    console.error("Error saving data: ", error);
                    showToast(`فشل الحفظ: ${error.message}`, 'error');
                })
                .finally(() => {
                    // Re-enable the button and restore its original text
                    saveBtn.disabled = false;
                    saveBtn.innerHTML = '<i class="fas fa-save"></i> حفظ البيانات';
                });
        }
    });
    
    // 5. Load, Edit, Delete Logic
    function loadPatients() {
        const patientsRef = db.ref('patients');
        patientsTableBody.innerHTML = '<tr><td colspan="6" class="text-center"><div class="spinner-border text-primary"></div></td></tr>';

        // Use 'on' to listen for real-time updates
        patientsRef.on('value', (snapshot) => {
            patientsTableBody.innerHTML = '';
            const data = snapshot.val();
            if (data) {
                Object.keys(data).forEach(patientId => {
                    const patient = data[patientId];
                    const regDate = patient.registrationDate ? new Date(patient.registrationDate).toLocaleDateString('ar-EG') : 'غير محدد';
                    const row = `
                        <tr id="row-${patientId}">
                            <td>${patient.fullName}</td><td>${patient.phone}</td><td>${patient.age}</td>
                            <td>${patient.gender}</td><td>${regDate}</td>
                            <td>
                                <i class="fas fa-edit action-btn btn-edit" data-id="${patientId}"></i>
                                <i class="fas fa-trash-alt action-btn btn-delete" data-id="${patientId}"></i>
                            </td>
                        </tr>`;
                    patientsTableBody.innerHTML += row;
                });
            } else {
                 patientsTableBody.innerHTML = '<tr><td colspan="6" class="text-center">لا يوجد مرضى مسجلون بعد.</td></tr>';
            }
        }, error => {
            console.error("Firebase read error:", error);
            patientsTableBody.innerHTML = `<tr><td colspan="6" class="text-center text-danger">فشل تحميل البيانات. تأكد من قواعد الأمان.</td></tr>`;
        });
    }

    patientsTableBody.addEventListener('click', (e) => {
        const patientId = e.target.dataset.id;
        if (!patientId) return;

        if (e.target.classList.contains('btn-edit')) {
            const patientRef = db.ref('patients/' + patientId);
            patientRef.once('value', (snapshot) => {
                const patient = snapshot.val();
                document.getElementById('patientId').value = patientId;
                document.getElementById('fullName').value = patient.fullName;
                // ... fill other form fields ...
                saveBtn.innerHTML = '<i class="fas fa-sync-alt"></i> تحديث البيانات';
                saveBtn.classList.add('btn-warning');
                bootstrap.Modal.getInstance(document.getElementById('patientsModal')).hide();
            });
        }

        if (e.target.classList.contains('btn-delete')) {
            if (confirm('هل أنت متأكد من حذف هذا المريض وكل بياناته؟')) {
                db.ref('patients/' + patientId).remove();
                db.ref('revenues/' + patientId).remove(); // Also delete their revenues
                showToast('تم حذف المريض بنجاح.');
            }
        }
    });

    // Event Listeners
    clearBtn.addEventListener('click', clearForm);
    document.getElementById('patientsModal').addEventListener('show.bs.modal', loadPatients);
});