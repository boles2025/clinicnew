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

    // 2. DOM Elements & Constants
    const passwordModal = new bootstrap.Modal(document.getElementById('passwordModal'));
    const CORRECT_PASSWORD = "Meso@8520";
    let allPatients = {};
    let pendingDeleteAction = null; // To store the function to be executed after password confirmation

    // 3. Helper Functions
    function showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast-notification bg-${type} text-white p-3 rounded mb-2`;
        toast.textContent = message;
        container.appendChild(toast);
        setTimeout(() => toast.remove(), 5000);
    }
    
    // Function to request password before executing a delete action
    function requestPassword(deleteFunction) {
        pendingDeleteAction = deleteFunction;
        document.getElementById('passwordInput').value = '';
        document.getElementById('passwordError').classList.add('d-none');
        passwordModal.show();
    }
    
    // 4. Data Fetching and Search UI
    async function fetchAllPatients() {
        const snapshot = await db.ref('patients').once('value');
        allPatients = snapshot.val() || {};
    }

    function renderPatientList(query, listElement) {
        listElement.innerHTML = '';
        if (query.length < 2) return;
        
        for (const id in allPatients) {
            if (allPatients[id].fullName.toLowerCase().includes(query.toLowerCase())) {
                const li = document.createElement('li');
                li.className = 'list-group-item list-group-item-action';
                li.textContent = allPatients[id].fullName;
                li.dataset.id = id;
                li.addEventListener('click', () => {
                    const currentActive = listElement.querySelector('.active');
                    if (currentActive) currentActive.classList.remove('active');
                    li.classList.add('active');
                    // Enable the corresponding delete button
                    const parentCard = listElement.closest('.card');
                    parentCard.querySelector('button[id^="delete"]').disabled = false;
                });
                listElement.appendChild(li);
            }
        }
    }

    // 5. Delete Logic Functions
    function deletePatient() {
        const selectedPatient = document.querySelector('#patient-list .active');
        if (!selectedPatient) { showToast('الرجاء تحديد مريض أولاً.', 'danger'); return; }
        const patientId = selectedPatient.dataset.id;
        
        requestPassword(async () => {
            try {
                await db.ref(`patients/${patientId}`).remove();
                await db.ref(`revenues/${patientId}`).remove();
                showToast('تم حذف المريض وكل بياناته بنجاح.', 'success');
                // Refresh data and UI
                fetchAllPatients().then(() => renderPatientList('', document.getElementById('patient-list')));
            } catch (error) { showToast('فشل حذف المريض.', 'danger'); console.error(error); }
        });
    }

    function deleteVisits() {
        // This is a placeholder for more complex logic (date ranges)
        // For simplicity, this example will delete ALL visits for the selected patient
        const selectedPatient = document.querySelector('#visits-patient-list .active');
        if (!selectedPatient) { showToast('الرجاء تحديد مريض أولاً.', 'danger'); return; }
        const patientId = selectedPatient.dataset.id;
        
        requestPassword(async () => {
            try {
                await db.ref(`patients/${patientId}/visits`).remove();
                showToast('تم حذف كل زيارات المريض المحدد بنجاح.', 'success');
            } catch (error) { showToast('فشل حذف الزيارات.', 'danger'); console.error(error); }
        });
    }

    function deleteRevenues() {
        // This is a placeholder for more complex logic (date ranges)
        // For simplicity, this example will delete ALL revenues for the selected patient
        const selectedPatient = document.querySelector('#revenues-patient-list .active');
        if (!selectedPatient) { showToast('الرجاء تحديد مريض أولاً.', 'danger'); return; }
        const patientId = selectedPatient.dataset.id;

        requestPassword(async () => {
            try {
                await db.ref(`revenues/${patientId}`).remove();
                showToast('تم حذف كل إيرادات المريض المحدد بنجاح.', 'success');
            } catch (error) { showToast('فشل حذف الإيرادات.', 'danger'); console.error(error); }
        });
    }

    // Nuclear options
    function deleteAllVisits() {
        requestPassword(async () => {
            let updates = {};
            Object.keys(allPatients).forEach(id => { updates[`/patients/${id}/visits`] = null; });
            try {
                await db.ref().update(updates);
                showToast('تم حذف جميع الزيارات من كل المرضى.', 'success');
            } catch (error) { showToast('فشل حذف جميع الزيارات.', 'danger'); console.error(error); }
        });
    }
    
    function deleteAllRevenues() {
        requestPassword(async () => {
            try {
                await db.ref('revenues').remove();
                showToast('تم حذف جميع الإيرادات بنجاح.', 'success');
            } catch (error) { showToast('فشل حذف جميع الإيرادات.', 'danger'); console.error(error); }
        });
    }
    
    function deleteAllData() {
        requestPassword(async () => {
            try {
                await db.ref().remove();
                showToast('تم حذف جميع بيانات العيادة بنجاح!', 'success');
            } catch (error) { showToast('فشل حذف جميع البيانات.', 'danger'); console.error(error); }
        });
    }

    // 6. Event Listeners
    // Password confirmation
    document.getElementById('confirmDeleteBtn').addEventListener('click', () => {
        const passwordInput = document.getElementById('passwordInput');
        if (passwordInput.value === CORRECT_PASSWORD) {
            passwordModal.hide();
            if (typeof pendingDeleteAction === 'function') {
                pendingDeleteAction(); // Execute the stored delete action
            }
            pendingDeleteAction = null; // Clear the action
        } else {
            document.getElementById('passwordError').classList.remove('d-none');
        }
    });
    
    // Search inputs
    document.getElementById('patientSearch').addEventListener('input', e => renderPatientList(e.target.value, document.getElementById('patient-list')));
    document.getElementById('visitsPatientSearch').addEventListener('input', e => renderPatientList(e.target.value, document.getElementById('visits-patient-list')));
    document.getElementById('revenuesPatientSearch').addEventListener('input', e => renderPatientList(e.target.value, document.getElementById('revenues-patient-list')));

    // Delete buttons
    document.getElementById('deletePatientBtn').addEventListener('click', deletePatient);
    document.getElementById('deleteVisitsBtn').addEventListener('click', deleteVisits);
    document.getElementById('deleteRevenuesBtn').addEventListener('click', deleteRevenues);
    
    // Nuclear delete buttons
    document.getElementById('deleteAllVisitsBtn').addEventListener('click', deleteAllVisits);
    document.getElementById('deleteAllRevenuesBtn').addEventListener('click', deleteAllRevenues);
    document.getElementById('deleteAllDataBtn').addEventListener('click', deleteAllData);

    // Initial data load
    fetchAllPatients();
});