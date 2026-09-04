import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
export default function NotFound(){const{t}=useTranslation();return <div className="container" style={{padding:'100px 24px',textAlign:'center'}}><p style={{fontFamily:'var(--font-display)',fontSize:64,color:'var(--accent)'}}>404</p><p style={{color:'var(--brown-soft)',marginTop:10}}>{t('notFound.message')}</p><Link to="/" className="btn btn-primary" style={{marginTop:20}}>{t('notFound.home')}</Link></div>}
