/**
 * Rural Learning Tutorial — MASTER API ENGINE
 */

// ── 1. CONFIGURATION ──
const isLocal = true;
const BASE_URL = 'http://127.0.0.1:5000/api';
const ROOT_URL = 'http://127.0.0.1:5000';

// ── 2. SESSION MANAGEMENT ──
const saveToken = (token) => sessionStorage.setItem('rlt_token', token);
const getToken  = ()      => sessionStorage.getItem('rlt_token');
const saveUser  = (user)  => sessionStorage.setItem('currentUser', JSON.stringify(user));

function getUser() {
    try {
        const data = sessionStorage.getItem('currentUser');
        return data ? JSON.parse(data) : null;
    } catch (e) { return null; }
}

function clearSession() {
    sessionStorage.clear();
    window.location.replace('Login.html');
}

// ── 3. MASTER API CALL HELPER ──
const apiCall = async (endpoint, method = 'GET', body = null) => {
    const token = getToken();
    const isFormData = body instanceof FormData;

    const options = {
        method,
        headers: {
            ...(!isFormData && { 'Content-Type': 'application/json' }),
            ...(token && { 'Authorization': `Bearer ${token}` })
        }
    };

    if (body) options.body = isFormData ? body : JSON.stringify(body);

    try {
        const response = await fetch(`${BASE_URL}${endpoint}`, options);
        if ((response.status === 401 || response.status === 403) && endpoint !== '/auth/login' && endpoint !== '/auth/register') {
            console.warn("Session expired. Logging out...");
            clearSession();
            return { success: false, message: "Session expired" };
        }
        return await response.json();
    } catch (error) {
        console.error(`Network Error on ${endpoint}:`, error);
        return { success: false, message: "Server offline. Ensure node server.js is running." };
    }
};

// ── 4. XHR UPLOAD HELPER (progress tracking) ──
const xhrUpload = (endpoint, formData, onProgress) => {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", `${BASE_URL}${endpoint}`);

        const token = getToken();
        if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);

        xhr.upload.onprogress = (e) => {
            if (e.lengthComputable && onProgress) {
                onProgress(Math.round((e.loaded / e.total) * 100));
            }
        };

        xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                let responseData = { success: true };
                try {
                    if (xhr.responseText) responseData = JSON.parse(xhr.responseText);
                } catch (e) { console.warn("Non-JSON response"); }
                resolve(responseData);
            } else {
                let errMsg = "Upload failed";
                try {
                    const errObj = JSON.parse(xhr.responseText);
                    errMsg = errObj.message || errMsg;
                } catch (e) {}
                reject(new Error(errMsg));
            }
        };

        xhr.onerror = () => reject(new Error("Network Error - Is server.js running?"));
        xhr.send(formData);
    });
};

// ── 5. API SERVICE OBJECTS ──
const AuthAPI = {
    register: (data) => apiCall('/auth/register', 'POST', data),
    login: async (credentials) => {
        const res = await apiCall('/auth/login', 'POST', credentials);
        if (res && res.success) {
            saveToken(res.token);
            saveUser(res.user);
        }
        return res;
    },
    getProfile: () => apiCall('/auth/profile'),
    updateProfile: (data) => apiCall('/auth/profile', 'PUT', data)
};

const ContentAPI = {
    getVideos:        () => apiCall('/videos'),
    uploadVideo:      (formData, onProg) => xhrUpload('/videos/upload', formData, onProg),
    deleteVideo:      (id) => apiCall(`/videos/${id}`, 'DELETE'),

    getMaterials:     () => apiCall('/materials'),
    uploadMaterial:   (formData, onProg) => xhrUpload('/materials/upload', formData, onProg),
    deleteMaterial:   (id) => apiCall(`/materials/${id}`, 'DELETE'),

    getAssignments:   () => apiCall('/assignments'),
    createAssignment: (data) => apiCall('/assignments', 'POST', data),
    deleteAssignment: (id) => apiCall(`/assignments/${id}`, 'DELETE'),
    submitWork:       (id, formData) => apiCall(`/assignments/${id}/submit`, 'POST', formData)
};

const AcademicAPI = {
    getQuizzes:      () => apiCall('/quizzes'),
    createQuiz:      (data) => apiCall('/quizzes/create', 'POST', data),
    updateQuiz:      (id, data) => apiCall(`/quizzes/${id}`, 'PUT', data),
    deleteQuiz:      (id) => apiCall(`/quizzes/${id}`, 'DELETE'),
    getStudentStats: () => apiCall('/analytics/student-stats'),
    submitQuiz:      (id, score, total) => apiCall(`/quizzes/${id}/submit`, 'POST', { score, total }),
    getScoreboard:   () => apiCall('/analytics/scoreboard'),
    getMyProgress:   () => apiCall('/analytics/progress')
};

console.log(`✅ API Engine: Linked to ${isLocal ? 'Localhost' : 'Production'}`);