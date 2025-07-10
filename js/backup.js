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
    const createBackupBtn = document.getElementById('createBackupBtn');
    const exportJsonBtn = document.getElementById('exportJsonBtn');
    const exportExcelBtn = document.getElementById('exportExcelBtn');
    const restoreFile = document.getElementById('restoreFile');
    const restoreBackupBtn = document.getElementById('restoreBackupBtn');
    const backupHistoryTable = document.getElementById('backupHistoryTable');
    const autoBackupSelect = document.getElementById('autoBackupSchedule');
    const saveScheduleBtn = document.getElementById('saveScheduleBtn');

    let autoBackupInterval;

    // 3. Helper Functions
    function showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast-notification ${type} animate__animated animate__fadeInUp`;
        toast.textContent = message;
        container.appendChild(toast);
        setTimeout(() => toast.remove(), 5000);
    }
    
    async function getFullData() {
        const patientsSnap = await db.ref('patients').once('value');
        const revenuesSnap = await db.ref('revenues').once('value');
        return {
            patients: patientsSnap.val() || {},
            revenues: revenuesSnap.val() || {},
        };
    }

    // 4. Backup Functions
    async function createFirebaseBackup() {
        showToast('جاري إنشاء نسخة احتياطية في Firebase...', 'info');
        try {
            const data = await getFullData();
            const timestamp = new Date().getTime();
            await db.ref(`backups/${timestamp}`).set(data);
            showToast('تم إنشاء النسخة الاحتياطية في Firebase بنجاح.', 'success');
            loadBackupHistory(); // Refresh the history table
        } catch (error) {
            console.error("Firebase Backup Error:", error);
            showToast('فشل إنشاء النسخة الاحتياطية في Firebase.', 'error');
        }
    }

    async function exportToJson() {
        try {
            const data = await getFullData();
            const jsonString = JSON.stringify(data, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `clinic_backup_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            showToast('تم تصدير ملف JSON بنجاح.', 'success');
        } catch (error) {
            console.error("JSON Export Error:", error);
            showToast('فشل تصدير ملف JSON.', 'error');
        }
    }

    async function exportToExcel() {
        try {
            const { patients, revenues } = await getFullData();
            
            const wb = XLSX.utils.book_new();

            // Patients Sheet
            const patientsData = Object.keys(patients).map(id => ({ id, ...patients[id] }));
            const wsPatients = XLSX.utils.json_to_sheet(patientsData);
            XLSX.utils.book_append_sheet(wb, wsPatients, 'المرضى');

            // Visits Sheet
            const visitsData = [];
            Object.keys(patients).forEach(pId => {
                if(patients[pId].visits) {
                    Object.keys(patients[pId].visits).forEach(vId => {
                        visitsData.push({ patientId: pId, visitId: vId, ...patients[pId].visits[vId] });
                    });
                }
            });
            const wsVisits = XLSX.utils.json_to_sheet(visitsData);
            XLSX.utils.book_append_sheet(wb, wsVisits, 'الزيارات');

            // Revenues Sheet
            const revenuesData = [];
            Object.keys(revenues).forEach(pId => {
                Object.keys(revenues[pId]).forEach(rId => {
                    revenuesData.push({ patientId: pId, revenueId: rId, ...revenues[pId][rId] });
                });
            });
            const wsRevenues = XLSX.utils.json_to_sheet(revenuesData);
            XLSX.utils.book_append_sheet(wb, wsRevenues, 'الإيرادات');
            
            XLSX.writeFile(wb, `clinic_data_${new Date().toISOString().split('T')[0]}.xlsx`);
            showToast('تم تصدير ملف Excel بنجاح.', 'success');
        } catch (error) {
            console.error("Excel Export Error:", error);
            showToast('فشل تصدير ملف Excel.', 'error');
        }
    }

    // 5. Restore Functions
    async function restoreFromFirebase(backupId) {
        if (!confirm('هل أنت متأكد من رغبتك في استعادة هذه النسخة؟ هذه العملية ستحل محل جميع البيانات الحالية ولا يمكن التراجع عنها.')) return;
        
        showToast('جاري استعادة النسخة من Firebase...', 'info');
        try {
            const snapshot = await db.ref(`backups/${backupId}`).once('value');
            const backupData = snapshot.val();
            if (!backupData) throw new Error("النسخة الاحتياطية فارغة.");

            await db.ref().update({
                patients: backupData.patients || {},
                revenues: backupData.revenues || {}
            });

            showToast('تمت استعادة البيانات بنجاح.', 'success');
        } catch(error) {
            console.error("Firebase Restore Error:", error);
            showToast(`فشل استعادة البيانات: ${error.message}`, 'error');
        }
    }

    async function restoreFromJsonFile(file) {
        if (!confirm('هل أنت متأكد من رغبتك في استعادة البيانات من هذا الملف؟ هذه العملية ستحل محل جميع البيانات الحالية.')) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const backupData = JSON.parse(event.target.result);
                if (!backupData.patients && !backupData.revenues) {
                    throw new Error('ملف JSON غير صالح أو لا يحتوي على بنية البيانات المطلوبة.');
                }
                await db.ref().update({
                    patients: backupData.patients || {},
                    revenues: backupData.revenues || {}
                });
                showToast('تمت استعادة البيانات من الملف بنجاح.', 'success');
            } catch (error) {
                console.error("JSON Restore Error:", error);
                showToast(`فشل استعادة البيانات من الملف: ${error.message}`, 'error');
            }
        };
        reader.readAsText(file);
    }
    
    // 6. Backup History
    async function loadBackupHistory() {
        backupHistoryTable.innerHTML = '<tr><td colspan="3" class="text-center p-4"><div class="spinner-border text-primary"></div></td></tr>';
        const snapshot = await db.ref('backups').orderByKey().limitToLast(10).once('value');
        const backups = snapshot.val() || {};
        
        backupHistoryTable.innerHTML = '';
        const sortedKeys = Object.keys(backups).sort((a,b) => b - a); // Newest first

        if (sortedKeys.length === 0) {
            backupHistoryTable.innerHTML = '<tr><td colspan="3" class="text-center p-4">لا توجد نسخ احتياطية محفوظة.</td></tr>';
            return;
        }

        sortedKeys.forEach((key, index) => {
            const date = new Date(parseInt(key));
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>نسخة احتياطية رقم ${sortedKeys.length - index}</td>
                <td>${date.toLocaleString('ar-EG', { dateStyle: 'full', timeStyle: 'medium' })}</td>
                <td>
                    <button class="btn btn-sm btn-info restore-from-history-btn" data-id="${key}"><i class="fas fa-history"></i> استعادة</button>
                    <button class="btn btn-sm btn-danger delete-backup-btn" data-id="${key}"><i class="fas fa-trash-alt"></i> حذف</button>
                </td>
            `;
            backupHistoryTable.appendChild(row);
        });
    }

    async function deleteFirebaseBackup(backupId) {
        if (!confirm('هل أنت متأكد من حذف هذه النسخة الاحتياطية نهائيًا؟')) return;
        try {
            await db.ref(`backups/${backupId}`).remove();
            showToast('تم حذف النسخة الاحتياطية بنجاح.', 'success');
            loadBackupHistory();
        } catch (error) {
            console.error("Delete Backup Error:", error);
            showToast('فشل حذف النسخة الاحتياطية.', 'error');
        }
    }

    // 7. Auto Backup
    function setupAutoBackup(schedule) {
        clearInterval(autoBackupInterval);
        if (schedule === 'off') {
            showToast('تم إيقاف النسخ الاحتياطي التلقائي.', 'info');
            return;
        }

        let interval;
        if (schedule === 'daily') interval = 24 * 60 * 60 * 1000;
        if (schedule === 'weekly') interval = 7 * 24 * 60 * 60 * 1000;
        if (schedule === 'monthly') interval = 30 * 24 * 60 * 60 * 1000;
        
        autoBackupInterval = setInterval(createFirebaseBackup, interval);
        showToast(`تم ضبط النسخ الاحتياطي التلقائي ${schedule === 'daily' ? 'يوميًا' : schedule === 'weekly' ? 'أسبوعيًا' : 'شهريًا'}.`, 'success');
    }

    // 8. Event Listeners
    createBackupBtn.addEventListener('click', createFirebaseBackup);
    exportJsonBtn.addEventListener('click', exportToJson);
    exportExcelBtn.addEventListener('click', exportToExcel);

    restoreFile.addEventListener('change', () => {
        restoreBackupBtn.disabled = !restoreFile.files.length;
    });
    restoreBackupBtn.addEventListener('click', () => {
        if (restoreFile.files.length > 0) {
            restoreFromJsonFile(restoreFile.files[0]);
        }
    });

    backupHistoryTable.addEventListener('click', (e) => {
        const backupId = e.target.dataset.id;
        if (!backupId) return;

        if (e.target.classList.contains('restore-from-history-btn')) {
            restoreFromFirebase(backupId);
        }
        if (e.target.classList.contains('delete-backup-btn')) {
            deleteFirebaseBackup(backupId);
        }
    });
    
    saveScheduleBtn.addEventListener('click', () => {
        const schedule = autoBackupSelect.value;
        localStorage.setItem('autoBackupSchedule', schedule);
        setupAutoBackup(schedule);
    });

    // Initial Load
    loadBackupHistory();
    const savedSchedule = localStorage.getItem('autoBackupSchedule') || 'off';
    autoBackupSelect.value = savedSchedule;
    setupAutoBackup(savedSchedule);
});