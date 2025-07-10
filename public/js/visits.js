document.addEventListener('DOMContentLoaded', function () {
    // 1. إعداد Firebase
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

    // 2. الوصول لعناصر الصفحة
    const searchInput = document.getElementById('searchInput');
    const patientsList = document.getElementById('patientsList');
    const visitContent = document.getElementById('visit-content');
    const noPatientSelected = document.getElementById('no-patient-selected');
    const visitForm = document.getElementById('visitForm');
    const visitsTableBody = document.getElementById('visitsTableBody');
    const deselectPatientBtn = document.getElementById('deselectPatientBtn');

    let allPatients = {}; // لتخزين المرضى وتجنب القراءة المتكررة
    let patientRefListener = null; // لتتبع المستمع الخاص بالزيارات

    // 3. الدوال المساعدة
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
    
    function calculateBMI(weight, height) {
        if (!weight || !height || height <= 0) return 'N/A';
        const heightInMeters = height / 100;
        return (weight / (heightInMeters * heightInMeters)).toFixed(2);
    }
    
    function clearVisitForm() {
        visitForm.reset();
        document.getElementById('visitId').value = '';
        document.getElementById('visitDate').valueAsDate = new Date();
        const saveBtn = document.getElementById('saveVisitBtn');
        saveBtn.innerHTML = '<i class="fas fa-save"></i> حفظ الزيارة';
        saveBtn.classList.remove('btn-warning');
        saveBtn.classList.add('btn-success');
    }

    // 4. تحميل المرضى والبحث
    function fetchAllPatients() {
        db.ref('patients').once('value', snapshot => {
            allPatients = snapshot.val() || {};
            renderPatientList(''); // عرض القائمة فارغة في البداية
        });
    }

    function renderPatientList(query) {
        patientsList.innerHTML = '';
        if (query.length === 0) return;
        
        for (const id in allPatients) {
            const patient = allPatients[id];
            if (patient.fullName.includes(query) || patient.phone.includes(query)) {
                const li = document.createElement('li');
                li.className = 'list-group-item list-group-item-action';
                li.innerHTML = `${patient.fullName} <small class="text-muted d-block">${patient.phone}</small>`;
                li.dataset.id = id;
                patientsList.appendChild(li);
            }
        }
    }

    searchInput.addEventListener('input', e => renderPatientList(e.target.value));
    
    // 5. اختيار المريض وعرض بياناته
    patientsList.addEventListener('click', e => {
        const li = e.target.closest('li');
        if (!li) return;

        const patientId = li.dataset.id;
        const patient = allPatients[patientId];
        
        document.getElementById('selectedPatientId').value = patientId;
        document.getElementById('displayName').textContent = patient.fullName;
        document.getElementById('displayAge').textContent = patient.age;
        document.getElementById('displayPhone').textContent = patient.phone;
        document.getElementById('displayHeight').textContent = patient.height;
        
        visitContent.classList.remove('d-none');
        noPatientSelected.classList.add('d-none');
        searchInput.value = '';
        patientsList.innerHTML = '';
        
        clearVisitForm();
        loadVisitHistory(patientId);
    });

    // 6. حفظ وتعديل الزيارة
    visitForm.addEventListener('submit', e => {
        e.preventDefault();
        const patientId = document.getElementById('selectedPatientId').value;
        if (!patientId) {
            showToast('الرجاء اختيار مريض أولاً', 'error');
            return;
        }

        const visitId = document.getElementById('visitId').value;
        const visitData = {
            visitDate: document.getElementById('visitDate').value,
            visitType: document.getElementById('visitType').value,
            currentWeight: document.getElementById('currentWeight').value,
            bmi: document.getElementById('bmi').value,
            bf: document.getElementById('bf').value,
            amr: document.getElementById('amr').value,
            nextAppointment: document.getElementById('nextAppointment').value,
            dietPlan: document.getElementById('dietPlan').value,
            notes: document.getElementById('notes').value,
        };

        const visitsRef = db.ref(`patients/${patientId}/visits`);
        if (visitId) {
            // تحديث
            visitsRef.child(visitId).update(visitData)
                .then(() => { showToast('تم تحديث الزيارة بنجاح', 'info'); clearVisitForm(); })
                .catch(err => showToast('خطأ في التحديث', 'error'));
        } else {
            // حفظ جديد
            visitsRef.push(visitData)
                .then(() => { showToast('تم حفظ الزيارة بنجاح'); clearVisitForm(); })
                .catch(err => showToast('خطأ في الحفظ', 'error'));
        }
    });
    
    // 7. عرض سجل الزيارات
    function loadVisitHistory(patientId) {
        if(patientRefListener) patientRefListener.off(); // إيقاف المستمع القديم
        
        const visitsRef = db.ref(`patients/${patientId}/visits`).orderByChild('visitDate');
        patientRefListener = visitsRef.on('value', snapshot => {
            visitsTableBody.innerHTML = '';
            const visits = [];
            snapshot.forEach(childSnapshot => {
                visits.push({ id: childSnapshot.key, ...childSnapshot.val() });
            });

            // ترتيب من الأحدث للأقدم
            visits.reverse().forEach(visit => {
                const tr = document.createElement('tr');
                tr.className = visit.visitType === 'كشف' ? 'visit-type-kashf' : 'visit-type-motabaa';
                tr.innerHTML = `
                    <td>${new Date(visit.visitDate).toLocaleDateString('ar-EG')}</td>
                    <td><span class="badge bg-${visit.visitType === 'كشف' ? 'warning' : 'info'}">${visit.visitType}</span></td>
                    <td>${visit.currentWeight} كجم</td>
                    <td>${visit.bmi}</td>
                    <td>${visit.bf || 'N/A'}%</td>
                    <td>${visit.nextAppointment ? new Date(visit.nextAppointment).toLocaleDateString('ar-EG') : '-'}</td>
                    <td>
                        <i class="fas fa-edit action-btn btn-edit" data-id="${visit.id}" title="تعديل"></i>
                        <i class="fas fa-trash-alt action-btn btn-delete" data-id="${visit.id}" title="حذف"></i>
                    </td>
                `;
                visitsTableBody.appendChild(tr);
            });
        });
    }
    
    // 8. تعديل وحذف الزيارة من السجل
    visitsTableBody.addEventListener('click', e => {
        const visitId = e.target.dataset.id;
        if (!visitId) return;
        
        const patientId = document.getElementById('selectedPatientId').value;
        const visitRef = db.ref(`patients/${patientId}/visits/${visitId}`);

        if (e.target.classList.contains('btn-edit')) {
            visitRef.once('value', snapshot => {
                const visit = snapshot.val();
                document.getElementById('visitId').value = snapshot.key;
                document.getElementById('visitDate').value = visit.visitDate;
                document.getElementById('visitType').value = visit.visitType;
                document.getElementById('currentWeight').value = visit.currentWeight;
                document.getElementById('bf').value = visit.bf;
                document.getElementById('amr').value = visit.amr;
                document.getElementById('nextAppointment').value = visit.nextAppointment;
                document.getElementById('dietPlan').value = visit.dietPlan;
                document.getElementById('notes').value = visit.notes;
                
                const saveBtn = document.getElementById('saveVisitBtn');
                saveBtn.innerHTML = '<i class="fas fa-sync-alt"></i> تحديث الزيارة';
                saveBtn.classList.remove('btn-success');
                saveBtn.classList.add('btn-warning');
                window.scrollTo({ top: visitForm.offsetTop, behavior: 'smooth' });
            });
        }
        
        if (e.target.classList.contains('btn-delete')) {
            if (confirm('هل أنت متأكد من حذف هذه الزيارة؟')) {
                visitRef.remove()
                    .then(() => showToast('تم حذف الزيارة بنجاح'))
                    .catch(() => showToast('خطأ في الحذف', 'error'));
            }
        }
    });

    // 9. وظائف إضافية
    // حساب BMI تلقائيًا
    document.getElementById('currentWeight').addEventListener('input', () => {
        const weight = document.getElementById('currentWeight').value;
        const height = allPatients[document.getElementById('selectedPatientId').value].height;
        document.getElementById('bmi').value = calculateBMI(weight, height);
    });
    
    // زر تغيير المريض
    deselectPatientBtn.addEventListener('click', () => {
        visitContent.classList.add('d-none');
        noPatientSelected.classList.remove('d-none');
        document.getElementById('selectedPatientId').value = '';
        if(patientRefListener) patientRefListener.off();
    });

    // بدء تحميل المرضى عند فتح الصفحة
    fetchAllPatients();
});