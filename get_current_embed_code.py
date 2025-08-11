#!/usr/bin/env python3
"""
Script to get the current streaming embed code from the backend
"""

import requests
import json

def get_current_embed_code():
    """Get the current streaming embed code from the backend"""
    
    # Test the widget endpoint to get the current script
    url = "http://localhost:8000/api/v1/web-widget/test/1"
    
    try:
        response = requests.get(url)
        response.raise_for_status()
        
        # Extract the script part from the HTML response
        html_content = response.text
        
        # Find the script section - look for the entire script block
        script_start = html_content.find('<!-- AI Agent Chat Widget -->')
        
        if script_start != -1:
            # Find the end of the script (look for the last </script> tag)
            script_end = html_content.rfind('</script>') + 8
            
            embed_code = html_content[script_start:script_end]
            
            print("🎯 CURRENT STREAMING EMBED CODE:")
            print("=" * 50)
            print(embed_code)
            print("=" * 50)
            
            # Check if it's using streaming
            if '/message/stream' in embed_code:
                print("✅ CONFIRMED: This embed code uses SSE streaming!")
            else:
                print("❌ WARNING: This embed code is NOT using streaming!")
                
            # Check for Enter key functionality
            if 'handleKeyDown' in embed_code and 'Enter' in embed_code:
                print("✅ CONFIRMED: Enter key functionality is included!")
            else:
                print("❌ WARNING: Enter key functionality is missing!")
                
            return embed_code
        else:
            print("❌ Could not extract embed code from response")
            return None
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Error getting embed code: {e}")
        return None

if __name__ == "__main__":
    get_current_embed_code() 