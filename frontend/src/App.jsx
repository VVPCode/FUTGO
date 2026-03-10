import React, { useState, useMemo } from 'react';
import { ShoppingCart, Search, X, Plus, Minus, Trash2, User, Settings, LogOut, AlertTriangle, Loader2, Mail, RefreshCw } from 'lucide-react';

const MOCK_PRODUCTS = [
  { id: "1", nome_camisa: "Camisa Seleção Brasileira Principal 24/25", preco: 349.90, categoria: "Seleções", imagem: "https://placehold.co/400x500/009b3a/fedf00?text=Brasil" },
  { id: "2", nome_camisa: "Camisa Real Madrid Home 23/24", preco: 399.90, categoria: "Europa", imagem: "https://placehold.co/400x500/ffffff/000000?text=Real+Madrid" },
  { id: "3", nome_camisa: "Camisa Flamengo Rubro-Negra 24", preco: 299.90, categoria: "Nacional", imagem: "https://placehold.co/400x500/c62828/000000?text=Flamengo" },
  { id: "4", nome_camisa: "Camisa Manchester City Away 23/24", preco: 359.90, categoria: "Europa", imagem: "https://placehold.co/400x500/1e22aa/ffffff?text=Man+City" }
];
const CATEGORIAS = ["Todas", "Nacional", "Europa", "Seleções"];

// URL Base da API Django
const API_BASE_URL = 'http://localhost:8000/api';

export default function App() {
  const [appUser, setAppUser] = useState(null); 
  const [produtos] = useState(MOCK_PRODUCTS);
  
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [filtroCategoria, setFiltroCategoria] = useState("Todas");
  const [busca, setBusca] = useState("");

  // ESTADOS DE AUTENTICAÇÃO
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authStep, setAuthStep] = useState('email'); // 'email' | 'register' | 'otp'
  const [authMode, setAuthMode] = useState('login'); 
  const [authEmail, setAuthEmail] = useState('');
  
  const [authNome, setAuthNome] = useState('');
  const [authCpf, setAuthCpf] = useState('');
  const [authTelefone, setAuthTelefone] = useState('');
  const [authOtp, setAuthOtp] = useState('');
  const [tempUserData, setTempUserData] = useState(null); 
  
  const [authErro, setAuthErro] = useState('');
  const [authMensagem, setAuthMensagem] = useState('');
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  // ESTADOS DO PERFIL (CRUD)
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [editNome, setEditNome] = useState('');
  const [editTelefone, setEditTelefone] = useState('');
  const [profileErro, setProfileErro] = useState('');
  const [profileSucesso, setProfileSucesso] = useState('');
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isFetchingData, setIsFetchingData] = useState(false);

  // ==========================================
  // LÓGICA DE AUTENTICAÇÃO (OTP POR E-MAIL)
  // ==========================================
  
  // 1. Verificar E-mail e Disparar OTP (se existir)
  const handleCheckEmail = async (e) => {
    e.preventDefault();
    if (!authEmail) return;
    setIsAuthLoading(true); setAuthErro(''); setAuthMensagem('');
    try {
      const res = await fetch(`${API_BASE_URL}/auth/check-email/`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: authEmail })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.erro || 'Erro no servidor Django. Verifique a porta 8000.');
      
      if (data.existe) {
        setAuthMode('login');
        await triggerSendOTP(); // Vai enviar ecrã para OTP
      } else {
        setAuthMode('register');
        setAuthStep('register'); // Vai para formulário de registo
      }
    } catch (error) { setAuthErro(error.message); setIsAuthLoading(false); }
  };

  // 2. Disparar OTP
  const triggerSendOTP = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/send-otp/`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ email: authEmail, method: 'email' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.erro || 'Erro ao enviar e-mail.');
      
      setAuthMensagem(`Código de segurança enviado para ${authEmail}.`);
      setAuthStep('otp');
    } catch (error) { 
      setAuthErro(error.message); 
      throw error; 
    } finally { setIsAuthLoading(false); }
  };

  // Submissão do Formulário de Registo (encaminha para OTP)
  const handleRegisterFormSubmit = async (e) => {
    e.preventDefault();
    if (!authNome || !authCpf || !authTelefone) return setAuthErro('Preencha os campos obrigatórios.');
    setIsAuthLoading(true); setAuthErro(''); setAuthMensagem('');
    setTempUserData({ nome: authNome, cpf: authCpf, telefone: authTelefone });
    
    try {
      await triggerSendOTP();
    } catch (e) {
      // Erro é tratado dentro da função
    }
  };

  // 3. Validar OTP e Entrar
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setIsAuthLoading(true); setAuthErro('');
    try {
      let endpoint = authMode === 'login' ? '/auth/login/' : '/auth/register/';
      let payload = authMode === 'login' 
        ? { email: authEmail, otp: authOtp } 
        : { nome: tempUserData.nome, email: authEmail, cpf: tempUserData.cpf, telefone: tempUserData.telefone, otp: authOtp };
      
      const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.erro || 'Código inválido ou expirado.');
      
      setAppUser(data.usuario); 
      closeAuthModal();
    } catch (error) { setAuthErro(error.message); } finally { setIsAuthLoading(false); }
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false); setAuthStep('email'); setAuthMode('login'); setAuthEmail(''); 
    setAuthNome(''); setAuthCpf(''); setAuthTelefone(''); setAuthOtp(''); setAuthErro(''); setAuthMensagem('');
  };

  // ==========================================
  // GESTÃO DO PERFIL DO UTILIZADOR (CRUD)
  // ==========================================
  
  // Abertura do Perfil com GET Automático
  const openProfileModal = async () => {
    setIsProfileModalOpen(true);
    setProfileErro(''); setProfileSucesso(''); setIsConfirmingDelete(false);
    
    // Dados em memória para display imediato
    setEditNome(appUser.nome); 
    setEditTelefone(appUser.telefone);

    // GET da Base de Dados
    setIsFetchingData(true);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/user/${appUser.id_usuario}/`, { method: 'GET' });
      const data = await res.json();
      if (res.ok) {
        setAppUser(data.usuario); 
        setEditNome(data.usuario.nome); 
        setEditTelefone(data.usuario.telefone);
      }
    } catch (error) {
      console.warn("Uso de dados locais devido a erro de sincronização.", error);
    } finally {
      setIsFetchingData(false);
    }
  };

  // Atualizar Perfil (PUT)
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setIsProfileLoading(true); setProfileErro(''); setProfileSucesso('');
    try {
      const res = await fetch(`${API_BASE_URL}/auth/user/${appUser.id_usuario}/`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nome: editNome, telefone: editTelefone })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.erro || 'Erro ao atualizar o perfil.');
      
      setAppUser(data.usuario); 
      setProfileSucesso('Dados atualizados com sucesso!');
    } catch (error) { setProfileErro(error.message); } finally { setIsProfileLoading(false); }
  };

  // Apagar Conta (DELETE)
  const handleDeleteAccount = async () => {
    setIsProfileLoading(true); setProfileErro('');
    try {
      const res = await fetch(`${API_BASE_URL}/auth/user/${appUser.id_usuario}/`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.erro || 'Erro ao apagar conta.');
      
      setAppUser(null); setIsProfileModalOpen(false); 
      alert("A sua conta foi apagada permanentemente.");
    } catch (error) { setProfileErro(error.message); setIsProfileLoading(false); }
  };

  // ==========================================
  // GESTÃO DO CARRINHO (UI)
  // ==========================================
  const addToCart = (produto, tamanho) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.id === produto.id && item.tamanho === tamanho);
      if (existingItem) return prevCart.map(item => (item.id === produto.id && item.tamanho === tamanho) ? { ...item, quantidade: item.quantidade + 1 } : item);
      return [...prevCart, { ...produto, tamanho, quantidade: 1 }];
    });
    setIsCartOpen(true);
  };
  const updateQuantity = (id, tamanho, delta) => setCart(prevCart => prevCart.map(item => item.id === id && item.tamanho === tamanho ? { ...item, quantidade: Math.max(1, item.quantidade + delta) } : item));
  const removeFromCart = (id, tamanho) => setCart(prevCart => prevCart.filter(item => !(item.id === id && item.tamanho === tamanho)));
  const cartTotal = useMemo(() => cart.reduce((total, item) => total + (item.preco * item.quantidade), 0), [cart]);
  const cartItemsCount = cart.reduce((count, item) => count + item.quantidade, 0);

  const produtosFiltrados = useMemo(() => {
    return produtos.filter(p => (filtroCategoria === "Todas" || p.categoria === filtroCategoria) && p.nome_camisa?.toLowerCase().includes(busca.toLowerCase()));
  }, [filtroCategoria, busca, produtos]);

  return (
    <div className="min-h-screen w-full bg-gray-50 font-sans text-gray-800 flex flex-col">
      {/* NAVEGAÇÃO */}
      <nav className="bg-slate-900 text-white sticky top-0 z-40 shadow-md w-full">
        <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2 cursor-pointer">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center font-bold text-slate-900">F!</div>
              <span className="font-bold text-xl tracking-tight hidden sm:block">FUTGO!</span>
            </div>
            
            <div className="hidden md:block flex-1 max-w-2xl mx-8">
              <div className="relative">
                <Search className="absolute inset-y-0 left-3 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
                <input type="text" placeholder="Procurar camisolas..." value={busca} onChange={(e) => setBusca(e.target.value)} className="block w-full pl-10 pr-3 py-2 rounded-md bg-slate-800 text-gray-300 focus:bg-white focus:text-gray-900 transition-colors" />
              </div>
            </div>

            <div className="flex items-center gap-4 sm:gap-6">
              {appUser ? (
                <div onClick={openProfileModal} className="flex items-center gap-2 cursor-pointer hover:bg-slate-800 p-2 rounded-lg transition-colors">
                  <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-sm font-bold border border-green-500">
                    {appUser.nome.charAt(0).toUpperCase()}
                  </div>
                  <div className="hidden sm:flex flex-col">
                    <span className="text-sm font-bold text-white leading-tight">{appUser.nome.split(' ')[0]}</span>
                    <span className="text-xs text-green-400">Ver Perfil</span>
                  </div>
                </div>
              ) : (
                <button onClick={() => setIsAuthModalOpen(true)} className="flex items-center gap-1.5 text-sm font-medium text-gray-300 hover:text-white transition-colors">
                  <User className="w-5 h-5" /> <span className="hidden sm:block">Entrar</span>
                </button>
              )}

              <button onClick={() => setIsCartOpen(true)} className="relative p-2 text-gray-300 hover:text-white transition-colors">
                <ShoppingCart className="h-6 w-6" />
                {cartItemsCount > 0 && <span className="absolute top-0 right-0 px-2 py-1 text-xs font-bold text-white transform translate-x-1/4 -translate-y-1/4 bg-green-500 rounded-full">{cartItemsCount}</span>}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* ÁREA PRINCIPAL E CATÁLOGO */}
      <main className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1">
        <div className="flex flex-col md:flex-row justify-between items-baseline mb-8 gap-4">
          <h1 className="text-3xl font-extrabold text-slate-900">Catálogo de Produtos</h1>
          <div className="flex gap-2 overflow-x-auto pb-2 w-full md:w-auto scrollbar-hide">
            {CATEGORIAS.map(cat => (
              <button key={cat} onClick={() => setFiltroCategoria(cat)} className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${filtroCategoria === cat ? 'bg-slate-900 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'}`}>
                {cat}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
          {produtosFiltrados.length > 0 ? produtosFiltrados.map((produto) => <ProductCard key={produto.id} produto={produto} onAdd={addToCart} />) : <div className="col-span-full text-center py-12 text-gray-500">Nenhum produto encontrado.</div>}
        </div>
      </main>

      {/* ========================================================= */}
      {/* MODAL DO PERFIL DO UTILIZADOR (GET AUTOMÁTICO, PUT E DELETE) */}
      {/* ========================================================= */}
      {isProfileModalOpen && appUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black bg-opacity-60 transition-opacity" onClick={() => setIsProfileModalOpen(false)} />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden z-50">
            
            <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-xl text-slate-900 flex items-center gap-2">
                <Settings className="w-5 h-5 text-gray-500" /> 
                {isFetchingData ? 'A carregar dados...' : 'O Meu Perfil'}
                {isFetchingData && <Loader2 className="w-4 h-4 animate-spin text-green-600" />}
              </h3>
              <button onClick={() => setIsProfileModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="w-6 h-6" /></button>
            </div>
            
            <div className="p-6">
              {profileErro && <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">{profileErro}</div>}
              {profileSucesso && <div className="mb-4 p-3 bg-green-50 text-green-700 text-sm rounded-lg border border-green-100 font-medium">{profileSucesso}</div>}
              
              {!isConfirmingDelete ? (
                <form onSubmit={handleUpdateProfile} className="space-y-4">
                  <div className="bg-gray-50 border border-gray-200 rounded p-3 mb-4">
                    <p className="text-xs text-gray-500">Membro desde: <span className="font-mono text-gray-800">{new Date(appUser.data_cadastro).toLocaleString('pt-PT')}</span></p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo</label>
                    <input type="text" required value={editNome} onChange={(e) => setEditNome(e.target.value)} disabled={isFetchingData || isProfileLoading} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 disabled:bg-gray-100 disabled:text-gray-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
                    <input type="tel" required value={editTelefone} onChange={(e) => setEditTelefone(e.target.value)} disabled={isFetchingData || isProfileLoading} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 disabled:bg-gray-100 disabled:text-gray-500 outline-none" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">CPF (Bloqueado)</label>
                      <input type="text" value={appUser.cpf} disabled className="w-full px-4 py-2 bg-gray-100 rounded-lg text-gray-400 cursor-not-allowed" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">E-mail (Bloqueado)</label>
                      <input type="email" value={appUser.email} disabled className="w-full px-4 py-2 bg-gray-100 rounded-lg text-gray-400 cursor-not-allowed" />
                    </div>
                  </div>
                  
                  <div className="pt-4 flex flex-col gap-3">
                    <button type="submit" disabled={isFetchingData || isProfileLoading || (editNome === appUser.nome && editTelefone === appUser.telefone)} className="w-full bg-slate-900 text-white font-medium py-2.5 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                      {isProfileLoading ? 'A gravar...' : 'Guardar Alterações'}
                    </button>
                    <div className="flex justify-between mt-2">
                      <button type="button" onClick={() => { setAppUser(null); setIsProfileModalOpen(false); }} className="text-sm font-medium text-gray-500 hover:text-gray-800 flex items-center gap-1"><LogOut className="w-4 h-4" /> Terminar Sessão</button>
                      <button type="button" onClick={() => setIsConfirmingDelete(true)} className="text-sm font-medium text-red-500 hover:text-red-700 flex items-center gap-1"><Trash2 className="w-4 h-4" /> Apagar Conta</button>
                    </div>
                  </div>
                </form>
              ) : (
                <div className="space-y-4 py-4 text-center">
                  <div className="flex justify-center mb-4"><div className="bg-red-100 p-4 rounded-full"><AlertTriangle className="w-10 h-10 text-red-600" /></div></div>
                  <h4 className="font-bold text-lg">Tem a certeza absoluta?</h4>
                  <p className="text-sm text-gray-600">Isto irá apagar permanentemente <strong>{appUser.email}</strong> e não pode ser desfeito.</p>
                  <div className="pt-4 flex gap-3">
                    <button type="button" onClick={() => setIsConfirmingDelete(false)} disabled={isProfileLoading} className="flex-1 bg-gray-200 font-medium py-2.5 rounded-lg hover:bg-gray-300 transition-colors">Cancelar</button>
                    <button type="button" onClick={handleDeleteAccount} disabled={isProfileLoading} className="flex-1 bg-red-600 text-white font-medium py-2.5 rounded-lg hover:bg-red-700 disabled:opacity-70 transition-colors">{isProfileLoading ? 'A apagar...' : 'Sim, Apagar'}</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL DE AUTENTICAÇÃO E OTP */}
      {/* ========================================================= */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black bg-opacity-60 transition-opacity" onClick={closeAuthModal} />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden z-50 p-6">
            <div className="flex justify-between items-center mb-6"><h3 className="font-bold text-xl text-slate-900">Acesso</h3><button onClick={closeAuthModal} className="text-gray-400 hover:text-gray-600"><X/></button></div>
            
            {authErro && <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">{authErro}</div>}
            {authMensagem && <div className="mb-4 p-3 bg-blue-50 text-blue-700 text-sm rounded-lg font-medium flex items-start gap-2 border border-blue-100"><Mail className="w-5 h-5 flex-shrink-0" /> <p>{authMensagem}</p></div>}
            
            {authStep === 'email' && (
              <form onSubmit={handleCheckEmail} className="space-y-4">
                <input type="email" required value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" placeholder="O seu e-mail de acesso..." />
                <button type="submit" disabled={isAuthLoading} className="w-full bg-slate-900 text-white py-2.5 rounded-lg disabled:opacity-70 hover:bg-slate-800 transition-colors font-medium">
                  {isAuthLoading ? 'A verificar conta...' : 'Continuar'}
                </button>
              </form>
            )}

            {authStep === 'register' && (
              <form onSubmit={handleRegisterFormSubmit} className="space-y-4">
                <p className="text-sm text-gray-600 mb-2">Parece ser novo por aqui. Preencha os dados abaixo para receber o seu código OTP por e-mail.</p>
                <input type="text" placeholder="Nome Completo" required value={authNome} onChange={(e) => setAuthNome(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" />
                <input type="text" placeholder="CPF (Apenas números)" required value={authCpf} onChange={(e) => setAuthCpf(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" />
                <input type="tel" placeholder="Telefone (Com DDD)" required value={authTelefone} onChange={(e) => setAuthTelefone(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" />
                <button type="submit" disabled={isAuthLoading} className="w-full bg-green-600 text-white py-2.5 rounded-lg font-medium disabled:opacity-70 hover:bg-green-700 transition-colors mt-2">
                  {isAuthLoading ? 'A enviar e-mail...' : 'Receber código de acesso'}
                </button>
              </form>
            )}

            {authStep === 'otp' && (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <input type="text" placeholder="Código de 6 dígitos" required maxLength={6} value={authOtp} onChange={(e) => setAuthOtp(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg text-center tracking-widest text-2xl font-mono focus:ring-2 focus:ring-green-500 outline-none" />
                <button type="submit" disabled={isAuthLoading} className="w-full bg-slate-900 text-white py-2.5 rounded-lg disabled:opacity-70 font-medium hover:bg-slate-800 transition-colors">
                  {isAuthLoading ? 'A validar...' : 'Confirmar e Entrar'}
                </button>
                <button type="button" onClick={() => setAuthStep('email')} className="w-full text-center text-sm text-green-600 hover:underline mt-2">Voltar / Alterar E-mail</button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL DO CARRINHO */}
      {/* ========================================================= */}
      {isCartOpen && (
        <div className="fixed inset-0 z-40 overflow-hidden">
          <div className="absolute inset-0 bg-black bg-opacity-50 transition-opacity" onClick={() => setIsCartOpen(false)} />
          <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-xl flex flex-col z-50">
            <div className="flex items-center justify-between px-4 py-6 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Carrinho de Compras</h2>
              <button onClick={() => setIsCartOpen(false)} className="text-gray-400 hover:text-gray-600"><X /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-6">
              {cart.length === 0 ? <p className="text-center text-gray-500 py-10">O seu carrinho está vazio.</p> : (
                <ul className="divide-y divide-gray-200">
                  {cart.map((item) => (
                    <li key={`${item.id}-${item.tamanho}`} className="py-6 flex">
                      <img src={item.imagem} className="w-16 h-16 rounded object-cover" />
                      <div className="ml-4 flex-1">
                        <div className="flex justify-between">
                          <h3 className="text-sm font-medium text-gray-900">{item.nome_camisa}</h3>
                          <button onClick={() => removeFromCart(item.id, item.tamanho)} className="text-gray-400 hover:text-red-500 ml-2"><Trash2 className="w-4 h-4" /></button>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Tam: {item.tamanho}</p>
                        <div className="flex justify-between items-center mt-2">
                          <div className="flex items-center gap-2 border rounded border-gray-200">
                            <button className="p-1 hover:bg-gray-100 text-gray-600" onClick={()=>updateQuantity(item.id, item.tamanho, -1)}><Minus className="w-3 h-3"/></button>
                            <span className="text-sm px-2 font-medium">{item.quantidade}</span>
                            <button className="p-1 hover:bg-gray-100 text-gray-600" onClick={()=>updateQuantity(item.id, item.tamanho, 1)}><Plus className="w-3 h-3"/></button>
                          </div>
                          <p className="font-bold text-gray-900">R$ {(item.preco * item.quantidade).toFixed(2)}</p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {cart.length > 0 && (
              <div className="p-6 border-t border-gray-200 bg-gray-50">
                <div className="flex justify-between font-bold text-lg mb-4 text-gray-900"><span>Total</span><span>R$ {cartTotal.toFixed(2)}</span></div>
                <button className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-md font-medium transition-colors">Finalizar Compra</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ProductCard({ produto, onAdd }) {
  const [tamanho, setTamanho] = useState('M');
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col hover:shadow-md transition-all duration-200">
      <img src={produto.imagem} className="w-full h-64 object-cover" />
      <div className="p-4 flex flex-col flex-1">
        <h3 className="text-sm font-semibold text-gray-900 leading-snug min-h-[40px]">{produto.nome_camisa}</h3>
        <p className="text-xl font-bold text-slate-900 mt-2 mb-4">R$ {Number(produto.preco).toFixed(2)}</p>
        <div className="mt-auto">
          <div className="flex gap-1 mb-3">
            {['P', 'M', 'G', 'GG'].map(t => (
              <button key={t} onClick={() => setTamanho(t)} className={`w-8 h-8 text-xs font-bold border rounded transition-colors ${tamanho === t ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-gray-600 hover:border-gray-400'}`}>{t}</button>
            ))}
          </div>
          <button onClick={() => onAdd(produto, tamanho)} className="w-full bg-slate-900 text-white py-2 rounded-lg text-sm font-medium flex justify-center items-center gap-2 hover:bg-slate-800 transition-colors"><ShoppingCart className="w-4 h-4"/> Adicionar</button>
        </div>
      </div>
    </div>
  );
}