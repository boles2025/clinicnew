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
    const revenueContent = document.getElementById('revenue-content');
    const noPatientSelected = document.getElementById('no-patient-selected');
    const revenueForm = document.getElementById('revenueForm');
    const revenueTableBody = document.getElementById('revenueTableBody');

    let allPatients = {};
    let revenueListener = null;

    // 3. الدوال المساعدة
    function showToast(message, type = 'success') { /* نفس دالة الرسائل من الصفحات السابقة */
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast-notification ${type} animate__animated animate__fadeInUp`;
        toast.textContent = message;
        container.appendChild(toast);
        setTimeout(() => { toast.classList.add('animate__fadeOutDown'); setTimeout(() => toast.remove(), 500); }, 4000);
    }
    
    function clearRevenueForm() {
        revenueForm.reset();
        document.getElementById('revenueId').value = '';
        document.getElementById('serviceDate').valueAsDate = new Date();
        const saveBtn = document.getElementById('saveRevenueBtn');
        saveBtn.innerHTML = '<i class="fas fa-plus-circle"></i> إضافة الإيراد';
        saveBtn.classList.remove('btn-warning');
        saveBtn.classList.add('btn-success');
    }

    // 4. تحميل المرضى والبحث
    function fetchAllPatients() {
        db.ref('patients').once('value', snapshot => {
            allPatients = snapshot.val() || {};
        });
    }

    searchInput.addEventListener('input', e => {
        const query = e.target.value.toLowerCase();
        patientsList.innerHTML = '';
        if (query.length === 0) return;
        
        for (const id in allPatients) {
            const patient = allPatients[id];
            if (patient.fullName.toLowerCase().includes(query)) {
                const li = document.createElement('li');
                li.className = 'list-group-item list-group-item-action';
                li.innerHTML = `${patient.fullName} <small class="text-muted d-block">${patient.phone}</small>`;
                li.dataset.id = id;
                patientsList.appendChild(li);
            }
        }
    });
    
    // 5. اختيار المريض
    patientsList.addEventListener('click', e => {
        const li = e.target.closest('li');
        if (!li) return;
        const patientId = li.dataset.id;
        const patient = allPatients[patientId];
        
        document.getElementById('selectedPatientId').value = patientId;
        document.getElementById('displayName').textContent = patient.fullName;
        document.getElementById('displayPhone').textContent = patient.phone;
        
        revenueContent.classList.remove('d-none');
        noPatientSelected.classList.add('d-none');
        searchInput.value = '';
        patientsList.innerHTML = '';
        
        clearRevenueForm();
        loadRevenueHistory(patientId);
    });

    // 6. حفظ وتعديل الإيراد
    revenueForm.addEventListener('submit', e => {
        e.preventDefault();
        const patientId = document.getElementById('selectedPatientId').value;
        if (!patientId) { showToast('الرجاء اختيار مريض أولاً', 'error'); return; }

        const revenueId = document.getElementById('revenueId').value;
        const revenueData = {
            date: document.getElementById('serviceDate').value,
            service: document.getElementById('serviceType').value,
            amount: parseFloat(document.getElementById('serviceAmount').value),
            notes: document.getElementById('serviceNotes').value,
        };
        
        // حفظ الإيرادات في مسار خاص بها /revenues/patient_id/revenue_id
        const revenuesRef = db.ref(`revenues/${patientId}`);
        if (revenueId) {
            // تحديث
            revenuesRef.child(revenueId).update(revenueData)
                .then(() => { showToast('تم تحديث الإيراد بنجاح', 'info'); clearRevenueForm(); })
                .catch(err => showToast('خطأ في التحديث', 'error'));
        } else {
            // حفظ جديد
            revenuesRef.push(revenueData)
                .then(() => { showToast('تم تسجيل الإيراد بنجاح'); clearRevenueForm(); })
                .catch(err => showToast('خطأ في التسجيل', 'error'));
        }
    });
    
    // 7. عرض سجل الإيرادات لمريض محدد
    function loadRevenueHistory(patientId) {
        if (revenueListener) revenueListener.off(); // إيقاف المستمع القديم
        
        const revenuesRef = db.ref(`revenues/${patientId}`).orderByChild('date');
        revenueListener = revenuesRef.on('value', snapshot => {
            revenueTableBody.innerHTML = '';
            let patientTotal = 0;
            const revenues = [];
            snapshot.forEach(childSnapshot => {
                revenues.push({ id: childSnapshot.key, ...childSnapshot.val() });
            });

            revenues.reverse().forEach(rev => {
                patientTotal += rev.amount;
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${new Date(rev.date).toLocaleDateString('ar-EG')}</td>
                    <td>${rev.service}</td>
                    <td>${rev.amount.toLocaleString()} ج.م</td>
                    <td>${rev.notes || '-'}</td>
                    <td>
                        <i class="fas fa-edit action-btn btn-edit" data-id="${rev.id}" title="تعديل"></i>
                        <i class="fas fa-trash-alt action-btn btn-delete" data-id="${rev.id}" title="حذف"></i>
                    </td>`;
                revenueTableBody.appendChild(tr);
            });
            document.getElementById('patientTotalAmount').textContent = `${patientTotal.toLocaleString()} ج.م`;
        });
    }
    
    // 8. تعديل وحذف الإيراد من السجل
    revenueTableBody.addEventListener('click', e => {
        const revenueId = e.target.dataset.id;
        if (!revenueId) return;
        const patientId = document.getElementById('selectedPatientId').value;
        const revenueRef = db.ref(`revenues/${patientId}/${revenueId}`);

        if (e.target.classList.contains('btn-edit')) {
            revenueRef.once('value', snapshot => {
                const rev = snapshot.val();
                document.getElementById('revenueId').value = snapshot.key;
                document.getElementById('serviceDate').value = rev.date;
                document.getElementById('serviceType').value = rev.service;
                document.getElementById('serviceAmount').value = rev.amount;
                document.getElementById('serviceNotes').value = rev.notes;
                
                const saveBtn = document.getElementById('saveRevenueBtn');
                saveBtn.innerHTML = '<i class="fas fa-sync-alt"></i> تحديث الإيراد';
                saveBtn.classList.remove('btn-success');
                saveBtn.classList.add('btn-warning');
                window.scrollTo({ top: revenueForm.offsetTop, behavior: 'smooth' });
            });
        }
        
        if (e.target.classList.contains('btn-delete')) {
            if (confirm('هل أنت متأكد من حذف هذا الإيراد؟')) {
                revenueRef.remove()
                    .then(() => showToast('تم حذف الإيراد بنجاح'))
                    .catch(() => showToast('خطأ في الحذف', 'error'));
            }
        }
    });

    // 9. حساب الملخصات الإجمالية
    function updateGlobalSummaries() {
        db.ref('revenues').on('value', snapshot => {
            let total = 0, today = 0, month = 0;
            const now = new Date();
            const todayStr = now.toISOString().split('T')[0];
            const monthStr = todayStr.substring(0, 7);

            snapshot.forEach(patientRevenues => {
                patientRevenues.forEach(revSnapshot => {
                    const rev = revSnapshot.val();
                    total += rev.amount;
                    if(rev.date === todayStr) today += rev.amount;
                    if(rev.date.startsWith(monthStr)) month += rev.amount;
                });
            });

            document.getElementById('totalRevenue').textContent = `${total.toLocaleString()} ج.م`;
            document.getElementById('todayRevenue').textContent = `${today.toLocaleString()} ج.م`;
            document.getElementById('monthRevenue').textContent = `${month.toLocaleString()} ج.م`;
        });
    }

    // بدء تحميل البيانات عند فتح الصفحة
    fetchAllPatients();
    updateGlobalSummaries();
    document.getElementById('serviceDate').valueAsDate = new Date(); // تعيين تاريخ اليوم افتراضيا
});