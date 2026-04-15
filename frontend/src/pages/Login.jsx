import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';

const SECURITY_QUESTIONS = [
  "What is your mother's maiden name?",
  "What city were you born in?",
  "What was the name of your first pet?",
  "What is your favorite book?",
  "What school did you attend for sixth grade?",
];

function PasswordStrength({ password }) {
  if (!password) return null;
  let score = 0;
  if (password.length >= 6) score++;
  if (password.length >= 10) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  const labels = ['Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'];
  const colors = ['#c0392b', '#e67e22', '#f1c40f', '#27ae60', '#00b894'];
  const idx = Math.max(0, score - 1);

  return (
    <div style={{ marginBottom: '12px' }}>
      <div style={{
        display: 'flex', gap: '3px', marginBottom: '4px',
      }}>
        {[0, 1, 2, 3, 4].map(i => (
          <div key={i} style={{
            flex: 1, height: '4px', borderRadius: '2px',
            background: i <= idx ? colors[idx] : '#e0d8d0',
            transition: 'background 0.3s',
          }} />
        ))}
      </div>
      <div style={{ fontSize: '10px', color: colors[idx], fontWeight: 600 }}>
        {labels[idx]}
      </div>
    </div>
  );
}

function Toast({ message, type, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className={`login-toast login-toast-${type}`} onClick={onClose}>
      <span style={{ marginRight: '8px' }}>
        {type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'}
      </span>
      {message}
    </div>
  );
}

export default function Login() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('signin');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  // Sign In state
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');

  // Sign Up state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regUser, setRegUser] = useState('');
  const [regPass, setRegPass] = useState('');
  const [regConfirm, setRegConfirm] = useState('');
  const [regQuestion, setRegQuestion] = useState(SECURITY_QUESTIONS[0]);
  const [regAnswer, setRegAnswer] = useState('');

  // Reset state
  const [resetUser, setResetUser] = useState('');
  const [resetQuestion, setResetQuestion] = useState('');
  const [resetAnswer, setResetAnswer] = useState('');
  const [resetNewPass, setResetNewPass] = useState('');
  const [resetStep, setResetStep] = useState(1); // 1=username, 2=answer+newpass

  // Redirect if already logged in
  useEffect(() => {
    if (localStorage.getItem('qs_token')) navigate('/home');
  }, [navigate]);

  const showToast = (message, type = 'error') => setToast({ message, type });

  const handleLogin = async () => {
    if (!loginUser.trim() || !loginPass) {
      showToast('Please enter both username and password');
      return;
    }
    setLoading(true);
    try {
      const res = await api.login(loginUser.trim(), loginPass);
      localStorage.setItem('qs_token', res.token);
      localStorage.setItem('qs_user', JSON.stringify(res.user));
      localStorage.setItem('qs_auth', '1');
      showToast(`Welcome back, ${res.user.full_name}!`, 'success');
      setTimeout(() => navigate('/home'), 600);
    } catch (err) {
      const msg = err.response?.data?.detail || 'Login failed. Please check your credentials.';
      showToast(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!regName.trim()) { showToast('Full name is required'); return; }
    if (!regEmail.trim() || !regEmail.includes('@')) { showToast('Valid email is required'); return; }
    if (regUser.trim().length < 3) { showToast('Username must be at least 3 characters'); return; }
    if (regPass.length < 6) { showToast('Password must be at least 6 characters'); return; }
    if (regPass !== regConfirm) { showToast('Passwords do not match'); return; }
    if (!regAnswer.trim()) { showToast('Security answer is required'); return; }

    setLoading(true);
    try {
      const res = await api.register({
        full_name: regName.trim(),
        email: regEmail.trim(),
        username: regUser.trim(),
        password: regPass,
        security_question: regQuestion,
        security_answer: regAnswer.trim(),
      });
      localStorage.setItem('qs_token', res.token);
      localStorage.setItem('qs_user', JSON.stringify(res.user));
      localStorage.setItem('qs_auth', '1');
      showToast(`Account created! Welcome, ${res.user.full_name}!`, 'success');
      setTimeout(() => navigate('/home'), 600);
    } catch (err) {
      const msg = err.response?.data?.detail || 'Registration failed. Please try again.';
      showToast(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleFetchQuestion = async () => {
    if (!resetUser.trim()) { showToast('Enter your username first'); return; }
    setLoading(true);
    try {
      const res = await api.getSecurityQuestion(resetUser.trim());
      setResetQuestion(res.security_question);
      setResetStep(2);
    } catch (err) {
      const msg = err.response?.data?.detail || 'User not found';
      showToast(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!resetAnswer.trim()) { showToast('Please answer the security question'); return; }
    if (resetNewPass.length < 6) { showToast('New password must be at least 6 characters'); return; }
    setLoading(true);
    try {
      await api.resetPassword(resetUser.trim(), resetAnswer.trim(), resetNewPass);
      showToast('Password reset successful! You can now sign in.', 'success');
      setTab('signin');
      setResetStep(1);
      setResetUser(''); setResetAnswer(''); setResetNewPass(''); setResetQuestion('');
    } catch (err) {
      const msg = err.response?.data?.detail || 'Reset failed. Check your answer.';
      showToast(msg);
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    padding: '11px 14px', border: '1px solid #e0d8d0',
    borderRadius: '8px', marginBottom: '12px', width: '100%',
    fontSize: '13px', fontFamily: 'inherit', outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  };

  const labelStyle = {
    fontSize: '11px', color: '#666', marginBottom: '5px',
    fontWeight: 600, display: 'block',
  };

  const tabBtnStyle = (active) => ({
    flex: 1, padding: '10px 0', border: 'none', cursor: 'pointer',
    fontSize: '13px', fontWeight: 600, borderRadius: '8px 8px 0 0',
    background: active ? '#fff' : 'transparent',
    color: active ? '#8b0000' : 'rgba(255,255,255,0.7)',
    transition: 'all 0.25s',
    borderBottom: active ? '2px solid #8b0000' : '2px solid transparent',
  });

  return (
    <div className="login-page">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="login-card">
        {/* Left panel — branding */}
        <div className="login-left">
          <div className="login-left-inner">
            <div className="login-badge-pqc">PQC-Ready</div>
            <div style={{ fontSize: '36px', fontWeight: 900, marginBottom: '8px', letterSpacing: '-0.5px' }}>
              QuantScan
            </div>
            <div style={{ fontSize: '14px', opacity: 0.8, textAlign: 'center', marginBottom: '6px' }}>
              PSB Hackathon Series 2026
            </div>
            <div style={{ fontSize: '13px', opacity: 0.7, textAlign: 'center' }}>
              In collaboration with IIT Kanpur
            </div>

            <div className="login-divider" />

            <div style={{
              fontSize: '20px', fontWeight: 700,
              color: '#e6a817', textAlign: 'center', lineHeight: 1.4,
            }}>
              PNB Cybersecurity<br />Hackathon 2026
            </div>
            <div style={{ fontSize: '13px', marginTop: '8px', opacity: 0.7 }}>
              Cyber Innovation Begins
            </div>

            <div className="login-feature-pills">
              <span className="login-pill">🔍 TLS Scanner</span>
              <span className="login-pill">📊 PQC Rating</span>
              <span className="login-pill">🛡️ CBOM Export</span>
            </div>
          </div>
        </div>

        {/* Right panel — auth forms */}
        <div className="login-right">
          {/* Tab bar */}
          <div style={{
            display: 'flex', background: 'rgba(139,0,0,0.08)',
            borderRadius: '8px 8px 0 0', marginBottom: '20px',
          }}>
            <button style={tabBtnStyle(tab === 'signin')} onClick={() => setTab('signin')}>
              Sign In
            </button>
            <button style={tabBtnStyle(tab === 'signup')} onClick={() => setTab('signup')}>
              Sign Up
            </button>
            <button style={tabBtnStyle(tab === 'reset')} onClick={() => { setTab('reset'); setResetStep(1); }}>
              Reset
            </button>
          </div>

          {/* ─── SIGN IN ─── */}
          {tab === 'signin' && (
            <div className="login-form-anim">
              <div style={{ fontSize: '20px', fontWeight: 700, color: '#8b0000', marginBottom: '4px' }}>
                Welcome Back
              </div>
              <div style={{ fontSize: '12px', color: '#888', marginBottom: '20px' }}>
                Sign in to your QuantScan account
              </div>

              <label style={labelStyle}>Username</label>
              <input
                type="text" value={loginUser}
                onChange={e => setLoginUser(e.target.value)}
                placeholder="Enter your username"
                style={inputStyle}
                onFocus={e => { e.target.style.borderColor = '#8b0000'; e.target.style.boxShadow = '0 0 0 3px rgba(139,0,0,0.08)'; }}
                onBlur={e => { e.target.style.borderColor = '#e0d8d0'; e.target.style.boxShadow = 'none'; }}
              />

              <label style={labelStyle}>Password</label>
              <input
                type="password" value={loginPass}
                onChange={e => setLoginPass(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                placeholder="Enter your password"
                style={inputStyle}
                onFocus={e => { e.target.style.borderColor = '#8b0000'; e.target.style.boxShadow = '0 0 0 3px rgba(139,0,0,0.08)'; }}
                onBlur={e => { e.target.style.borderColor = '#e0d8d0'; e.target.style.boxShadow = 'none'; }}
              />

              <div style={{ fontSize: '11px', color: '#aaa', marginBottom: '16px', textAlign: 'right' }}>
                <span
                  style={{ cursor: 'pointer', color: '#8b0000', fontWeight: 600 }}
                  onClick={() => { setTab('reset'); setResetStep(1); }}
                >
                  Forgot password?
                </span>
              </div>

              <button
                className="btn-primary login-submit-btn"
                onClick={handleLogin}
                disabled={loading}
                style={{ width: '100%', padding: '12px', fontSize: '14px' }}
              >
                {loading ? <span className="login-spinner" /> : 'Sign In →'}
              </button>

              <div style={{ fontSize: '11px', color: '#aaa', marginTop: '16px', textAlign: 'center' }}>
                Don't have an account?{' '}
                <span
                  style={{ color: '#8b0000', fontWeight: 600, cursor: 'pointer' }}
                  onClick={() => setTab('signup')}
                >
                  Sign Up
                </span>
              </div>

              <div className="login-default-creds">
                <span style={{ fontWeight: 600, color: '#8b0000' }}>Demo:</span> admin / QuantScan@2026
              </div>
            </div>
          )}

          {/* ─── SIGN UP ─── */}
          {tab === 'signup' && (
            <div className="login-form-anim login-signup-scroll">
              <div style={{ fontSize: '20px', fontWeight: 700, color: '#8b0000', marginBottom: '4px' }}>
                Create Account
              </div>
              <div style={{ fontSize: '12px', color: '#888', marginBottom: '18px' }}>
                Join QuantScan as a security analyst
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <label style={labelStyle}>Full Name</label>
                  <input type="text" value={regName} onChange={e => setRegName(e.target.value)}
                    placeholder="John Doe" style={inputStyle}
                    onFocus={e => { e.target.style.borderColor = '#8b0000'; e.target.style.boxShadow = '0 0 0 3px rgba(139,0,0,0.08)'; }}
                    onBlur={e => { e.target.style.borderColor = '#e0d8d0'; e.target.style.boxShadow = 'none'; }}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Username</label>
                  <input type="text" value={regUser} onChange={e => setRegUser(e.target.value)}
                    placeholder="johndoe" style={inputStyle}
                    onFocus={e => { e.target.style.borderColor = '#8b0000'; e.target.style.boxShadow = '0 0 0 3px rgba(139,0,0,0.08)'; }}
                    onBlur={e => { e.target.style.borderColor = '#e0d8d0'; e.target.style.boxShadow = 'none'; }}
                  />
                </div>
              </div>

              <label style={labelStyle}>Email</label>
              <input type="email" value={regEmail} onChange={e => setRegEmail(e.target.value)}
                placeholder="john@example.com" style={inputStyle}
                onFocus={e => { e.target.style.borderColor = '#8b0000'; e.target.style.boxShadow = '0 0 0 3px rgba(139,0,0,0.08)'; }}
                onBlur={e => { e.target.style.borderColor = '#e0d8d0'; e.target.style.boxShadow = 'none'; }}
              />

              <label style={labelStyle}>Password</label>
              <input type="password" value={regPass} onChange={e => setRegPass(e.target.value)}
                placeholder="Min 6 characters" style={inputStyle}
                onFocus={e => { e.target.style.borderColor = '#8b0000'; e.target.style.boxShadow = '0 0 0 3px rgba(139,0,0,0.08)'; }}
                onBlur={e => { e.target.style.borderColor = '#e0d8d0'; e.target.style.boxShadow = 'none'; }}
              />
              <PasswordStrength password={regPass} />

              <label style={labelStyle}>Confirm Password</label>
              <input type="password" value={regConfirm} onChange={e => setRegConfirm(e.target.value)}
                placeholder="Re-enter password" style={{
                  ...inputStyle,
                  borderColor: regConfirm && regConfirm !== regPass ? '#c0392b' : '#e0d8d0',
                }}
                onFocus={e => { e.target.style.borderColor = '#8b0000'; e.target.style.boxShadow = '0 0 0 3px rgba(139,0,0,0.08)'; }}
                onBlur={e => { e.target.style.borderColor = regConfirm && regConfirm !== regPass ? '#c0392b' : '#e0d8d0'; e.target.style.boxShadow = 'none'; }}
              />
              {regConfirm && regConfirm !== regPass && (
                <div style={{ fontSize: '10px', color: '#c0392b', marginTop: '-8px', marginBottom: '8px' }}>
                  Passwords do not match
                </div>
              )}

              <label style={labelStyle}>Security Question</label>
              <select value={regQuestion} onChange={e => setRegQuestion(e.target.value)}
                style={{ ...inputStyle, cursor: 'pointer', appearance: 'auto' }}>
                {SECURITY_QUESTIONS.map(q => <option key={q} value={q}>{q}</option>)}
              </select>

              <label style={labelStyle}>Security Answer</label>
              <input type="text" value={regAnswer} onChange={e => setRegAnswer(e.target.value)}
                placeholder="Your answer (used for password reset)"
                style={inputStyle}
                onFocus={e => { e.target.style.borderColor = '#8b0000'; e.target.style.boxShadow = '0 0 0 3px rgba(139,0,0,0.08)'; }}
                onBlur={e => { e.target.style.borderColor = '#e0d8d0'; e.target.style.boxShadow = 'none'; }}
              />

              <button
                className="btn-primary login-submit-btn"
                onClick={handleRegister}
                disabled={loading}
                style={{ width: '100%', padding: '12px', fontSize: '14px' }}
              >
                {loading ? <span className="login-spinner" /> : 'Create Account →'}
              </button>

              <div style={{ fontSize: '11px', color: '#aaa', marginTop: '14px', textAlign: 'center' }}>
                Already have an account?{' '}
                <span style={{ color: '#8b0000', fontWeight: 600, cursor: 'pointer' }}
                  onClick={() => setTab('signin')}>
                  Sign In
                </span>
              </div>
            </div>
          )}

          {/* ─── RESET PASSWORD ─── */}
          {tab === 'reset' && (
            <div className="login-form-anim">
              <div style={{ fontSize: '20px', fontWeight: 700, color: '#8b0000', marginBottom: '4px' }}>
                Reset Password
              </div>
              <div style={{ fontSize: '12px', color: '#888', marginBottom: '20px' }}>
                {resetStep === 1 ? 'Enter your username to get started' : 'Answer your security question'}
              </div>

              {resetStep === 1 && (
                <>
                  <label style={labelStyle}>Username</label>
                  <input type="text" value={resetUser}
                    onChange={e => setResetUser(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleFetchQuestion()}
                    placeholder="Enter your username" style={inputStyle}
                    onFocus={e => { e.target.style.borderColor = '#8b0000'; e.target.style.boxShadow = '0 0 0 3px rgba(139,0,0,0.08)'; }}
                    onBlur={e => { e.target.style.borderColor = '#e0d8d0'; e.target.style.boxShadow = 'none'; }}
                  />
                  <button
                    className="btn-primary login-submit-btn"
                    onClick={handleFetchQuestion}
                    disabled={loading}
                    style={{ width: '100%', padding: '12px', fontSize: '14px' }}
                  >
                    {loading ? <span className="login-spinner" /> : 'Continue →'}
                  </button>
                </>
              )}

              {resetStep === 2 && (
                <>
                  <div style={{
                    background: '#fff8e8', border: '1px solid #f0e0b8', borderRadius: '8px',
                    padding: '12px 14px', marginBottom: '16px', fontSize: '12px',
                  }}>
                    <div style={{ fontWeight: 600, color: '#8b6914', marginBottom: '4px' }}>
                      Security Question
                    </div>
                    <div style={{ color: '#666' }}>{resetQuestion}</div>
                  </div>

                  <label style={labelStyle}>Your Answer</label>
                  <input type="text" value={resetAnswer}
                    onChange={e => setResetAnswer(e.target.value)}
                    placeholder="Type your answer" style={inputStyle}
                    onFocus={e => { e.target.style.borderColor = '#8b0000'; e.target.style.boxShadow = '0 0 0 3px rgba(139,0,0,0.08)'; }}
                    onBlur={e => { e.target.style.borderColor = '#e0d8d0'; e.target.style.boxShadow = 'none'; }}
                  />

                  <label style={labelStyle}>New Password</label>
                  <input type="password" value={resetNewPass}
                    onChange={e => setResetNewPass(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleResetPassword()}
                    placeholder="Min 6 characters" style={inputStyle}
                    onFocus={e => { e.target.style.borderColor = '#8b0000'; e.target.style.boxShadow = '0 0 0 3px rgba(139,0,0,0.08)'; }}
                    onBlur={e => { e.target.style.borderColor = '#e0d8d0'; e.target.style.boxShadow = 'none'; }}
                  />
                  <PasswordStrength password={resetNewPass} />

                  <button
                    className="btn-primary login-submit-btn"
                    onClick={handleResetPassword}
                    disabled={loading}
                    style={{ width: '100%', padding: '12px', fontSize: '14px' }}
                  >
                    {loading ? <span className="login-spinner" /> : 'Reset Password →'}
                  </button>

                  <div style={{ fontSize: '11px', color: '#aaa', marginTop: '12px', textAlign: 'center' }}>
                    <span style={{ color: '#8b0000', fontWeight: 600, cursor: 'pointer' }}
                      onClick={() => setResetStep(1)}>
                      ← Back
                    </span>
                  </div>
                </>
              )}

              <div style={{ fontSize: '11px', color: '#aaa', marginTop: '16px', textAlign: 'center' }}>
                Remember your password?{' '}
                <span style={{ color: '#8b0000', fontWeight: 600, cursor: 'pointer' }}
                  onClick={() => setTab('signin')}>
                  Sign In
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}