import React, { useState, useMemo, useEffect } from 'react';
import { ShoppingCart, Search, X, Plus, Minus, Trash2, User, Settings, LogOut, AlertTriangle, Loader2, Mail, MapPin, MapPinned, ShieldAlert, Edit, PlusCircle, Image as ImageIcon } from 'lucide-react';
import { auth as firebaseAuth, googleProvider, facebookProvider } from './firebase'; 
import { signInWithPopup } from 'firebase/auth';

const CATEGORIAS = ["Todas", "Nacional", "Europa", "Seleções"];
const API_BASE_URL = 'http://localhost:8000/api';

export default function App() {
  const [appUser, setAppUser] = useState(null); 
  const [produtos, setProdutos] = useState([]);
  const [isLoadingProdutos, setIsLoadingProdutos] = useState(true);
  
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [filtroCategoria, setFiltroCategoria] = useState("Todas");
  const [busca, setBusca] = useState("");

  // ESTADOS DE AUTENTICAÇÃO
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authStep, setAuthStep] = useState('email'); 
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

  // ESTADOS DO PERFIL E ENDEREÇOS
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profileTab, setProfileTab] = useState('dados');
  const [editNome, setEditNome] = useState('');
  const [editTelefone, setEditTelefone] = useState('');
  const [editCpf, setEditCpf] = useState(''); // NOVO: Estado para o CPF
  const [profileErro, setProfileErro] = useState('');
  const [profileSucesso, setProfileSucesso] = useState('');
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isFetchingData, setIsFetchingData] = useState(false);

  const [enderecos, setEnderecos] = useState([]);
  const [endCep, setEndCep] = useState('');
  const [endRua, setEndRua] = useState('');
  const [endNumero, setEndNumero] = useState('');
  const [endComplemento, setEndComplemento] = useState('');
  const [endBairro, setEndBairro] = useState('');
  const [endCidade, setEndCidade] = useState('');
  const [endEstado, setEndEstado] = useState('');
  const [isBuscandoCep, setIsBuscandoCep] = useState(false);

  // ESTADOS DO PAINEL ADMIN
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [adminTab, setAdminTab] = useState('lista'); 
  const [adminProdutoEditing, setAdminProdutoEditing] = useState(null); 
  const [prodNome, setProdNome] = useState('');
  const [prodPreco, setProdPreco] = useState('');
  const [prodCategoria, setProdCategoria] = useState('Nacional');
  const [prodImagem, setProdImagem] = useState('');
  const [adminErro, setAdminErro] = useState('');
  const [isAdminLoading, setIsAdminLoading] = useState(false);

  const isUserAdmin = appUser?.email === 'admin@futgo.com' || appUser?.is_admin === true;

  // ==========================================
  // CARREGAR CATÁLOGO INICIAL
  // ==========================================
  useEffect(() => {
    fetchProdutos();
  }, []);

  const fetchProdutos = async () => {
    setIsLoadingProdutos(true);
    try {
      const res = await fetch(`${API_BASE_URL}/produtos/`);
      const data = await res.json();
      if (res.ok) setProdutos(data);
    } catch (error) { console.error("Erro ao puxar produtos:", error); } 
    finally { setIsLoadingProdutos(false); }
  };

  // ==========================================
  // LÓGICA DE LOGIN SOCIAL (GOOGLE/FACEBOOK)
  // ==========================================
  const handleSocialLogin = async (provider) => {
    setIsAuthLoading(true); setAuthErro('');
    try {
      const result = await signInWithPopup(firebaseAuth, provider);
      const token = await result.user.getIdToken();

      const res = await fetch(`${API_BASE_URL}/auth/social/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.erro || 'Falha ao autenticar no servidor.');

      setAppUser(data.usuario);
      closeAuthModal();
    } catch (error) {
      setAuthErro('Login cancelado ou erro de autenticação.');
    } finally { setIsAuthLoading(false); }
  };

  // ==========================================
  // LÓGICA DE AUTENTICAÇÃO POR OTP (E-MAIL)
  // ==========================================
  const handleCheckEmail = async (e) => {
    e.preventDefault();
    if (!authEmail) return;
    setIsAuthLoading(true); setAuthErro(''); setAuthMensagem('');
    try {
      const res = await fetch(`${API_BASE_URL}/auth/check-email/`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: authEmail }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.erro || 'Erro no servidor Django.');
      
      if (data.existe) { setAuthMode('login'); await triggerSendOTP(); } 
      else { setAuthMode('register'); setAuthStep('register'); setIsAuthLoading(false); }
    } catch (error) { setAuthErro(error.message); setIsAuthLoading(false); }
  };

  const triggerSendOTP = async () => {
    setIsAuthLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/send-otp/`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: authEmail, method: 'email' }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.erro || 'Erro ao enviar e-mail.');
      setAuthMensagem(`Código de acesso enviado para ${authEmail}.`); setAuthStep('otp');
    } catch (error) { setAuthErro(error.message); throw error; } finally { setIsAuthLoading(false); }
  };

  const handleRegisterFormSubmit = async (e) => {
    e.preventDefault();
    if (!authNome || !authCpf || !authTelefone) return setAuthErro('Preencha os campos obrigatórios.');
    setIsAuthLoading(true); setAuthErro(''); setAuthMensagem('');
    setTempUserData({ nome: authNome, cpf: authCpf, telefone: authTelefone });
    try { await triggerSendOTP(); } catch (e) {}
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setIsAuthLoading(true); setAuthErro('');
    try {
      let endpoint = authMode === 'login' ? '/auth/login/' : '/auth/register/';
      let payload = authMode === 'login' ? { email: authEmail, otp: authOtp } : { nome: tempUserData.nome, email: authEmail, cpf: tempUserData.cpf, telefone: tempUserData.telefone, otp: authOtp };
      
      const res = await fetch(`${API_BASE_URL}${endpoint}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.erro || 'Código inválido ou expirado.');
      
      setAppUser(data.usuario); closeAuthModal();
    } catch (error) { setAuthErro(error.message); } finally { setIsAuthLoading(false); }
  };

  const closeAuthModal = () => { setIsAuthModalOpen(false); setAuthStep('email'); setAuthMode('login'); setAuthEmail(''); setAuthNome(''); setAuthCpf(''); setAuthTelefone(''); setAuthOtp(''); setAuthErro(''); setAuthMensagem(''); };

  // ==========================================
  // LÓGICA DE PERFIL E ENDEREÇOS
  // ==========================================
  const openProfileModal = async () => {
    setIsProfileModalOpen(true); setProfileTab('dados'); setProfileErro(''); setProfileSucesso(''); setIsConfirmingDelete(false); setIsProfileLoading(false);
    setEditNome(appUser.nome); 
    setEditTelefone(appUser.telefone || '');
    setEditCpf(appUser.cpf || ''); // Puxa o CPF, se existir
    
    setIsFetchingData(true);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/user/${appUser.id_usuario}/`);
      const data = await res.json();
      if (res.ok) { 
        setAppUser(data.usuario); 
        setEditNome(data.usuario.nome); 
        setEditTelefone(data.usuario.telefone || ''); 
        setEditCpf(data.usuario.cpf || ''); 
      }
      await fetchEnderecos(); 
    } catch (error) {} finally { setIsFetchingData(false); }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setIsProfileLoading(true); setProfileErro(''); setProfileSucesso('');
    try {
      const res = await fetch(`${API_BASE_URL}/auth/user/${appUser.id_usuario}/`, { 
        method: 'PUT', 
        headers: { 'Content-Type': 'application/json' }, 
        // Agora envia o CPF também (se o backend aceitar, ele grava e bloqueia)
        body: JSON.stringify({ nome: editNome, telefone: editTelefone, cpf: editCpf }) 
      });
      const data = await res.json().catch(()=>({}));
      if (!res.ok) throw new Error(data.erro || 'Erro ao atualizar.');
      setAppUser(data.usuario); setProfileSucesso('Perfil atualizado com sucesso!');
    } catch (error) { setProfileErro(error.message); } finally { setIsProfileLoading(false); }
  };

  const handleDeleteAccount = async () => {
    setIsProfileLoading(true); setProfileErro('');
    try {
      const res = await fetch(`${API_BASE_URL}/auth/user/${appUser.id_usuario}/`, { method: 'DELETE' });
      const data = await res.json().catch(()=>({}));
      if (!res.ok) throw new Error(data.erro || 'Erro ao apagar conta.');
      setAppUser(null); setIsProfileModalOpen(false); alert("Conta apagada permanentemente.");
    } catch (error) { setProfileErro(error.message); } finally { setIsProfileLoading(false); }
  };

  const fetchEnderecos = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/user/${appUser.id_usuario}/enderecos/`);
      const data = await res.json();
      if (res.ok) setEnderecos(data.enderecos || []);
    } catch (error) { console.error("Erro ao puxar endereços", error); }
  };

  // LÓGICA DO VIACEP
  const handleCepChange = async (e) => {
    let val = e.target.value.replace(/\D/g, '');
    let formatado = val;
    if (val.length > 5) formatado = val.replace(/^(\d{5})(\d)/, '$1-$2');
    setEndCep(formatado);

    if (val.length === 8) {
      setIsBuscandoCep(true); setProfileErro('');
      try {
        const res = await fetch(`https://viacep.com.br/ws/${val}/json/`);
        const data = await res.json();
        if (data.erro) { setProfileErro('CEP não encontrado. Preencha manualmente.'); return; }
        setEndRua(data.logradouro || ''); setEndBairro(data.bairro || ''); setEndCidade(data.localidade || ''); setEndEstado(data.uf || '');
        document.getElementById('endNumeroInput')?.focus();
        setProfileSucesso('Endereço localizado!');
      } catch (error) { setProfileErro('Falha ao comunicar com os Correios.'); } 
      finally { setIsBuscandoCep(false); }
    }
  };

  const handleAddEndereco = async (e) => {
    e.preventDefault();
    setIsProfileLoading(true); setProfileErro(''); setProfileSucesso('');
    try {
      const payload = { cep: endCep.replace(/\D/g, ''), rua: endRua, numero: endNumero, complemento: endComplemento, bairro: endBairro, cidade: endCidade, estado: endEstado };
      const res = await fetch(`${API_BASE_URL}/auth/user/${appUser.id_usuario}/enderecos/`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json().catch(()=>({}));
      if (!res.ok) throw new Error(data.erro || 'Erro ao guardar endereço.');
      setEnderecos([...enderecos, data.endereco]); setProfileSucesso('Endereço adicionado com sucesso!'); setProfileTab('enderecos'); 
      setEndCep(''); setEndRua(''); setEndNumero(''); setEndComplemento(''); setEndBairro(''); setEndCidade(''); setEndEstado('');
    } catch (error) { setProfileErro(error.message); } finally { setIsProfileLoading(false); }
  };

  const handleDeleteEndereco = async (id_endereco) => {
    if(!window.confirm('Apagar este endereço?')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/auth/endereco/${id_endereco}/`, { method: 'DELETE' });
      if (res.ok) { setEnderecos(enderecos.filter(end => end.id_endereco !== id_endereco)); setProfileSucesso('Endereço apagado.'); }
    } catch (error) { setProfileErro('Erro ao apagar endereço.'); }
  };

  // ==========================================
  // LÓGICA DO PAINEL ADMIN
  // ==========================================
  const openAdminModal = () => { setAdminTab('lista'); setIsAdminModalOpen(true); setAdminErro(''); setIsAdminLoading(false); };
  const handleAdminEdit = (produto) => { setAdminErro(''); setAdminProdutoEditing(produto); setProdNome(produto.nome_camisa); setProdPreco(produto.preco); setProdCategoria(produto.categoria); setProdImagem(produto.imagem); setAdminTab('formulario'); };
  const handleAdminNew = () => { setAdminErro(''); setAdminProdutoEditing(null); setProdNome(''); setProdPreco(''); setProdCategoria('Nacional'); setProdImagem(''); setAdminTab('formulario'); };

  const handleAdminSaveProduct = async (e) => {
    e.preventDefault();
    setIsAdminLoading(true); setAdminErro('');
    const headers = { 'Content-Type': 'application/json', 'X-User-ID': appUser.id_usuario };
    const payload = { nome_camisa: prodNome, preco: parseFloat(prodPreco), categoria: prodCategoria, imagem: prodImagem };

    try {
      if (adminProdutoEditing) {
        const res = await fetch(`${API_BASE_URL}/produtos/${adminProdutoEditing.id}/`, { method: 'PUT', headers, body: JSON.stringify(payload) });
        const data = await res.json().catch(()=>({}));
        if (!res.ok) throw new Error(data.erro || 'Falha ao atualizar.');
        setProdutos(produtos.map(p => p.id === adminProdutoEditing.id ? data.produto : p));
      } else {
        const res = await fetch(`${API_BASE_URL}/produtos/`, { method: 'POST', headers, body: JSON.stringify(payload) });
        const data = await res.json().catch(()=>({}));
        if (!res.ok) throw new Error(data.erro || 'Falha ao criar.');
        setProdutos([...produtos, data.produto]);
      }
      setAdminTab('lista');
    } catch (error) { setAdminErro(error.message); } finally { setIsAdminLoading(false); }
  };

  const handleAdminDeleteProduct = async (id) => {
    if(!window.confirm('Excluir este produto?')) return;
    setIsAdminLoading(true); setAdminErro('');
    try {
      const res = await fetch(`${API_BASE_URL}/produtos/${id}/`, { method: 'DELETE', headers: { 'X-User-ID': appUser.id_usuario } });
      if (!res.ok) throw new Error('Falha ao apagar.');
      setProdutos(produtos.filter(p => p.id !== id)); setCart(cart.filter(item => item.id !== id)); 
    } catch (error) { setAdminErro(error.message); } finally { setIsAdminLoading(false); }
  };

  // ==========================================
  // CARRINHO E FILTROS
  // ==========================================
  const addToCart = (produto, tamanho) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.id === produto.id && item.tamanho === tamanho);
      if (existingItem) return prevCart.map(item => (item.id === produto.id && item.tamanho === tamanho) ? { ...item, quantidade: item.quantidade + 1 } : item);
      return [...prevCart, { ...produto, tamanho, quantidade: 1 }];
    }); setIsCartOpen(true);
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
              {isUserAdmin && (
                <button onClick={openAdminModal} className="flex items-center gap-1.5 text-sm font-medium bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg transition-colors shadow-sm">
                  <ShieldAlert className="w-4 h-4" /> <span className="hidden sm:block">Painel Admin</span>
                </button>
              )}

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
        
        {isLoadingProdutos ? (
          <div className="flex flex-col justify-center items-center py-20 text-gray-500 gap-3">
             <Loader2 className="w-8 h-8 animate-spin text-green-600" />
             <p>A carregar catálogo a partir da Base de Dados...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {produtosFiltrados.length > 0 ? produtosFiltrados.map((produto) => <ProductCard key={produto.id} produto={produto} onAdd={addToCart} />) : <div className="col-span-full text-center py-12 text-gray-500">Nenhum produto encontrado no banco de dados. Adicione no Painel Admin.</div>}
          </div>
        )}
      </main>

      {/* ========================================================= */}
      {/* MODAL DE AUTENTICAÇÃO E LOGIN SOCIAL */}
      {/* ========================================================= */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black bg-opacity-60 transition-opacity" onClick={closeAuthModal} />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden z-50 p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-xl text-slate-900">Acesso</h3>
              <button onClick={closeAuthModal} className="text-gray-400 hover:text-gray-600"><X/></button>
            </div>
            
            {authErro && <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">{authErro}</div>}
            {authMensagem && <div className="mb-4 p-3 bg-blue-50 text-blue-700 text-sm rounded-lg font-medium flex items-start gap-2 border border-blue-100"><Mail className="w-5 h-5 flex-shrink-0" /> <p>{authMensagem}</p></div>}
            
            {authStep === 'email' && (
              <form onSubmit={handleCheckEmail} className="space-y-4">
                <input type="email" required value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" placeholder="O seu e-mail de acesso..." />
                <button type="submit" disabled={isAuthLoading} className="w-full bg-slate-900 text-white py-2.5 rounded-lg disabled:opacity-70 hover:bg-slate-800 transition-colors font-medium">
                  {isAuthLoading ? 'A verificar...' : 'Continuar com E-mail'}
                </button>

                <div className="relative flex py-2 items-center">
                  <div className="flex-grow border-t border-gray-300"></div>
                  <span className="flex-shrink-0 mx-4 text-gray-400 text-sm">Ou entre com</span>
                  <div className="flex-grow border-t border-gray-300"></div>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <button type="button" onClick={() => handleSocialLogin(googleProvider)} disabled={isAuthLoading} className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                    <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-5 h-5" alt="Google" />
                    <span className="text-sm font-medium text-gray-700">Google</span>
                  </button>
                  
                  <button type="button" onClick={() => handleSocialLogin(facebookProvider)} disabled={isAuthLoading} className="flex items-center justify-center gap-2 px-4 py-2 border border-[#1877F2] bg-[#1877F2] rounded-lg hover:bg-blue-700 transition-colors text-white">
                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                    <span className="text-sm font-medium">Facebook</span>
                  </button>
                </div>
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
      {/* MODAL DO PERFIL DO UTILIZADOR E ENDEREÇOS */}
      {/* ========================================================= */}
      {isProfileModalOpen && appUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black bg-opacity-60 transition-opacity" onClick={() => setIsProfileModalOpen(false)} />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden z-50 flex flex-col max-h-[90vh]">
            
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-xl text-slate-900 flex items-center gap-2">
                <Settings className="w-5 h-5 text-gray-500" /> 
                A Minha Conta
                {isFetchingData && <Loader2 className="w-4 h-4 animate-spin text-green-600" />}
              </h3>
              <button onClick={() => setIsProfileModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="w-6 h-6" /></button>
            </div>

            <div className="flex border-b border-gray-200 bg-white">
              <button onClick={() => setProfileTab('dados')} className={`flex-1 py-3 text-sm font-medium transition-colors border-b-2 ${profileTab === 'dados' ? 'border-green-500 text-green-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Dados Pessoais</button>
              <button onClick={() => setProfileTab('enderecos')} className={`flex-1 py-3 text-sm font-medium transition-colors border-b-2 ${(profileTab === 'enderecos' || profileTab === 'novo_endereco') ? 'border-green-500 text-green-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Meus Endereços</button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              {profileErro && <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">{profileErro}</div>}
              {profileSucesso && <div className="mb-4 p-3 bg-green-50 text-green-700 text-sm rounded-lg border border-green-100 font-medium">{profileSucesso}</div>}
              
              {profileTab === 'dados' && (
                !isConfirmingDelete ? (
                  <form onSubmit={handleUpdateProfile} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo</label>
                        <input type="text" required value={editNome} onChange={(e) => setEditNome(e.target.value)} disabled={isFetchingData || isProfileLoading} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
                        <input type="tel" value={editTelefone} onChange={(e) => setEditTelefone(e.target.value)} disabled={isFetchingData || isProfileLoading} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" placeholder="Opcional" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        {/* NOVO: Verifica se já tem CPF. Se sim, bloqueia. Se não (Google), liberta! */}
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          CPF {appUser.cpf ? '(Bloqueado)' : '(Pendente)'}
                        </label>
                        <input 
                          type="text" 
                          value={editCpf} 
                          onChange={(e) => setEditCpf(e.target.value)} 
                          disabled={isFetchingData || isProfileLoading || appUser.cpf} 
                          placeholder="Apenas números" 
                          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none ${appUser.cpf ? 'bg-gray-100 text-gray-500 cursor-not-allowed border-gray-200' : 'bg-white border-gray-300'}`} 
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-500 mb-1">E-mail (Bloqueado)</label>
                        <input type="email" value={appUser.email} disabled className="w-full px-4 py-2 bg-gray-100 rounded-lg text-gray-500 cursor-not-allowed border-gray-200" />
                      </div>
                    </div>
                    
                    <div className="pt-6 flex flex-col gap-3">
                      <button type="submit" disabled={isFetchingData || isProfileLoading} className="w-full bg-slate-900 text-white font-medium py-2.5 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50">{isProfileLoading ? 'A gravar...' : 'Salvar Alterações'}</button>
                      <div className="flex justify-between mt-2 pt-4 border-t border-gray-100">
                        <button type="button" onClick={() => { setAppUser(null); setIsProfileModalOpen(false); }} className="text-sm font-medium text-gray-500 hover:text-gray-800 flex items-center gap-1"><LogOut className="w-4 h-4" /> Sair da conta</button>
                        <button type="button" onClick={() => setIsConfirmingDelete(true)} className="text-sm font-medium text-red-500 hover:text-red-700 flex items-center gap-1"><Trash2 className="w-4 h-4" /> Apagar Conta</button>
                      </div>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-4 py-4 text-center">
                    <div className="flex justify-center mb-4"><div className="bg-red-100 p-4 rounded-full"><AlertTriangle className="w-10 h-10 text-red-600" /></div></div>
                    <h4 className="font-bold text-lg">Tem a certeza absoluta?</h4>
                    <p className="text-sm text-gray-600">Isto irá apagar a conta e os endereços associados.</p>
                    <div className="pt-4 flex gap-3">
                      <button type="button" onClick={() => setIsConfirmingDelete(false)} disabled={isProfileLoading} className="flex-1 bg-gray-200 font-medium py-2.5 rounded-lg hover:bg-gray-300">Cancelar</button>
                      <button type="button" onClick={handleDeleteAccount} disabled={isProfileLoading} className="flex-1 bg-red-600 text-white font-medium py-2.5 rounded-lg hover:bg-red-700 disabled:opacity-70">{isProfileLoading ? 'A apagar...' : 'Sim, Apagar'}</button>
                    </div>
                  </div>
                )
              )}

              {profileTab === 'enderecos' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="font-bold text-gray-800 flex items-center gap-2"><MapPin className="w-4 h-4 text-green-600" /> Locais de Entrega</h4>
                    <button onClick={() => {setProfileSucesso(''); setProfileErro(''); setProfileTab('novo_endereco');}} className="text-sm bg-green-50 text-green-700 px-3 py-1.5 rounded border border-green-200 hover:bg-green-100 font-medium flex items-center gap-1"><Plus className="w-4 h-4" /> Adicionar</button>
                  </div>

                  {enderecos.length === 0 ? (
                    <div className="text-center py-8 bg-gray-50 border border-dashed border-gray-300 rounded-lg"><MapPinned className="w-8 h-8 mx-auto text-gray-400 mb-2" /><p className="text-sm text-gray-500">Nenhum endereço cadastrado.</p></div>
                  ) : (
                    <div className="space-y-3">
                      {enderecos.map(end => (
                        <div key={end.id_endereco} className="p-3 border border-gray-200 rounded-lg hover:border-green-300 transition-colors bg-white relative group">
                          <button onClick={() => handleDeleteEndereco(end.id_endereco)} className="absolute top-3 right-3 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-4 h-4"/></button>
                          <p className="font-bold text-sm text-gray-800">{end.rua}, {end.numero}</p>
                          {end.complemento && <p className="text-xs text-gray-500">{end.complemento}</p>}
                          <p className="text-xs text-gray-600 mt-1">{end.bairro} - {end.cidade}/{end.estado}</p>
                          <p className="text-xs text-gray-400 font-mono mt-1">CEP: {end.cep}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {profileTab === 'novo_endereco' && (
                <form onSubmit={handleAddEndereco} className="space-y-4">
                  <div className="flex justify-between items-center mb-4 border-b pb-2">
                    <h4 className="font-bold text-gray-800">Novo Endereço</h4>
                    <button type="button" onClick={() => setProfileTab('enderecos')} className="text-sm text-gray-500 hover:underline">Voltar</button>
                  </div>

                  <div className="relative">
                    <label className="block text-xs font-medium text-gray-700 mb-1">CEP *</label>
                    <input type="text" required maxLength={9} value={endCep} onChange={handleCepChange} disabled={isBuscandoCep} className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-green-500 outline-none disabled:bg-gray-100" placeholder="Ex: 01001-000" />
                    {isBuscandoCep && <Loader2 className="absolute right-3 top-7 w-4 h-4 text-green-500 animate-spin" />}
                  </div>
                  
                  <div className="grid grid-cols-4 gap-3">
                    <div className="col-span-3">
                      <label className="block text-xs font-medium text-gray-700 mb-1">Rua / Logradouro *</label>
                      <input type="text" required value={endRua} onChange={(e) => setEndRua(e.target.value)} className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-green-500 outline-none" />
                    </div>
                    <div className="col-span-1">
                      <label className="block text-xs font-medium text-gray-700 mb-1">Número *</label>
                      <input type="text" id="endNumeroInput" required value={endNumero} onChange={(e) => setEndNumero(e.target.value)} className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-green-500 outline-none shadow-sm" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Complemento</label>
                      <input type="text" value={endComplemento} onChange={(e) => setEndComplemento(e.target.value)} className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-green-500 outline-none" placeholder="Apt, Bloco..." />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Bairro *</label>
                      <input type="text" required value={endBairro} onChange={(e) => setEndBairro(e.target.value)} className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-green-500 outline-none" />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-gray-700 mb-1">Cidade *</label>
                      <input type="text" required value={endCidade} onChange={(e) => setEndCidade(e.target.value)} className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-green-500 outline-none" />
                    </div>
                    <div className="col-span-1">
                      <label className="block text-xs font-medium text-gray-700 mb-1">Estado (UF) *</label>
                      <input type="text" required maxLength={2} value={endEstado} onChange={(e) => setEndEstado(e.target.value.toUpperCase())} className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-green-500 outline-none text-center" />
                    </div>
                  </div>

                  <button type="submit" disabled={isProfileLoading || isBuscandoCep} className="w-full bg-slate-900 text-white font-medium py-2.5 rounded-lg mt-4 disabled:opacity-70 hover:bg-slate-800 transition-colors">
                    {isProfileLoading ? 'A salvar...' : 'Salvar Endereço'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL ADMIN (CRUD DE PRODUTOS) */}
      {/* ========================================================= */}
      {isAdminModalOpen && isUserAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black bg-opacity-70 transition-opacity" onClick={() => setIsAdminModalOpen(false)} />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden z-50 flex flex-col max-h-[90vh]">
            
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-slate-900 text-white">
              <h3 className="font-bold text-xl flex items-center gap-2"><ShieldAlert className="w-5 h-5 text-red-500" /> Painel Administrativo do Catálogo</h3>
              <button onClick={() => setIsAdminModalOpen(false)} className="text-gray-300 hover:text-white"><X className="w-6 h-6" /></button>
            </div>

            <div className="p-6 overflow-y-auto bg-gray-50 flex-1">
              {adminErro && <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100 font-medium">{adminErro}</div>}

              {adminTab === 'lista' ? (
                <>
                  <div className="flex justify-between items-center mb-6">
                    <p className="text-sm text-gray-600">Acesso administrativo: <strong>{appUser.email}</strong></p>
                    <button onClick={handleAdminNew} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors shadow-sm"><PlusCircle className="w-4 h-4" /> Adicionar Produto</button>
                  </div>
                  
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-gray-100 border-b border-gray-200 text-gray-600">
                        <tr><th className="px-4 py-3 font-medium">Imagem</th><th className="px-4 py-3 font-medium">Nome / Descrição</th><th className="px-4 py-3 font-medium">Categoria</th><th className="px-4 py-3 font-medium">Preço (R$)</th><th className="px-4 py-3 font-medium text-right">Ações</th></tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {produtos.length === 0 ? <tr><td colSpan="5" className="text-center py-6 text-gray-500">Sem produtos no banco de dados.</td></tr> : null}
                        {produtos.map(p => (
                          <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-2"><img src={p.imagem} alt="thumb" className="w-10 h-10 rounded object-cover border border-gray-200" /></td>
                            <td className="px-4 py-2 font-medium text-gray-900">{p.nome_camisa}</td>
                            <td className="px-4 py-2 text-gray-600"><span className="bg-gray-100 px-2 py-1 rounded text-xs">{p.categoria}</span></td>
                            <td className="px-4 py-2 text-gray-900 font-bold">{Number(p.preco).toFixed(2)}</td>
                            <td className="px-4 py-2 flex justify-end gap-2">
                              <button onClick={() => handleAdminEdit(p)} disabled={isAdminLoading} className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors disabled:opacity-50"><Edit className="w-4 h-4" /></button>
                              <button onClick={() => handleAdminDeleteProduct(p.id)} disabled={isAdminLoading} className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"><Trash2 className="w-4 h-4" /></button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <form onSubmit={handleAdminSaveProduct} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                  <div className="flex justify-between items-center mb-6 border-b pb-4">
                    <h4 className="font-bold text-gray-800 text-lg flex items-center gap-2">{adminProdutoEditing ? <Edit className="w-5 h-5 text-blue-500"/> : <PlusCircle className="w-5 h-5 text-green-500"/>} {adminProdutoEditing ? 'Editar Produto' : 'Criar Novo Produto'}</h4>
                    <button type="button" onClick={() => setAdminTab('lista')} className="text-sm text-gray-500 hover:underline">Cancelar e Voltar</button>
                  </div>

                  <div className="space-y-5">
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Nome da Camisa *</label><input type="text" required value={prodNome} onChange={e => setProdNome(e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" /></div>
                    <div className="grid grid-cols-2 gap-4">
                      <div><label className="block text-sm font-medium text-gray-700 mb-1">Preço (R$) *</label><input type="number" step="0.01" min="0" required value={prodPreco} onChange={e => setProdPreco(e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" /></div>
                      <div><label className="block text-sm font-medium text-gray-700 mb-1">Categoria *</label><select required value={prodCategoria} onChange={e => setProdCategoria(e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none bg-white"><option value="Nacional">Nacional</option><option value="Europa">Europa</option><option value="Seleções">Seleções</option></select></div>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <label className="block text-sm font-bold text-gray-800 mb-1 flex items-center gap-1.5"><ImageIcon className="w-4 h-4 text-green-600"/> URL da Imagem *</label>
                      <input type="url" required value={prodImagem} onChange={e => setProdImagem(e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none mb-4" />
                      {prodImagem && <div className="mt-2 text-center bg-white p-2 rounded border border-dashed border-gray-300 inline-block"><img src={prodImagem} alt="Preview" className="h-40 object-contain mx-auto rounded" onError={(e) => e.target.src = "https://placehold.co/400x500/ffcccc/ff0000?text=Link+Invalido"} /></div>}
                    </div>
                  </div>
                  <div className="mt-8 flex gap-3"><button type="submit" disabled={isAdminLoading} className="flex-1 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors shadow-sm disabled:opacity-70">{isAdminLoading ? 'A sincronizar...' : 'Salvar no Catálogo'}</button></div>
                </form>
              )}
            </div>
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
      <img src={produto.imagem} className="w-full h-72 object-cover bg-gray-50" onError={(e) => e.target.src = "https://placehold.co/400x500/cccccc/ffffff?text=Sem+Imagem"} />
      <div className="p-4 flex flex-col flex-1">
        <h3 className="text-sm font-semibold text-gray-900 leading-snug min-h-[40px]">{produto.nome_camisa}</h3>
        <p className="text-xl font-bold text-slate-900 mt-2 mb-4">R$ {Number(produto.preco).toFixed(2)}</p>
        <div className="mt-auto">
          <div className="flex gap-1 mb-3">
            {['P', 'M', 'G', 'GG'].map(t => (
              <button key={t} onClick={() => setTamanho(t)} className={`w-8 h-8 text-xs font-bold border rounded transition-colors ${tamanho === t ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-gray-600 hover:border-gray-400'}`}>{t}</button>
            ))}
          </div>
          <button onClick={() => onAdd(produto, tamanho)} className="w-full bg-slate-900 text-white py-2 rounded-lg text-sm font-medium flex justify-center items-center gap-2 hover:bg-slate-800 transition-colors"><ShoppingCart className="w-4 h-4"/> Adicionar ao Carrinho</button>
        </div>
      </div>
    </div>
  );
}