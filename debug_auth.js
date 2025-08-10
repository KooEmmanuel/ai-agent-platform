// Debug script to test authentication
// Run this in your browser console on the production site

async function debugAuth() {
    console.log('🔍 Starting authentication debug...');
    
    // Get the auth token from localStorage
    const token = localStorage.getItem('auth_token');
    console.log('🔑 Token from localStorage:', token ? token.substring(0, 20) + '...' : 'None');
    
    if (!token) {
        console.log('❌ No token found in localStorage');
        return;
    }
    
    // Test the auth debug endpoint
    try {
        console.log('🧪 Testing auth debug endpoint...');
        const response = await fetch('/api/auth/debug', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('📡 Response status:', response.status);
        console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));
        
        const data = await response.json();
        console.log('📄 Response data:', data);
        
        if (response.ok) {
            console.log('✅ Authentication is working!');
        } else {
            console.log('❌ Authentication failed:', data);
        }
    } catch (error) {
        console.error('❌ Error testing auth:', error);
    }
    
    // Test the agents endpoint
    try {
        console.log('🧪 Testing agents endpoint...');
        const response = await fetch('/api/agents', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('📡 Agents response status:', response.status);
        console.log('📡 Agents response headers:', Object.fromEntries(response.headers.entries()));
        
        const data = await response.json();
        console.log('📄 Agents response data:', data);
        
        if (response.ok) {
            console.log('✅ Agents endpoint is working!');
        } else {
            console.log('❌ Agents endpoint failed:', data);
        }
    } catch (error) {
        console.error('❌ Error testing agents:', error);
    }
}

// Run the debug function
debugAuth(); 