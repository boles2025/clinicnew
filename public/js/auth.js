import { auth, signInWithEmailAndPassword } from './firebase.js';

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        
        const email = username + '@nutritionclinic.com';

        signInWithEmailAndPassword(auth, email, password)
            .then((userCredential) => {
                // Signed in 
                const user = userCredential.user;
                loginForm.classList.add('animate__animated', 'animate__zoomOut');
                setTimeout(() => {
                    window.location.href = 'home.html';
                }, 1000);
            })
            .catch((error) => {
                const errorCode = error.code;
                const errorMessage = error.message;
                showError('اسم المستخدم أو كلمة المرور غير صحيحة');
            });
    });
});

function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'alert alert-danger animate__animated animate__shakeX';
    errorDiv.textContent = message;
    
    const loginForm = document.getElementById('loginForm');
    loginForm.prepend(errorDiv);
    
    // إضافة اهتزاز لحقول الإدخال
    document.getElementById('username').classList.add('shake');
    document.getElementById('password').classList.add('shake');
    
    setTimeout(() => {
        errorDiv.remove();
        document.getElementById('username').classList.remove('shake');
        document.getElementById('password').classList.remove('shake');
    }, 3000);
}