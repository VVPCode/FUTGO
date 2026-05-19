import React, { useState, useMemo, useEffect, useRef } from 'react';
import { ShoppingCart, Search, X, Plus, Minus, Trash2, User, Settings, LogOut, AlertTriangle, Loader2, Mail, MapPin, MapPinned, ShieldAlert, Edit, PlusCircle, Image as ImageIcon, Filter, Menu, Check, ChevronLeft, ChevronRight, UploadCloud, Truck, Box, CreditCard, CheckCircle, BellRing, ExternalLink, QrCode, Barcode, ShieldCheck, Sparkles, MessageCircle, Star } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, FacebookAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from 'firebase/auth';
import { getFirestore, collection, query, where, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';

const CATEGORIAS = ["Todas", "Nacional", "Europa", "Seleções"];
const API_BASE_URL = 'http://localhost:8000/api';
const BACKEND_URL = 'http://localhost:8000'; // Guardamos o base do Django

// ==========================================
// 🛠️ FUNÇÃO MÁGICA: CORRETOR DE IMAGENS (SUPER POTENTE) 🛠️
// ==========================================
const formatImageUrl = (url) => {
  if (!url) return 'https://placehold.co/400x500/cccccc/ffffff?text=Sem+Foto';
 
  let fixedUrl = url;

  // 1. Substitui o IP do emulador pelo localhost
  if (fixedUrl.includes('10.0.2.2')) {
    fixedUrl = fixedUrl.replace('10.0.2.2', 'localhost');
  }

  // 2. Se a URL começar com /media (caminho relativo)
  if (fixedUrl.startsWith('/media/')) {
    fixedUrl = `${BACKEND_URL}${fixedUrl}`;
  }

  // 3. Limpeza de erros comuns (barras duplas geradas acidentalmente)
  fixedUrl = fixedUrl.replace(/([^:]\/)\/+/g, "$1");

  return fixedUrl;
};

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
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

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
  const [firebaseUser, setFirebaseUser] = useState(null);
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
  const [favoritosIds, setFavoritosIds] = useState([]);

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
          if (!isInitialLoad) mostrarNotificacao('Pedido Registado! ⚽', `Pedido ${pedido.id_pedido} criado.`);
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
    if (!firebaseUser || !dbFrontend) {
      setFavoritosIds([]);
      return;
    }
   
    const favRef = collection(dbFrontend, 'artifacts', appId, 'users', firebaseUser.uid, 'favoritos');
    const unsubscribe = onSnapshot(favRef,
      (snapshot) => {
        const ids = snapshot.docs.map(doc => doc.id);
        setFavoritosIds(ids);
      },
      (error) => {
        console.error("Erro ao procurar favoritos:", error);
      }
    );

    return () => unsubscribe();
  }, [firebaseUser]);

  const toggleFavorito = async (produto) => {
    if (!firebaseUser) {
      setIsAuthModalOpen(true);
      return;
    }
   
    const prodIdStr = produto.id?.toString();
    if (!prodIdStr) return;

    try {
      const docRef = doc(dbFrontend, 'artifacts', appId, 'users', firebaseUser.uid, 'favoritos', prodIdStr);
     
      if (favoritosIds.includes(prodIdStr)) {
        await deleteDoc(docRef);
      } else {
        await setDoc(docRef, { adicionado_em: new Date().toISOString() });
        mostrarNotificacao('Favoritado! ⭐', `${produto.nome_camisa} foi guardado na sua lista de desejos.`);
      }
    } catch (error) {
      console.error("Erro ao favoritar:", error);
    }
  };

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
        setFirebaseUser(user);
       
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
    setAppUser(null); setFirebaseUser(null); setIsProfileModalOpen(false); setCart([]); setPedidosUsuario([]); setFavoritosIds([]);
  };

  const handleDeleteAccount = async () => {
    setIsProfileLoading(true); setProfileErro('');
    try {
      const res = await fetch(`${API_BASE_URL}/auth/user/${appUser.id_usuario}/`, { method: 'DELETE' });
      const data = await res.json().catch(()=>({}));
      if (!res.ok) throw new Error(data.erro || 'Erro ao apagar conta.');
      if (firebaseAuth) await signOut(firebaseAuth);
      setAppUser(null); setFirebaseUser(null); setIsProfileModalOpen(false); alert("Conta apagada.");
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
    setProdNome(produto.nome_camisa); setProdPreco(produto.preco); setProdCategoria(produto.categoria);
    setProdImagem(formatImageUrl(produto.imagem || ''));
   
    setProdCores(produto.cores || []); setProdPais(produto.pais || ''); setProdLiga(produto.liga || ''); setProdTamanhos(produto.tamanhos || ['P', 'M', 'G', 'GG']);
    setProdTemporada(produto.temporada || ''); setProdTipo(produto.tipo_uniforme || 'Primeira Camisa'); setProdMarca(produto.marca || '');
    setProdGenero(produto.genero || 'Unissex'); setProdPersonalizavel(produto.personalizavel || false);
   
    const imagensExistentes = produto.imagens && produto.imagens.length > 0 ? produto.imagens : (produto.imagem ? [produto.imagem] : []);
    setProdImagensSalvas(imagensExistentes.map(img => formatImageUrl(img)));
    setProdNovosArquivos([]); setAdminTab('formulario');
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
            {produtosFiltrados.length > 0 ? produtosFiltrados.map((produto) => (
              <ProductCard
                key={produto.id || Math.random()}
                produto={produto}
                onAdd={addToCart}
                isFavorito={favoritosIds.includes(produto.id?.toString())}
                onToggleFavorito={() => toggleFavorito(produto)}
              />
            )) : <div className="col-span-full text-center py-12 text-gray-500">Nenhum produto encontrado com estes filtros.</div>}
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
           
            <div className="flex border-b border-gray-200 bg-white overflow-x-auto scrollbar-hide">
              <button onClick={() => setProfileTab('dados')} className={`flex-1 py-3 text-sm font-medium transition-colors border-b-2 whitespace-nowrap px-4 ${profileTab === 'dados' ? 'border-green-500 text-green-600' : 'border-transparent text-gray-500'}`}>Dados</button>
              <button onClick={() => setProfileTab('enderecos')} className={`flex-1 py-3 text-sm font-medium transition-colors border-b-2 whitespace-nowrap px-4 ${(profileTab === 'enderecos' || profileTab === 'novo_endereco') ? 'border-green-500 text-green-600' : 'border-transparent text-gray-500'}`}>Endereços</button>
              <button onClick={() => setProfileTab('pedidos')} className={`flex-1 py-3 text-sm font-medium transition-colors border-b-2 whitespace-nowrap px-4 ${profileTab === 'pedidos' ? 'border-green-500 text-green-600' : 'border-transparent text-gray-500'}`}>Meus Pedidos <span className="ml-1 bg-gray-100 text-gray-600 py-0.5 px-2 rounded-full text-xs">{pedidosUsuario.length}</span></button>
              <button onClick={() => setProfileTab('desejos')} className={`flex-1 py-3 text-sm font-medium transition-colors border-b-2 whitespace-nowrap px-4 ${profileTab === 'desejos' ? 'border-green-500 text-green-600' : 'border-transparent text-gray-500'}`}>
                Desejos <span className="ml-1 bg-gray-100 text-gray-600 py-0.5 px-2 rounded-full text-xs">{favoritosIds.length}</span>
              </button>
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

              {/* ABA DE LISTA DE DESEJOS (FAVORITOS) */}
              {profileTab === 'desejos' && (
                <div className="space-y-4">
                  {favoritosIds.length === 0 ? (
                    <div className="text-center py-12">
                      <Star className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500 font-medium">A sua lista de desejos está vazia.</p>
                      <p className="text-sm text-gray-400 mt-1">Navegue pelo catálogo e clique na estrela para guardar as suas camisas favoritas.</p>
                      <button onClick={() => setIsProfileModalOpen(false)} className="mt-4 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm">Ver Catálogo</button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {produtos.filter(p => favoritosIds.includes(p.id?.toString())).map(produto => (
                        <div key={produto.id} className="flex gap-3 border rounded-lg p-3 bg-white relative hover:shadow-sm transition-shadow">
                          <img src={formatImageUrl(produto.imagem || (produto.imagens && produto.imagens[0]))} className="w-20 h-20 object-cover rounded bg-gray-50 border border-gray-100" />
                          <div className="flex-1 pt-1">
                             <h4 className="font-bold text-sm text-gray-800 line-clamp-2 leading-snug pr-6">{produto.nome_camisa}</h4>
                             <p className="font-extrabold text-slate-900 mt-2">R$ {Number(produto.preco).toFixed(2)}</p>
                          </div>
                          <button
                            onClick={() => toggleFavorito(produto)}
                            className="absolute top-2 right-2 p-1.5 bg-yellow-50 hover:bg-yellow-100 rounded-full transition-colors group"
                            title="Remover dos favoritos"
                          >
                            <Star className="w-5 h-5 fill-yellow-400 text-yellow-500 group-hover:scale-110 transition-transform" />
                          </button>
                         
                          <button
                            onClick={() => addToCart(produto, produto.tamanhos?.[0] || 'M')}
                            className="absolute bottom-3 right-3 text-xs font-bold text-green-600 hover:text-green-700 bg-green-50 hover:bg-green-100 px-2 py-1 rounded"
                          >
                            + Carrinho
                          </button>
                        </div>
                      ))}
                    </div>
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
                              <img src={formatImageUrl(p.imagem)} className="w-10 h-10 rounded object-cover" onError={(e) => e.target.src = "https://placehold.co/100?text=Foto"} />
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
                    <h4 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                      {adminProdutoEditing ? <Edit className="w-5 h-5 text-blue-500"/> : <PlusCircle className="w-5 h-5 text-green-500"/>}
                      {adminProdutoEditing ? 'Editar Produto' : 'Criar Novo Produto'}
                    </h4>
                    <button type="button" onClick={() => setAdminTab('lista')} className="text-sm text-gray-500 hover:underline">Cancelar e Voltar</button>
                  </div>

                  <div className="space-y-5">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nome da Camisa *</label>
                      <input type="text" required value={prodNome} onChange={e => setProdNome(e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" placeholder="Ex: Camisa Seleção Brasileira 2024..." />
                    </div>
                   
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Preço (R$) *</label>
                        <input type="number" step="0.01" min="0" required value={prodPreco} onChange={e => setProdPreco(e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" placeholder="299.90" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Categoria *</label>
                        <select required value={prodCategoria} onChange={e => setProdCategoria(e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none bg-white">
                          <option value="Nacional">Nacional</option>
                          <option value="Europa">Europa</option>
                          <option value="Seleções">Seleções</option>
                        </select>
                      </div>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <label className="block text-sm font-bold text-gray-800 mb-1 flex items-center gap-1.5"><ImageIcon className="w-4 h-4 text-green-600"/> URL da Imagem do Produto *</label>
                      <p className="text-xs text-gray-500 mb-3">É obrigatório fornecer no mínimo uma imagem para este produto (Insira um link HTTP/HTTPS).</p>
                     
                      <input type="url" required value={prodImagem} onChange={e => setProdImagem(e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none mb-4" placeholder="https://exemplo.com/imagem_camisa.jpg" />
                     
                      {prodImagem ? (
                        <div className="mt-2 text-center bg-white p-2 rounded border border-dashed border-gray-300 inline-block">
                          <p className="text-xs text-gray-500 mb-2">Pré-visualização da Imagem:</p>
                          <img src={formatImageUrl(prodImagem)} alt="Preview" className="h-40 object-contain mx-auto rounded" onError={(e) => e.target.src = "https://placehold.co/400x500/ffcccc/ff0000?text=Link+Invalido"} />
                        </div>
                      ) : (
                        <div className="mt-2 flex items-center justify-center h-20 bg-gray-100 border border-dashed border-gray-300 rounded text-gray-400 text-sm">
                          Insira um link acima para ver a imagem
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-8 flex gap-3">
                    <button type="submit" disabled={isAdminLoading} className="flex-1 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors shadow-sm disabled:opacity-70">
                      {isAdminLoading ? 'A sincronizar com a Base de Dados...' : (adminProdutoEditing ? 'Salvar Alterações na Nuvem' : 'Criar Produto no Catálogo')}
                    </button>
                  </div>
                </form>
              )}
            </div>
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
                        <input type="radio" name="frete" className="w-4 h-4 text-blue-600" checked={checkoutData.frete?.tipo === frete.tipo} onChange={()