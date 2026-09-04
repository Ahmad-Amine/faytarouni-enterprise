import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth';
import { ErrorBanner } from '../../components/Feedback';

const schema = z.object({
  email: z.string().email('Enter a valid email.'),
  password: z.string().min(1, 'Password is required.'),
});

export default function Login() {
  const { t } = useTranslation();
  const { login, loginPending, loginError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: zodResolver(schema) });

  const onSubmit = async (values) => {
    await login(values);
    navigate(location.state?.from?.pathname || '/');
  };

  return (
    <div className="container auth-shell" style={{ padding: '70px 24px', maxWidth: 420 }}>
      <h1 style={{ color: 'var(--accent)', fontSize: 30 }}>{t('auth.loginTitle')}</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="card" style={{ marginTop: 24 }}>
        <ErrorBanner message={loginError?.message} />
        <div className="field"><label>{t('auth.email')}</label><input className="input" type="email" {...register('email')} />{errors.email && <p className="field-error">{errors.email.message}</p>}</div>
        <div className="field"><label>{t('auth.password')}</label><input className="input" type="password" {...register('password')} />{errors.password && <p className="field-error">{errors.password.message}</p>}</div>
        <p style={{ textAlign: 'end', marginBottom: 16 }}><Link to="/forgot-password" style={{ fontSize: 13, color: 'var(--teal)' }}>{t('auth.forgotPassword')}</Link></p>
        <button type="submit" className="btn btn-primary btn-block" disabled={loginPending}>{loginPending ? t('auth.signingIn') : t('auth.submitLogin')}</button>
      </form>
      <p style={{ marginTop: 20, textAlign: 'center', fontSize: 14 }}>{t('auth.noAccount')} <Link to="/register" style={{ color: 'var(--accent)', fontWeight: 600 }}>{t('auth.createAccount')}</Link></p>
    </div>
  );
}
