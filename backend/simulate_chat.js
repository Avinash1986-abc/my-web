const axios = require('axios');

const BASE_URL = 'http://127.0.0.1:5000/api';

async function simulate() {
    try {
        console.log("=== SIMULATING HTTP API CHAT ===");

        // 1. Login as Student (Avinash Zirli)
        console.log("Logging in as student...");
        const studentLoginRes = await axios.post(`${BASE_URL}/auth/login`, {
            email: 'avinashzirli8@gmail.com',
            password: 'Aa@12345'
        });
        const studentToken = studentLoginRes.data.token;
        const studentId = studentLoginRes.data.user.id;
        console.log("Student logged in! Token:", studentToken ? "YES" : "NO", "ID:", studentId);

        // 2. Login as Teacher (Akash Zirli)
        console.log("Logging in as teacher...");
        const teacherLoginRes = await axios.post(`${BASE_URL}/auth/login`, {
            email: 'zirliavinash61@gmail.com',
            password: 'Aa@12345'
        });
        const teacherToken = teacherLoginRes.data.token;
        const teacherId = teacherLoginRes.data.user.id;
        console.log("Teacher logged in! Token:", teacherToken ? "YES" : "NO", "ID:", teacherId);

        // 3. Send message from Student to Teacher via API
        console.log(`Sending message from Student (ID: ${studentId}) to Teacher (ID: ${teacherId})...`);
        const sendRes = await axios.post(`${BASE_URL}/chat/send`, {
            text: "Hello Mentor, this is Avinash!",
            to: teacherId
        }, {
            headers: { 'Authorization': `Bearer ${studentToken}` }
        });
        console.log("Send message API response:", sendRes.data);

        // 4. Retrieve chat history for Student
        console.log("Retrieving chat history for Student...");
        const historyRes1 = await axios.get(`${BASE_URL}/chat/history?target=${teacherId}`, {
            headers: { 'Authorization': `Bearer ${studentToken}` }
        });
        console.log("Student history API response:", historyRes1.data);

        // 5. Retrieve chat history for Teacher
        console.log("Retrieving chat history for Teacher...");
        const historyRes2 = await axios.get(`${BASE_URL}/chat/history?target=${studentId}`, {
            headers: { 'Authorization': `Bearer ${teacherToken}` }
        });
        console.log("Teacher history API response:", historyRes2.data);

        process.exit(0);
    } catch (e) {
        console.error("❌ API Simulation Failed:", e.response ? e.response.data : e.message);
        process.exit(1);
    }
}

simulate();
