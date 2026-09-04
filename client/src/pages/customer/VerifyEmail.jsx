import { useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { authService } from '../../services/authService';
import { Spinner } from '../../components/Feedback';
export default function VerifyEmail(){const {t}=useTranslation();const[params]=useSearchParams();const token=params.get('token');const mutation=useMutation({mutationFn:()=>authService.verifyEmail(token)});useEffect(()=>{if(token)mutation.mutate();},[token]);return <div className="container auth-shell" style={{padding:'90px 24px',textAlign:'center',maxWidth:420}}>{mutation.isPending&&<Spinner/>}{mutation.isSuccess&&<><h1 style={{color:'var(--accent)'}}>{t('auth.emailVerified')}</h1><Link to="/" className="btn btn-primary" style={{marginTop:16}}>{t('auth.goHome')}</Link></>}{mutation.isError&&<p style={{color:'var(--danger)'}}>{mutation.error.message}</p>}</div>}
