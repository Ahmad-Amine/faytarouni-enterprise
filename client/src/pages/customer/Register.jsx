import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth';
import { ErrorBanner } from '../../components/Feedback';
import { COUNTRY_CODES, DEFAULT_COUNTRY_DIAL } from '../../data/countryCodes';

const schema = z.object({
  name: z.string().min(1, 'Name is required.'),
  email: z.string().email('Enter a valid email.'),
  countryDial: z.string().min(1, 'Select a country code.'),
  phone: z.string().min(1, 'Phone number is required.').regex(/^\d+$/, 'Enter digits only, no spaces or symbols.'),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
  birthday: z.string().optional(),
});

export default function Register() {
  const { t } = useTranslation();
  const { register: signup, registerPending, registerError } = useAuth();
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: zodResolver(schema), defaultValues: { countryDial: DEFAULT_COUNTRY_DIAL } });
  const onSubmit = async (values) => { const { countryDial, phone, ...rest } = values; await signup({ ...rest, phone: `${countryDial}${phone}` }); navigate('/'); };

  return (
    <div className="container auth-shell" style={{ padding: '70px 24px', maxWidth: 440 }}>
      <h1 style={{ color: 'var(--accent)', fontSize: 30 }}>{t('auth.registerTitle')}</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="card" style={{ marginTop: 24 }}>
        <ErrorBanner message={registerError?.message} />
        <div className="field"><label>{t('auth.name')}</label><input className="input" {...register('name')} />{errors.name && <p className="field-error">{errors.name.message}</p>}</div>
        <div className="field"><label>{t('auth.email')}</label><input className="input" type="email" {...register('email')} />{errors.email && <p className="field-error">{errors.email.message}</p>}</div>
        <div className="field"><label>{t('auth.phone')}</label><div className="phone-field-row"><select className="select phone-code" {...register('countryDial')}>{COUNTRY_CODES.map((c) => <option key={c.code} value={c.dial}>{c.name} ({c.dial})</option>)}</select><input className="input" type="tel" inputMode="numeric" placeholder="70 123 456" {...register('phone')} /></div>{(errors.countryDial || errors.phone) && <p className="field-error">{errors.countryDial?.message || errors.phone?.message}</p>}</div>
        <div className="field"><label>{t('auth.birthday')}</label><input className="input" type="date" {...register('birthday')} /></div>
        <div className="field"><label>{t('auth.password')}</label><input className="input" type="password" {...register('password')} />{errors.password && <p className="field-error">{errors.password.message}</p>}</div>
        <button type="submit" className="btn btn-primary btn-block" disabled={registerPending}>{registerPending ? t('auth.creating') : t('auth.submitRegister')}</button>
      </form>
      <p style={{ marginTop: 20, textAlign: 'center', fontSize: 14 }}>{t('auth.haveAccount')} <Link to="/login" style={{ color: 'var(--accent)', fontWeight: 600 }}>{t('auth.submitLogin')}</Link></p>
    </div>
  );
}
