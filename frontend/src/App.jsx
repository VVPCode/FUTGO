import React, { useState, useMemo, useEffect, useRef } from 'react';
import { ShoppingCart, Search, X, Plus, Minus, Trash2, User, Settings, LogOut, AlertTriangle, Loader2, Mail, MapPin, MapPinned, ShieldAlert, Edit, PlusCircle, Image as ImageIcon, Filter, Menu, Check, ChevronLeft, ChevronRight, UploadCloud, Truck, Box, CreditCard, CheckCircle, BellRing, ExternalLink, QrCode, Barcode, ShieldCheck, Sparkles, MessageCircle } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, FacebookAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from 'firebase/auth';
import { getFirestore, collection, query, where, onSnapshot } from 'firebase/firestore';

const CATEGORIAS = ["Todas", "Nacional", "Europa", "Seleções"];
const API_BASE_URL = 'http://localhost:8000/api';

const getFirebaseConfig = () => {
  try {
    return {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID
    };
  } catch (e) {
    return {};
  }
};

const firebaseConfig = getFirebaseConfig();

let firebaseAuth, googleProvider, facebookProvider, dbFrontend;
try {
  if (firebaseConfig.apiKey) {
    const app = initializeApp(firebaseConfig);
    firebaseAuth = getAuth(app);
    dbFrontend = getFirestore(app);
    googleProvider = new GoogleAuthProvider();
    googleProvider.addScope('email');
    googleProvider.addScope('profile');
    facebookProvider = new FacebookAuthProvider();
    facebookProvider.addScope('email');
    facebookProvider.setCustomParameters({ display: 'popup' });
    googleProvider.setCustomParameters({ prompt: 'select_account' });
  }
} catch (error) {
  console.warn("Aviso: Firebase não inicializado.");
}

const formatarIdentificador = (val) => {
  if (!val) return '';
  const str = val.trim();
  if (str.includes('@')) return str.toLowerCase();
  const numbers = str.replace(/\D/g, '');
  if (numbers.length === 0) return str;
  if (numbers.startsWith('55')) return numbers;
  return `55${numbers}`;
};

export default function App() {
  const [appUser, setAppUser] = useState(null);
  const [produtos, setProdutos] = useState([]);
  const [isLoadingProdutos, setIsLoadingProdutos] = useState(true);
  const isLoggingInRef = useRef(false);

  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [filtroCategoria, setFiltroCategoria] = useState("Todas");
  const [busca, setBusca] = useState("");

  const [isFilterSidebarOpen, setIsFilterSidebarOpen] = useState(false);
  const [filtrosAvancados, setFiltrosAvancados] = useState({
    precoMin: '', precoMax: '', cores: [], tamanhos: [], paises: [], ligas: [],
    temporadas: [], tipos: [], marcas: [], generos: [], personalizavel: false
  });

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

  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profileTab, setProfileTab] = useState('dados');
  const [editNome, setEditNome] = useState('');
  const [editTelefone, setEditTelefone] = useState('');
  const [editCpf, setEditCpf] = useState('');
 
  // NOVOS ESTADOS PARA PREFERÊNCIAS DE NOTIFICAÇÃO
  const [notificaEmail, setNotificaEmail] = useState(true);
  const [notificaWhatsapp, setNotificaWhatsapp] = useState(true);
 
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

  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [adminTab, setAdminTab] = useState('lista');
  const [adminProdutoEditing, setAdminProdutoEditing] = useState(null);
  const [prodNome, setProdNome] = useState('');
  const [prodPreco, setProdPreco] = useState('');
  const [prodCategoria, setProdCategoria] = useState('Nacional');
  const [prodImagem, setProdImagem] = useState('');
  const [prodImagensSalvas, setProdImagensSalvas] = useState([]);
  const [prodNovosArquivos, setProdNovosArquivos] = useState([]);
  const [prodCores, setProdCores] = useState([]);
  const [prodPais, setProdPais] = useState('');
  const [prodLiga, setProdLiga] = useState('');
  const [prodTamanhos, setProdTamanhos] = useState(['P', 'M', 'G', 'GG']);
  const [prodTemporada, setProdTemporada] = useState('');
  const [prodTipo, setProdTipo] = useState('Primeira Camisa');
  const [prodMarca, setProdMarca] = useState('');
  const [prodGenero, setProdGenero] = useState('Unissex');
  const [prodPersonalizavel, setProdPersonalizavel] = useState(false);
  const [adminErro, setAdminErro] = useState('');
  const [isAdminLoading, setIsAdminLoading] = useState(false);
  const [todosPedidos, setTodosPedidos] = useState([]);

  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState(1);
  const [checkoutData, setCheckoutData] = useState({ endereco: null, frete: null });
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutErro, setCheckoutErro] = useState('');
 
  const [pedidosUsuario, setPedidosUsuario] = useState([]);
  const [notificacaoInApp, setNotificacaoInApp] = useState(null);
 
  const [recomendacoesCarrinho, setRecomendacoesCarrinho] = useState([]);

  const isUserAdmin = appUser?.email === 'admin@futgo.com' || appUser?.is_admin === true;

  useEffect(() => {
    const fetchRecomendacoes = async () => {
      if (cart.length > 0 && isCartOpen) {
        const baseItem = cart[cart.length - 1];
       
        try {
          const res = await fetch(`${API_BASE_URL}/recomendacoes/?produto_id=${baseItem.id}`);
          if (res.ok) {
            const data = await res.json();
            const sugestoesLimpidas = (data || []).filter(rec => !cart.some(itemCart => itemCart.id === rec.id));
            if (sugestoesLimpidas.length >= 3) {
              setRecomendacoesCarrinho(sugestoesLimpidas.slice(0, 4));
            } else {
              preencherRecomendacoes(baseItem, sugestoesLimpidas);
            }
          } else {
            preencherRecomendacoes(baseItem, []);
          }
        } catch (error) {
          preencherRecomendacoes(baseItem, []);
        }
      } else {
        setRecomendacoesCarrinho([]);
      }
    };

    fetchRecomendacoes();
  }, [cart, isCartOpen, produtos]);

  const preencherRecomendacoes = (baseItem, sugestoesIniciais) => {
    const idsJaSugeridos = sugestoesIniciais.map(s => s.id);
    let disponiveis = produtos.filter(p => p.id !== baseItem.id && !cart.some(itemCart => itemCart.id === p.id) && !idsJaSugeridos.includes(p.id));
    let mesmaCategoria = disponiveis.filter(p => p.categoria === baseItem.categoria);
    let outrasCategorias = disponiveis.filter(p => p.categoria !== baseItem.categoria);
    let recsFinais = [...sugestoesIniciais, ...mesmaCategoria, ...outrasCategorias];
    setRecomendacoesCarrinho(recsFinais.slice(0, 4));
  };

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const statusPagamento = urlParams.get('pagamento');
   
    if (statusPagamento === 'sucesso') {
      mostrarNotificacao('Pagamento Aprovado! 🎉', 'O seu pagamento foi processado com sucesso. O pedido será enviado em breve!');
      window.history.replaceState({}, document.title, window.location.pathname);
      setCart([]);
    } else if (statusPagamento === 'falha') {
      mostrarNotificacao('Pagamento Cancelado ❌', 'O pagamento não foi concluído. Pode tentar novamente na secção dos seus pedidos.');
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  useEffect(() => {
    if (!appUser || !dbFrontend) return;
    if (appUser.email === 'admin@futgo.com') return;

    if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
      Notification.requestPermission();
    }

    let isInitialLoad = true;
    const previousStatuses = new Map();

    const q = query(collection(dbFrontend, 'pedidos'), where('id_usuario', '==', Number(appUser.id_usuario)));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const pedidosAtualizados = [];
     
      snapshot.docChanges().forEach((change) => {
        const pedido = change.doc.data();
       
        if (change.type === 'added') {
          previousStatuses.set(pedido.id_pedido, pedido.status);
          if (!isInitialLoad) {
            mostrarNotificacao('Pedido Registado! ⚽', `Pedido ${pedido.id_pedido} criado.`);
          }
        }
       
        if (change.type === 'modified') {
          const oldStatus = previousStatuses.get(pedido.id_pedido);
          if (oldStatus !== pedido.status) {
            previousStatuses.set(pedido.id_pedido, pedido.status);
            mostrarNotificacao(`Atualização no Pedido!`, `Status mudou para: ${pedido.status}`);
          }
        }
      });

      snapshot.forEach(doc => pedidosAtualizados.push(doc.data()));
      pedidosAtualizados.sort((a, b) => new Date(b.data_pedido) - new Date(a.data_pedido));
      setPedidosUsuario(pedidosAtualizados);
     
      isInitialLoad = false;
    });

    return () => unsubscribe();
  }, [appUser]);

  useEffect(() => {
    if (notificacaoInApp) {
      const timer = setTimeout(() => setNotificacaoInApp(null), 6000);
      return () => clearTimeout(timer);
    }
  }, [notificacaoInApp]);

  const mostrarNotificacao = (titulo, mensagem) => {
    if (Notification.permission === 'granted') { new Notification(titulo, { body: mensagem }); }
    setNotificacaoInApp({ titulo, mensagem, id: Date.now() });
  };

  useEffect(() => {
    fetchProdutos();
    if (firebaseAuth) {
      const unsubscribe = onAuthStateChanged(firebaseAuth, async (user) => {
        if (user && !appUser && !isLoggingInRef.current) {
          try {
            await new Promise(resolve => setTimeout(resolve, 2000));
            const token = await user.getIdToken();
            const fallbackEmail = user.email || user.providerData[0]?.email || "";
            if (!fallbackEmail) return;
            const fallbackName = user.displayName || user.providerData[0]?.displayName || "Utilizador";

            const res = await fetch(`${API_BASE_URL}/auth/social/`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, fallbackEmail, fallbackName }) });
            if (res.ok) { const data = await res.json(); setAppUser(data.usuario); }
          } catch (e) { console.error("Falha ao recuperar sessão:", e); }
        }
      });
      return () => unsubscribe();
    }
  }, []);

  useEffect(() => { return () => { prodNovosArquivos.forEach(item => URL.revokeObjectURL(item.preview)); }; }, [prodNovosArquivos]);

  const fetchProdutos = async () => {
    setIsLoadingProdutos(true);
    try {
      const res = await fetch(`${API_BASE_URL}/produtos/`);
      const data = await res.json();
      if (res.ok) setProdutos(data);
    } catch (error) { console.error("Erro ao puxar produtos:", error); }
    finally { setIsLoadingProdutos(false); }
  };

  const handleSocialLogin = async (provider) => {
    if (!firebaseAuth) return setAuthErro("Firebase não configurado.");
    setIsAuthLoading(true); setAuthErro(''); isLoggingInRef.current = true;
    try {
      const result = await signInWithPopup(firebaseAuth, provider);
      await new Promise(resolve => setTimeout(resolve, 2000));
      const token = await result.user.getIdToken();
      const fallbackEmail = result.user.email || result.user.providerData[0]?.email || "";
      if (!fallbackEmail) throw new Error("O seu provedor não partilhou o e-mail.");
      const fallbackName = result.user.displayName || result.user.providerData[0]?.displayName || "Utilizador";
     
      const res = await fetch(`${API_BASE_URL}/auth/social/`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, fallbackEmail, fallbackName }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.erro || 'Falha na sincronização.');
      setAppUser(data.usuario); closeAuthModal();
    } catch (error) { setAuthErro(error.message); }
    finally { setIsAuthLoading(false); isLoggingInRef.current = false; }
  };

  const handleCheckAuth = async (e) => {
    e.preventDefault();
    if (!authEmail) return;
    setIsAuthLoading(true); setAuthErro(''); setAuthMensagem('');
    try {
      const identificadorFormatado = formatarIdentificador(authEmail);
      const res = await fetch(`${API_BASE_URL}/auth/check/`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ identificador: identificadorFormatado }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.erro || 'Erro no servidor Django.');
     
      if (data.existe) { setAuthMode('login'); await triggerSendOTP(identificadorFormatado, data.metodo); }
      else {
        setAuthMode('register'); setAuthStep('register');
        if (!authEmail.includes('@')) setAuthTelefone(authEmail.replace(/\D/g, ''));
        setIsAuthLoading(false);
      }
    } catch (error) { setAuthErro(error.message); setIsAuthLoading(false); }
  };

  const triggerSendOTP = async (identificadorOverride = null, metodoOverride = null) => {
    setIsAuthLoading(true);
    try {
      const iden = identificadorOverride || formatarIdentificador(authEmail);
      const mtd = metodoOverride || (authEmail.includes('@') ? 'email' : 'whatsapp');
      const res = await fetch(`${API_BASE_URL}/auth/send-otp/`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ identificador: iden, method: mtd }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.erro || 'Erro ao enviar código.');
      setAuthMensagem(`Código enviado para ${iden}.`); setAuthStep('otp');
    } catch (error) { setAuthErro(error.message); throw error; }
    finally { setIsAuthLoading(false); }
  };

  const handleRegisterFormSubmit = async (e) => {
    e.preventDefault();
    if (!authNome || !authCpf || !authTelefone) return setAuthErro('Preencha os campos.');
    setIsAuthLoading(true); setAuthErro(''); setAuthMensagem('');
    setTempUserData({ nome: authNome, cpf: authCpf, telefone: authTelefone });
    try { await triggerSendOTP(); } catch (e) {}
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setIsAuthLoading(true); setAuthErro('');
    try {
      const identificadorFormatado = formatarIdentificador(authEmail);
      let endpoint = authMode === 'login' ? '/auth/login/' : '/auth/register/';
      let payload = authMode === 'login'
        ? { identificador: identificadorFormatado, otp: authOtp }
        : { nome: tempUserData.nome, email: authEmail.includes('@') ? authEmail : '', cpf: tempUserData.cpf, telefone: tempUserData.telefone, identificador: identificadorFormatado, otp: authOtp };
     
      const res = await fetch(`${API_BASE_URL}${endpoint}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.erro || 'Código inválido.');
     
      setAppUser(data.usuario); closeAuthModal();
    } catch (error) { setAuthErro(error.message); } finally { setIsAuthLoading(false); }
  };

  const closeAuthModal = () => { setIsAuthModalOpen(false); setAuthStep('email'); setAuthMode('login'); setAuthEmail(''); setAuthNome(''); setAuthCpf(''); setAuthTelefone(''); setAuthOtp(''); setAuthErro(''); setAuthMensagem(''); };

  const openProfileModal = async () => {
    setIsProfileModalOpen(true); setProfileTab('dados'); setProfileErro(''); setProfileSucesso(''); setIsConfirmingDelete(false); setIsProfileLoading(false);
    setEditNome(appUser.nome); setEditTelefone(appUser.telefone); setEditCpf(appUser.cpf || '');
   
    // Inicia os toggles, se não existir o campo, assume true (para novos e antigos utilizadores)
    setNotificaEmail(appUser.notifica_email !== false);
    setNotificaWhatsapp(appUser.notifica_whatsapp !== false);

    setIsFetchingData(true);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/user/${appUser.id_usuario}/`);
      const data = await res.json();
      if (res.ok) {
        setAppUser(data.usuario);
        setEditNome(data.usuario.nome);
        setEditTelefone(data.usuario.telefone);
        setEditCpf(data.usuario.cpf || '');
        setNotificaEmail(data.usuario.notifica_email !== false);
        setNotificaWhatsapp(data.usuario.notifica_whatsapp !== false);
      }
      await fetchEnderecos();
    } catch (error) {} finally { setIsFetchingData(false); }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setIsProfileLoading(true); setProfileErro(''); setProfileSucesso('');
    try {
      const payload = {
        nome: editNome,
        telefone: editTelefone,
        notifica_email: notificaEmail,
        notifica_whatsapp: notificaWhatsapp
      };
      if (!appUser.cpf && editCpf) payload.cpf = editCpf;
     
      const res = await fetch(`${API_BASE_URL}/auth/user/${appUser.id_usuario}/`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json().catch(()=>({}));
      if (!res.ok) throw new Error(data.erro || 'Erro ao atualizar.');
      setAppUser(data.usuario); setProfileSucesso('Perfil e preferências guardadas!');
    } catch (error) { setProfileErro(error.message); } finally { setIsProfileLoading(false); }
  };

  const handleLogout = async () => {
    try { if (firebaseAuth) await signOut(firebaseAuth); } catch (error) { console.error("Erro ao sair:", error); }
    setAppUser(null); setIsProfileModalOpen(false); setCart([]); setPedidosUsuario([]);
  };

  const handleDeleteAccount = async () => {
    setIsProfileLoading(true); setProfileErro('');
    try {
      const res = await fetch(`${API_BASE_URL}/auth/user/${appUser.id_usuario}/`, { method: 'DELETE' });
      const data = await res.json().catch(()=>({}));
      if (!res.ok) throw new Error(data.erro || 'Erro ao apagar conta.');
      if (firebaseAuth) await signOut(firebaseAuth);
      setAppUser(null); setIsProfileModalOpen(false); alert("Conta apagada.");
    } catch (error) { setProfileErro(error.message); } finally { setIsProfileLoading(false); }
  };

  const fetchEnderecos = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/user/${appUser.id_usuario}/enderecos/`);
      const data = await res.json();
      if (res.ok) setEnderecos(data.enderecos || []);
    } catch (error) {}
  };

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
        if (data.erro) { setProfileErro('CEP não encontrado.'); return; }
        setEndRua(data.logradouro || ''); setEndBairro(data.bairro || ''); setEndCidade(data.localidade || ''); setEndEstado(data.uf || '');
        document.getElementById('endNumeroInput')?.focus(); setProfileSucesso('Endereço localizado!');
      } catch (error) { setProfileErro('Falha nos Correios.'); } finally { setIsBuscandoCep(false); }
    }
  };

  const handleAddEndereco = async (e) => {
    e.preventDefault();
    setIsProfileLoading(true); setProfileErro(''); setProfileSucesso('');
    try {
      const payload = { cep: endCep.replace(/\D/g, ''), rua: endRua, numero: endNumero, complemento: endComplemento, bairro: endBairro, cidade: endCidade, estado: endEstado };
      const res = await fetch(`${API_BASE_URL}/auth/user/${appUser.id_usuario}/enderecos/`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json().catch(()=>({}));
      if (!res.ok) throw new Error(data.erro || 'Erro ao guardar.');
      setEnderecos([...enderecos, data.endereco]); setProfileSucesso('Endereço adicionado!'); setProfileTab('enderecos');
      setEndCep(''); setEndRua(''); setEndNumero(''); setEndComplemento(''); setEndBairro(''); setEndCidade(''); setEndEstado('');
    } catch (error) { setProfileErro(error.message); } finally { setIsProfileLoading(false); }
  };

  const handleDeleteEndereco = async (id_endereco) => {
    if(!window.confirm('Apagar este endereço?')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/auth/endereco/${id_endereco}/`, { method: 'DELETE' });
      if (res.ok) { setEnderecos(enderecos.filter(end => end.id_endereco !== id_endereco)); setProfileSucesso('Endereço apagado.'); }
    } catch (error) { setProfileErro('Erro ao apagar.'); }
  };

  const handleIniciarCheckout = () => {
    setIsCartOpen(false);
    if (!appUser) { setIsAuthModalOpen(true); return; }
    if (enderecos.length === 0) fetchEnderecos();
    setIsCheckoutOpen(true); setCheckoutStep(1); setCheckoutErro('');
  };

  const handleFinalizarCompra = async () => {
    setCheckoutLoading(true);
    setCheckoutErro('');
    try {
      const payload = {
        itens: cart.map(i => ({ id: i.id, nome_camisa: i.nome_camisa, tamanho: i.tamanho, quantidade: i.quantidade, preco: i.preco })),
        endereco_id: checkoutData.endereco.id_endereco,
        frete: checkoutData.frete,
        total: cartTotal + checkoutData.frete.valor
      };
     
      const res = await fetch(`${API_BASE_URL}/pedidos/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-ID': appUser.id_usuario },
        body: JSON.stringify(payload)
      });
     
      const data = await res.json();
      if (!res.ok) throw new Error(data.erro || 'Falha ao processar o pedido.');
     
      if (data.pagamento_url) {
        window.location.href = data.pagamento_url;
      } else {
        throw new Error("Erro de Integração: Link não gerado. Verifique a chave da Gateway no .env do backend.");
      }
     
    } catch (error) {
      setCheckoutErro(error.message);
      setCheckoutLoading(false);
    }
  };

  const fetchTodosPedidos = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/pedidos/admin/`, { headers: {'X-User-ID': appUser.id_usuario} });
      if (res.ok) {
        const data = await res.json();
        setTodosPedidos(data);
      }
    } catch(e) { console.error("Erro ao puxar todos os pedidos:", e); }
  };

  const updatePedidoStatus = async (id_pedido, status) => {
    try {
      const res = await fetch(`${API_BASE_URL}/pedidos/${id_pedido}/status/`, { method: 'PUT', headers: {'Content-Type': 'application/json', 'X-User-ID': appUser.id_usuario}, body: JSON.stringify({ status }) });
      if (res.ok) { fetchTodosPedidos(); }
      else { const data = await res.json(); setAdminErro(data.erro || "Falha ao atualizar o status"); }
    } catch(e) { console.error(e); }
  };

  const openAdminModal = () => { setAdminTab('lista'); setIsAdminModalOpen(true); setAdminErro(''); setIsAdminLoading(false); fetchTodosPedidos(); };

  const handleAdminEdit = (produto) => {
    setAdminErro(''); setAdminProdutoEditing(produto);
    setProdNome(produto.nome_camisa); setProdPreco(produto.preco); setProdCategoria(produto.categoria); setProdImagem(produto.imagem || '');
    setProdCores(produto.cores || []); setProdPais(produto.pais || ''); setProdLiga(produto.liga || ''); setProdTamanhos(produto.tamanhos || ['P', 'M', 'G', 'GG']);
    setProdTemporada(produto.temporada || ''); setProdTipo(produto.tipo_uniforme || 'Primeira Camisa'); setProdMarca(produto.marca || '');
    setProdGenero(produto.genero || 'Unissex'); setProdPersonalizavel(produto.personalizavel || false);
    const imagensExistentes = produto.imagens && produto.imagens.length > 0 ? produto.imagens : (produto.imagem ? [produto.imagem] : []);
    setProdImagensSalvas(imagensExistentes); setProdNovosArquivos([]); setAdminTab('formulario');
  };

  const handleAdminNew = () => {
    setAdminErro(''); setAdminProdutoEditing(null);
    setProdNome(''); setProdPreco(''); setProdCategoria('Nacional'); setProdImagem('');
    setProdCores([]); setProdPais(''); setProdLiga(''); setProdTamanhos(['P', 'M', 'G', 'GG']);
    setProdTemporada(''); setProdTipo('Primeira Camisa'); setProdMarca(''); setProdGenero('Unissex'); setProdPersonalizavel(false);
    setProdImagensSalvas([]); setProdNovosArquivos([]); setAdminTab('formulario');
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    const novosItens = files.map(file => ({ file, preview: URL.createObjectURL(file) }));
    setProdNovosArquivos(prev => [...prev, ...novosItens]); e.target.value = null;
  };

  const removerNovaImagem = (index) => { setProdNovosArquivos(prev => { const updated = [...prev]; URL.revokeObjectURL(updated[index].preview); updated.splice(index, 1); return updated; }); };
  const removerImagemSalva = (index) => { setProdImagensSalvas(prev => { const updated = [...prev]; updated.splice(index, 1); return updated; }); };

  const handleAdminSaveProduct = async (e) => {
    e.preventDefault();
    if (prodImagensSalvas.length === 0 && prodNovosArquivos.length === 0 && !prodImagem) { setAdminErro('É obrigatório adicionar pelo menos uma imagem.'); return; }
    setIsAdminLoading(true); setAdminErro(''); let urlsFinais = [...prodImagensSalvas];
    try {
      if (prodNovosArquivos.length > 0) {
        const formData = new FormData(); prodNovosArquivos.forEach(item => { formData.append('imagens', item.file); });
        const uploadRes = await fetch(`${API_BASE_URL}/upload-imagens/`, { method: 'POST', headers: { 'X-User-ID': appUser.id_usuario }, body: formData });
        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) throw new Error(uploadData.erro || 'Falha ao guardar os ficheiros no servidor.');
        urlsFinais = [...urlsFinais, ...uploadData.urls];
      }
      if(urlsFinais.length === 0 && prodImagem) urlsFinais = [prodImagem];
      const headers = { 'Content-Type': 'application/json', 'X-User-ID': appUser.id_usuario };
      const payload = { nome_camisa: prodNome, preco: parseFloat(prodPreco), categoria: prodCategoria, imagem: urlsFinais[0] || prodImagem, imagens: urlsFinais, cores: prodCores, pais: prodPais.trim().toLowerCase(), liga: prodLiga.trim().toLowerCase(), tamanhos: prodTamanhos, temporada: prodTemporada.trim(), tipo_uniforme: prodTipo, marca: prodMarca.trim().toLowerCase(), genero: prodGenero, personalizavel: prodPersonalizavel };
      if (adminProdutoEditing) {
        const res = await fetch(`${API_BASE_URL}/produtos/${adminProdutoEditing.id}/`, { method: 'PUT', headers, body: JSON.stringify(payload) });
        const data = await res.json().catch(()=>({}));
        if (!res.ok) throw new Error(data.erro || 'Falha ao atualizar produto.');
        setProdutos(produtos.map(p => p.id === adminProdutoEditing.id ? data.produto : p));
      } else {
        const res = await fetch(`${API_BASE_URL}/produtos/`, { method: 'POST', headers, body: JSON.stringify(payload) });
        const data = await res.json().catch(()=>({}));
        if (!res.ok) throw new Error(data.erro || 'Falha ao criar produto.');
        setProdutos([...produtos, data.produto]);
      }
      setAdminTab('lista');
    } catch (error) { setAdminErro(error.message); } finally { setIsAdminLoading(false); }
  };

  const handleAdminDeleteProduct = async (id) => {
    if(!window.confirm('Excluir este produto permanentemente?')) return;
    setIsAdminLoading(true); setAdminErro('');
    try {
      const res = await fetch(`${API_BASE_URL}/produtos/${id}/`, { method: 'DELETE', headers: { 'X-User-ID': appUser.id_usuario } });
      const data = await res.json().catch(()=>({}));
      if (!res.ok) throw new Error(data.erro || 'Falha ao apagar.');
      setProdutos(produtos.filter(p => p.id !== id)); setCart(cart.filter(item => item.id !== id));
    } catch (error) { setAdminErro(error.message); } finally { setIsAdminLoading(false); }
  };

  const addToCart = (produto, tamanho) => {
    const prodId = produto.id || produto.id_produto || produto._id;
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.id === prodId && item.tamanho === tamanho);
      if (existingItem) return prevCart.map(item => (item.id === prodId && item.tamanho === tamanho) ? { ...item, quantidade: item.quantidade + 1 } : item);
      return [...prevCart, { ...produto, id: prodId, tamanho, quantidade: 1 }];
    });
    setIsCartOpen(true);
  };
 
  const updateQuantity = (id, tamanho, delta) => setCart(prevCart => prevCart.map(item => item.id === id && item.tamanho === tamanho ? { ...item, quantidade: Math.max(1, item.quantidade + delta) } : item));
  const removeFromCart = (id, tamanho) => setCart(prevCart => prevCart.filter(item => !(item.id === id && item.tamanho === tamanho)));
  const cartTotal = useMemo(() => cart.reduce((total, item) => total + (item.preco * item.quantidade), 0), [cart]);
  const cartItemsCount = cart.reduce((count, item) => count + item.quantidade, 0);

  const opcoesFiltro = useMemo(() => {
    return {
      cores: [...new Set(produtos.flatMap(p => p.cores || []))], paises: [...new Set(produtos.map(p => p.pais).filter(Boolean))],
      ligas: [...new Set(produtos.map(p => p.liga).filter(Boolean))], temporadas: [...new Set(produtos.map(p => p.temporada).filter(Boolean))],
      tipos: [...new Set(produtos.map(p => p.tipo_uniforme).filter(Boolean))], marcas: [...new Set(produtos.map(p => p.marca).filter(Boolean))],
      generos: [...new Set(produtos.map(p => p.genero).filter(Boolean))]
    };
  }, [produtos]);

  const toggleFiltroArray = (tipo, valor) => { setFiltrosAvancados(prev => { const arrayAtual = prev[tipo]; const novoArray = arrayAtual.includes(valor) ? arrayAtual.filter(item => item !== valor) : [...arrayAtual, valor]; return { ...prev, [tipo]: novoArray }; }); };

  const produtosFiltrados = useMemo(() => {
    const termosBusca = busca.toLowerCase().trim().split(/\s+/);
    return produtos.filter(p => {
      const matchCategoria = filtroCategoria === "Todas" || p.categoria === filtroCategoria;
      if (!matchCategoria) return false;
      if (filtrosAvancados.precoMin && Number(p.preco) < Number(filtrosAvancados.precoMin)) return false;
      if (filtrosAvancados.precoMax && Number(p.preco) > Number(filtrosAvancados.precoMax)) return false;
      if (filtrosAvancados.personalizavel && !p.personalizavel) return false;
      if (filtrosAvancados.cores.length > 0 && (!p.cores || !filtrosAvancados.cores.some(c => p.cores.includes(c)))) return false;
      if (filtrosAvancados.paises.length > 0 && !filtrosAvancados.paises.includes(p.pais)) return false;
      if (filtrosAvancados.ligas.length > 0 && !filtrosAvancados.ligas.includes(p.liga)) return false;
      if (filtrosAvancados.temporadas.length > 0 && !filtrosAvancados.temporadas.includes(p.temporada)) return false;
      if (filtrosAvancados.tipos.length > 0 && !filtrosAvancados.tipos.includes(p.tipo_uniforme)) return false;
      if (filtrosAvancados.marcas.length > 0 && !filtrosAvancados.marcas.includes(p.marca)) return false;
      if (filtrosAvancados.generos.length > 0 && !filtrosAvancados.generos.includes(p.genero)) return false;
      if (filtrosAvancados.tamanhos.length > 0) { const pTamanhos = p.tamanhos || ['P', 'M', 'G', 'GG']; if (!filtrosAvancados.tamanhos.some(t => pTamanhos.includes(t))) return false; }
      if (termosBusca.length === 0 || termosBusca[0] === "") return true;
      const atributosDaCamisola = `${p.nome_camisa || ''} ${p.categoria || ''} ${p.preco || ''} ${(p.cores || []).join(' ')} ${p.pais || ''} ${p.liga || ''} ${p.temporada || ''} ${p.tipo_uniforme || ''} ${p.marca || ''}`.toLowerCase();
      return termosBusca.every(termo => atributosDaCamisola.includes(termo));
    });
  }, [filtroCategoria, busca, produtos, filtrosAvancados]);

  return (
    <div className="min-h-screen w-full bg-gray-50 font-sans text-gray-800 flex flex-col relative">
     
      {/* TOAST NOTIFICATION UI */}
      {notificacaoInApp && (
        <div className="fixed top-20 right-4 z-[100] bg-white border-l-4 border-green-500 shadow-2xl rounded-lg p-4 w-80 flex items-start gap-3 transition-all duration-300">
          <div className="bg-green-100 p-2 rounded-full flex-shrink-0">
            <BellRing className="w-5 h-5 text-green-600" />
          </div>
          <div className="flex-1">
            <h4 className="font-bold text-gray-900 text-sm">{notificacaoInApp.titulo}</h4>
            <p className="text-gray-600 text-xs mt-1 leading-snug">{notificacaoInApp.mensagem}</p>
          </div>
          <button onClick={() => setNotificacaoInApp(null)} className="text-gray-400 hover:text-gray-600 flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <nav className="bg-slate-900 text-white sticky top-0 z-40 shadow-md w-full">
        <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button onClick={() => setIsFilterSidebarOpen(true)} className="p-2 -ml-2 text-gray-300 hover:text-white transition-colors" title="Filtros Avançados">
                <Menu className="w-6 h-6" />
              </button>
              <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.location.reload()}>
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center font-bold text-slate-900">F!</div>
                <span className="font-bold text-xl tracking-tight hidden sm:block">FUTGO!</span>
              </div>
            </div>
           
            <div className="hidden md:block flex-1 max-w-2xl mx-8">
              <div className="relative">
                <Search className="absolute inset-y-0 left-3 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
                <input type="text" placeholder="Procurar camisetas..." value={busca} onChange={(e) => setBusca(e.target.value)} className="block w-full pl-10 pr-3 py-2 rounded-md bg-slate-800 text-gray-300 focus:bg-white focus:text-gray-900 transition-colors" />
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
            {produtosFiltrados.length > 0 ? produtosFiltrados.map((produto) => <ProductCard key={produto.id || Math.random()} produto={produto} onAdd={addToCart} />) : <div className="col-span-full text-center py-12 text-gray-500">Nenhum produto encontrado com estes filtros.</div>}
          </div>
        )}
      </main>

      {/* MODAL DE LOGIN */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black bg-opacity-60 transition-opacity" onClick={closeAuthModal} />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden z-50 p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-xl text-slate-900">Acesso</h3>
              <button onClick={closeAuthModal} className="text-gray-400 hover:text-gray-600"><X/></button>
            </div>
           
            {authErro && <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">{authErro}</div>}
            {authMensagem && <div className="mb-4 p-3 bg-blue-50 text-blue-700 text-sm rounded-lg font-medium flex items-start gap-2 border border-blue-100"><Mail className="w-5 h-5 flex-shrink-0" /> <p>{authMensagem}</p></div>}
           
            {authStep === 'email' && (
              <form onSubmit={handleCheckAuth} className="space-y-4">
                <input type="text" required value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" placeholder="E-mail ou WhatsApp (Ex: 11999999999)" />
                <button type="submit" disabled={isAuthLoading} className="w-full bg-slate-900 text-white py-2.5 rounded-lg disabled:opacity-70 hover:bg-slate-800 transition-colors font-medium">
                  {isAuthLoading ? 'A verificar...' : 'Continuar com E-mail / Celular'}
                </button>
                <div className="relative flex py-2 items-center">
                  <div className="flex-grow border-t border-gray-300"></div>
                  <span className="flex-shrink-0 mx-4 text-gray-400 text-sm">Ou entre com</span>
                  <div className="flex-grow border-t border-gray-300"></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button type="button" onClick={() => handleSocialLogin(googleProvider)} disabled={isAuthLoading} className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                    <img src="https://www.google.com/favicon.ico" className="w-4 h-4" alt="Google" />
                    <span className="text-sm font-medium text-gray-700">Google</span>
                  </button>
                  <button type="button" onClick={() => handleSocialLogin(facebookProvider)} disabled={isAuthLoading} className="flex items-center justify-center gap-2 px-4 py-2 border border-[#1877F2] bg-[#1877F2] rounded-lg hover:bg-blue-700 transition-colors text-white">
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                    <span className="text-sm font-medium">Facebook</span>
                  </button>
                </div>
              </form>
            )}

            {authStep === 'register' && (
              <form onSubmit={handleRegisterFormSubmit} className="space-y-4">
                <input type="text" placeholder="Nome Completo" required value={authNome} onChange={(e) => setAuthNome(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" />
                <input type="text" placeholder="CPF (Apenas números)" required value={authCpf} onChange={(e) => setAuthCpf(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" />
                <input type="tel" placeholder="Telefone (Com DDD)" required value={authTelefone} onChange={(e) => setAuthTelefone(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" />
                <button type="submit" disabled={isAuthLoading} className="w-full bg-green-600 text-white py-2.5 rounded-lg font-medium disabled:opacity-70 hover:bg-green-700 mt-2">
                  Receber código de acesso
                </button>
              </form>
            )}

            {authStep === 'otp' && (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <input type="text" placeholder="Código de 6 dígitos" required maxLength={6} value={authOtp} onChange={(e) => setAuthOtp(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg text-center tracking-widest text-2xl font-mono focus:ring-2 focus:ring-green-500 outline-none" />
                <button type="submit" disabled={isAuthLoading} className="w-full bg-slate-900 text-white py-2.5 rounded-lg disabled:opacity-70 font-medium">
                  Confirmar e Entrar
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* MODAL DO PERFIL DO UTILIZADOR */}
      {isProfileModalOpen && appUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black bg-opacity-60 transition-opacity" onClick={() => setIsProfileModalOpen(false)} />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden z-50 flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-xl text-slate-900 flex items-center gap-2">A Minha Conta</h3>
              <button onClick={() => setIsProfileModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X /></button>
            </div>
           
            <div className="flex border-b border-gray-200 bg-white">
              <button onClick={() => setProfileTab('dados')} className={`flex-1 py-3 text-sm font-medium transition-colors border-b-2 ${profileTab === 'dados' ? 'border-green-500 text-green-600' : 'border-transparent text-gray-500'}`}>Dados</button>
              <button onClick={() => setProfileTab('enderecos')} className={`flex-1 py-3 text-sm font-medium transition-colors border-b-2 ${(profileTab === 'enderecos' || profileTab === 'novo_endereco') ? 'border-green-500 text-green-600' : 'border-transparent text-gray-500'}`}>Endereços</button>
              <button onClick={() => setProfileTab('pedidos')} className={`flex-1 py-3 text-sm font-medium transition-colors border-b-2 ${profileTab === 'pedidos' ? 'border-green-500 text-green-600' : 'border-transparent text-gray-500'}`}>Meus Pedidos <span className="ml-1 bg-gray-100 text-gray-600 py-0.5 px-2 rounded-full text-xs">{pedidosUsuario.length}</span></button>
            </div>

            <div className="p-6 overflow-y-auto">
              {profileErro && <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg">{profileErro}</div>}
              {profileSucesso && <div className="mb-4 p-3 bg-green-50 text-green-700 text-sm rounded-lg">{profileSucesso}</div>}
             
              {profileTab === 'dados' && (
                !isConfirmingDelete ? (
                  <form onSubmit={handleUpdateProfile} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div><label className="block text-sm font-medium mb-1">Nome</label><input type="text" required value={editNome} onChange={(e) => setEditNome(e.target.value)} className="w-full px-4 py-2 border rounded-lg" /></div>
                      <div><label className="block text-sm font-medium mb-1">Telefone</label><input type="tel" required value={editTelefone} onChange={(e) => setEditTelefone(e.target.value)} className="w-full px-4 py-2 border rounded-lg" /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div><label className="block text-sm font-medium mb-1 text-gray-500">CPF</label><input type="text" value={appUser.cpf || editCpf} disabled={!!appUser.cpf} onChange={(e) => setEditCpf(e.target.value)} className="w-full px-4 py-2 border rounded-lg disabled:bg-gray-100" /></div>
                      <div><label className="block text-sm font-medium mb-1 text-gray-500">E-mail</label><input type="email" value={appUser.email} disabled className="w-full px-4 py-2 border rounded-lg disabled:bg-gray-100" /></div>
                    </div>

                    {/* ======================================================== */}
                    {/* NOVA SECÇÃO: PREFERÊNCIAS DE NOTIFICAÇÃO                 */}
                    {/* ======================================================== */}
                    <div className="pt-4 border-t border-gray-100 mt-4 space-y-3">
                      <h4 className="text-sm font-bold text-gray-800">Preferências de Notificação (Status do Pedido)</h4>
                     
                      <label className="flex items-center justify-between cursor-pointer p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-green-300 transition-colors">
                        <div className="flex items-center gap-3">
                          <Mail className={`w-5 h-5 ${notificaEmail ? 'text-green-500' : 'text-gray-400'}`} />
                          <div>
                            <p className="text-sm font-bold text-gray-800">E-mail</p>
                            <p className="text-xs text-gray-500">Receber atualizações no e-mail cadastrado.</p>
                          </div>
                        </div>
                        <div className={`w-10 h-6 flex items-center bg-gray-300 rounded-full p-1 duration-300 ease-in-out ${notificaEmail ? 'bg-green-500' : ''}`}>
                          <div className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-300 ease-in-out ${notificaEmail ? 'translate-x-4' : ''}`}></div>
                        </div>
                        <input type="checkbox" className="hidden" checked={notificaEmail} onChange={(e) => setNotificaEmail(e.target.checked)} />
                      </label>

                      <label className="flex items-center justify-between cursor-pointer p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-green-300 transition-colors">
                        <div className="flex items-center gap-3">
                          <MessageCircle className={`w-5 h-5 ${notificaWhatsapp ? 'text-green-500' : 'text-gray-400'}`} />
                          <div>
                            <p className="text-sm font-bold text-gray-800">WhatsApp</p>
                            <p className="text-xs text-gray-500">Receber mensagens automáticas no número acima.</p>
                          </div>
                        </div>
                        <div className={`w-10 h-6 flex items-center bg-gray-300 rounded-full p-1 duration-300 ease-in-out ${notificaWhatsapp ? 'bg-green-500' : ''}`}>
                          <div className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-300 ease-in-out ${notificaWhatsapp ? 'translate-x-4' : ''}`}></div>
                        </div>
                        <input type="checkbox" className="hidden" checked={notificaWhatsapp} onChange={(e) => setNotificaWhatsapp(e.target.checked)} />
                      </label>
                    </div>

                    <div className="pt-6">
                      <button type="submit" disabled={isProfileLoading} className="w-full bg-slate-900 text-white font-medium py-2.5 rounded-lg hover:bg-slate-800">Salvar Alterações</button>
                      <div className="flex justify-between mt-4 border-t pt-4">
                        <button type="button" onClick={handleLogout} className="text-sm font-medium text-gray-500 hover:text-gray-800">Sair da conta</button>
                        <button type="button" onClick={() => setIsConfirmingDelete(true)} className="text-sm font-medium text-red-500 hover:text-red-700">Apagar Conta</button>
                      </div>
                    </div>
                  </form>
                ) : (
                  <div className="text-center py-4">
                    <h4 className="font-bold text-lg mb-2">Apagar conta definitivamente?</h4>
                    <div className="flex gap-3 mt-6">
                      <button type="button" onClick={() => setIsConfirmingDelete(false)} className="flex-1 bg-gray-200 py-2.5 rounded-lg">Cancelar</button>
                      <button type="button" onClick={handleDeleteAccount} className="flex-1 bg-red-600 text-white py-2.5 rounded-lg">Sim, Apagar</button>
                    </div>
                  </div>
                )
              )}

              {profileTab === 'enderecos' && (
                <div className="space-y-4">
                  <button onClick={() => setProfileTab('novo_endereco')} className="w-full py-2 bg-green-50 text-green-700 font-medium rounded-lg border border-green-200">+ Adicionar Novo Endereço</button>
                  {enderecos.map(end => (
                    <div key={end.id_endereco} className="p-3 border rounded-lg relative group">
                      <button onClick={() => handleDeleteEndereco(end.id_endereco)} className="absolute top-3 right-3 text-red-500"><Trash2 className="w-4 h-4"/></button>
                      <p className="font-bold">{end.rua}, {end.numero}</p>
                      <p className="text-sm text-gray-600">{end.bairro} - {end.cidade}/{end.estado}</p>
                    </div>
                  ))}
                </div>
              )}

              {profileTab === 'novo_endereco' && (
                <form onSubmit={handleAddEndereco} className="space-y-4">
                  <div className="relative">
                    <label className="block text-xs font-medium mb-1">CEP *</label>
                    <input type="text" required maxLength={9} value={endCep} onChange={handleCepChange} className="w-full px-3 py-2 border rounded" placeholder="01001-000" />
                  </div>
                  <div className="grid grid-cols-4 gap-3">
                    <div className="col-span-3"><label className="block text-xs font-medium mb-1">Rua *</label><input type="text" required value={endRua} onChange={(e) => setEndRua(e.target.value)} className="w-full px-3 py-2 border rounded" /></div>
                    <div className="col-span-1"><label className="block text-xs font-medium mb-1">Núm *</label><input type="text" required value={endNumero} onChange={(e) => setEndNumero(e.target.value)} id="endNumeroInput" className="w-full px-3 py-2 border rounded" /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="block text-xs font-medium mb-1">Comp.</label><input type="text" value={endComplemento} onChange={(e) => setEndComplemento(e.target.value)} className="w-full px-3 py-2 border rounded" /></div>
                    <div><label className="block text-xs font-medium mb-1">Bairro *</label><input type="text" required value={endBairro} onChange={(e) => setEndBairro(e.target.value)} className="w-full px-3 py-2 border rounded" /></div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2"><label className="block text-xs font-medium mb-1">Cidade *</label><input type="text" required value={endCidade} onChange={(e) => setEndCidade(e.target.value)} className="w-full px-3 py-2 border rounded" /></div>
                    <div className="col-span-1"><label className="block text-xs font-medium mb-1">UF *</label><input type="text" required maxLength={2} value={endEstado} onChange={(e) => setEndEstado(e.target.value.toUpperCase())} className="w-full px-3 py-2 border rounded text-center" /></div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <button type="button" onClick={() => setProfileTab('enderecos')} className="flex-1 py-2 bg-gray-100 rounded text-gray-600">Cancelar</button>
                    <button type="submit" disabled={isBuscandoCep} className="flex-1 py-2 bg-slate-900 text-white rounded">Salvar Endereço</button>
                  </div>
                </form>
              )}

              {profileTab === 'pedidos' && (
                <div className="space-y-4">
                  {pedidosUsuario.length === 0 ? (
                    <p className="text-center text-gray-500 py-10">Nenhum pedido realizado ainda.</p>
                  ) : (
                    pedidosUsuario.map(pedido => (
                      <div key={pedido.id_pedido} className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                        <div className="bg-slate-50 px-4 py-3 flex justify-between items-center border-b border-gray-100">
                          <div>
                            <span className="text-xs text-gray-500">Nº Pedido</span>
                            <p className="font-mono font-bold text-slate-900">{pedido.id_pedido}</p>
                          </div>
                          <div className="text-right">
                            <span className="text-xs text-gray-500 flex items-center gap-1 justify-end">Status</span>
                            <p className={`font-bold text-sm px-2 py-1 rounded-full mt-1 ${pedido.status === 'Entregue' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>{pedido.status}</p>
                          </div>
                        </div>
                        <div className="p-4 flex justify-between items-end">
                           <ul className="text-sm text-gray-600 space-y-1">
                             {pedido.itens.map(item => <li key={`${item.id}-${item.tamanho}`}>- {item.quantidade}x {item.nome_camisa} ({item.tamanho})</li>)}
                           </ul>
                           <div className="text-right">
                             <p className="text-xs text-gray-500 mb-1">Data: {new Date(pedido.data_pedido).toLocaleDateString()}</p>
                             <p className="font-extrabold text-lg text-slate-900">R$ {pedido.total.toFixed(2)}</p>
                           </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* MODAL ADMIN */}
      {isAdminModalOpen && isUserAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black bg-opacity-70 transition-opacity" onClick={() => setIsAdminModalOpen(false)} />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-5xl overflow-hidden z-50 flex flex-col max-h-[90vh]">
           
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-slate-900 text-white">
              <h3 className="font-bold text-xl flex items-center gap-2"><ShieldAlert className="w-5 h-5 text-red-500" /> Painel Admin</h3>
              <div className="flex gap-4 items-center">
                <button onClick={() => setAdminTab('lista')} className={`text-sm font-bold ${adminTab === 'lista' ? 'text-green-400' : 'text-gray-300'}`}>Produtos</button>
                <button onClick={() => setAdminTab('pedidos')} className={`text-sm font-bold ${adminTab === 'pedidos' ? 'text-green-400' : 'text-gray-300'}`}>Gestão de Pedidos</button>
                <button onClick={() => setIsAdminModalOpen(false)} className="ml-4 text-gray-300 hover:text-white"><X className="w-6 h-6" /></button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto bg-gray-50 flex-1">
              {adminErro && <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg">{adminErro}</div>}

              {adminTab === 'pedidos' && (
                 <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-gray-100 border-b">
                        <tr>
                          <th className="px-4 py-3">ID / Data</th>
                          <th className="px-4 py-3">Cliente (ID)</th>
                          <th className="px-4 py-3">Total</th>
                          <th className="px-4 py-3 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {todosPedidos.length === 0 ? (
                          <tr><td colSpan="4" className="text-center py-6 text-gray-500">Nenhum pedido recebido ainda.</td></tr>
                        ) : (
                          todosPedidos.map(ped => (
                            <tr key={ped.id_pedido}>
                              <td className="px-4 py-3">
                                <span className="font-mono font-bold block text-slate-900">{ped.id_pedido}</span>
                                <span className="text-xs text-gray-500">{new Date(ped.data_pedido).toLocaleString()}</span>
                              </td>
                              <td className="px-4 py-3 text-gray-600 font-mono text-xs">{ped.id_usuario}</td>
                              <td className="px-4 py-3 font-bold text-slate-900">R$ {ped.total.toFixed(2)}</td>
                              <td className="px-4 py-3 text-right">
                                <select
                                  value={ped.status}
                                  onChange={(e) => updatePedidoStatus(ped.id_pedido, e.target.value)}
                                  className={`px-3 py-1.5 rounded-lg border font-bold text-xs outline-none cursor-pointer ${
                                    ped.status === 'Entregue' ? 'bg-green-50 text-green-700 border-green-200' :
                                    ped.status === 'Cancelado' ? 'bg-red-50 text-red-700 border-red-200' :
                                    'bg-blue-50 text-blue-700 border-blue-200'
                                  }`}>
                                  <option value="Aguardando Pagamento">Aguardando Pagamento</option>
                                  <option value="Recebido">Recebido / Pago</option>
                                  <option value="Em Separação">Em Separação</option>
                                  <option value="Enviado">Enviado</option>
                                  <option value="Entregue">Entregue</option>
                                  <option value="Cancelado">Cancelado</option>
                                </select>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                 </div>
              )}

              {adminTab === 'lista' && (
                <>
                  <div className="flex justify-end mb-4">
                    <button onClick={handleAdminNew} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"><PlusCircle className="w-4 h-4" /> Novo Produto</button>
                  </div>
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-gray-100 border-b"><tr><th className="px-4 py-3">Produto</th><th className="px-4 py-3">Cat. / Liga</th><th className="px-4 py-3">Preço</th><th className="px-4 py-3 text-right">Ações</th></tr></thead>
                      <tbody className="divide-y divide-gray-100">
                        {produtos.map(p => (
                          <tr key={p.id}>
                            <td className="px-4 py-2 flex items-center gap-3">
                              <img src={p.imagem} className="w-10 h-10 rounded object-cover" onError={(e) => e.target.src = "https://placehold.co/100?text=Foto"} />
                              <span className="font-medium">{p.nome_camisa}</span>
                            </td>
                            <td className="px-4 py-2 text-gray-600">{p.categoria} / {p.liga || '-'}</td>
                            <td className="px-4 py-2 font-bold">{Number(p.preco).toFixed(2)}</td>
                            <td className="px-4 py-2 text-right">
                              <button onClick={() => handleAdminEdit(p)} className="p-2 text-blue-600"><Edit className="w-4 h-4" /></button>
                              <button onClick={() => handleAdminDeleteProduct(p.id)} className="p-2 text-red-600"><Trash2 className="w-4 h-4" /></button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              {adminTab === 'formulario' && (
                <form onSubmit={handleAdminSaveProduct} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                  <div className="flex justify-between items-center mb-6 border-b pb-4">
                    <h4 className="font-bold text-gray-800 text-lg">Detalhes do Produto</h4>
                    <button type="button" onClick={() => setAdminTab('lista')} className="text-sm text-gray-500 hover:underline">Cancelar</button>
                  </div>

                  <div className="space-y-5">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nome da Camisa *</label>
                      <input type="text" required value={prodNome} onChange={e => setProdNome(e.target.value)} className="w-full px-4 py-2 border rounded-lg focus:ring-green-500" placeholder="Ex: Camisa Brasil Titular 2024" />
                    </div>
                   
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">Preço (R$) *</label>
                        <input type="number" step="0.01" required value={prodPreco} onChange={e => setProdPreco(e.target.value)} className="w-full px-4 py-2 border rounded-lg" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Categoria Principal *</label>
                        <select required value={prodCategoria} onChange={e => setProdCategoria(e.target.value)} className="w-full px-4 py-2 border rounded-lg">
                          <option value="Nacional">Nacional</option><option value="Europa">Europa</option><option value="Seleções">Seleções</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Tipo de Uniforme</label>
                        <select value={prodTipo} onChange={e => setProdTipo(e.target.value)} className="w-full px-4 py-2 border rounded-lg">
                          <option value="Primeira Camisa">Primeira Camisa (Home)</option>
                          <option value="Segunda Camisa">Segunda Camisa (Away)</option>
                          <option value="Terceira Camisa">Terceira Camisa (Third)</option>
                          <option value="Treino">Treino</option>
                          <option value="Goleiro">Goleiro</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">Temporada</label>
                        <input type="text" value={prodTemporada} onChange={e => setProdTemporada(e.target.value)} className="w-full px-4 py-2 border rounded-lg" placeholder="Ex: 2024/25, Retrô" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">País</label>
                        <input type="text" value={prodPais} onChange={e => setProdPais(e.target.value)} className="w-full px-4 py-2 border rounded-lg" placeholder="Ex: brasil" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Liga</label>
                        <input type="text" value={prodLiga} onChange={e => setProdLiga(e.target.value)} className="w-full px-4 py-2 border rounded-lg" placeholder="Ex: brasileirão" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Marca / Fornecedor</label>
                        <input type="text" value={prodMarca} onChange={e => setProdMarca(e.target.value)} className="w-full px-4 py-2 border rounded-lg" placeholder="Ex: nike, adidas" />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Público (Género)</label>
                        <select value={prodGenero} onChange={e => setProdGenero(e.target.value)} className="w-full px-4 py-2 border rounded-lg">
                          <option value="Masculino">Masculino</option><option value="Feminino">Feminino</option><option value="Infantil">Infantil</option><option value="Unissex">Unissex</option>
                        </select>
                      </div>
                      <div className="flex items-end pb-1">
                        <label className="flex items-center gap-3 cursor-pointer p-2 border rounded-lg w-full bg-white hover:bg-gray-50">
                          <input type="checkbox" checked={prodPersonalizavel} onChange={e => setProdPersonalizavel(e.target.checked)} className="w-5 h-5 text-green-600 rounded" />
                          <span className="text-sm font-bold text-gray-800">Aceita Personalização (Nome/Número)</span>
                        </label>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Cores Predominantes</label>
                      <div className="flex flex-wrap gap-2">
                        {['vermelho', 'azul', 'branco', 'preto', 'verde', 'amarelo', 'cinza', 'rosa', 'roxo', 'laranja', 'bordo', 'dourado'].map(c => (
                          <button type="button" key={c} onClick={() => setProdCores(prev => prev.includes(c) ? prev.filter(item => item !== c) : [...prev, c])} className={`px-3 py-1 rounded text-sm font-bold border transition-colors capitalize ${prodCores.includes(c) ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-gray-600'}`}>{c}</button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Tamanhos Disponíveis</label>
                      <div className="flex flex-wrap gap-2">
                        {['P', 'M', 'G', 'GG', 'XG'].map(t => (
                          <button type="button" key={t} onClick={() => setProdTamanhos(prev => prev.includes(t) ? prev.filter(item => item !== t) : [...prev, t])} className={`w-10 h-10 rounded font-bold border transition-colors ${prodTamanhos.includes(t) ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-gray-600'}`}>{t}</button>
                        ))}
                      </div>
                    </div>

                    <div className="bg-blue-50 p-5 rounded-lg border border-blue-200">
                      <label className="block text-sm font-bold text-blue-900 mb-2 flex items-center gap-2"><ImageIcon className="w-5 h-5"/> Imagens do Produto *</label>
                      <p className="text-xs text-blue-700 mb-4">Carregue as imagens a partir do seu computador. A primeira imagem será a capa do produto.</p>
                     
                      <div className="mb-4">
                        <label className="cursor-pointer inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm">
                          <UploadCloud className="w-5 h-5" /> Adicionar Fotos
                          <input type="file" multiple accept="image/*" onChange={handleFileSelect} className="hidden" />
                        </label>
                      </div>

                      {(prodImagensSalvas.length > 0 || prodNovosArquivos.length > 0) ? (
                        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4 mt-4 bg-white p-4 rounded-lg border border-blue-100">
                          {prodImagensSalvas.map((url, i) => (
                            <div key={`salva-${i}`} className="relative group rounded-lg overflow-hidden border border-gray-200 h-24 bg-gray-100 flex items-center justify-center">
                              {i === 0 && <span className="absolute top-1 left-1 bg-green-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded z-10">CAPA</span>}
                              <img src={url} className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <button type="button" onClick={() => removerImagemSalva(i)} className="bg-red-500 text-white p-1.5 rounded-full hover:bg-red-600"><Trash2 className="w-4 h-4"/></button>
                              </div>
                            </div>
                          ))}

                          {prodNovosArquivos.map((item, i) => (
                            <div key={`nova-${i}`} className="relative group rounded-lg overflow-hidden border-2 border-blue-400 border-dashed h-24 bg-blue-50 flex items-center justify-center">
                              {prodImagensSalvas.length === 0 && i === 0 && <span className="absolute top-1 left-1 bg-green-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded z-10">CAPA</span>}
                              <span className="absolute bottom-0 w-full bg-blue-600 text-white text-[9px] text-center py-0.5 z-10 font-medium">NOVA</span>
                              <img src={item.preview} className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-20">
                                <button type="button" onClick={() => removerNovaImagem(i)} className="bg-red-500 text-white p-1.5 rounded-full hover:bg-red-600"><Trash2 className="w-4 h-4"/></button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="mt-4 pt-4 border-t border-blue-100">
                          <label className="block text-sm font-bold text-gray-700 mb-2">Ou use URL Antiga (Fallback)</label>
                          <input type="url" value={prodImagem} onChange={e => setProdImagem(e.target.value)} className="w-full px-4 py-2 border rounded-lg" placeholder="https://exemplo.com/imagem.jpg" />
                        </div>
                      )}
                    </div>
                  </div>
                  <button type="submit" disabled={isAdminLoading} className="w-full py-3 bg-green-600 text-white font-bold rounded-lg mt-6 flex justify-center items-center gap-2">
                    {isAdminLoading && <Loader2 className="w-5 h-5 animate-spin" />}
                    {isAdminLoading ? 'A Salvar...' : 'Salvar Produto no Catálogo'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL DO CARRINHO */}
      {isCartOpen && (
        <div className="fixed inset-0 z-40 overflow-hidden">
          <div className="absolute inset-0 bg-black bg-opacity-50 transition-opacity" onClick={() => setIsCartOpen(false)} />
          <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-xl flex flex-col z-50">
            <div className="flex items-center justify-between px-4 py-6 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900 flex items-center gap-2"><ShoppingCart className="w-5 h-5 text-green-600"/> O seu Carrinho</h2>
              <button onClick={() => setIsCartOpen(false)} className="text-gray-400 hover:text-gray-600"><X /></button>
            </div>
           
            <div className="flex-1 overflow-y-auto">
              <div className="px-4 py-4">
                {cart.length === 0 ? <p className="text-center text-gray-500 py-10">Carrinho vazio.</p> : (
                  <ul className="divide-y divide-gray-100">
                    {cart.map((item) => {
                      const imgUrl = (item.imagens && item.imagens.length > 0) ? item.imagens[0] : (item.imagem || 'https://placehold.co/100?text=Sem+Foto');
                      const precoNumerico = Number(String(item.preco).replace(',', '.')) || 0;

                      return (
                        <li key={`${item.id}-${item.tamanho}`} className="py-4 flex">
                          <img src={imgUrl} className="w-16 h-16 rounded object-cover border border-gray-100" />
                          <div className="ml-4 flex-1">
                            <div className="flex justify-between">
                              <h3 className="text-sm font-medium text-gray-900 leading-tight pr-4">{item.nome_camisa}</h3>
                              <button onClick={() => removeFromCart(item.id, item.tamanho)} className="text-gray-400 hover:text-red-500 shrink-0"><Trash2 className="w-4 h-4" /></button>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">Tam: <span className="font-bold text-gray-800">{item.tamanho}</span></p>
                            <div className="flex justify-between items-center mt-3">
                              <div className="flex items-center gap-2 border border-gray-300 rounded">
                                <button className="p-1 text-gray-600 hover:bg-gray-100" onClick={()=>updateQuantity(item.id, item.tamanho, -1)}><Minus className="w-3 h-3"/></button>
                                <span className="text-sm px-2 font-medium">{item.quantidade}</span>
                                <button className="p-1 text-gray-600 hover:bg-gray-100" onClick={()=>updateQuantity(item.id, item.tamanho, 1)}><Plus className="w-3 h-3"/></button>
                              </div>
                              <p className="font-extrabold text-slate-900">R$ {(precoNumerico * item.quantidade).toFixed(2)}</p>
                            </div>
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>

              {recomendacoesCarrinho.length > 0 && cart.length > 0 && (
                <div className="mt-4 border-t border-gray-200 bg-blue-50 p-4">
                  <h3 className="text-xs font-black text-blue-900 uppercase tracking-wider flex items-center gap-1.5 mb-3">
                    <Sparkles className="w-4 h-4 text-blue-600" /> Quem comprou, também levou:
                  </h3>
                  <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x">
                    {recomendacoesCarrinho.map(rec => {
                      const imgUrl = (rec.imagens && rec.imagens.length > 0) ? rec.imagens[0] : (rec.imagem || 'https://placehold.co/100?text=Sem+Foto');
                      return (
                        <div key={rec.id} className="min-w-[130px] w-[130px] bg-white border border-blue-100 rounded-lg p-2 flex flex-col snap-start shadow-sm">
                          <img src={imgUrl} className="w-full h-[80px] object-cover rounded mb-2 bg-gray-50" />
                          <h4 className="text-[11px] font-semibold text-gray-800 line-clamp-2 leading-snug mb-1" title={rec.nome_camisa}>{rec.nome_camisa}</h4>
                          <p className="text-xs font-extrabold text-blue-700 mt-auto">R$ {Number(rec.preco).toFixed(2)}</p>
                          <button
                            onClick={() => addToCart(rec, rec.tamanhos?.[0] || 'M')}
                            className="mt-2 w-full py-1.5 bg-blue-600 text-white text-[10px] font-bold uppercase rounded hover:bg-blue-700 transition-colors"
                          >
                            + Adicionar
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            {cart.length > 0 && (
              <div className="p-6 border-t border-gray-200 bg-white">
                <div className="flex justify-between items-end mb-4">
                  <span className="text-gray-500 text-sm font-medium">Total Estimado</span>
                  <span className="font-black text-2xl text-slate-900">R$ {cartTotal.toFixed(2)}</span>
                </div>
                <button onClick={handleIniciarCheckout} className="w-full bg-green-600 text-white py-3.5 rounded-lg font-bold hover:bg-green-700 shadow-md transition-colors text-lg">
                  Finalizar Compra
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL DE FINALIZAÇÃO DE COMPRA (CHECKOUT) */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black bg-opacity-70 transition-opacity" onClick={() => setIsCheckoutOpen(false)} />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden z-50 flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-200 bg-slate-900 text-white flex justify-between items-center">
              <h3 className="font-bold text-xl flex items-center gap-2"><ShoppingCart className="w-5 h-5 text-green-500"/> Finalizar Compra</h3>
              <button onClick={() => setIsCheckoutOpen(false)} className="text-gray-400 hover:text-white"><X /></button>
            </div>
            <div className="flex border-b border-gray-200 bg-gray-50">
              <div className={`flex-1 py-3 text-center text-sm font-bold border-b-2 ${checkoutStep >= 1 ? 'border-blue-500 text-blue-700' : 'border-transparent text-gray-400'}`}>1. Endereço</div>
              <div className={`flex-1 py-3 text-center text-sm font-bold border-b-2 ${checkoutStep >= 2 ? 'border-blue-500 text-blue-700' : 'border-transparent text-gray-400'}`}>2. Entrega</div>
              <div className={`flex-1 py-3 text-center text-sm font-bold border-b-2 ${checkoutStep >= 3 ? 'border-blue-500 text-blue-700' : 'border-transparent text-gray-400'}`}>3. Pagamento Seguro</div>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              {checkoutErro && <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg">{checkoutErro}</div>}

              {checkoutStep === 1 && (
                <div className="space-y-4">
                  <h4 className="font-bold text-lg text-gray-800">Onde deseja receber o seu pedido?</h4>
                  {enderecos.length === 0 ? (
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 text-sm">
                      Você ainda não tem nenhum endereço salvo.
                      <button onClick={() => { setIsCheckoutOpen(false); openProfileModal(); setProfileTab('novo_endereco'); }} className="mt-2 block font-bold underline">
                        Clique aqui para adicionar um endereço no seu perfil.
                      </button>
                    </div>
                  ) : (
                    enderecos.map(end => (
                      <label key={end.id_endereco} className={`flex items-start gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${checkoutData.endereco?.id_endereco === end.id_endereco ? 'border-blue-500 bg-blue-50' : 'hover:bg-gray-50'}`}>
                        <input type="radio" name="endereco" className="mt-1 w-4 h-4 text-blue-600" checked={checkoutData.endereco?.id_endereco === end.id_endereco} onChange={() => setCheckoutData({...checkoutData, endereco: end})} />
                        <div>
                          <p className="font-bold text-gray-900">{end.rua}, {end.numero}</p>
                          <p className="text-sm text-gray-600">{end.bairro} - {end.cidade}/{end.estado} | CEP: {end.cep}</p>
                        </div>
                      </label>
                    ))
                  )}

                  {enderecos.length > 0 && (
                    <div className="pt-2 pb-4">
                      <button onClick={() => { setIsCheckoutOpen(false); openProfileModal(); setProfileTab('novo_endereco'); }} className="text-sm font-bold text-blue-600 hover:underline">+ Cadastrar um novo endereço</button>
                    </div>
                  )}

                  <div className="pt-4 text-right border-t">
                    <button disabled={!checkoutData.endereco} onClick={() => setCheckoutStep(2)} className="bg-slate-900 text-white px-6 py-2.5 rounded-lg font-medium disabled:opacity-50 hover:bg-slate-800 transition-colors">Continuar para Entrega</button>
                  </div>
                </div>
              )}

              {checkoutStep === 2 && (
                <div className="space-y-4">
                  <h4 className="font-bold text-lg text-gray-800">Escolha o tipo de entrega</h4>
                  {[
                    { tipo: 'PAC (Econômica)', valor: 15.00, prazo: 7 },
                    { tipo: 'SEDEX (Expressa)', valor: 35.00, prazo: 3 }
                  ].map(frete => (
                    <label key={frete.tipo} className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer transition-colors ${checkoutData.frete?.tipo === frete.tipo ? 'border-blue-500 bg-blue-50' : 'hover:bg-gray-50'}`}>
                      <div className="flex items-center gap-3">
                        <input type="radio" name="frete" className="w-4 h-4 text-blue-600" checked={checkoutData.frete?.tipo === frete.tipo} onChange={() => setCheckoutData({...checkoutData, frete})} />
                        <div>
                          <p className="font-bold text-gray-900 flex items-center gap-2"><Truck className="w-4 h-4 text-gray-500"/> {frete.tipo}</p>
                          <p className="text-sm text-gray-600">Chega em até {frete.prazo} dias úteis</p>
                        </div>
                      </div>
                      <span className="font-bold text-blue-700">R$ {frete.valor.toFixed(2)}</span>
                    </label>
                  ))}
                  <div className="pt-4 flex justify-between border-t mt-4">
                    <button onClick={() => setCheckoutStep(1)} className="text-gray-500 px-4 py-2 font-medium hover:bg-gray-100 rounded-lg">Voltar</button>
                    <button disabled={!checkoutData.frete} onClick={() => setCheckoutStep(3)} className="bg-slate-900 text-white px-6 py-2.5 rounded-lg font-medium disabled:opacity-50 hover:bg-slate-800 transition-colors">Continuar para Pagamento</button>
                  </div>
                </div>
              )}

              {checkoutStep === 3 && (
                <div className="space-y-6">
                  {/* Resumo */}
                  <div className="bg-blue-50 p-5 rounded-xl border border-blue-100 flex items-center justify-between shadow-sm">
                    <div>
                      <p className="text-sm text-blue-800 font-medium mb-1">Resumo do Pedido</p>
                      <p className="font-extrabold text-2xl text-slate-900">Total a pagar: R$ {(cartTotal + checkoutData.frete.valor).toFixed(2)}</p>
                    </div>
                    <Box className="w-10 h-10 text-blue-300" />
                  </div>

                  <div className="bg-white border-2 border-gray-200 rounded-xl p-8 text-center space-y-4">
                    <div className="flex justify-center gap-4 mb-4">
                      <ShieldCheck className="w-12 h-12 text-blue-500" />
                    </div>
                    <h4 className="font-bold text-xl text-gray-800">Checkout Seguro Criptografado</h4>
                    <p className="text-sm text-gray-600 max-w-md mx-auto">
                      Ao clicar no botão abaixo, será redirecionado para a página oficial de checkout, onde poderá introduzir os seus dados de pagamento com total segurança.
                    </p>
                  </div>

                  <div className="pt-4 flex justify-between border-t mt-6">
                    <button onClick={() => setCheckoutStep(2)} className="text-gray-500 px-4 py-2 font-medium hover:bg-gray-100 rounded-lg">Voltar</button>
                    <button onClick={handleFinalizarCompra} disabled={checkoutLoading} className="bg-blue-600 text-white px-6 py-3 rounded-lg font-bold flex items-center gap-2 hover:bg-blue-700 transition-colors shadow-md disabled:opacity-50">
                      {checkoutLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ExternalLink className="w-5 h-5" />}
                      Ir para o Pagamento
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL DO FILTRO LATERAL AVANÇADO */}
      {isFilterSidebarOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div className="absolute inset-0 bg-black bg-opacity-50 transition-opacity" onClick={() => setIsFilterSidebarOpen(false)} />
          <div className="fixed inset-y-0 left-0 w-full max-w-xs bg-white shadow-xl flex flex-col z-50 overflow-y-auto">
            <div className="flex items-center justify-between px-4 py-6 border-b border-gray-200 sticky top-0 bg-white z-10">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2"><Filter className="w-5 h-5"/> Filtros Refinados</h2>
              <button onClick={() => setIsFilterSidebarOpen(false)} className="text-gray-400 hover:text-gray-600"><X /></button>
            </div>
           
            <div className="p-4 space-y-6">
             
              <div className="bg-green-50 p-3 rounded-lg border border-green-100 flex items-center justify-between cursor-pointer" onClick={() => setFiltrosAvancados({...filtrosAvancados, personalizavel: !filtrosAvancados.personalizavel})}>
                <span className="text-sm font-bold text-green-900">Aceita Personalização</span>
                <div className={`w-10 h-6 flex items-center bg-gray-300 rounded-full p-1 duration-300 ease-in-out ${filtrosAvancados.personalizavel ? 'bg-green-500' : ''}`}>
                  <div className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-300 ease-in-out ${filtrosAvancados.personalizavel ? 'translate-x-4' : ''}`}></div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-gray-900 mb-2">Faixa de Preço (R$)</h3>
                <div className="flex items-center gap-2">
                  <input type="number" placeholder="Mínimo" value={filtrosAvancados.precoMin} onChange={(e) => setFiltrosAvancados({...filtrosAvancados, precoMin: e.target.value})} className="w-full px-3 py-2 border rounded-md text-sm outline-none focus:border-green-500" />
                  <span className="text-gray-400">-</span>
                  <input type="number" placeholder="Máximo" value={filtrosAvancados.precoMax} onChange={(e) => setFiltrosAvancados({...filtrosAvancados, precoMax: e.target.value})} className="w-full px-3 py-2 border rounded-md text-sm outline-none focus:border-green-500" />
                </div>
              </div>

              {opcoesFiltro.generos.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-gray-900 mb-2">Género / Público</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {opcoesFiltro.generos.map(g => (
                      <button key={g} onClick={() => toggleFiltroArray('generos', g)} className={`py-1.5 text-xs font-bold border rounded-md transition-colors ${filtrosAvancados.generos.includes(g) ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-gray-600 border-gray-300'}`}>{g}</button>
                    ))}
                  </div>
                </div>
              )}

              {opcoesFiltro.temporadas.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-gray-900 mb-2">Temporada</h3>
                  <div className="flex flex-wrap gap-2">
                    {opcoesFiltro.temporadas.map(temp => (
                      <button key={temp} onClick={() => toggleFiltroArray('temporadas', temp)} className={`px-3 py-1.5 text-xs font-bold border rounded-md transition-colors ${filtrosAvancados.temporadas.includes(temp) ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-gray-600 border-gray-300'}`}>{temp}</button>
                    ))}
                  </div>
                </div>
              )}

              {opcoesFiltro.marcas.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-gray-900 mb-2">Marca / Fornecedor</h3>
                  <div className="flex flex-wrap gap-2">
                    {opcoesFiltro.marcas.map(marca => (
                      <button key={marca} onClick={() => toggleFiltroArray('marcas', marca)} className={`px-3 py-1.5 text-xs font-bold border rounded-md transition-colors capitalize ${filtrosAvancados.marcas.includes(marca) ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-gray-600 border-gray-300'}`}>{marca}</button>
                    ))}
                  </div>
                </div>
              )}

              {opcoesFiltro.tipos.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-gray-900 mb-2">Edição</h3>
                  <div className="space-y-2">
                    {opcoesFiltro.tipos.map(tipo => (
                      <label key={tipo} className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={filtrosAvancados.tipos.includes(tipo)} onChange={() => toggleFiltroArray('tipos', tipo)} className="w-4 h-4 text-green-600 rounded border-gray-300" />
                        <span className="text-sm text-gray-700">{tipo}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {opcoesFiltro.ligas.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-gray-900 mb-2">Ligas</h3>
                  <div className="space-y-2">
                    {opcoesFiltro.ligas.map(liga => (
                      <label key={liga} className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={filtrosAvancados.ligas.includes(liga)} onChange={() => toggleFiltroArray('ligas', liga)} className="w-4 h-4 text-green-600 rounded border-gray-300" />
                        <span className="text-sm text-gray-700 capitalize">{liga}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {opcoesFiltro.paises.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-gray-900 mb-2">País</h3>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {opcoesFiltro.paises.map(pais => (
                      <label key={pais} className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={filtrosAvancados.paises.includes(pais)} onChange={() => toggleFiltroArray('paises', pais)} className="w-4 h-4 text-green-600 rounded border-gray-300" />
                        <span className="text-sm text-gray-700 capitalize">{pais}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h3 className="text-sm font-bold text-gray-900 mb-2">Tamanhos</h3>
                <div className="flex flex-wrap gap-2">
                  {['P', 'M', 'G', 'GG', 'XG'].map(t => (
                    <button key={t} onClick={() => toggleFiltroArray('tamanhos', t)} className={`w-10 h-10 text-sm font-bold border rounded-md transition-colors ${filtrosAvancados.tamanhos.includes(t) ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-gray-600 border-gray-300'}`}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {opcoesFiltro.cores.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-gray-900 mb-2">Cores Predominantes</h3>
                  <div className="space-y-2">
                    {opcoesFiltro.cores.map(cor => (
                      <label key={cor} className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={filtrosAvancados.cores.includes(cor)} onChange={() => toggleFiltroArray('cores', cor)} className="w-4 h-4 text-green-600 rounded border-gray-300" />
                        <span className="text-sm text-gray-700 capitalize">{cor}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

            </div>

            <div className="p-4 border-t border-gray-200 mt-auto bg-gray-50 sticky bottom-0 z-10">
              <button onClick={() => setFiltrosAvancados({precoMin: '', precoMax: '', cores: [], tamanhos: [], paises: [], ligas: [], temporadas: [], tipos: [], marcas: [], generos: [], personalizavel: false})} className="w-full py-2.5 text-sm font-bold text-gray-600 hover:text-slate-900 bg-white border border-gray-300 rounded-md shadow-sm">
                Limpar Todos os Filtros
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ProductCard({ produto, onAdd }) {
  const [tamanho, setTamanho] = useState('M');
  const [imgIndex, setImgIndex] = useState(0);
 
  const tamanhosDisponiveis = produto.tamanhos && produto.tamanhos.length > 0 ? produto.tamanhos : ['P', 'M', 'G', 'GG'];
  const listaImagens = produto.imagens && produto.imagens.length > 0 ? produto.imagens : (produto.imagem ? [produto.imagem] : []);

  useEffect(() => {
    if (!tamanhosDisponiveis.includes(tamanho) && tamanhosDisponiveis.length > 0) {
      setTamanho(tamanhosDisponiveis[0]);
    }
  }, [produto, tamanhosDisponiveis]);

  const proximaImagem = (e) => {
    e.stopPropagation();
    setImgIndex((prev) => (prev === listaImagens.length - 1 ? 0 : prev + 1));
  };

  const imagemAnterior = (e) => {
    e.stopPropagation();
    setImgIndex((prev) => (prev === 0 ? listaImagens.length - 1 : prev - 1));
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col hover:shadow-md transition-all duration-200 relative group">
      {produto.personalizavel && (
        <span className="absolute top-3 left-3 bg-green-500 text-white text-[10px] font-extrabold px-2 py-1 rounded-full uppercase tracking-wider z-10 shadow-sm">
          Personalizável
        </span>
      )}
     
      <div className="relative w-full h-72 bg-gray-50 flex items-center justify-center">
        {listaImagens.length > 0 ? (
          <img src={listaImagens[imgIndex]} className="w-full h-full object-cover transition-opacity duration-300" onError={(e) => e.target.src = "https://placehold.co/400x500/cccccc/ffffff?text=Sem+Imagem"} />
        ) : (
          <div className="flex flex-col items-center text-gray-400"><ImageIcon className="w-10 h-10 mb-2"/><span>Sem Foto</span></div>
        )}
       
        {listaImagens.length > 1 && (
          <>
            <button onClick={imagemAnterior} className="absolute left-2 top-1/2 -translate-y-1/2 bg-white bg-opacity-80 p-1.5 rounded-full text-gray-800 hover:bg-opacity-100 shadow-md opacity-0 group-hover:opacity-100 transition-opacity"><ChevronLeft className="w-5 h-5"/></button>
            <button onClick={proximaImagem} className="absolute right-2 top-1/2 -translate-y-1/2 bg-white bg-opacity-80 p-1.5 rounded-full text-gray-800 hover:bg-opacity-100 shadow-md opacity-0 group-hover:opacity-100 transition-opacity"><ChevronRight className="w-5 h-5"/></button>
           
            <div className="absolute bottom-3 left-0 w-full flex justify-center gap-1.5">
              {listaImagens.map((_, idx) => (
                <div key={idx} className={`w-2 h-2 rounded-full transition-colors shadow-sm ${idx === imgIndex ? 'bg-green-500 scale-110' : 'bg-gray-300 bg-opacity-80'}`} />
              ))}
            </div>
          </>
        )}
      </div>

      <div className="p-4 flex flex-col flex-1">
        <div className="flex justify-between items-start mb-1">
          <p className="text-xs text-gray-500 font-bold uppercase">{produto.marca || 'S/ Marca'}</p>
          <p className="text-xs text-gray-400">{produto.temporada}</p>
        </div>
        <h3 className="text-sm font-semibold text-gray-900 leading-snug min-h-[40px]">{produto.nome_camisa}</h3>
        <p className="text-xl font-bold text-slate-900 mt-2 mb-4">R$ {Number(produto.preco).toFixed(2)}</p>
        <div className="mt-auto">
          <div className="flex flex-wrap gap-1 mb-3">
            {tamanhosDisponiveis.map(t => (
              <button key={t} onClick={() => setTamanho(t)} className={`w-8 h-8 text-xs font-bold border rounded transition-colors ${tamanho === t ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-gray-600 hover:border-gray-400'}`}>{t}</button>
            ))}
          </div>
          <button onClick={() => onAdd(produto, tamanho)} className="w-full bg-slate-900 text-white py-2 rounded-lg text-sm font-medium flex justify-center items-center gap-2 hover:bg-slate-800 transition-colors"><ShoppingCart className="w-4 h-4"/> Adicionar</button>
        </div>
      </div>
    </div>
  );
}