import AuthPanel from '@/components/auth/AuthPanel';
import BackButton from '@/components/BackButton';

export default function AdminLoginPage() {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-8">
      <div className="max-w-md mx-auto">
        <BackButton />
        <AuthPanel admin />
      </div>
    </div>
  );
}