(async () => {
  try {
    console.log('Sending PUT request to /api/users/update-profile');
    const response = await fetch('http://localhost:5000/api/users/update-profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: 1, // Suppose Master Admin is ID 1
        name: 'Test Name',
        email: 'admin@mtpas.com',
        profile_pic: 'data:image/jpeg;base64,1234',
        department: 'Test Dept',
        reporting_to: 'Test Manager'
      })
    });
    
    const text = await response.text();
    console.log('Status:', response.status);
    console.log('Response:', text);
  } catch (err) {
    console.error('Error:', err);
  }
})();
