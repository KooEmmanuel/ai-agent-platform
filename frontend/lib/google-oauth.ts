// Google OAuth configuration and utilities

declare global {
  interface Window {
    google: any;
  }
}

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || 'your-google-client-id-here';

export const initializeGoogleOAuth = () => {
  return new Promise<void>((resolve, reject) => {
    if (window.google) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleCredentialResponse,
      });
      resolve();
    };
    script.onerror = () => reject(new Error('Failed to load Google OAuth script'));
    document.head.appendChild(script);
  });
};

let onCredentialResponse: ((response: any) => void) | null = null;

const handleCredentialResponse = (response: any) => {
  if (onCredentialResponse) {
    onCredentialResponse(response);
  }
};

export const renderGoogleSignInButton = (
  elementId: string,
  callback: (response: any) => void
) => {
  onCredentialResponse = callback;
  
  if (window.google?.accounts?.id) {
    window.google.accounts.id.renderButton(
      document.getElementById(elementId),
      {
        theme: 'outline',
        size: 'large',
        type: 'standard',
        text: 'continue_with',
        shape: 'rectangular',
        logo_alignment: 'left',
      }
    );
  }
};

export const promptGoogleSignIn = (callback: (response: any) => void) => {
  onCredentialResponse = callback;
  
  if (window.google?.accounts?.id) {
    window.google.accounts.id.prompt();
  }
};

export const signOutGoogle = () => {
  if (window.google?.accounts?.id) {
    window.google.accounts.id.disableAutoSelect();
  }
}; 