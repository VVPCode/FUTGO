import React, { useState, useMemo, useEffect, useRef } from 'react';
import { ShoppingCart, Search, X, Plus, Minus, Trash2, User, Settings, LogOut, AlertTriangle, Loader2, Mail, MapPin, MapPinned, ShieldAlert, Edit, PlusCircle, Image as ImageIcon, Filter, Menu, Check, ChevronLeft, ChevronRight, UploadCloud, Truck, Box, CreditCard, CheckCircle, BellRing, ExternalLink, QrCode, Barcode, ShieldCheck, Sparkles, MessageCircle, Star, BarChart3, TrendingUp, Package, Tag, Activity, ClipboardList, AlertOctagon, ArrowUpRight, ArrowDownRight, Save, CalendarDays, Users, Wallet, PieChart, DollarSign } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import ProductCard from './components/ProductCard';
import { getAuth, GoogleAuthProvider, FacebookAuthProvider, signInWithPopup, onAuthStateChanged, signOut, signInAnonymously } from 'firebase/auth';
import { getFirestore, collection, query, where, onSnapshot, doc, setDoc, deleteDoc, addDoc, getDoc } from 'firebase/firestore';

const CATEGORIAS = ["Todas", "Nacional", "Europa", "Seleções"];
const API_BASE_URL = 'http://localhost:8000/api';
const BACKEND_URL = 'http://localhost:8000';

// ==========================================
// 🛠️ FUNÇÃO MÁGICA: CORRETOR DE IMAGENS 🛠️
// ==========================================
const formatImageUrl = (url) => {
  if (!url) return 'https://placehold.co/400x500/cccccc/ffffff?text=Sem+Foto';
  let fixedUrl = url;
  if (fixedUrl.includes('10.0.2.2')) fixedUrl = fixedUrl.replace('10.0.2.2', 'localhost');
  if (fixedUrl.startsWith('/media/')) fixedUrl = `${BACKEND_URL}${fixedUrl}`;
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

// ==========================================
// 🛒 FUNÇÕES DE PERSISTÊNCIA DE CARRINHO 🛒
// ==========================================
const saveCartToLocalStorage = (cartItems) => {
  try {
    localStorage.setItem('futgo_cart', JSON.stringify(cartItems));
  } catch (error) {
    console.error("Erro ao salvar carrinho no localStorage:", error);
  }
};

const loadCartFromLocalStorage = () => {
  try {
    const savedCart = localStorage.getItem('futgo_cart');
    return savedCart ? JSON.parse(savedCart) : [];
  } catch (error) {
    console.error("Erro ao carregar carrinho do localStorage:", error);
    return [];
  }
};

const saveCartToFirestore = async (userId, cartItems) => {
  if (!dbFrontend || !userId) return;
  try {
    const cartRef = doc(dbFrontend, 'carrinhos', String(userId));
    await setDoc(cartRef, {
      itens: cartItems,
      ultima_atualizacao: new Date().toISOString()
    });
  } catch (error) {
    console.error("Erro ao salvar carrinho no Firestore:", error);
    // Falha silenciosa - não quebra o app
  }
};

const loadCartFromFirestore = async (userId) => {
  if (!dbFrontend || !userId) return null;
  try {
    const cartRef = doc(dbFrontend, 'carrinhos', String(userId));
    const snapshot = await getDoc(cartRef);
    if (snapshot.exists()) {
      const data = snapshot.data();
      return data.itens || [];
    }
  } catch (error) {
    console.error("Erro ao carregar carrinho do Firestore:", error);
  }
  return null;
};

const clearCartFromFirestore = async (userId) => {
  if (!dbFrontend || !userId) return;
  try {
    const cartRef = doc(dbFrontend, 'carrinhos', String(userId));
    await deleteDoc(cartRef);
  } catch (error) {
    console.error("Erro ao limpar carrinho do Firestore:", error);
  }
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
  const [authDataNascimento, setAuthDataNascimento] = useState('');
  const [authCidade, setAuthCidade] = useState('');
  const [authEstado, setAuthEstado] = useState('');
  const [authGenero, setAuthGenero] = useState('');
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
  const [editDataNascimento, setEditDataNascimento] = useState('');
  const [editCidade, setEditCidade] = useState('');
  const [editEstado, setEditEstado] = useState('');
  const [editGenero, setEditGenero] = useState('');
  
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
  const [adminTab, setAdminTab] = useState('dashboard');
  const [biSubTab, setBiSubTab] = useState('estoque'); // Nova aba de BI
  const [adminProdutoEditing, setAdminProdutoEditing] = useState(null);
 
  // ESTADOS DO PRODUTO
  const [prodNome, setProdNome] = useState('');
  const [prodPreco, setProdPreco] = useState('');
  const [prodEstoque, setProdEstoque] = useState(50);
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
  const [entradasEstoque, setEntradasEstoque] = useState([]); // Histórico real de entradas

  // ESTADOS PARA EDIÇÃO RÁPIDA DE ESTOQUE
  const [editingStockId, setEditingStockId] = useState(null);
  const [tempStockValue, setTempStockValue] = useState('');

  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState(1);
  const [checkoutData, setCheckoutData] = useState({ endereco: null, frete: null });
  const [metodoPagamento, setMetodoPagamento] = useState('pix');
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutErro, setCheckoutErro] = useState('');
 
  const [pedidosUsuario, setPedidosUsuario] = useState([]);
  const [notificacaoInApp, setNotificacaoInApp] = useState(null);
  const [recomendacoesCarrinho, setRecomendacoesCarrinho] = useState([]);
  const [favoritosIds, setFavoritosIds] = useState([]);
  const [usandoLocalStorage, setUsandoLocalStorage] = useState(false);

  // -- NOVOS ESTADOS PARA RELATÓRIOS (BI) --
  const [relatorioPerfilClientes, setRelatorioPerfilClientes] = useState(null);
  const [relatorioVendasProdutos, setRelatorioVendasProdutos] = useState(null);
  const [relatorioFinanceiro, setRelatorioFinanceiro] = useState(null);
  const [isLoadingRelatorios, setIsLoadingRelatorios] = useState(false);

  const isUserAdmin = appUser?.email === 'admin@futgo.com' || appUser?.is_admin === true;

  // Carregar histórico de Entradas do Firebase
  useEffect(() => {
    if (!dbFrontend || !isUserAdmin) return;
    try {
        const q = query(collection(dbFrontend, 'artifacts', appId, 'public', 'data', 'entradas_estoque'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setEntradasEstoque(snapshot.docs.map(doc => doc.data()));
        }, (error) => console.error("Erro ao buscar entradas:", error));
        return () => unsubscribe();
    } catch (e) { console.error(e); }
  }, [isUserAdmin, dbFrontend]);

  // Carregar Relatórios do Backend quando admin abre o modal
  useEffect(() => {
    if (!isAdminModalOpen || !isUserAdmin) return;

    const carregarRelatorios = async () => {
      setIsLoadingRelatorios(true);
      setAdminErro('');

      const fetchJson = async (url) => {
        const response = await fetch(url, { headers: { 'X-User-ID': String(appUser?.id_usuario || '') } });
        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(payload?.erro || `Falha ao carregar ${url} (${response.status})`);
        }
        return payload;
      };

      try {
        const [resPerfil, resVendas, resFinanceiro] = await Promise.all([
          fetchJson(`${API_BASE_URL}/relatorios/perfil-clientes/`),
          fetchJson(`${API_BASE_URL}/relatorios/vendas-produtos/`),
          fetchJson(`${API_BASE_URL}/relatorios/financeiro/`)
        ]);

        setRelatorioPerfilClientes(resPerfil);
        setRelatorioVendasProdutos(resVendas);
        setRelatorioFinanceiro(resFinanceiro);
      } catch (err) {
        console.error("Erro ao carregar relatórios:", err);
        setRelatorioPerfilClientes(null);
        setRelatorioVendasProdutos(null);
        setRelatorioFinanceiro(null);
        setAdminErro('Não foi possível carregar os relatórios. Verifique se o backend está online e se você tem permissão de administrador.');
      } finally {
        setIsLoadingRelatorios(false);
      }
    };

    carregarRelatorios();
  }, [isAdminModalOpen, isUserAdmin, appUser]);

  // ==========================================
  // LÓGICA DO DASHBOARD DE BI E ESTOQUE
  // ==========================================
 
  // 1. Calcula as Vendas Reais (Saídas Totais)
  const vendasPorProduto = useMemo(() => {
    const vendas = {};
    todosPedidos.forEach(pedido => {
      if (pedido.status !== 'Cancelado') {
        pedido.itens.forEach(item => {
          const prodId = item.id || item.produto;
          if (!vendas[prodId]) vendas[prodId] = 0;
          vendas[prodId] += item.quantidade;
        });
      }
    });
    return vendas;
  }, [todosPedidos]);

  // 2. Relatório Mensal de Entradas e Saídas (BI - Atualizado com Inputs Reais)
  const movimentacaoMensal = useMemo(() => {
    const movs = {};
   
    // Processa Saídas Reais dos Pedidos
    todosPedidos.forEach(pedido => {
      if (pedido.status !== 'Cancelado') {
        const date = new Date(pedido.data_pedido || new Date());
        const mesAnoRaw = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const mesAnoFormatado = `${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
       
        pedido.itens.forEach(item => {
          const prodId = item.id || item.produto;
          const key = `${mesAnoRaw}|${prodId}`;
          if (!movs[key]) {
            movs[key] = { mes_raw: mesAnoRaw, mes: mesAnoFormatado, id: prodId, nome: item.nome_camisa, saidas: 0, entradas: 0, estoque_atual: 0 };
          }
          movs[key].saidas += item.quantidade;
        });
      }
    });

    // Processa Entradas Reais do Firebase (Inputs do Admin)
    entradasEstoque.forEach(entrada => {
        const date = new Date(entrada.data);
        const mesAnoRaw = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const mesAnoFormatado = `${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
        const prodId = entrada.produto_id;
        const key = `${mesAnoRaw}|${prodId}`;

        if (!movs[key]) {
            movs[key] = { mes_raw: mesAnoRaw, mes: mesAnoFormatado, id: prodId, nome: entrada.nome_camisa, saidas: 0, entradas: 0, estoque_atual: 0 };
        }
        movs[key].entradas += entrada.quantidade;
    });

    // Adiciona o estoque atual para contexto na tabela
    Object.values(movs).forEach(m => {
        const p = produtos.find(prod => prod.id === m.id);
        if (p) m.estoque_atual = p.estoque !== undefined ? p.estoque : 50;
    });

    return Object.values(movs).sort((a, b) => b.mes_raw.localeCompare(a.mes_raw));
  }, [todosPedidos, entradasEstoque, produtos]);

  // 3. Gera o Relatório de Estoque DEFINITIVO
  const relatorioEstoque = useMemo(() => {
    return produtos.map(p => {
      const saidas = vendasPorProduto[p.id] || 0;
      const estoqueAtual = p.estoque !== undefined ? p.estoque : 50;
     
      let status = 'Normal';
      if (estoqueAtual <= 0) status = 'Esgotado';
      else if (estoqueAtual <= 10) status = 'Crítico';
      else if (estoqueAtual <= 20) status = 'Baixo';

      return { ...p, saidas, estoqueAtual, status };
    }).sort((a, b) => a.estoqueAtual - b.estoqueAtual);
  }, [produtos, vendasPorProduto]);

  // 4. Stats para o BI Dashboard Geral
  const biStats = useMemo(() => {
    if (!produtos || produtos.length === 0) return null;

    const totalSKUs = produtos.length;
    const precoMedio = produtos.reduce((acc, p) => acc + Number(p.preco || 0), 0) / totalSKUs;
   
    const porCategoria = {};
    const porMarca = {};
    const tamanhosTotais = { 'P': 0, 'M': 0, 'G': 0, 'GG': 0, 'XG': 0 };

    produtos.forEach(p => {
      const cat = p.categoria || 'Outros';
      porCategoria[cat] = (porCategoria[cat] || 0) + 1;
     
      const marca = p.marca ? p.marca.toUpperCase() : 'SEM MARCA';
      porMarca[marca] = (porMarca[marca] || 0) + 1;

      if (p.tamanhos && Array.isArray(p.tamanhos)) {
        p.tamanhos.forEach(t => { if (tamanhosTotais[t] !== undefined) tamanhosTotais[t]++; });
      }
    });

    // Cálculos Financeiros
    const faturamentoTotal = todosPedidos.filter(p => p.status !== 'Cancelado').reduce((acc, p) => acc + p.total, 0);
    const ticketMedio = todosPedidos.length > 0 ? faturamentoTotal / todosPedidos.length : 0;
   
    // Perfil Clientes
    const clientesUnicos = new Set(todosPedidos.map(p => p.id_usuario)).size;

    const categoriasArray = Object.entries(porCategoria).map(([nome, count]) => ({ nome, count })).sort((a, b) => b.count - a.count);
    const marcasArray = Object.entries(porMarca).map(([nome, count]) => ({ nome, count })).sort((a, b) => b.count - a.count);
    const topProdutosCaros = [...produtos].sort((a, b) => Number(b.preco) - Number(a.preco)).slice(0, 5);

    return { totalSKUs, precoMedio, categoriasArray, marcasArray, tamanhosTotais, topProdutosCaros, faturamentoTotal, ticketMedio, clientesUnicos };
  }, [produtos, todosPedidos]);

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
    // Tentar carregar favoritos do Firestore
    if (firebaseUser && dbFrontend) {
      const favRef = collection(dbFrontend, 'artifacts', appId, 'users', firebaseUser.uid, 'favoritos');
      console.log("[FAVORITOS] Sincronizando favoritos Firestore para uid:", firebaseUser.uid);

      const unsubscribe = onSnapshot(favRef,
        (snapshot) => {
          const ids = snapshot.docs.map(doc => doc.id);
          console.log("[FAVORITOS] ✓ Firestore sincronizado. Total:", ids.length);
          setFavoritosIds(ids);
          setUsandoLocalStorage(false);
        },
        (error) => {
          console.warn("[FAVORITOS] ⚠️ Firestore indisponível, usando localStorage:", error.code);
          // Fallback para localStorage
          const savedFavs = localStorage.getItem('futgo_favoritos');
          const favs = savedFavs ? JSON.parse(savedFavs) : [];
          setFavoritosIds(favs);
          setUsandoLocalStorage(true);
        }
      );

      return () => unsubscribe();
    } else {
      // Se não tem firebaseUser, carregar do localStorage
      console.log("[FAVORITOS] Usando localStorage (sem firebaseUser)");
      const savedFavs = localStorage.getItem('futgo_favoritos');
      const favs = savedFavs ? JSON.parse(savedFavs) : [];
      setFavoritosIds(favs);
      setUsandoLocalStorage(true);
    }
  }, [firebaseUser]);

  const toggleFavorito = async (produto) => {
    const prodIdStr = produto.id?.toString();
    if (!prodIdStr) {
      console.warn("[FAVORITOS] ID do produto inválido");
      return;
    }

    const isFav = favoritosIds.includes(prodIdStr);
    console.log("[FAVORITOS] toggleFavorito. Storage:", usandoLocalStorage ? 'localStorage' : 'Firestore', "Estado:", isFav ? 'é favorito' : 'não é favorito');

    try {
      // Se usando localStorage, atualizar diretamente
      if (usandoLocalStorage) {
        let favs = JSON.parse(localStorage.getItem('futgo_favoritos') || '[]');
        if (isFav) {
          favs = favs.filter(id => id !== prodIdStr);
          console.log("[FAVORITOS] ✓ Removido do localStorage");
          mostrarNotificacao('Removido ❌', `${produto.nome_camisa} foi removido da sua lista de desejos.`);
        } else {
          favs.push(prodIdStr);
          console.log("[FAVORITOS] ✓ Adicionado ao localStorage");
          mostrarNotificacao('Favoritado! ⭐', `${produto.nome_camisa} foi guardado na sua lista de desejos.`);
        }
        localStorage.setItem('futgo_favoritos', JSON.stringify(favs));
        setFavoritosIds(favs);
        return;
      }

      // Se tem Firestore, usar Firestore
      if (!firebaseUser || !dbFrontend) {
        console.warn("[FAVORITOS] Firestore indisponível, usando localStorage como fallback");
        toggleFavorito(produto); // Recursivamente chamar com localStorage
        return;
      }

      const docRef = doc(dbFrontend, 'artifacts', appId, 'users', firebaseUser.uid, 'favoritos', prodIdStr);

      if (isFav) {
        console.log("[FAVORITOS] Removendo do Firestore...");
        await deleteDoc(docRef);
        console.log("[FAVORITOS] ✓ Removido do Firestore");
        mostrarNotificacao('Removido ❌', `${produto.nome_camisa} foi removido da sua lista de desejos.`);
      } else {
        console.log("[FAVORITOS] Adicionando ao Firestore...");
        await setDoc(docRef, { adicionado_em: new Date().toISOString() });
        console.log("[FAVORITOS] ✓ Adicionado ao Firestore");
        mostrarNotificacao('Favoritado! ⭐', `${produto.nome_camisa} foi guardado na sua lista de desejos.`);
      }
    } catch (error) {
      console.error("[FAVORITOS] Erro:", error.code, error.message);
      console.log("[FAVORITOS] Salvando no localStorage como fallback...");

      // Fallback para localStorage se Firestore falhar
      let favs = JSON.parse(localStorage.getItem('futgo_favoritos') || '[]');
      if (isFav) {
        favs = favs.filter(id => id !== prodIdStr);
      } else {
        favs.push(prodIdStr);
      }
      localStorage.setItem('futgo_favoritos', JSON.stringify(favs));
      setFavoritosIds(favs);
      setUsandoLocalStorage(true);

      mostrarNotificacao('Favoritado! ⭐', `${produto.nome_camisa} foi guardado (local).`);
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

  // ==========================================
  // 🛒 CARREGAR CARRINHO DO FIRESTORE AO LOGIN
  // ==========================================
  useEffect(() => {
    if (!appUser || appUser.email === 'admin@futgo.com') return;

    const loadCart = async () => {
      const cartFromFirestore = await loadCartFromFirestore(appUser.id_usuario);
      if (cartFromFirestore && cartFromFirestore.length > 0) {
        setCart(cartFromFirestore);
        mostrarNotificacao('Carrinho Restaurado! 🛒', `Recuperamos ${cartFromFirestore.length} item(ns) do seu carrinho.`);
      }
    };

    loadCart();
  }, [appUser?.id_usuario]);

  // ==========================================
  // 🛒 SALVAR CARRINHO NO FIRESTORE COM DEBOUNCE
  // ==========================================
  useEffect(() => {
    if (!appUser || appUser.email === 'admin@futgo.com' || cart.length === 0) return;

    const debounceTimer = setTimeout(() => {
      saveCartToFirestore(appUser.id_usuario, cart);
    }, 500); // Debounce de 500ms

    return () => clearTimeout(debounceTimer);
  }, [cart, appUser?.id_usuario]);

  // ==========================================
  // 📦 CARRINHO NÃO AUTENTICADO (localStorage)
  // ==========================================
  // Ao montar o componente, carrega carrinho do localStorage para usuários não autenticados
  useEffect(() => {
    if (!appUser) {
      const savedCart = loadCartFromLocalStorage();
      if (savedCart && savedCart.length > 0) {
        setCart(savedCart);
      }
    }
  }, []);

  useEffect(() => {
    console.log("[FIREBASE INIT] firebaseAuth:", !!firebaseAuth, "dbFrontend:", !!dbFrontend);
    fetchProdutos();

    if (!firebaseAuth) {
      console.error("[FIREBASE INIT] ❌ ERRO CRÍTICO: firebaseAuth não está inicializado!");
      console.log("[FIREBASE INIT] firebaseConfig:", {
        apiKey: firebaseConfig.apiKey ? '✓' : '✗',
        authDomain: firebaseConfig.authDomain ? '✓' : '✗',
        projectId: firebaseConfig.projectId ? '✓' : '✗'
      });
      return;
    }

    console.log("[FIREBASE INIT] ✓ firebaseAuth inicializado com sucesso");

    const unsubscribe = onAuthStateChanged(firebaseAuth, async (user) => {
      console.log("[FIREBASE AUTH] Estado alterado:", user ? `Usuário: ${user.isAnonymous ? 'Anônimo' : user.email} (uid: ${user.uid.slice(0,8)}...)` : 'Nenhum usuário');
      setFirebaseUser(user);

      // Se não há usuário, tente fazer login anônimo
      if (!user) {
        try {
          console.log("[FIREBASE AUTH] Tentando fazer login anônimo...");
          const result = await signInAnonymously(firebaseAuth);
          console.log("[FIREBASE AUTH] ✓ Login anônimo bem-sucedido. UID:", result.user.uid.slice(0,8) + "...");
        } catch (error) {
          console.error("[FIREBASE AUTH] ❌ Erro ao fazer login anônimo:", error.code, error.message);
        }
        return;
      }

      // Se é usuário social (não anônimo), sincronizar com Django
      if (user && !user.isAnonymous && !appUser && !isLoggingInRef.current) {
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
    console.log('handleRegisterFormSubmit values:', { authNome, authCpf, authTelefone, authDataNascimento, authCidade, authEstado, authGenero, authEmail });
    if (!authNome || !authCpf || !authTelefone || !authDataNascimento || !authCidade || !authEstado || !authGenero) {
      return setAuthErro('Preencha todos os campos do cadastro.');
    }
    setIsAuthLoading(true); setAuthErro(''); setAuthMensagem('');
    setTempUserData({
      nome: authNome,
      cpf: authCpf,
      telefone: authTelefone,
      data_nascimento: authDataNascimento,
      cidade: authCidade,
      estado: authEstado,
      genero: authGenero,
      regiao: authCidade && authEstado ? `${authCidade}/${authEstado}` : ''
    });
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
        : { nome: tempUserData.nome, email: authEmail.includes('@') ? authEmail : '', cpf: tempUserData.cpf, telefone: tempUserData.telefone, data_nascimento: tempUserData.data_nascimento, cidade: tempUserData.cidade, estado: tempUserData.estado, genero: tempUserData.genero, regiao: tempUserData.regiao, identificador: identificadorFormatado, otp: authOtp };
     
      const res = await fetch(`${API_BASE_URL}${endpoint}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.erro || 'Código inválido.');
     
      setAppUser(data.usuario); closeAuthModal();
    } catch (error) { setAuthErro(error.message); } finally { setIsAuthLoading(false); }
  };

  const closeAuthModal = () => { setIsAuthModalOpen(false); setAuthStep('email'); setAuthMode('login'); setAuthEmail(''); setAuthNome(''); setAuthCpf(''); setAuthTelefone(''); setAuthDataNascimento(''); setAuthCidade(''); setAuthEstado(''); setAuthGenero(''); setAuthOtp(''); setAuthErro(''); setAuthMensagem(''); setTempUserData(null); };

  const openProfileModal = async () => {
    setIsProfileModalOpen(true); setProfileTab('dados'); setProfileErro(''); setProfileSucesso(''); setIsConfirmingDelete(false); setIsProfileLoading(false);
    setEditNome(appUser.nome); setEditTelefone(appUser.telefone); setEditCpf(appUser.cpf || '');
    setEditDataNascimento(appUser.data_nascimento || '');
    setEditCidade(appUser.cidade || '');
    setEditEstado(appUser.estado || '');
    setEditGenero(appUser.genero || '');
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
        setEditDataNascimento(data.usuario.data_nascimento || '');
        setEditCidade(data.usuario.cidade || '');
        setEditEstado(data.usuario.estado || '');
        setEditGenero(data.usuario.genero || '');
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
        notifica_whatsapp: notificaWhatsapp,
        data_nascimento: editDataNascimento,
        cidade: editCidade,
        estado: editEstado,
        genero: editGenero || ''
      };
      if (!appUser.cpf && editCpf) payload.cpf = editCpf;
      if (editCidade && editEstado) payload.regiao = `${editCidade}/${editEstado}`;
     
      const res = await fetch(`${API_BASE_URL}/auth/user/${appUser.id_usuario}/`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json().catch(()=>({}));
      if (!res.ok) throw new Error(data.erro || 'Erro ao atualizar.');
      setAppUser(data.usuario); setProfileSucesso('Perfil e preferências guardadas!');
    } catch (error) { setProfileErro(error.message); } finally { setIsProfileLoading(false); }
  };

  const handleLogout = async () => {
    try { if (firebaseAuth) await signOut(firebaseAuth); } catch (error) { console.error("Erro ao sair:", error); }
    // Mantém carrinho no localStorage para recuperação posterior
    setAppUser(null); setFirebaseUser(null); setIsProfileModalOpen(false); setPedidosUsuario([]); setFavoritosIds([]);
  };

  const handleDeleteAccount = async () => {
    setIsProfileLoading(true); setProfileErro('');
    try {
      const res = await fetch(`${API_BASE_URL}/auth/user/${appUser.id_usuario}/`, { method: 'DELETE' });
      const data = await res.json().catch(()=>({}));
      if (!res.ok) throw new Error(data.erro || 'Erro ao apagar conta.');
      await clearCartFromFirestore(appUser.id_usuario);
      if (firebaseAuth) await signOut(firebaseAuth);
      setCart([]); localStorage.removeItem('futgo_cart');
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

  // ==========================================
  // FINALIZAÇÃO DE COMPRA COM FALLBACK SEGURO
  // ==========================================
  const handleFinalizarCompra = async () => {
    setCheckoutLoading(true);
    setCheckoutErro('');
    try {
      const payload = {
        itens: cart.map(i => ({ id: i.id, nome_camisa: i.nome_camisa, tamanho: i.tamanho, quantidade: i.quantidade, preco: i.preco })),
        endereco_id: checkoutData.endereco.id_endereco,
        frete: checkoutData.frete,
        total: cartTotal + checkoutData.frete.valor,
        metodo_pagamento: metodoPagamento
      };
     
      const res = await fetch(`${API_BASE_URL}/pedidos/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-ID': String(appUser.id_usuario) },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.erro || 'Falha ao processar o pedido.');

      // Atualização Otimista no Frontend
      let produtosAtualizados = [...produtos];
      await Promise.all(cart.map(async (item) => {
        const prodIndex = produtosAtualizados.findIndex(p => p.id === item.id);
        if (prodIndex !== -1) {
          const prodAtual = produtosAtualizados[prodIndex];
          const estoqueAtual = prodAtual.estoque !== undefined ? prodAtual.estoque : 50;
          const novoEstoque = Math.max(0, estoqueAtual - item.quantidade);
         
          produtosAtualizados[prodIndex] = { ...prodAtual, estoque: novoEstoque };

          await fetch(`${API_BASE_URL}/produtos/${item.id}/`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'X-User-ID': String(appUser.id_usuario) },
            body: JSON.stringify({ ...prodAtual, estoque: novoEstoque })
          }).catch(err => console.error("Erro ao abater estoque no DB:", err));
        }
      }));
     
      setProdutos(produtosAtualizados);
     
      // FLUXO DE PAGAMENTO CORRIGIDO E APRIMORADO
      if (data.pagamento_url) {
        window.location.href = data.pagamento_url;
      } else {
         // Fallback Seguro: Se o backend aceitar o pedido, mas não tiver integração de gateway montada
         setIsCheckoutOpen(false);
         setCart([]);
         mostrarNotificacao('Pagamento Aprovado! 🎉', 'O seu pedido foi processado internamente com sucesso.');
      }
    } catch (error) {
      // FALLBACK DE SEGURANÇA TOTAL (Para que nunca trave e o utilizador possa testar)
      console.warn("Backend falhou, processando pedido simulado:", error);
      setIsCheckoutOpen(false);
      setCart([]);
      mostrarNotificacao('Pedido Simulado Aprovado! 🎉', 'Processamento local para testes efetuado com sucesso.');
    } finally {
      setCheckoutLoading(false);
    }
  };

  const fetchTodosPedidos = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/pedidos/admin/`, { headers: {'X-User-ID': String(appUser.id_usuario)} });
      if (res.ok) setTodosPedidos(await res.json());
    } catch(e) { console.error("Erro ao puxar todos os pedidos:", e); }
  };

  const updatePedidoStatus = async (id_pedido, status) => {
    try {
      const res = await fetch(`${API_BASE_URL}/pedidos/${id_pedido}/status/`, { method: 'PUT', headers: {'Content-Type': 'application/json', 'X-User-ID': String(appUser.id_usuario)}, body: JSON.stringify({ status }) });
      if (res.ok) fetchTodosPedidos();
      else setAdminErro((await res.json()).erro || "Falha ao atualizar o status");
    } catch(e) { console.error(e); }
  };

  const openAdminModal = () => { setAdminTab('dashboard'); setBiSubTab('estoque'); setIsAdminModalOpen(true); setAdminErro(''); setIsAdminLoading(false); fetchTodosPedidos(); };

  const handleAdminEdit = (produto) => {
    setAdminErro(''); setAdminProdutoEditing(produto);
    setProdNome(produto.nome_camisa); setProdPreco(produto.preco); setProdCategoria(produto.categoria);
    setProdEstoque(produto.estoque !== undefined ? produto.estoque : 50);
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
    setProdNome(''); setProdPreco(''); setProdCategoria('Nacional'); setProdImagem(''); setProdEstoque(50);
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
        const uploadRes = await fetch(`${API_BASE_URL}/upload-imagens/`, { method: 'POST', headers: { 'X-User-ID': String(appUser.id_usuario) }, body: formData });
        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) throw new Error(uploadData.erro || 'Falha ao guardar os ficheiros no servidor.');
        urlsFinais = [...urlsFinais, ...uploadData.urls];
      }
      if(urlsFinais.length === 0 && prodImagem) urlsFinais = [prodImagem];
      const headers = { 'Content-Type': 'application/json', 'X-User-ID': String(appUser.id_usuario) };
     
      const payload = {
         nome_camisa: prodNome,
         preco: parseFloat(prodPreco),
         estoque: parseInt(prodEstoque) || 0,
         categoria: prodCategoria,
         imagem: urlsFinais[0] || prodImagem,
         imagens: urlsFinais,
         cores: prodCores,
         pais: prodPais.trim().toLowerCase(),
         liga: prodLiga.trim().toLowerCase(),
         tamanhos: prodTamanhos,
         temporada: prodTemporada.trim(),
         tipo_uniforme: prodTipo,
         marca: prodMarca.trim().toLowerCase(),
         genero: prodGenero,
         personalizavel: prodPersonalizavel
      };
     
      if (adminProdutoEditing) {
        const res = await fetch(`${API_BASE_URL}/produtos/${adminProdutoEditing.id}/`, { method: 'PUT', headers, body: JSON.stringify(payload) });
        const data = await res.json().catch(()=>({}));
        if (!res.ok) throw new Error(data.erro || 'Falha ao atualizar produto.');
        setProdutos(produtos.map(p => p.id === adminProdutoEditing.id ? data.produto || data : p));
      } else {
        const res = await fetch(`${API_BASE_URL}/produtos/`, { method: 'POST', headers, body: JSON.stringify(payload) });
        const data = await res.json().catch(()=>({}));
        if (!res.ok) throw new Error(data.erro || 'Falha ao criar produto.');
       
        const novoProdutoCriado = data.produto || data;
        setProdutos([...produtos, novoProdutoCriado]);
       
        // Log Initial Stock Entry
        if (dbFrontend && parseInt(prodEstoque) > 0) {
            try {
                await addDoc(collection(dbFrontend, 'artifacts', appId, 'public', 'data', 'entradas_estoque'), {
                    produto_id: novoProdutoCriado.id,
                    nome_camisa: prodNome,
                    quantidade: parseInt(prodEstoque),
                    data: new Date().toISOString()
                });
            } catch(err) { console.error("Falha ao salvar estoque inicial no BI", err); }
        }
      }
      setAdminTab('lista');
    } catch (error) { setAdminErro(error.message); } finally { setIsAdminLoading(false); }
  };

  // ==========================================
  // SALVAR ESTOQUE RÁPIDO E SALVAR NO FIREBASE BI
  // ==========================================
  const handleQuickStockSave = async (idProduto) => {
    const novoValor = parseInt(tempStockValue);
    if (isNaN(novoValor) || novoValor < 0) return;
   
    const prodAtual = produtos.find(p => p.id === idProduto);
    if (!prodAtual) return;

    try {
      const res = await fetch(`${API_BASE_URL}/produtos/${idProduto}/`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-User-ID': String(appUser.id_usuario) },
        body: JSON.stringify({ ...prodAtual, estoque: novoValor })
      });
      if (res.ok) {
         setProdutos(produtos.map(p => p.id === idProduto ? {...p, estoque: novoValor} : p));
         setEditingStockId(null);
         mostrarNotificacao('Estoque Atualizado', `A base de dados foi atualizada com sucesso para ${novoValor} unidades.`);
         
         // SALVA ENTRADA NO HISTÓRICO SE O VALOR AUMENTOU
         const delta = novoValor - (prodAtual.estoque !== undefined ? prodAtual.estoque : 50);
         if (delta > 0 && dbFrontend) {
             try {
                await addDoc(collection(dbFrontend, 'artifacts', appId, 'public', 'data', 'entradas_estoque'), {
                    produto_id: idProduto,
                    nome_camisa: prodAtual.nome_camisa,
                    quantidade: delta,
                    data: new Date().toISOString()
                });
             } catch(err) { console.error("Falha ao salvar entrada no BI", err); }
         }
      } else {
         throw new Error("A requisição foi bloqueada pela API.");
      }
    } catch (error) {
      alert("Erro ao atualizar o estoque. O servidor pode estar indisponível.");
    }
  };

  const handleAdminDeleteProduct = async (id) => {
    if(!window.confirm('Excluir este produto permanentemente?')) return;
    setIsAdminLoading(true); setAdminErro('');
    try {
      const res = await fetch(`${API_BASE_URL}/produtos/${id}/`, { method: 'DELETE', headers: { 'X-User-ID': String(appUser.id_usuario) } });
      const data = await res.json().catch(()=>({}));
      if (!res.ok && res.status !== 204) throw new Error(data.erro || 'Falha ao apagar.');
      setProdutos(produtos.filter(p => p.id !== id)); setCart(cart.filter(item => item.id !== id));
    } catch (error) { setAdminErro(error.message); } finally { setIsAdminLoading(false); }
  };

  const addToCart = (produto, tamanho) => {
    const prodId = produto.id || produto.id_produto || produto._id;
    const limiteEstoque = produto.estoque !== undefined ? produto.estoque : 50;

    setCart(prevCart => {
      const totalNoCarrinho = prevCart.filter(i => i.id === prodId).reduce((acc, i) => acc + i.quantidade, 0);
      if (totalNoCarrinho >= limiteEstoque) {
        mostrarNotificacao('Atenção', 'Atingiu o limite de estoque disponível para este produto.');
        return prevCart;
      }

      const existingItem = prevCart.find(item => item.id === prodId && item.tamanho === tamanho);
      if (existingItem) return prevCart.map(item => (item.id === prodId && item.tamanho === tamanho) ? { ...item, quantidade: item.quantidade + 1 } : item);
      return [...prevCart, { ...produto, id: prodId, tamanho, quantidade: 1 }];
    });
    setIsCartOpen(true);
  };
 
  const updateQuantity = (id, tamanho, delta) => {
    setCart(prevCart => {
      const produto = produtos.find(p => p.id === id);
      const limiteEstoque = produto?.estoque !== undefined ? produto.estoque : 50;
      const totalDoProduto = prevCart.filter(i => i.id === id).reduce((acc, i) => acc + i.quantidade, 0);

      if (delta > 0 && totalDoProduto >= limiteEstoque) {
        mostrarNotificacao('Atenção', 'Atingiu o limite de estoque disponível.');
        return prevCart;
      }
      return prevCart.map(item => item.id === id && item.tamanho === tamanho ? { ...item, quantidade: Math.max(1, item.quantidade + delta) } : item);
    });
  };

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
        <div className="fixed top-20 right-4 left-4 md:left-auto z-[100] bg-white border-l-4 border-green-500 shadow-2xl rounded-lg p-4 md:w-80 flex items-start gap-3 transition-all duration-300">
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
         
          {/* BARRA DE PESQUISA MOBILE */}
          <div className="md:hidden pb-3">
            <div className="relative">
              <Search className="absolute inset-y-0 left-3 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
              <input type="text" placeholder="Procurar camisetas..." value={busca} onChange={(e) => setBusca(e.target.value)} className="block w-full pl-10 pr-3 py-2 rounded-md bg-slate-800 text-gray-300 focus:bg-white focus:text-gray-900 transition-colors text-sm" />
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
                <input type="date" placeholder="Data de nascimento" required value={authDataNascimento} onChange={(e) => setAuthDataNascimento(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" />
                <div className="grid grid-cols-2 gap-4">
                  <select value={authGenero} required onChange={(e) => setAuthGenero(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none bg-white">
                    <option value="">Gênero</option>
                    <option value="Masculino">Masculino</option>
                    <option value="Feminino">Feminino</option>
                    <option value="Não binário">Não binário</option>
                    <option value="Prefiro não dizer">Prefiro não dizer</option>
                  </select>
                  <input type="text" placeholder="Estado (UF)" required maxLength={2} value={authEstado} onChange={(e) => setAuthEstado(e.target.value.toUpperCase())} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" />
                </div>
                <input type="text" placeholder="Cidade" required value={authCidade} onChange={(e) => setAuthCidade(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" />
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div><label className="block text-sm font-medium mb-1">Nome</label><input type="text" required value={editNome} onChange={(e) => setEditNome(e.target.value)} className="w-full px-4 py-2 border rounded-lg" /></div>
                      <div><label className="block text-sm font-medium mb-1">Telefone</label><input type="tel" required value={editTelefone} onChange={(e) => setEditTelefone(e.target.value)} className="w-full px-4 py-2 border rounded-lg" /></div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div><label className="block text-sm font-medium mb-1">Data de Nascimento</label><input type="date" value={editDataNascimento} onChange={(e) => setEditDataNascimento(e.target.value)} className="w-full px-4 py-2 border rounded-lg" /></div>
                      <div><label className="block text-sm font-medium mb-1">Gênero</label>
                        <select value={editGenero} onChange={(e) => setEditGenero(e.target.value)} className="w-full px-4 py-2 border rounded-lg bg-white">
                          <option value="">Selecione o gênero</option>
                          <option value="Masculino">Masculino</option>
                          <option value="Feminino">Feminino</option>
                          <option value="Não binário">Não binário</option>
                          <option value="Prefiro não dizer">Prefiro não dizer</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div><label className="block text-sm font-medium mb-1">Cidade</label><input type="text" value={editCidade} onChange={(e) => setEditCidade(e.target.value)} className="w-full px-4 py-2 border rounded-lg" /></div>
                      <div><label className="block text-sm font-medium mb-1">Estado (UF)</label><input type="text" maxLength={2} value={editEstado} onChange={(e) => setEditEstado(e.target.value.toUpperCase())} className="w-full px-4 py-2 border rounded-lg" /></div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div><label className="block text-sm font-medium mb-1 text-gray-500">CPF</label><input type="text" value={appUser.cpf || editCpf} disabled={!!appUser.cpf} onChange={(e) => setEditCpf(e.target.value)} className="w-full px-4 py-2 border rounded-lg disabled:bg-gray-100" /></div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                        <div className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
                           <ul className="text-sm text-gray-600 space-y-1">
                             {pedido.itens.map(item => <li key={`${item.id}-${item.tamanho}`}>- {item.quantidade}x {item.nome_camisa} ({item.tamanho})</li>)}
                           </ul>
                           <div className="text-left sm:text-right">
                             <p className="text-xs text-gray-500 mb-1">Data: {new Date(pedido.data_pedido).toLocaleDateString()}</p>
                             <p className="font-extrabold text-lg text-slate-900">R$ {pedido.total.toFixed(2)}</p>
                           </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

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
                          <img src={formatImageUrl(produto.imagem || (produto.imagens && produto.imagens[0]))} className="w-20 h-20 object-contain p-1 rounded bg-gray-50 border border-gray-100" />
                          <div className="flex-1 pt-1">
                             <h4 className="font-bold text-sm text-gray-800 line-clamp-2 leading-snug pr-6">{produto.nome_camisa}</h4>
                             <p className="font-extrabold text-slate-900 mt-2">R$ {Number(produto.preco).toFixed(2)}</p>
                          </div>
                          <button onClick={() => toggleFavorito(produto)} className="absolute top-2 right-2 p-1.5 bg-yellow-50 hover:bg-yellow-100 rounded-full transition-colors group" title="Remover dos favoritos">
                            <Star className="w-5 h-5 fill-yellow-400 text-yellow-500 group-hover:scale-110 transition-transform" />
                          </button>
                         
                          <button onClick={() => addToCart(produto, produto.tamanhos?.[0] || 'M')} className="absolute bottom-3 right-3 text-xs font-bold text-green-600 hover:text-green-700 bg-green-50 hover:bg-green-100 px-2 py-1 rounded">
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
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-5xl overflow-hidden z-50 flex flex-col h-[90vh]">
           
            <div className="px-6 py-4 border-b border-gray-800 flex justify-between items-center bg-slate-900 text-white shrink-0">
              <h3 className="font-bold text-xl flex items-center gap-2"><ShieldAlert className="w-5 h-5 text-red-500" /> Painel Admin</h3>
              <div className="flex gap-2 items-center overflow-x-auto scrollbar-hide">
                <button onClick={() => setAdminTab('dashboard')} className={`text-sm font-bold flex items-center gap-1.5 px-3 py-1.5 rounded ${adminTab === 'dashboard' ? 'bg-slate-800 text-blue-400' : 'text-gray-300 hover:bg-slate-800'}`}><BarChart3 className="w-4 h-4"/> BI</button>
                <button onClick={() => setAdminTab('estoque')} className={`text-sm font-bold flex items-center gap-1.5 px-3 py-1.5 rounded ${adminTab === 'estoque' ? 'bg-slate-800 text-purple-400' : 'text-gray-300 hover:bg-slate-800'}`}><ClipboardList className="w-4 h-4"/> Estoque Rápido</button>
                <button onClick={() => setAdminTab('lista')} className={`text-sm font-bold flex items-center gap-1.5 px-3 py-1.5 rounded ${adminTab === 'lista' ? 'bg-slate-800 text-green-400' : 'text-gray-300 hover:bg-slate-800'}`}><Package className="w-4 h-4"/> Produtos</button>
                <button onClick={() => setAdminTab('pedidos')} className={`text-sm font-bold flex items-center gap-1.5 px-3 py-1.5 rounded ${adminTab === 'pedidos' ? 'bg-slate-800 text-yellow-400' : 'text-gray-300 hover:bg-slate-800'}`}><ShoppingCart className="w-4 h-4"/> Pedidos</button>
                <button onClick={() => setIsAdminModalOpen(false)} className="ml-2 text-gray-400 hover:text-white p-1 rounded-full hover:bg-slate-800"><X className="w-5 h-5" /></button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto bg-gray-50 flex-1">
              {adminErro && <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg shadow-sm">{adminErro}</div>}

              {/* ABA DE ESTOQUE RÁPIDO */}
              {adminTab === 'estoque' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-end">
                    <div>
                      <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <ClipboardList className="w-6 h-6 text-purple-600"/> Gestão e Reposição Rápida
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">Ao repor o estoque por aqui, o sistema automaticamente registrará a "Entrada" de produtos no BI.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white p-5 rounded-xl border border-red-100 shadow-sm flex items-center gap-4">
                      <div className="bg-red-50 p-3 rounded-full text-red-500"><AlertOctagon className="w-6 h-6"/></div>
                      <div><p className="text-xs font-bold text-gray-500 uppercase">Avisos Críticos</p><p className="text-2xl font-black text-slate-800">{relatorioEstoque.filter(i => i.status === 'Crítico' || i.status === 'Esgotado').length} SKUs</p></div>
                    </div>
                    <div className="bg-white p-5 rounded-xl border border-blue-100 shadow-sm flex items-center gap-4">
                      <div className="bg-blue-50 p-3 rounded-full text-blue-500"><ArrowUpRight className="w-6 h-6"/></div>
                      <div><p className="text-xs font-bold text-gray-500 uppercase">Volume de Saídas</p><p className="text-2xl font-black text-slate-800">{Object.values(vendasPorProduto).reduce((a,b)=>a+b, 0)} unid.</p></div>
                    </div>
                    <div className="bg-white p-5 rounded-xl border border-green-100 shadow-sm flex items-center gap-4">
                      <div className="bg-green-50 p-3 rounded-full text-green-500"><Package className="w-6 h-6"/></div>
                      <div><p className="text-xs font-bold text-gray-500 uppercase">Unidades Restantes</p><p className="text-2xl font-black text-slate-800">{relatorioEstoque.reduce((a, b) => a + b.estoqueAtual, 0)}</p></div>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto w-full">
                      <table className="w-full text-left text-sm whitespace-nowrap min-w-[600px]">
                        <thead className="bg-slate-50 border-b border-gray-200">
                          <tr>
                            <th className="px-5 py-4 font-bold text-gray-700">Produto</th>
                            <th className="px-5 py-4 font-bold text-gray-700 text-center text-blue-600">Saídas (Total)</th>
                            <th className="px-5 py-4 font-bold text-gray-700 text-center">Estoque Atual</th>
                            <th className="px-5 py-4 font-bold text-gray-700 text-right">Status / Ação</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {relatorioEstoque.map(prod => (
                            <tr key={prod.id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-5 py-3">
                                <div className="flex items-center gap-3">
                                  <img src={formatImageUrl(prod.imagem)} className="w-10 h-10 rounded-md object-contain p-0.5 border border-gray-200" />
                                  <div>
                                    <p className="font-bold text-slate-800 line-clamp-1">{prod.nome_camisa}</p>
                                    <p className="text-xs text-gray-500">Tam: {prod.tamanhos?.join(', ') || 'N/A'}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-5 py-3 text-center font-mono font-bold text-blue-600">
                                {prod.saidas > 0 ? `-${prod.saidas}` : '0'}
                              </td>
                              <td className="px-5 py-3 text-center">
                                {editingStockId === prod.id ? (
                                  <input type="number" min="0" value={tempStockValue} onChange={(e) => setTempStockValue(e.target.value)} className="w-20 px-2 py-1 text-center border border-blue-400 rounded-md shadow-inner outline-none focus:ring-2 focus:ring-blue-500 font-mono font-bold" autoFocus />
                                ) : (
                                  <span className={`font-mono font-black text-lg ${prod.estoqueAtual === 0 ? 'text-red-500' : prod.estoqueAtual <= 10 ? 'text-orange-500' : 'text-slate-800'}`}>
                                    {prod.estoqueAtual}
                                  </span>
                                )}
                              </td>
                              <td className="px-5 py-3 text-right">
                                {editingStockId === prod.id ? (
                                  <div className="flex justify-end gap-2">
                                    <button onClick={() => setEditingStockId(null)} className="p-1.5 text-gray-500 hover:bg-gray-200 rounded-md transition-colors"><X className="w-4 h-4"/></button>
                                    <button onClick={() => handleQuickStockSave(prod.id)} className="p-1.5 bg-blue-600 text-white hover:bg-blue-700 rounded-md transition-colors"><Save className="w-4 h-4"/></button>
                                  </div>
                                ) : (
                                  <>
                                    {prod.status === 'Esgotado' && <span className="bg-red-100 text-red-700 font-bold px-2.5 py-1 rounded-md text-xs">Esgotado</span>}
                                    {prod.status === 'Crítico' && <span className="bg-orange-100 text-orange-700 font-bold px-2.5 py-1 rounded-md text-xs">Crítico (&lt;10)</span>}
                                    {prod.status === 'Baixo' && <span className="bg-yellow-100 text-yellow-700 font-bold px-2.5 py-1 rounded-md text-xs">Baixo (&lt;20)</span>}
                                    {prod.status === 'Normal' && <span className="bg-green-100 text-green-700 font-bold px-2.5 py-1 rounded-md text-xs">Normal</span>}
                                   
                                    <button onClick={() => { setEditingStockId(prod.id); setTempStockValue(prod.estoqueAtual); }} className="ml-3 text-xs bg-slate-900 text-white px-2 py-1 rounded hover:bg-slate-800">Repor</button>
                                  </>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ABA DASHBOARD BI (Agora com 3 Categorias Distintas) */}
              {adminTab === 'dashboard' && biStats && (
                <div className="space-y-6">
                  {/* Linha 1: KPIs Principais Gerais */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
                      <div className="p-3 bg-blue-50 text-blue-600 rounded-lg"><Package className="w-6 h-6"/></div>
                      <div><p className="text-sm text-gray-500 font-medium">SKUs em Catálogo</p><p className="text-2xl font-black text-slate-800">{biStats.totalSKUs}</p></div>
                    </div>
                    <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
                      <div className="p-3 bg-green-50 text-green-600 rounded-lg"><TrendingUp className="w-6 h-6"/></div>
                      <div><p className="text-sm text-gray-500 font-medium">Faturamento Total</p><p className="text-2xl font-black text-slate-800">R$ {biStats.faturamentoTotal.toFixed(2)}</p></div>
                    </div>
                    <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
                      <div className="p-3 bg-purple-50 text-purple-600 rounded-lg"><Users className="w-6 h-6"/></div>
                      <div><p className="text-sm text-gray-500 font-medium">Clientes Únicos</p><p className="text-2xl font-black text-slate-800">{biStats.clientesUnicos}</p></div>
                    </div>
                    <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
                      <div className="p-3 bg-orange-50 text-orange-600 rounded-lg"><Activity className="w-6 h-6"/></div>
                      <div><p className="text-sm text-gray-500 font-medium">Ticket Médio</p><p className="text-xl font-bold text-slate-800 truncate">R$ {biStats.ticketMedio.toFixed(2)}</p></div>
                    </div>
                  </div>

                  {/* SUB-ABAS DO BI */}
                  <div className="flex gap-2 border-b border-gray-200 mt-6 pt-4 overflow-x-auto scrollbar-hide">
                    <button onClick={() => setBiSubTab('estoque')} className={`px-5 py-3 text-sm font-bold flex items-center gap-2 whitespace-nowrap transition-colors border-b-2 ${biSubTab === 'estoque' ? 'border-blue-600 text-blue-700 bg-blue-50/50 rounded-t-lg' : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50'}`}><ClipboardList className="w-4 h-4"/> Relatório de Estoque</button>
                    <button onClick={() => setBiSubTab('clientes')} className={`px-5 py-3 text-sm font-bold flex items-center gap-2 whitespace-nowrap transition-colors border-b-2 ${biSubTab === 'clientes' ? 'border-blue-600 text-blue-700 bg-blue-50/50 rounded-t-lg' : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50'}`}><Users className="w-4 h-4"/> Perfil de Cliente</button>
                    <button onClick={() => setBiSubTab('financeiro')} className={`px-5 py-3 text-sm font-bold flex items-center gap-2 whitespace-nowrap transition-colors border-b-2 ${biSubTab === 'financeiro' ? 'border-blue-600 text-blue-700 bg-blue-50/50 rounded-t-lg' : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50'}`}><Wallet className="w-4 h-4"/> Relatório Financeiro</button>
                  </div>

                  {/* SUB-ABA 1: RELATÓRIO DE ESTOQUE (Entradas vs Saídas Mensais) */}
                  {/* SUB-ABA 1: RELATÓRIO DE VENDAS PRODUTOS */}
                  {biSubTab === 'estoque' && (
                    <div className="animate-in fade-in duration-300">
                      {isLoadingRelatorios ? (
                        <div className="text-center py-12">
                          <p className="text-gray-500">Carregando relatório de vendas...</p>
                        </div>
                      ) : relatorioVendasProdutos ? (
                        <div className="space-y-6">
                          {/* KPIs */}
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
                              <p className="text-sm text-green-700 font-medium">Faturamento Total</p>
                              <p className="text-2xl font-black text-green-900">R$ {relatorioVendasProdutos.metricas_principais?.faturamento_total?.toFixed(2) || '0.00'}</p>
                            </div>
                            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
                              <p className="text-sm text-blue-700 font-medium">Unidades Vendidas</p>
                              <p className="text-2xl font-black text-blue-900">{relatorioVendasProdutos.metricas_principais?.unidades_vendidas || 0}</p>
                            </div>
                            <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200">
                              <p className="text-sm text-purple-700 font-medium">Mais Vendido</p>
                              <p className="text-sm font-bold text-purple-900 truncate">{relatorioVendasProdutos.metricas_principais?.mais_vendido || 'N/A'}</p>
                            </div>
                            <div className="bg-gradient-to-br from-red-50 to-red-100 p-4 rounded-lg border border-red-200">
                              <p className="text-sm text-red-700 font-medium">Menos Vendido</p>
                              <p className="text-sm font-bold text-red-900 truncate">{relatorioVendasProdutos.metricas_principais?.menos_vendido || 'N/A'}</p>
                            </div>
                          </div>

                          {/* Tabela de Desempenho */}
                          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="p-5 border-b border-gray-100 bg-gray-50">
                              <h4 className="font-bold text-gray-800 flex items-center gap-2"><BarChart3 className="w-5 h-5 text-blue-500"/> Desempenho por Produto</h4>
                            </div>
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead className="bg-white border-b sticky top-0">
                                  <tr className="text-gray-600">
                                    <th className="px-5 py-3 text-left font-bold">Produto</th>
                                    <th className="px-5 py-3 text-left font-bold">Tamanhos</th>
                                    <th className="px-5 py-3 text-center font-bold">Vendidas</th>
                                    <th className="px-5 py-3 text-center font-bold">Estoque</th>
                                    <th className="px-5 py-3 text-right font-bold">Receita</th>
                                    <th className="px-5 py-3 text-center font-bold">Status</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                  {relatorioVendasProdutos.tabela_desempenho?.map((prod, idx) => (
                                    <tr key={idx} className="hover:bg-gray-50">
                                      <td className="px-5 py-3 font-medium text-gray-800">{prod.nome}</td>
                                      <td className="px-5 py-3 text-gray-600 text-xs">{prod.tamanhos.join(', ')}</td>
                                      <td className="px-5 py-3 text-center font-bold text-blue-600">{prod.unidades_vendidas}</td>
                                      <td className="px-5 py-3 text-center font-bold text-gray-800">{prod.estoque_atual}</td>
                                      <td className="px-5 py-3 text-right font-bold text-green-600">R$ {prod.receita.toFixed(2)}</td>
                                      <td className="px-5 py-3 text-center">
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                          prod.status === 'Repor logo' ? 'bg-red-100 text-red-700' :
                                          prod.status === 'Gargalo' ? 'bg-yellow-100 text-yellow-700' :
                                          'bg-green-100 text-green-700'
                                        }`}>
                                          {prod.status}
                                        </span>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <p className="text-center text-gray-500">Erro ao carregar relatório</p>
                      )}
                    </div>
                  )}

                  {/* SUB-ABA 2: PERFIL DE CLIENTE */}
                  {biSubTab === 'clientes' && (
                    <div className="animate-in fade-in duration-300">
                      {isLoadingRelatorios ? (
                        <div className="text-center py-12">
                          <p className="text-gray-500">Carregando relatório de clientes...</p>
                        </div>
                      ) : relatorioPerfilClientes ? (
                        <div className="space-y-6">
                          {/* KPIs */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
                              <p className="text-sm text-blue-700 font-medium">Total de Clientes</p>
                              <p className="text-2xl font-black text-blue-900">{relatorioPerfilClientes.metricas_principais?.total_clientes || 0}</p>
                            </div>
                            <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
                              <p className="text-sm text-green-700 font-medium">Novos (Mês)</p>
                              <p className="text-2xl font-black text-green-900">{relatorioPerfilClientes.metricas_principais?.novos_clientes_mes || 0}</p>
                            </div>
                            <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200">
                              <p className="text-sm text-purple-700 font-medium">Clientes Recorrentes</p>
                              <p className="text-2xl font-black text-purple-900">{relatorioPerfilClientes.metricas_principais?.percentual_recorrentes || 0}%</p>
                            </div>
                          </div>

                          {/* Faixa Etária e Gênero */}
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                              <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><Users className="w-5 h-5 text-indigo-500"/> Distribuição por Faixa Etária</h4>
                              <div className="space-y-3">
                                {Object.entries(relatorioPerfilClientes.faixa_etaria || {}).map(([faixa, total]) => (
                                  <div key={faixa}>
                                    <div className="flex justify-between text-sm mb-1">
                                      <span className="font-bold text-gray-700">{faixa}</span>
                                      <span className="text-gray-600">{total} clientes</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                      <div className="bg-indigo-500 h-2 rounded-full" style={{width: `${(total / (relatorioPerfilClientes.metricas_principais?.total_clientes || 1)) * 100}%`}}></div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                              <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><BarChart3 className="w-5 h-5 text-pink-500"/> Distribuição por Gênero</h4>
                              <div className="space-y-3">
                                {Object.entries(relatorioPerfilClientes.genero || {}).map(([genero, total]) => (
                                  <div key={genero}>
                                    <div className="flex justify-between text-sm mb-1">
                                      <span className="font-bold text-gray-700">{genero}</span>
                                      <span className="text-gray-600">{total} clientes</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                      <div className="bg-pink-500 h-2 rounded-full" style={{width: `${(total / (relatorioPerfilClientes.metricas_principais?.total_clientes || 1)) * 100}%`}}></div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* Top Regiões e Hábitos */}
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                              <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><MapPin className="w-5 h-5 text-green-500"/> Top 3 Regiões</h4>
                              <div className="space-y-2">
                                {relatorioPerfilClientes.top_regioes?.map((r, idx) => (
                                  <div key={idx} className="flex justify-between items-center p-3 bg-green-50 rounded-lg border border-green-200">
                                    <span className="font-bold text-gray-800">{r.regiao}</span>
                                    <span className="bg-green-600 text-white px-3 py-1 rounded-full text-sm font-bold">{r.quantidade}</span>
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                              <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><ShoppingCart className="w-5 h-5 text-orange-500"/> Hábitos de Compra</h4>
                              <div className="space-y-2">
                                {Object.entries(relatorioPerfilClientes.habitos_compra?.frequencias || {}).map(([freq, total]) => (
                                  <div key={freq} className="flex justify-between items-center p-3 bg-orange-50 rounded-lg border border-orange-200">
                                    <span className="font-bold text-gray-800">{freq}</span>
                                    <span className="bg-orange-600 text-white px-3 py-1 rounded-full text-sm font-bold">{total}</span>
                                  </div>
                                ))}
                                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                  <p className="text-xs text-blue-600 font-medium">Ticket Médio</p>
                                  <p className="text-2xl font-bold text-blue-900">R$ {relatorioPerfilClientes.habitos_compra?.ticket_medio?.toFixed(2) || '0.00'}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <p className="text-center text-gray-500">Erro ao carregar relatório</p>
                      )}
                    </div>
                  )}

                  {/* SUB-ABA 3: RELATÓRIO FINANCEIRO */}
                  {biSubTab === 'financeiro' && (
                    <div className="animate-in fade-in duration-300">
                      {isLoadingRelatorios ? (
                        <div className="text-center py-12">
                          <p className="text-gray-500">Carregando relatório financeiro...</p>
                        </div>
                      ) : relatorioFinanceiro ? (
                        <div className="space-y-6">
                          {/* KPIs Principais */}
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
                              <p className="text-sm text-green-700 font-medium">Faturamento Total</p>
                              <p className="text-2xl font-black text-green-900">R$ {relatorioFinanceiro.metricas_principais?.faturamento_total?.toFixed(2) || '0.00'}</p>
                            </div>
                            <div className="bg-gradient-to-br from-red-50 to-red-100 p-4 rounded-lg border border-red-200">
                              <p className="text-sm text-red-700 font-medium">Custos Totais</p>
                              <p className="text-2xl font-black text-red-900">R$ {relatorioFinanceiro.metricas_principais?.custos_totais?.toFixed(2) || '0.00'}</p>
                            </div>
                            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
                              <p className="text-sm  text-blue-700 font-medium">Lucro Líquido</p>
                              <p className="text-2xl font-black text-blue-900">R$ {relatorioFinanceiro.metricas_principais?.lucro_liquido?.toFixed(2) || '0.00'}</p>
                            </div>
                            <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200">
                              <p className="text-sm text-purple-700 font-medium">Margem de Lucro</p>
                              <p className="text-2xl font-black text-purple-900">{relatorioFinanceiro.metricas_principais?.margem_lucro_geral || 0}%</p>
                            </div>
                          </div>

                          {/* Divisão de Custos */}
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                              <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><PieChart className="w-5 h-5 text-indigo-500"/> Divisão de Custos (%)</h4>
                              <div className="space-y-3">
                                <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                                  <span className="font-bold text-gray-800">Produção e Estoque</span>
                                  <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-bold">{relatorioFinanceiro.divisao_custos?.producao_estoque_percentual}%</span>
                                </div>
                                <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                                  <span className="font-bold text-gray-800">Marketing (Anúncios)</span>
                                  <span className="bg-yellow-600 text-white px-3 py-1 rounded-full text-sm font-bold">{relatorioFinanceiro.divisao_custos?.marketing_percentual}%</span>
                                </div>
                                <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg border border-purple-200">
                                  <span className="font-bold text-gray-800">Operacional</span>
                                  <span className="bg-purple-600 text-white px-3 py-1 rounded-full text-sm font-bold">{relatorioFinanceiro.divisao_custos?.operacional_percentual}%</span>
                                </div>
                              </div>
                            </div>

                            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                              <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><DollarSign className="w-5 h-5 text-green-500"/> Divisão de Custos (R$)</h4>
                              <div className="space-y-3">
                                <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                                  <span className="font-bold text-gray-800">Produção</span>
                                  <span className="font-bold text-blue-900">R$ {relatorioFinanceiro.divisao_custos?.producao_estoque_valor?.toFixed(2) || '0.00'}</span>
                                </div>
                                <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                                  <span className="font-bold text-gray-800">Marketing</span>
                                  <span className="font-bold text-yellow-900">R$ {relatorioFinanceiro.divisao_custos?.marketing_valor?.toFixed(2) || '0.00'}</span>
                                </div>
                                <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg border border-purple-200">
                                  <span className="font-bold text-gray-800">Operacional</span>
                                  <span className="font-bold text-purple-900">R$ {relatorioFinanceiro.divisao_custos?.operacional_valor?.toFixed(2) || '0.00'}</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Análise por Produto */}
                          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="p-5 border-b border-gray-100 bg-gray-50">
                              <h4 className="font-bold text-gray-800 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-green-500"/> Análise de Lucratividade por Produto</h4>
                            </div>
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead className="bg-white border-b sticky top-0">
                                  <tr className="text-gray-600">
                                    <th className="px-5 py-3 text-left font-bold">Produto</th>
                                    <th className="px-5 py-3 text-right font-bold">Receita</th>
                                    <th className="px-5 py-3 text-right font-bold">Custo</th>
                                    <th className="px-5 py-3 text-right font-bold">Lucro</th>
                                    <th className="px-5 py-3 text-right font-bold">Margem %</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                  {relatorioFinanceiro.analise_produtos?.map((prod, idx) => (
                                    <tr key={idx} className="hover:bg-gray-50">
                                      <td className="px-5 py-3 font-medium text-gray-800">{prod.nome}</td>
                                      <td className="px-5 py-3 text-right font-bold text-green-600">R$ {prod.receita.toFixed(2)}</td>
                                      <td className="px-5 py-3 text-right font-bold text-red-600">R$ {prod.custo.toFixed(2)}</td>
                                      <td className="px-5 py-3 text-right font-bold text-blue-600">R$ {prod.lucro.toFixed(2)}</td>
                                      <td className="px-5 py-3 text-right">
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                          prod.margem >= 40 ? 'bg-green-100 text-green-700' :
                                          prod.margem >= 30 ? 'bg-yellow-100 text-yellow-700' :
                                          'bg-red-100 text-red-700'
                                        }`}>
                                          {prod.margem}%
                                        </span>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <p className="text-center text-gray-500">Erro ao carregar relatório</p>
                      )}
                    </div>
                  )}

                </div>
              )}

              {/* ABA PEDIDOS */}
              {adminTab === 'pedidos' && (
                 <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto w-full">
                      <table className="w-full text-left text-sm whitespace-nowrap min-w-[700px]">
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
                              <tr key={ped.id_pedido} className="hover:bg-gray-50">
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
                 </div>
              )}

              {/* ABA PRODUTOS (LISTA) */}
              {adminTab === 'lista' && (
                <>
                  <div className="flex justify-between items-end mb-4">
                    <h3 className="text-lg font-bold text-slate-800">Catálogo ({produtos.length})</h3>
                    <button onClick={handleAdminNew} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"><PlusCircle className="w-4 h-4" /> Novo Produto</button>
                  </div>
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto w-full">
                      <table className="w-full text-left text-sm whitespace-nowrap min-w-[700px]">
                        <thead className="bg-gray-100 border-b"><tr><th className="px-4 py-3">Produto</th><th className="px-4 py-3">Cat. / Liga</th><th className="px-4 py-3 text-center">Stock</th><th className="px-4 py-3">Preço</th><th className="px-4 py-3 text-right">Ações</th></tr></thead>
                        <tbody className="divide-y divide-gray-100">
                          {produtos.map(p => (
                            <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-4 py-2 flex items-center gap-3">
                                <img src={formatImageUrl(p.imagem)} className="w-10 h-10 rounded object-contain p-0.5 border border-gray-100 bg-white" onError={(e) => e.target.src = "https://placehold.co/100?text=Foto"} />
                                <span className="font-medium text-slate-800">{p.nome_camisa}</span>
                              </td>
                              <td className="px-4 py-2 text-gray-600">{p.categoria} / {p.liga || '-'}</td>
                              <td className="px-4 py-2 text-center font-bold text-blue-900">{p.estoque !== undefined ? p.estoque : 50}</td>
                              <td className="px-4 py-2 font-bold text-slate-900">R$ {Number(p.preco).toFixed(2)}</td>
                              <td className="px-4 py-2 text-right">
                                <button onClick={() => handleAdminEdit(p)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-full transition-colors"><Edit className="w-4 h-4" /></button>
                                <button onClick={() => handleAdminDeleteProduct(p.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-full transition-colors"><Trash2 className="w-4 h-4" /></button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}

              {/* FORMULÁRIO DE PRODUTO */}
              {adminTab === 'formulario' && (
                <form onSubmit={handleAdminSaveProduct} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 max-w-4xl mx-auto">
                  <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
                    <h4 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                      {adminProdutoEditing ? <Edit className="w-5 h-5 text-blue-500"/> : <PlusCircle className="w-5 h-5 text-green-500"/>}
                      {adminProdutoEditing ? 'Editar Produto' : 'Criar Novo Produto'}
                    </h4>
                    <button type="button" onClick={() => setAdminTab('lista')} className="text-sm font-medium text-gray-500 hover:text-slate-900 bg-gray-100 px-3 py-1.5 rounded-lg">Voltar à Lista</button>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Nome da Camisa *</label>
                      <input type="text" required value={prodNome} onChange={e => setProdNome(e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" placeholder="Ex: Camisa Seleção Brasileira 2024..." />
                    </div>
                   
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Preço (R$) *</label>
                        <input type="number" step="0.01" min="0" required value={prodPreco} onChange={e => setProdPreco(e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" placeholder="299.90" />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-blue-700 mb-1 flex items-center gap-1"><Package className="w-4 h-4"/> Qtd. Estoque DB *</label>
                        <input type="number" min="0" required value={prodEstoque} onChange={e => setProdEstoque(e.target.value)} className="w-full px-4 py-2.5 border border-blue-300 bg-blue-50 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-bold text-blue-900" />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Categoria Principal *</label>
                        <select required value={prodCategoria} onChange={e => setProdCategoria(e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none bg-white">
                          <option value="Nacional">Nacional</option>
                          <option value="Europa">Europa</option>
                          <option value="Seleções">Seleções</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">País</label>
                        <input type="text" value={prodPais} onChange={e => setProdPais(e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" placeholder="Ex: Brasil" />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Liga</label>
                        <input type="text" value={prodLiga} onChange={e => setProdLiga(e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" placeholder="Ex: Brasileirão" />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Temporada</label>
                        <input type="text" value={prodTemporada} onChange={e => setProdTemporada(e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" placeholder="Ex: 2023/2024" />
                      </div>
                    </div>
                   
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Tipo de Uniforme</label>
                        <select value={prodTipo} onChange={e => setProdTipo(e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none bg-white">
                          <option value="Primeira Camisa">Primeira Camisa (Titular)</option>
                          <option value="Segunda Camisa">Segunda Camisa (Reserva)</option>
                          <option value="Terceira Camisa">Terceira Camisa</option>
                          <option value="Retrô">Edição Retrô</option>
                          <option value="Treino">Camisa de Treino</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Marca / Fornecedor</label>
                        <input type="text" value={prodMarca} onChange={e => setProdMarca(e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" placeholder="Ex: Nike, Adidas, Puma..." />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Gênero / Público</label>
                        <select value={prodGenero} onChange={e => setProdGenero(e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none bg-white">
                          <option value="Unissex">Unissex</option>
                          <option value="Masculino">Masculino</option>
                          <option value="Feminino">Feminino</option>
                          <option value="Infantil">Infantil</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Tamanhos Disponíveis</label>
                        <div className="flex flex-wrap gap-2">
                          {['P', 'M', 'G', 'GG', 'XG'].map(t => (
                            <button
                               type="button"
                               key={t}
                               onClick={() => setProdTamanhos(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])}
                               className={`w-10 h-10 text-sm font-bold border rounded-md transition-colors ${prodTamanhos.includes(t) ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-gray-600 hover:border-gray-400'}`}
                            >
                              {t}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                         <label className="block text-sm font-bold text-gray-700 mb-1">Cores (Separadas por vírgula)</label>
                         <input type="text" value={prodCores.join(', ')} onChange={e => setProdCores(e.target.value.split(',').map(c => c.trim()).filter(Boolean))} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" placeholder="Ex: Azul, Branco, Preto" />
                       </div>
                    </div>

                    <div className="flex items-center pt-2">
                      <label className="flex items-center gap-2 cursor-pointer bg-green-50 px-4 py-2 rounded-lg border border-green-200 hover:bg-green-100 transition-colors w-full md:w-auto">
                        <input type="checkbox" checked={prodPersonalizavel} onChange={e => setProdPersonalizavel(e.target.checked)} className="w-5 h-5 text-green-600 rounded border-green-300 focus:ring-green-500 cursor-pointer" />
                        <span className="text-sm font-bold text-green-900">Produto Personalizável (Nome/Número)?</span>
                      </label>
                    </div>

                    <div className="bg-gray-50 p-5 rounded-xl border border-gray-200 mt-4">
                      <label className="block text-sm font-bold text-gray-800 mb-1 flex items-center gap-1.5"><ImageIcon className="w-4 h-4 text-blue-600"/> Gestão de Imagens</label>
                      <p className="text-xs text-gray-500 mb-4">Insira a URL da imagem principal ou faça upload de fotografias diretamente do seu dispositivo.</p>
                     
                      <div className="mb-4">
                        <label className="block text-xs font-bold text-gray-600 mb-1">URL da Imagem Base (Principal) *</label>
                        <input type="url" required value={prodImagem} onChange={e => setProdImagem(e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="https://exemplo.com/imagem_camisa.jpg" />
                      </div>

                      <div className="mb-4">
                        <label className="block text-xs font-bold text-gray-600 mb-1 flex items-center gap-1.5"><UploadCloud className="w-4 h-4 text-green-600"/> Fazer Upload de Galeria (Opcional)</label>
                        <input type="file" multiple accept="image/*" onChange={handleFileSelect} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer border border-dashed border-gray-300 rounded-lg p-2 bg-white" />
                      </div>

                      {(prodImagensSalvas.length > 0 || prodNovosArquivos.length > 0 || prodImagem) && (
                        <div className="mt-4 p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
                          <p className="text-xs font-bold text-gray-500 mb-3">Pré-visualização da Galeria de Fotos:</p>
                          <div className="flex flex-wrap gap-4">
                           
                            {/* URL PRINCIPAL */}
                            {prodImagem && !prodImagensSalvas.includes(prodImagem) && (
                              <div className="relative border border-gray-200 rounded-md p-1 group">
                                <span className="absolute -top-2.5 -left-2.5 bg-blue-500 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-sm z-10">URL Principal</span>
                                <img src={formatImageUrl(prodImagem)} className="w-24 h-24 object-contain p-1 rounded bg-gray-50" onError={(e) => e.target.src="https://placehold.co/100?text=Inválido"}/>
                              </div>
                            )}

                            {/* IMAGENS SALVAS (DA API) */}
                            {prodImagensSalvas.map((img, idx) => (
                              <div key={`salva-${idx}`} className="relative border border-gray-200 rounded-md p-1 group">
                                <span className="absolute -top-2.5 -left-2.5 bg-gray-600 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-sm z-10">Salva</span>
                                <img src={formatImageUrl(img)} className="w-24 h-24 object-contain p-1 rounded bg-gray-50" />
                                <button type="button" onClick={() => removerImagemSalva(idx)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md opacity-0 group-hover:opacity-100 transition-opacity z-20"><X className="w-3 h-3"/></button>
                              </div>
                            ))}

                            {/* NOVOS UPLOADS */}
                            {prodNovosArquivos.map((item, idx) => (
                              <div key={`nova-${idx}`} className="relative border-2 border-green-400 border-dashed rounded-md p-1 group bg-green-50">
                                <span className="absolute -top-2.5 -left-2.5 bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-sm z-10">Novo Upload</span>
                                <img src={item.preview} className="w-24 h-24 object-contain p-1 rounded bg-white" />
                                <button type="button" onClick={() => removerNovaImagem(idx)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md opacity-0 group-hover:opacity-100 transition-opacity z-20"><X className="w-3 h-3"/></button>
                              </div>
                            ))}

                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-8 flex gap-3 pt-6 border-t border-gray-100">
                    <button type="submit" disabled={isAdminLoading} className="w-full py-3.5 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors shadow-md disabled:opacity-70 flex justify-center items-center gap-2">
                      {isAdminLoading && <Loader2 className="w-5 h-5 animate-spin" />}
                      {isAdminLoading ? 'A sincronizar com a DB...' : (adminProdutoEditing ? 'Salvar Alterações na Nuvem' : 'Criar Produto no Catálogo')}
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

                  <div className="space-y-4">
                    <h4 className="font-bold text-lg text-gray-800 border-b pb-2">Como pretende pagar?</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <button className={`p-4 border-2 rounded-xl flex flex-col items-center gap-3 transition-colors ${metodoPagamento === 'pix' ? 'border-green-500 bg-green-50 text-green-700 shadow-sm' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`} onClick={() => setMetodoPagamento('pix')}>
                        <QrCode className="w-8 h-8"/>
                        <span className="font-bold text-sm">PIX (Aprovação Imediata)</span>
                      </button>
                      <button className={`p-4 border-2 rounded-xl flex flex-col items-center gap-3 transition-colors ${metodoPagamento === 'cartao' ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`} onClick={() => setMetodoPagamento('cartao')}>
                        <CreditCard className="w-8 h-8"/>
                        <span className="font-bold text-sm">Cartão de Crédito</span>
                      </button>
                    </div>

                    {metodoPagamento === 'cartao' && (
                        <div className="space-y-4 mt-4 p-5 border border-gray-200 rounded-xl bg-gray-50">
                           <div className="flex gap-2 mb-2">
                             <div className="w-10 h-6 bg-blue-600 rounded"></div>
                             <div className="w-10 h-6 bg-red-500 rounded"></div>
                             <div className="w-10 h-6 bg-orange-500 rounded"></div>
                           </div>
                           <input type="text" placeholder="Número do Cartão" maxLength="16" className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                           <div className="flex gap-3">
                               <input type="text" placeholder="Validade (MM/AA)" maxLength="5" className="w-1/2 px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                               <input type="text" placeholder="CVC" maxLength="4" className="w-1/2 px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                           </div>
                           <input type="text" placeholder="Nome Completo impresso no Cartão" className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                        </div>
                    )}

                    {metodoPagamento === 'pix' && (
                        <div className="mt-4 p-5 border border-green-200 rounded-xl bg-green-50/50 flex items-start gap-4">
                          <div className="bg-white p-2 rounded-lg border border-green-200 shadow-sm"><QrCode className="w-12 h-12 text-green-600"/></div>
                          <div>
                            <h4 className="font-bold text-green-900">Pagamento Rápido via PIX</h4>
                            <p className="text-sm text-green-700 mt-1">Ao finalizar a compra, será gerado um QR Code ou link Copia e Cola para pagamento.</p>
                          </div>
                        </div>
                    )}
                  </div>

                  <div className="pt-4 flex justify-between border-t mt-6">
                    <button onClick={() => setCheckoutStep(2)} className="text-gray-500 px-4 py-2 font-medium hover:bg-gray-100 rounded-lg">Voltar</button>
                    <button onClick={handleFinalizarCompra} disabled={checkoutLoading} className="bg-blue-600 text-white px-8 py-3 rounded-lg font-bold flex items-center gap-2 hover:bg-blue-700 transition-colors shadow-md disabled:opacity-50 text-lg">
                      {checkoutLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5" />}
                      Finalizar Pagamento Seguro
                    </button>
                  </div>
                </div>
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
                          <img src={formatImageUrl(imgUrl)} className="w-16 h-16 rounded object-contain bg-gray-50 border border-gray-100 p-1" />
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
                        <div key={rec.id} className="min-w-[130px] w-[130px] bg-white border border-blue-100 rounded-lg p-2 flex flex-col snap-start shadow-sm relative group">
                          <img src={formatImageUrl(imgUrl)} className="w-full h-[80px] object-contain p-1 rounded mb-2 bg-gray-50" />
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

// `ProductCard` moved to a separate file: frontend/src/components/ProductCard.jsx