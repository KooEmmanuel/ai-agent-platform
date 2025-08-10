"""
Web Widget Integration Service for AI Agents
Handles web widget chat integration and message routing
"""

import asyncio
import json
from typing import Dict, Any, Optional
from sqlalchemy import select
from app.core.config import settings
from app.services.agent_service import AgentService
from app.core.database import get_db, Integration, Agent
from sqlalchemy.ext.asyncio import AsyncSession

class WebWidgetIntegrationService:
    """
    Web Widget integration service
    Handles chat widget messages and routes them to agents
    """
    
    def __init__(self):
        pass
    
    async def process_widget_message(self, message_data: Dict[str, Any], db: AsyncSession):
        """Process incoming web widget message and route to appropriate agent"""
        try:
            # Extract message details
            widget_id = message_data.get('widget_id', '')
            session_id = message_data.get('session_id', '')
            user_id = message_data.get('user_id', 'anonymous')
            message = message_data.get('message', '')
            domain = message_data.get('domain', '')
            
            if not widget_id or not message:
                return
            
            # Find integration by widget ID or domain
            integration = await self._get_integration_by_widget(widget_id, domain, db)
            if not integration:
                print(f"No integration found for widget: {widget_id}")
                return
            
            # Get the associated agent
            result = await db.execute(
                select(Agent).where(Agent.id == integration.agent_id)
            )
            agent = result.scalar_one_or_none()
            
            if not agent:
                print(f"No agent found for integration: {integration.id}")
                return
            
            # Process message with agent
            agent_service = AgentService(db)
            response, tools_used, cost = await agent_service.execute_agent(
                agent=agent,
                user_message=f"Web chat from {user_id} on {domain}: {message}",
                session_id=session_id
            )
            
            # Consume credits for web widget AI usage
            from app.services.billing_service import BillingService, CreditRates
            billing_service = BillingService(db)
            
            # Calculate credit consumption
            credit_amount = CreditRates.INTEGRATION_MESSAGE  # 1 credit for integration message
            if tools_used:
                for tool in tools_used:
                    credit_amount += CreditRates.TOOL_EXECUTION  # 5 credits per tool
            
            # Consume credits for the integration owner
            credit_result = await billing_service.consume_credits(
                user_id=integration.user_id,  # Charge the integration owner
                amount=credit_amount,
                description=f"Web widget chat on {domain}",
                agent_id=agent.id,
                tool_used="web_widget"
            )
            
            # If credit consumption fails, return error response
            if not credit_result['success']:
                return {
                    "response": "Sorry, the service is temporarily unavailable due to insufficient credits. Please contact the website owner.",
                    "session_id": session_id,
                    "agent_name": agent.name,
                    "timestamp": message_data.get('timestamp'),
                    "error": "insufficient_credits"
                }
            
            # Return response for widget
            return {
                "response": response,
                "session_id": session_id,
                "agent_name": agent.name,
                "timestamp": message_data.get('timestamp')
            }
                
        except Exception as e:
            print(f"Error processing widget message: {e}")
            return None
    
    async def _get_integration_by_widget(self, widget_id: str, domain: str, db: AsyncSession):
        """Get web widget integration by widget ID or domain"""
        try:
            # Get all active web integrations and filter in Python
            result = await db.execute(
                select(Integration).where(
                    Integration.platform == "web",
                    Integration.is_active == True
                )
            )
            integrations = result.scalars().all()
            
            # First try to find by widget_id
            if widget_id:
                for integration in integrations:
                    if integration.config and integration.config.get('widget_id') == widget_id:
                        return integration
            
            # If not found by widget_id, try by domain
            if domain:
                for integration in integrations:
                    if integration.config and integration.config.get('domain') == domain:
                        return integration
            
            return None
        except Exception as e:
            print(f"Error getting widget integration: {e}")
            return None
    
    def generate_widget_script(self, widget_config: Dict[str, Any]) -> str:
        """Generate JavaScript widget script for embedding with playground-style UI"""
        widget_id = widget_config.get('widget_id', 'default')
        domain = widget_config.get('domain', '')
        api_url = widget_config.get('api_url', 'http://localhost:8000/api/v1/web-widget')
        
        # Customization options
        theme_color = widget_config.get('theme_color', '#3B82F6')
        position = widget_config.get('position', 'bottom-right')
        greeting_message = widget_config.get('greeting_message', 'Hi! How can I help you today?')
        widget_name = widget_config.get('widget_name', 'AI Assistant')
        avatar_url = widget_config.get('avatar_url', '')
        
        # Pre-calculate position values
        position_parts = position.split('-')
        position_vertical = position_parts[0] if len(position_parts) > 0 else 'bottom'
        position_horizontal = position_parts[1] if len(position_parts) > 1 else 'right'
        
        # Create the script using string formatting to avoid f-string escaping issues
        script_template = """
<!-- AI Agent Chat Widget -->
<div id="ai-chat-widget-{widget_id}"></div>
<script src="https://cdn.jsdelivr.net/npm/marked@9.1.6/marked.min.js"></script>
<script>
(function() {{
    // Widget configuration
    const config = {{
        widgetId: '{widget_id}',
        domain: '{domain}',
        apiUrl: '{api_url}',
        themeColor: '{theme_color}',
        position: '{position}',
        greetingMessage: '{greeting_message}',
        widgetName: '{widget_name}',
        avatarUrl: '{avatar_url}'
    }};
    
    // Markdown renderer setup
    if (typeof marked !== 'undefined') {{
        marked.setOptions({{
            breaks: true,
            gfm: true
        }});
    }}
    
    // Create widget container
    const widgetContainer = document.createElement('div');
    widgetContainer.id = 'ai-chat-widget-container';
    widgetContainer.style.cssText = `
        position: fixed;
        {position_vertical}: 20px;
        {position_horizontal}: 20px;
        z-index: 9999;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    `;
    
    // Widget button with improved design
    const widgetButton = document.createElement('div');
    widgetButton.style.cssText = `
        width: 64px;
        height: 64px;
        background: linear-gradient(135deg, {theme_color} 0%, {theme_color}dd 100%);
        border-radius: 50%;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 20px rgba(59, 130, 246, 0.3);
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        border: 3px solid rgba(255, 255, 255, 0.2);
    `;
    widgetButton.innerHTML = `
        <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
            <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
        </svg>
    `;
    
    // Hover effects for button
    widgetButton.addEventListener('mouseenter', () => {{
        widgetButton.style.transform = 'scale(1.1)';
        widgetButton.style.boxShadow = '0 6px 25px rgba(59, 130, 246, 0.4)';
    }});
    widgetButton.addEventListener('mouseleave', () => {{
        widgetButton.style.transform = 'scale(1)';
        widgetButton.style.boxShadow = '0 4px 20px rgba(59, 130, 246, 0.3)';
    }});
    
    // Modern chat window with playground styling
    const chatWindow = document.createElement('div');
    chatWindow.style.cssText = `
        width: 400px;
        height: 600px;
        background: white;
        border-radius: 16px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
        display: none;
        flex-direction: column;
        position: absolute;
        {position_vertical}: 80px;
        {position_horizontal}: 0px;
        border: 1px solid rgba(0, 0, 0, 0.08);
        overflow: hidden;
    `;
    
    // Modern chat header with gradient
    const chatHeader = document.createElement('div');
    chatHeader.style.cssText = `
        background: linear-gradient(135deg, {theme_color} 0%, {theme_color}dd 100%);
        color: white;
        padding: 20px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    `;
    chatHeader.innerHTML = `
        <div style="display: flex; align-items: center;">
            ${{config.avatarUrl ? `<img src="${{config.avatarUrl}}" alt="Avatar" style="width: 32px; height: 32px; border-radius: 50%; margin-right: 12px; object-fit: cover;">` : ''}}
            <div>
                <div style="font-weight: 600; font-size: 18px; margin-bottom: 4px;">${{config.widgetName}}</div>
                <div style="font-size: 12px; opacity: 0.8;">Online • Ready to help</div>
            </div>
        </div>
        <button id="close-chat" style="
            background: rgba(255, 255, 255, 0.1); 
            border: none; 
            color: white; 
            cursor: pointer; 
            width: 32px; 
            height: 32px; 
            border-radius: 50%; 
            display: flex; 
            align-items: center; 
            justify-content: center;
            transition: background-color 0.2s;
            font-size: 18px;
        " onmouseover="this.style.background='rgba(255,255,255,0.2)'" onmouseout="this.style.background='rgba(255,255,255,0.1)'">&times;</button>
    `;
    
    // Chat messages area with playground styling
    const chatMessages = document.createElement('div');
    chatMessages.style.cssText = `
        flex: 1;
        padding: 24px;
        overflow-y: auto;
        background: #fafbfc;
        display: flex;
        flex-direction: column;
        gap: 16px;
    `;
    
    // Add welcome message with better styling
    const welcomeMessage = document.createElement('div');
    welcomeMessage.style.cssText = `
        background: white;
        padding: 16px 20px;
        border-radius: 12px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
        border: 1px solid rgba(0, 0, 0, 0.04);
        margin-right: 40px;
        position: relative;
    `;
    welcomeMessage.innerHTML = `
        <div style="color: #374151; line-height: 1.6;">${{config.greetingMessage}}</div>
        <div style="display: flex; align-items: center; margin-top: 8px; color: #9CA3AF; font-size: 12px;">
            <div style="width: 6px; height: 6px; background: #10B981; border-radius: 50%; margin-right: 6px;"></div>
            ${{config.widgetName}}
        </div>
    `;
    chatMessages.appendChild(welcomeMessage);
    
    // Modern chat input with playground styling
    const chatInput = document.createElement('div');
    chatInput.style.cssText = `
        padding: 20px;
        border-top: 1px solid rgba(0, 0, 0, 0.06);
        background: white;
    `;
    chatInput.innerHTML = `
        <div style="display: flex; gap: 12px; align-items: flex-end;">
            <textarea id="chat-message-input" placeholder="Type your message..." 
                   style="
                       flex: 1; 
                       padding: 12px 16px; 
                       border: 1px solid #E5E7EB; 
                       border-radius: 12px; 
                       outline: none;
                       resize: none;
                       min-height: 20px;
                       max-height: 120px;
                       font-family: inherit;
                       font-size: 14px;
                       line-height: 1.4;
                       transition: border-color 0.2s;
                   " 
                   rows="1"
                   onkeydown="handleKeyDown(event)"
                   oninput="this.style.height='20px'; this.style.height=Math.min(this.scrollHeight, 120)+'px';"
                   onfocus="this.style.borderColor='{theme_color}'"
                   onblur="this.style.borderColor='#E5E7EB'"
            ></textarea>
            <button id="send-message" style="
                background: {theme_color}; 
                color: white; 
                border: none; 
                padding: 12px 20px; 
                border-radius: 12px; 
                cursor: pointer;
                font-weight: 500;
                transition: all 0.2s;
                min-width: 60px;
            " onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 4px 12px rgba(59,130,246,0.3)'" 
               onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none'">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                </svg>
            </button>
        </div>
    `;
    
    // Assemble widget
    chatWindow.appendChild(chatHeader);
    chatWindow.appendChild(chatMessages);
    chatWindow.appendChild(chatInput);
    
    widgetContainer.appendChild(widgetButton);
    widgetContainer.appendChild(chatWindow);
    document.body.appendChild(widgetContainer);
    
    // Widget functionality with smooth animations
    let isOpen = false;
    let sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    
    widgetButton.addEventListener('click', () => {{
        isOpen = !isOpen;
        if (isOpen) {{
            chatWindow.style.display = 'flex';
            chatWindow.style.opacity = '0';
            chatWindow.style.transform = 'scale(0.9)';
            setTimeout(() => {{
                chatWindow.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
                chatWindow.style.opacity = '1';
                chatWindow.style.transform = 'scale(1)';
            }}, 10);
        }} else {{
            chatWindow.style.transition = 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)';
            chatWindow.style.opacity = '0';
            chatWindow.style.transform = 'scale(0.9)';
            setTimeout(() => {{
                chatWindow.style.display = 'none';
            }}, 200);
        }}
        document.getElementById('chat-message-input').focus();
    }});
    
    document.getElementById('close-chat').addEventListener('click', () => {{
        isOpen = false;
        chatWindow.style.transition = 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)';
        chatWindow.style.opacity = '0';
        chatWindow.style.transform = 'scale(0.9)';
        setTimeout(() => {{
            chatWindow.style.display = 'none';
        }}, 200);
    }});
    
    // Enhanced message creation functions
    function createUserMessage(message) {{
        const messageContainer = document.createElement('div');
        messageContainer.style.cssText = `
            display: flex;
            justify-content: flex-end;
            margin-bottom: 16px;
        `;
        
        const userMessage = document.createElement('div');
        userMessage.style.cssText = `
            background: {theme_color};
            color: white;
            padding: 12px 16px;
            border-radius: 16px 16px 4px 16px;
            max-width: 280px;
            word-wrap: break-word;
            font-size: 14px;
            line-height: 1.4;
            box-shadow: 0 2px 8px rgba(59, 130, 246, 0.2);
        `;
        userMessage.textContent = message;
        messageContainer.appendChild(userMessage);
        return messageContainer;
    }}
    
    function createAIMessage(message) {{
        const messageContainer = document.createElement('div');
        messageContainer.style.cssText = `
            display: flex;
            justify-content: flex-start;
            margin-bottom: 16px;
        `;
        
        const aiMessage = document.createElement('div');
        aiMessage.style.cssText = `
            background: white;
            color: #374151;
            padding: 16px 20px;
            border-radius: 16px 16px 16px 4px;
            max-width: 280px;
            word-wrap: break-word;
            font-size: 14px;
            line-height: 1.6;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
            border: 1px solid rgba(0, 0, 0, 0.04);
            position: relative;
        `;
        
        // Render markdown if marked is available
        if (typeof marked !== 'undefined') {{
            aiMessage.innerHTML = marked.parse(message);
            // Style markdown elements
            const style = document.createElement('style');
            style.textContent = `
                #ai-chat-widget-container h1, #ai-chat-widget-container h2, #ai-chat-widget-container h3 {{
                    margin: 8px 0 4px 0;
                    font-weight: 600;
                }}
                #ai-chat-widget-container p {{
                    margin: 4px 0;
                }}
                #ai-chat-widget-container code {{
                    background: #f3f4f6;
                    padding: 2px 6px;
                    border-radius: 4px;
                    font-size: 12px;
                }}
                #ai-chat-widget-container pre {{
                    background: #f8f9fa;
                    padding: 12px;
                    border-radius: 8px;
                    overflow-x: auto;
                    margin: 8px 0;
                }}
                #ai-chat-widget-container ul, #ai-chat-widget-container ol {{
                    margin: 8px 0;
                    padding-left: 20px;
                }}
                #ai-chat-widget-container li {{
                    margin: 4px 0;
                }}
                #ai-chat-widget-container blockquote {{
                    border-left: 3px solid {theme_color};
                    margin: 8px 0;
                    padding-left: 12px;
                    color: #6b7280;
                }}
            `;
            document.head.appendChild(style);
        }} else {{
            aiMessage.textContent = message;
        }}
        
        // Add AI indicator
        const indicator = document.createElement('div');
        indicator.style.cssText = `
            display: flex;
            align-items: center;
            margin-top: 8px;
            color: #9CA3AF;
            font-size: 11px;
        `;
        indicator.innerHTML = `
            <div style="width: 6px; height: 6px; background: #10B981; border-radius: 50%; margin-right: 6px;"></div>
            ${{config.widgetName}}
        `;
        aiMessage.appendChild(indicator);
        
        messageContainer.appendChild(aiMessage);
        return messageContainer;
    }}
    
    function createTypingIndicator() {{
        const messageContainer = document.createElement('div');
        messageContainer.style.cssText = `
            display: flex;
            justify-content: flex-start;
            margin-bottom: 16px;
        `;
        messageContainer.id = 'typing-indicator';
        
        const typingMessage = document.createElement('div');
        typingMessage.style.cssText = `
            background: white;
            padding: 16px 20px;
            border-radius: 16px 16px 16px 4px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
            border: 1px solid rgba(0, 0, 0, 0.04);
            display: flex;
            align-items: center;
            gap: 8px;
        `;
        
        typingMessage.innerHTML = `
            <div style="display: flex; gap: 4px;">
                <div style="width: 6px; height: 6px; background: #9CA3AF; border-radius: 50%; animation: typing 1.4s infinite ease-in-out;"></div>
                <div style="width: 6px; height: 6px; background: #9CA3AF; border-radius: 50%; animation: typing 1.4s infinite ease-in-out 0.2s;"></div>
                <div style="width: 6px; height: 6px; background: #9CA3AF; border-radius: 50%; animation: typing 1.4s infinite ease-in-out 0.4s;"></div>
            </div>
            <span style="color: #6B7280; font-size: 13px;">AI is thinking...</span>
        `;
        
        messageContainer.appendChild(typingMessage);
        return messageContainer;
    }}
    
    // Add typing animation styles
    const animationStyle = document.createElement('style');
    animationStyle.textContent = `
        @keyframes typing {{
            0%, 60%, 100% {{
                transform: translateY(0);
                opacity: 0.4;
            }}
            30% {{
                transform: translateY(-10px);
                opacity: 1;
            }}
        }}
    `;
    document.head.appendChild(animationStyle);
    
    // Enhanced send message functionality
    async function sendMessage(message) {{
        if (!message.trim()) return;
        
        const input = document.getElementById('chat-message-input');
        input.value = '';
        input.style.height = '20px';
        
        // Add user message
        const userMsg = createUserMessage(message);
        chatMessages.appendChild(userMsg);
        
        // Add typing indicator
        const typingIndicator = createTypingIndicator();
        chatMessages.appendChild(typingIndicator);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
        try {{
            // Send to API
            const response = await fetch(config.apiUrl + '/message', {{
                method: 'POST',
                headers: {{
                    'Content-Type': 'application/json',
                }},
                body: JSON.stringify({{
                    widget_id: config.widgetId,
                    session_id: sessionId,
                    user_id: 'web_user',
                    message: message,
                    domain: window.location.hostname,
                    timestamp: new Date().toISOString()
                }})
            }});
            
            const data = await response.json();
            
            // Remove typing indicator
            const typingEl = document.getElementById('typing-indicator');
            if (typingEl) {{
                chatMessages.removeChild(typingEl);
            }}
            
            // Add AI response with markdown rendering
            const aiMsg = createAIMessage(data.response || 'Sorry, I could not process your request.');
            chatMessages.appendChild(aiMsg);
            
        }} catch (error) {{
            // Remove typing indicator
            const typingEl = document.getElementById('typing-indicator');
            if (typingEl) {{
                chatMessages.removeChild(typingEl);
            }}
            
            // Show error message
            const errorMsg = createAIMessage('Sorry, I encountered an error. Please try again.');
            chatMessages.appendChild(errorMsg);
        }}
        
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }}
    
    // Event listeners
    document.getElementById('send-message').addEventListener('click', () => {{
        const input = document.getElementById('chat-message-input');
        if (input.value.trim()) {{
            sendMessage(input.value);
        }}
    }});
    
    // Key handler function for textarea
    function handleKeyDown(event) {{
        if (event.key === 'Enter' && !event.shiftKey) {{
            event.preventDefault();
            document.getElementById('send-message').click();
        }}
    }}
}})();
</script>
"""
        
        # Format the script with the configuration values
        script = script_template.format(
            widget_id=widget_id,
            domain=domain,
            api_url=api_url,
            theme_color=theme_color,
            position=position,
            position_vertical=position_vertical,
            position_horizontal=position_horizontal,
            greeting_message=greeting_message,
            widget_name=widget_name,
            avatar_url=avatar_url
        )
        
        return script.strip()
    
    def validate_web_config(self, config: Dict[str, Any]) -> bool:
        """Validate web widget integration configuration"""
        required_fields = ['domain']
        
        for field in required_fields:
            if not config.get(field):
                return False
        
        # Validate domain format
        domain = config.get('domain', '')
        if not domain or '.' not in domain:
            return False
        
        return True