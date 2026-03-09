import React, { useState, useMemo } from 'react';
import { ShoppingCart, Search, Menu, X, Plus, Minus, Trash2, User } from 'lucide-react';

// --- MOCK DATA (Catálogo) ---
// (Em produção, isto também viria do Django via GET http://localhost:8000/api/produtos/)
const MOCK_PRODUCTS = [
  { id: "1", nome_camisa: "Camisa Seleção Brasileira Principal 24/25", preco: 349.90, categoria: "Seleções", imagem: "https://placehold.co/400x500/009b3a/fedf00?text=Brasil" },
  { id: "2", nome_camisa: "Camisa Real Madrid Home 23/24", preco: 399.90, categoria: "Europa", imagem: "https://placehold.co/400x500/ffffff/000000?text=Real+Madrid" },
  { id: "3", nome_camisa: "Camisa Flamengo Rubro-Negra 24", preco: 299.90, categoria: "Nacional", imagem: "https://placehold.co/400x500/c62828/000000?text=Flamengo" },
  { id: "4", nome_camisa: "Camisa Manchester City Away 23/24", preco: 359.90, categoria: "Europa", imagem: "https://placehold.co/400x500/1e22aa/ffffff?text=Man+City" }
];
const CATEGORIAS = ["Todas", "Nacional", "Europa", "Seleções"];

// URL Base do seu Backend Django
const API_BASE_URL = 'http://localhost:8000/api';

export default function App() {
  const [appUser, setAppUser] = useState(null); 
  const [produtos] = useState(MOCK_PRODUCTS);
  
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [filtroCategoria, setFiltroCategoria] = useState("Todas");
  const [busca, setBusca] = useState("");

  // --- ESTADOS DE AUTENTICAÇÃO ---
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authStep, setAuthStep] = useState('email'); // 'email', 'register', 'otp'
  const [authMode, setAuthMode] = useState('login'); // 'login' ou 'register'
  
  const [authEmail, setAuthEmail] = useState('');
  const [authNome, setAuthNome] = useState('');
  const [authCpf, setAuthCpf] = useState('');
  const [authTelefone, setAuthTelefone] = useState('');
  const [authOtp, setAuthOtp] = useState('');
  
  const [tempUserData, setTempUserData] = useState(null); 
  
  const [authErro, setAuthErro] = useState('');
  const [authMensagem, setAuthMensagem] = useState('');
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  // --- 1. COMUNICAÇÃO COM O DJANGO: VERIFICAR E-MAIL ---
  const handleCheckEmail = async (e) => {
    e.preventDefault();
    if (!authEmail) return;
    
    setIsAuthLoading(true);
    setAuthErro('');
    setAuthMensagem('');

    try {
      const res = await fetch(`${API_BASE_URL}/auth/check-email/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: authEmail })
      });
      
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.erro || 'Erro ao comunicar com o servidor.');
      }

      if (data.existe) {
        setAuthMode('login');
        setAuthMensagem(data.mensagem || 'E-mail encontrado. Insira o OTP.');
        setAuthStep('otp');
      } else {
        setAuthMode('register');
        setAuthStep('register');
      }
    } catch (error) {
      console.error(error);
      setAuthErro('Erro de ligação. O servidor Django está a correr na porta 8000?');
    } finally {
      setIsAuthLoading(false);
    }
  };

  // --- 2. TRANSIÇÃO: DO REGISTO PARA O OTP ---
  const handleRegisterFormSubmit = (e) => {
    e.preventDefault();
    if (!authNome || !authCpf || !authTelefone) {
      setAuthErro('Preencha todos os campos obrigatórios.');
      return;
    }
    setAuthErro('');
    setTempUserData({ nome: authNome, cpf: authCpf, telefone: authTelefone });
    setAuthMensagem(`Enviámos um código OTP para ${authEmail} para confirmar o registo.`);
    setAuthStep('otp');
  };

  // --- 3. COMUNICAÇÃO COM O DJANGO: VALIDAR OTP (LOGIN OU REGISTO) ---
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setIsAuthLoading(true);
    setAuthErro('');

    try {
      let endpoint = '';
      let payload = {};

      if (authMode === 'login') {
        endpoint = '/auth/login/';
        payload = { email: authEmail, otp: authOtp };
      } else {
        endpoint = '/auth/register/';
        payload = {
          nome: tempUserData.nome,
          email: authEmail,
          cpf: tempUserData.cpf,
          telefone: tempUserData.telefone,
          otp: authOtp
        };
      }

      const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.erro || 'Erro na validação do OTP.');
      }

      // Sucesso! O Django devolve os dados do utilizador confirmados
      setAppUser(data.usuario);
      closeAuthModal();

    } catch (error) {
      console.error(error);
      setAuthErro(error.message || 'Falha ao ligar à API Django.');
    } finally {
      setIsAuthLoading(false);
    }
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
    setAuthStep('email');
    setAuthMode('login');
    setAuthEmail('');
    setAuthNome('');
    setAuthCpf('');
    setAuthTelefone('');
    setAuthOtp('');
    setAuthErro('');
    setAuthMensagem('');
    setTempUserData(null);
  };

  // --- LÓGICA DO CARRINHO (Mantida local) ---
  const addToCart = (produto, tamanho) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.id === produto.id && item.tamanho === tamanho);
      if (existingItem) {
        return prevCart.map(item =>
          (item.id === produto.id && item.tamanho === tamanho) ? { ...item, quantidade: item.quantidade + 1 } : item
        );
      }
      return [...prevCart, { ...produto, tamanho, quantidade: 1 }];
    });
    setIsCartOpen(true);
  };

  const updateQuantity = (id, tamanho, delta) => {
    setCart(prevCart => prevCart.map(item => {
      if (item.id === id && item.tamanho === tamanho) {
        return { ...item, quantidade: Math.max(1, item.quantidade + delta) };
      }
      return item;
    }));
  };

  const removeFromCart = (id, tamanho) => {
    setCart(prevCart => prevCart.filter(item => !(item.id === id && item.tamanho === tamanho)));
  };

  const cartTotal = useMemo(() => cart.reduce((total, item) => total + (item.preco * item.quantidade), 0), [cart]);
  const cartItemsCount = cart.reduce((count, item) => count + item.quantidade, 0);

  const produtosFiltrados = useMemo(() => {
    return produtos.filter(p => {
      const matchCategoria = filtroCategoria === "Todas" || p.categoria === filtroCategoria;
      const matchBusca = p.nome_camisa?.toLowerCase().includes(busca.toLowerCase());
      return matchCategoria && matchBusca;
    });
  }, [filtroCategoria, busca, produtos]);

  return (
    <div className="min-h-screen w-full bg-gray-50 font-sans text-gray-800 flex flex-col">
      {/* NAVBAR */}
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
                <input
                  type="text" placeholder="Buscar camisas..." value={busca} onChange={(e) => setBusca(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 rounded-md bg-slate-800 text-gray-300 placeholder-gray-400 focus:outline-none focus:bg-white focus:text-gray-900 focus:border-green-500 sm:text-sm"
                />
              </div>
            </div>

            <div className="flex items-center gap-4 sm:gap-6">
              {appUser ? (
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-sm font-bold border border-green-500">
                    {appUser.nome.charAt(0).toUpperCase()}
                  </div>
                  <div className="hidden sm:flex flex-col">
                    <span className="text-sm font-bold text-white leading-tight">{appUser.nome.split(' ')[0]}</span>
                    <button onClick={() => setAppUser(null)} className="text-xs text-gray-400 hover:text-white text-left">Sair</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setIsAuthModalOpen(true)} className="flex items-center gap-1.5 text-sm font-medium text-gray-300 hover:text-white transition-colors">
                  <User className="w-5 h-5" /> <span className="hidden sm:block">Entrar / Registar</span>
                </button>
              )}

              <button onClick={() => setIsCartOpen(true)} className="relative p-2 text-gray-300 hover:text-white transition-colors">
                <ShoppingCart className="h-6 w-6" />
                {cartItemsCount > 0 && (
                  <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold text-white transform translate-x-1/4 -translate-y-1/4 bg-green-500 rounded-full">
                    {cartItemsCount}
                  </span>
                )}
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
              <button
                key={cat} onClick={() => setFiltroCategoria(cat)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${filtroCategoria === cat ? 'bg-slate-900 text-white' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'}`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
          {produtosFiltrados.length > 0 ? (
            produtosFiltrados.map((produto) => <ProductCard key={produto.id} produto={produto} onAdd={addToCart} />)
          ) : (
            <div className="col-span-full text-center py-12 text-gray-500">Nenhuma camisa encontrada.</div>
          )}
        </div>
      </main>

      {/* CARRINHO MODAL (Omitido o código longo de UI do carrinho que não mudou) */}
      {isCartOpen && (
        <div className="fixed inset-0 z-40 overflow-hidden">
          <div className="absolute inset-0 bg-black bg-opacity-50 transition-opacity" onClick={() => setIsCartOpen(false)} />
          <div className="fixed inset-y-0 right-0 max-w-full flex z-50">
            <div className="w-screen max-w-md w-full flex flex-col bg-white shadow-xl">
              <div className="flex items-center justify-between px-4 py-6 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">Carrinho</h2>
                <button onClick={() => setIsCartOpen(false)} className="text-gray-400 hover:text-gray-500"><X className="h-6 w-6" /></button>
              </div>
              <div className="flex-1 overflow-y-auto px-4 py-6">
                {cart.length === 0 ? (
                  <p className="text-center text-gray-500 py-10">Carrinho vazio.</p>
                ) : (
                  <ul className="divide-y divide-gray-200">
                    {cart.map((item) => (
                      <li key={`${item.id}-${item.tamanho}`} className="py-6 flex">
                        <img src={item.imagem} alt={item.nome_camisa} className="w-20 h-20 object-cover rounded" />
                        <div className="ml-4 flex-1 flex flex-col">
                          <h3 className="text-sm font-medium">{item.nome_camisa}</h3>
                          <p className="text-sm text-gray-500">Tam: {item.tamanho}</p>
                          <div className="mt-auto flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <button onClick={() => updateQuantity(item.id, item.tamanho, -1)}><Minus className="h-4 w-4" /></button>
                              <span>{item.quantidade}</span>
                              <button onClick={() => updateQuantity(item.id, item.tamanho, 1)}><Plus className="h-4 w-4" /></button>
                            </div>
                            <p className="font-medium">R$ {(item.preco * item.quantidade).toFixed(2)}</p>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {cart.length > 0 && (
                <div className="p-6 border-t bg-gray-50">
                  <div className="flex justify-between font-bold mb-4"><span>Total</span><span>R$ {cartTotal.toFixed(2)}</span></div>
                  <button className="w-full bg-green-600 text-white py-3 rounded-md font-medium hover:bg-green-700">Finalizar Compra</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL LOGIN / REGISTO DB COM INTEGRAÇÃO DJANGO */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black bg-opacity-60 transition-opacity" onClick={closeAuthModal} />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden z-50">
            <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-xl text-slate-900">
                {authStep === 'email' && 'Acesso E-commerce'}
                {authStep === 'register' && 'Novo Registo'}
                {authStep === 'otp' && (authMode === 'login' ? 'Validação OTP' : 'Confirmar Registo')}
              </h3>
              <button onClick={closeAuthModal} className="text-gray-400 hover:text-gray-600"><X className="w-6 h-6" /></button>
            </div>
            
            <div className="p-6">
              {authErro && <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">{authErro}</div>}
              {authMensagem && <div className="mb-4 p-3 bg-blue-50 text-blue-700 text-sm rounded-lg border border-blue-100 font-medium">{authMensagem}</div>}
              
              {authStep === 'email' && (
                <form onSubmit={handleCheckEmail} className="space-y-4">
                  <p className="text-sm text-gray-500 mb-2">Introduza o seu e-mail. Se não tiver conta, criaremos uma.</p>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
                    <input type="email" required value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" placeholder="exemplo@email.com" />
                  </div>
                  <button type="submit" disabled={isAuthLoading} className="w-full bg-slate-900 text-white font-medium py-2.5 rounded-lg hover:bg-slate-800 disabled:opacity-70 flex justify-center items-center">
                    {isAuthLoading ? <span className="animate-pulse">A comunicar com o Backend...</span> : 'Continuar'}
                  </button>
                </form>
              )}

              {authStep === 'register' && (
                <form onSubmit={handleRegisterFormSubmit} className="space-y-4">
                  <p className="text-sm text-gray-600 mb-2">E-mail não encontrado. Preencha os dados abaixo:</p>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
                    <input type="email" value={authEmail} disabled className="w-full px-4 py-2 border border-gray-200 bg-gray-50 rounded-lg text-gray-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo</label>
                    <input type="text" required value={authNome} onChange={(e) => setAuthNome(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">CPF</label>
                      <input type="text" required value={authCpf} onChange={(e) => setAuthCpf(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500" placeholder="000.000.000-00"/>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
                      <input type="tel" required value={authTelefone} onChange={(e) => setAuthTelefone(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500" placeholder="(11) 9999-9999" />
                    </div>
                  </div>
                  <button type="submit" disabled={isAuthLoading} className="w-full bg-green-600 text-white font-medium py-2.5 rounded-lg hover:bg-green-700 mt-2 disabled:opacity-70">
                    Receber OTP de Validação
                  </button>
                </form>
              )}

              {authStep === 'otp' && (
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Código de 6 dígitos</label>
                    <input type="text" required maxLength={6} value={authOtp} onChange={(e) => setAuthOtp(e.target.value)} className="w-full px-4 py-3 text-center text-2xl tracking-widest border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 font-mono" placeholder="------" />
                    <p className="text-xs text-gray-400 text-center mt-2">O Django espera o código "123456"</p>
                  </div>
                  <button type="submit" disabled={isAuthLoading || authOtp.length !== 6} className="w-full bg-slate-900 text-white font-medium py-2.5 rounded-lg hover:bg-slate-800 disabled:opacity-70">
                    {isAuthLoading ? 'A verificar no Backend...' : (authMode === 'login' ? 'Validar Acesso' : 'Confirmar Registo')}
                  </button>
                  <button type="button" onClick={() => { setAuthStep('email'); setTempUserData(null); }} className="w-full text-center text-sm text-green-600 hover:underline mt-2">
                    Voltar e alterar e-mail
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ProductCard({ produto, onAdd }) {
  const [tamanho, setTamanho] = useState('M');
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col hover:shadow-md transition-shadow">
      <div className="relative pt-[120%] bg-gray-100">
        <img src={produto.imagem} alt={produto.nome_camisa} className="absolute inset-0 w-full h-full object-cover" />
      </div>
      <div className="p-5 flex flex-col flex-1">
        <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 min-h-[40px]">{produto.nome_camisa}</h3>
        <p className="text-xl font-bold text-slate-900 mt-2 mb-4">R$ {Number(produto.preco).toFixed(2)}</p>
        <div className="mt-auto">
          <div className="flex gap-1 mb-3">
            {['P', 'M', 'G', 'GG'].map(t => (
              <button key={t} onClick={() => setTamanho(t)} className={`w-7 h-7 text-xs font-bold border rounded ${tamanho === t ? 'bg-slate-900 text-white' : 'text-gray-600'}`}>
                {t}
              </button>
            ))}
          </div>
          <button onClick={() => onAdd(produto, tamanho)} className="w-full bg-slate-900 text-white py-2 rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-slate-800">
            <ShoppingCart className="h-4 w-4" /> Adicionar
          </button>
        </div>
      </div>
    </div>
  );
}