/**
 * Rural Learning Tutorial — API ENGINE
 * Path: /api.js
 */

const BASE_URL = 'https://my-web-1vxa.onrender.com/api';
const ROOT_URL = 'https://my-web-1vxa.onrender.com';

// ── 1. SESSION MANAGEMENT ──
const saveToken = (token) => localStorage.setItem('rlt_token', token);
const getToken  = ()      => localStorage.getItem('rlt_token');
const saveUser  = (user)  => localStorage.setItem('currentUser', JSON.stringify(user));

function getUser() {
    try {
        const data = localStorage.getItem('currentUser');
        return data ? JSON.parse(data) : null;
    } catch (e) { return null; }
}

function clearSession() { 
    localStorage.clear(); 
    window.location.replace('login.html'); 
}

// ── 2. MASTER API CALL HELPER ──
const apiCall = async (endpoint, method = 'GET', body = null) => {
    const token = getToken();
    const isFormData = body instanceof FormData;

    const options = {
        method,
        headers: {
            // ONLY add JSON header if we are NOT sending a file
            ...(!isFormData && { 'Content-Type': 'application/json' }),
            ...(token && { 'Authorization': `Bearer ${token}` })
        }
    };
    
    if (body) {
        options.body = isFormData ? body : JSON.stringify(body);
    }

    try {
        const response = await fetch(`${BASE_URL}${endpoint}`, options);
        
        // Return the JSON result (even for 401/403/500 errors)
        const result = await response.json();
        return result; 
    } catch (error) {
        console.error(`Network Error on ${endpoint}:`, error);
        return { success: false, message: "Connection to server lost. Please check your internet." };
    }
};

// ── 3. API SERVICE OBJECTS ──

const AuthAPI = {
    // ✅ ADDED: Registration logic
    register: (data) => apiCall('/auth/register', 'POST', data),

    // Login logic
    login: async (credentials) => {
        const res = await apiCall('/auth/login', 'POST', credentials);
        if (res && res.success) {
            saveToken(res.token);
            saveUser(res.user);
        }
        return res;
    },
    
    // Profile logic
    getProfile: () => apiCall('/auth/profile'),
    
    // ✅ ADDED: Profile Update logic (for Profile.html)
    updateProfile: (data) => apiCall('/auth/profile', 'PUT', data)
};

const ContentAPI = {
    getVideos:      () => apiCall('/videos'),
    uploadVideo:    (formData) => apiCall('/videos/upload', 'POST', formData),
    deleteVideo:    (id) => apiCall(`/videos/${id}`, 'DELETE'),
    
    getMaterials:   () => apiCall('/materials'),
    uploadMaterial: (formData) => apiCall('/materials/upload', 'POST', formData),
    deleteMaterial: (id) => apiCall(`/materials/${id}`, 'DELETE'),
    
    getAssignments: () => apiCall('/assignments'),
    createAssignment: (data) => apiCall('/assignments', 'POST', data),
    deleteAssignment: (id) => apiCall(`/assignments/${id}`, 'DELETE'),
    
    // Student file upload
    submitWork: (id, formData) => apiCall(`/assignments/${id}/submit`, 'POST', formData)
};

const AcademicAPI = {
    getQuizzes: () => apiCall('/quizzes'),
    createQuiz: (data) => apiCall('/quizzes/create', 'POST', data),
    deleteQuiz: (id) => apiCall(`/quizzes/${id}`, 'DELETE'),
    
    // Student: Submit quiz score
    submitQuiz: (id, score, total) => apiCall(`/quizzes/${id}/submit`, 'POST', { score, total }),
    
    // Scoreboard for Performance page
    getScoreboard: () => apiCall('/analytics/scoreboard')
};

console.log("✅ RuralLearning API Engine Connected & All Services Loaded");