import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { authMessage } from '@/lib/authErrors';
import { supabase } from '@/lib/supabase';

export function GoogleButton({ label, onError }: { label: string; onError: (message: string) => void }) {
  const [loading, setLoading] = useState(false);

  async function go() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/studio` },
    });
    if (error) {
      setLoading(false);
      onError(authMessage(error));
    }
  }

  return (
    <Button variant="outline" className="w-full" onClick={go} loading={loading}>
      <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
        <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.4-1.7 4.1-5.5 4.1a6.2 6.2 0 010-12.4c2 0 3.3.8 4.1 1.5l2.8-2.7A10 10 0 0012 2a10 10 0 100 20c5.8 0 9.6-4 9.6-9.8 0-.7-.1-1.2-.2-2z" />
      </svg>
      {label}
    </Button>
  );
}
