const express = require('express');
const router = express.Router();

// App-focused assistant knowledge base
const hrKnowledgeBase = [
  {
    keywords: ['leave', 'vacation', 'holiday', 'pto', 'off', 'sick', 'approve leave', 'reject leave'],
    response: "In this system, employees apply for leave from their Employee Dashboard. HR/Admin review requests in Leave Management, where they can approve or reject them. Employees receive status updates through the notification center."
  },
  {
    keywords: ['attendance', 'present', 'absent', 'clock', 'clock in', 'clock-in', 'daily status', 'attendance report'],
    response: "Attendance is tracked from employee clock-ins. HR/Admin can view Daily Attendance Status or Attendance Logs from Attendance Management, filter by branch, and export the report as a PDF."
  },
  {
    keywords: ['performance', 'appraisal', 'score', 'metrics', 'calls', 'bookings', 'site visit', 'svp', 'svd'],
    response: "Performance reports use employee metrics such as calls, talk time, site visits planned, site visits done, bookings, and leaves. Appraisal PDFs are generated for employee-role users only and include a calculated overall score from available metrics."
  },
  {
    keywords: ['report', 'pdf', 'excel', 'download', 'export', 'logo'],
    response: "Reports can be exported from the relevant pages. Employee appraisal, leave, attendance, and bi-monthly reports export as PDFs, and performance data can also be exported to Excel where available."
  },
  {
    keywords: ['hourly', 'update', 'final update', '6:30', 'submission', 'work update'],
    response: "Employees submit hourly work updates from the Employee Dashboard. HR/Admin can track project summaries and by-employee update status from the dashboard, including final update submissions."
  },
  {
    keywords: ['notification', 'alert', 'message', 'send notification', 'read notification'],
    response: "The notification center shows system and HR/Admin messages. HR/Admin can send notifications from the admin dashboard, and users can mark individual or all notifications as read."
  },
  {
    keywords: ['employee', 'user', 'add user', 'edit user', 'delete user', 'role', 'branch', 'department'],
    response: "Admin users can create, edit, and remove users from the Admin Dashboard. Employee records include role, department, reporting manager, branch, and performance metrics."
  },
  {
    keywords: ['profile', 'password', 'photo', 'image', 'account'],
    response: "Users can update profile details, profile photo, and password from the Profile page. Saved profile changes are reflected across the system."
  },
  {
    keywords: ['hello', 'hi', 'hey', 'help', 'assist'],
    response: "Hello! I can help with this HR system: leave requests, attendance, performance metrics, appraisal PDFs, reports, notifications, profiles, and hourly updates. What would you like to know?"
  }
];

const defaultResponse = "I can answer questions about this HR system only. Try asking about leave requests, attendance reports, appraisal PDFs, performance metrics, notifications, profiles, or hourly updates.";

router.post('/query', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'Message is required' });

    const lowerMessage = message.toLowerCase();
    let bestMatch = null;

    for (const item of hrKnowledgeBase) {
      if (item.keywords.some(kw => lowerMessage.includes(kw))) {
        bestMatch = item.response;
        break;
      }
    }

    /* 
    // OPTIONAL: UNCOMMENT THIS TO USE REAL GEMINI AI
    // To use this, get an API key from https://aistudio.google.com/
    
    try {
      const { GoogleGenerativeAI } = require("@google/generative-ai");
      const genAI = new GoogleGenerativeAI("YOUR_GEMINI_API_KEY");
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      
      const prompt = `You are a helpful HR Assistant for a company. 
      Knowledge Base: ${JSON.stringify(hrKnowledgeBase)}
      User Message: ${message}
      Answer the user query based on the knowledge base. If not found, use your general HR knowledge but state it's a general policy.`;

      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      
      return res.json({ 
        response: responseText,
        sender: 'AI Assistant',
        timestamp: new Date()
      });
    } catch (apiError) {
      console.error('Gemini API Error:', apiError);
    }
    */

    // Simulate AI thinking time for mock responses
    setTimeout(() => {
      res.json({ 
        response: bestMatch || defaultResponse,
        sender: 'AI Assistant',
        timestamp: new Date()
      });
    }, 800);

  } catch (error) {
    res.status(500).json({ error: 'Failed to process query' });
  }
});

module.exports = router;
