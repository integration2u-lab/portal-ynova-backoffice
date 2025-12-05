import React, { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { AuthAPI } from '../services/api';

type LoginPageProps = {
  onLogin: (e: React.FormEvent, email: string, password: string) => void;
  isLoading: boolean;
  error: string | null;
};

export default function LoginPage({ onLogin, isLoading, error }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [tab, setTab] = useState<'login' | 'register' | 'confirm'>('login');

  const [regFirstName, setRegFirstName] = useState('');
  const [regLastName, setRegLastName] = useState('');
  const [regBirthdate, setRegBirthdate] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirm, setRegConfirm] = useState('');
  const [regError, setRegError] = useState('');

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regFirstName.trim()) {
      setRegError('Informe seu nome.');
      return;
    }
    if (!regLastName.trim()) {
      setRegError('Informe seu sobrenome.');
      return;
    }
    if (!regBirthdate) {
      setRegError('Informe sua data de nascimento.');
      return;
    }
    const phoneDigits = regPhone.replace(/\D/g, '');
    if (phoneDigits.length < 10) {
      setRegError('Informe um telefone válido.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(regEmail)) {
      setRegError('E-mail inválido');
      return;
    }
    if (regPassword.length < 8 || !/\d/.test(regPassword)) {
      setRegError('Senha deve ter ao menos 8 caracteres e números');
      return;
    }
    if (regPassword !== regConfirm) {
      setRegError('As senhas não são iguais');
      return;
    }
    setRegError('');
    setTab('confirm');
  };

  const handleForgotPassword = async () => {
    if (!email) {
      alert('Informe seu e-mail primeiro.');
      return;
    }
    try {
      await AuthAPI.forgotPassword(email);
      alert('Se o e-mail existir, enviaremos instruções para redefinição.');
    } catch (err) {
      alert('Não foi possível solicitar a redefinição agora.');
    }
  };

  const renderLogin = () => (
    <form onSubmit={(e) => onLogin(e, email, password)} className="space-y-4" noValidate>
      <div>
        <input
          type="text"
          inputMode="email"
          autoComplete="username"
          placeholder="seu@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-md bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-yn-orange dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600"
          required
        />
      </div>
      <div>
        <input
          type="password"
          placeholder="********"
          value={password}
          autoComplete="current-password"
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-md bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-yn-orange dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600"
          required
        />
      </div>
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-yn-orange hover:bg-yn-orange/90 text-white font-medium py-2 rounded-md flex items-center justify-center"
      >
        {isLoading ? <RefreshCw className="animate-spin" size={20} /> : 'Entrar'}
      </button>
    </form>
  );

  const renderRegister = () => (
    <form onSubmit={handleRegister} className="space-y-4" noValidate>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <input
          type="text"
          placeholder="Nome"
          value={regFirstName}
          onChange={(e) => setRegFirstName(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-md bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-yn-orange dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600"
          required
        />
        <input
          type="text"
          placeholder="Sobrenome"
          value={regLastName}
          onChange={(e) => setRegLastName(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-md bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-yn-orange dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600"
          required
        />
      </div>
      <div>
        <input
          type="date"
          placeholder="Data de nascimento"
          value={regBirthdate}
          onChange={(e) => setRegBirthdate(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-md bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-yn-orange dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600"
          required
        />
      </div>
      <div>
        <input
          type="tel"
          placeholder="Telefone"
          value={regPhone}
          onChange={(e) => setRegPhone(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-md bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-yn-orange dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600"
          required
        />
      </div>
      <div>
        <input
          type="email"
          placeholder="seu@email.com"
          value={regEmail}
          onChange={(e) => setRegEmail(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-md bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-yn-orange dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600"
          required
        />
      </div>
      <div>
        <input
          type="password"
          placeholder="Senha"
          value={regPassword}
          onChange={(e) => setRegPassword(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-md bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-yn-orange dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600"
          required
        />
      </div>
      <div>
        <input
          type="password"
          placeholder="Confirme sua senha"
          value={regConfirm}
          onChange={(e) => setRegConfirm(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-md bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-yn-orange dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600"
          required
        />
      </div>
      {regError && <p className="text-red-600 text-sm">{regError}</p>}
      <button
        type="submit"
        className="w-full bg-yn-orange hover:bg-yn-orange/90 text-white font-medium py-2 rounded-md"
      >
        Cadastrar
      </button>
      <button
        type="button"
        onClick={() => setTab('login')}
        className="w-full border border-gray-300 text-gray-700 hover:bg-gray-100 font-medium py-2 rounded-md"
      >
        Voltar
      </button>
    </form>
  );

  const renderConfirm = () => (
    <div className="text-center space-y-4">
      <p>Clique no link enviado para o seu e-mail para confirmar o cadastro.</p>
      <button
        type="button"
        onClick={() => setTab('login')}
        className="w-full border border-gray-300 text-gray-700 hover:bg-gray-100 font-medium py-2 rounded-md"
      >
        Voltar
      </button>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 to-blue-400 p-4">
      <div className="bg-white rounded-lg shadow-md p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold text-yn-orange text-center">YNOVA</h1>
        <p className="text-gray-500 text-center mb-6">Portal de Gestao</p>

        {tab !== 'confirm' && (
          <div className="flex mb-6">
            <button
              className={`flex-1 py-2 border-b-2 ${
                tab === 'login'
                  ? 'border-yn-orange text-yn-orange'
                  : 'border-transparent text-gray-500'
              }`}
              onClick={() => setTab('login')}
            >
              Login
            </button>
            <button
              className={`flex-1 py-2 border-b-2 ${
                tab === 'register'
                  ? 'border-yn-orange text-yn-orange'
                  : 'border-transparent text-gray-500'
              }`}
              onClick={() => setTab('register')}
            >
              Cadastro
            </button>
          </div>
        )}

        {tab === 'login' && renderLogin()}
        {tab === 'register' && renderRegister()}
        {tab === 'confirm' && renderConfirm()}

        {tab === 'login' && (
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={handleForgotPassword}
              className="text-sm text-yn-orange hover:text-yn-orange/80"
            >
              Esqueci minha senha
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
