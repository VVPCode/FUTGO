import React, { useState, useEffect } from 'react';
import { ShoppingCart, Image as ImageIcon, ChevronLeft, ChevronRight, Star } from 'lucide-react';

const BACKEND_URL = 'http://localhost:8000';
const formatImageUrl = (url) => {
  if (!url) return 'https://placehold.co/400x500/cccccc/ffffff?text=Sem+Foto';
  let fixedUrl = url;
  if (fixedUrl.includes('10.0.2.2')) fixedUrl = fixedUrl.replace('10.0.2.2', 'localhost');
  if (fixedUrl.startsWith('/media/')) fixedUrl = `${BACKEND_URL}${fixedUrl}`;
  fixedUrl = fixedUrl.replace(/([^:]\/)\/+/g, "$1");
  return fixedUrl;
};

export default function ProductCard({ produto, onAdd, isFavorito, onToggleFavorito }) {
  const [tamanho, setTamanho] = useState('M');
  const [imgIndex, setImgIndex] = useState(0);

  const tamanhosDisponiveis = produto.tamanhos && produto.tamanhos.length > 0 ? produto.tamanhos : ['P', 'M', 'G', 'GG'];
  const listaImagens = produto.imagens && produto.imagens.length > 0 ? produto.imagens : (produto.imagem ? [produto.imagem] : []);

  const esgotado = produto.estoque !== undefined && produto.estoque <= 0;

  useEffect(() => {
    if (!tamanhosDisponiveis.includes(tamanho) && tamanhosDisponiveis.length > 0) {
      setTamanho(tamanhosDisponiveis[0]);
    }
  }, [produto]);

  const proximaImagem = (e) => {
    e.stopPropagation();
    setImgIndex((prev) => (prev === listaImagens.length - 1 ? 0 : prev + 1));
  };

  const imagemAnterior = (e) => {
    e.stopPropagation();
    setImgIndex((prev) => (prev === 0 ? listaImagens.length - 1 : prev - 1));
  };

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col hover:shadow-md transition-all duration-200 relative group ${esgotado ? 'opacity-70 grayscale-[30%]' : ''}`}>
      {esgotado ? (
        <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-red-600 text-white text-lg font-black px-6 py-2 rounded shadow-lg z-30 uppercase tracking-widest transform -rotate-12 border-2 border-white">
          Esgotado
        </span>
      ) : produto.personalizavel ? (
        <span className="absolute top-3 left-3 bg-green-500 text-white text-[10px] font-extrabold px-2 py-1 rounded-full uppercase tracking-wider z-10 shadow-sm">
          Personalizável
        </span>
      ) : null}

      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleFavorito && onToggleFavorito();
        }}
        className="absolute top-3 right-3 z-20 p-2 rounded-full bg-white bg-opacity-80 hover:bg-opacity-100 shadow-sm transition-all"
        title="Adicionar à Lista de Desejos"
      >
        <Star className={`w-5 h-5 transition-colors ${isFavorito ? 'fill-yellow-400 text-yellow-500' : 'text-gray-400 hover:text-yellow-400'}`} />
      </button>

      <div className="relative w-full h-72 bg-white flex items-center justify-center p-4">
        {listaImagens.length > 0 ? (
          <img src={formatImageUrl(listaImagens[imgIndex])} className="w-full h-full object-contain transition-opacity duration-300 drop-shadow-sm" onError={(e) => e.target.src = "https://placehold.co/400x500/cccccc/ffffff?text=Sem+Imagem"} />
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

      <div className="p-4 flex flex-col flex-1 border-t border-gray-50">
        <div className="flex justify-between items-start mb-1">
          <p className="text-xs text-gray-500 font-bold uppercase">{produto.marca || 'S/ Marca'}</p>
          <p className="text-xs text-gray-400">{produto.temporada}</p>
        </div>
        <h3 className="text-sm font-semibold text-gray-900 leading-snug min-h-[40px] line-clamp-2">{produto.nome_camisa}</h3>
        <p className="text-xl font-bold text-slate-900 mt-2 mb-4">R$ {Number(produto.preco).toFixed(2)}</p>
        <div className="mt-auto">
          <div className="flex flex-wrap gap-1 mb-3">
            {tamanhosDisponiveis.map(t => (
              <button disabled={esgotado} key={t} onClick={() => setTamanho(t)} className={`w-8 h-8 text-xs font-bold border rounded transition-colors ${tamanho === t ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-gray-600 hover:border-gray-400'} disabled:opacity-50`}>{t}</button>
            ))}
          </div>
          <button disabled={esgotado} onClick={() => onAdd && onAdd(produto, tamanho)} className="w-full bg-slate-900 text-white py-2 rounded-lg text-sm font-medium flex justify-center items-center gap-2 hover:bg-slate-800 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed">
            <ShoppingCart className="w-4 h-4"/> {esgotado ? 'Sem Estoque' : 'Adicionar'}
          </button>
        </div>
      </div>
    </div>
  );
}
