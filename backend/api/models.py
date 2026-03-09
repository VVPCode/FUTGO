import re
from datetime import datetime

# NOTA: Como vocês estão usando Firebase Firestore (NoSQL), 
# não usamos os models relacionais padrão do Django (models.Model).
# Criamos classes puras para representar as regras de negócio e acesso ao DB.

class UsuarioModel:
    @staticmethod
    def limpar_documento(dado: str) -> int:
        """
        RN05 — Sanitização de Dados: O backend deve remover qualquer máscara
        (pontos, traços, espaços) de CPF e TELEFONE antes da persistência.
        O Firestore vai armazenar nativamente como inteiro.
        """
        if not dado: 
            return None
        # Remove tudo o que não for número (\D)
        apenas_numeros = re.sub(r'\D', '', str(dado))
        return int(apenas_numeros) if apenas_numeros else None

    @staticmethod
    def criar_usuario(dados: dict, db_client):
        """
        Lógica (Model) de criação de usuário aplicando as regras de negócio.
        'db_client' é a instância do Firestore.
        """
        cpf_limpo = UsuarioModel.limpar_documento(dados.get('cpf'))
        telefone_limpo = UsuarioModel.limpar_documento(dados.get('telefone'))

        # RN05 - Verificar unicidade de CPF e Email
        usuarios_ref = db_client.collection('usuarios')
        check_email = usuarios_ref.where('email', '==', dados.get('email')).get()
        check_cpf = usuarios_ref.where('cpf', '==', cpf_limpo).get()
        
        if check_email or check_cpf:
            raise ValueError("Email ou CPF já cadastrados no sistema.")

        # RN06 - Campos Autogerados
        novo_usuario_ref = usuarios_ref.document() # Gera um ID único
        
        novo_usuario = {
            "id_usuario": novo_usuario_ref.id,      # Chave primária autogerada
            "nome": dados.get('nome'),
            "email": dados.get('email'),
            "cpf": cpf_limpo,
            "telefone": telefone_limpo,
            "data_cadastro": datetime.now()         # Carimbado pelo backend no exato momento
        }

        # Persiste no Firestore
        # novo_usuario_ref.set(novo_usuario) 
        
        return novo_usuario

class ProdutoModel:
    @staticmethod
    def listar_produtos(db_client, id_categoria=None):
        """Busca produtos no Firestore (Requisito 8.1 - Catálogo)"""
        produtos_ref = db_client.collection('produtos')
        
        if id_categoria and id_categoria != "Todas":
            query = produtos_ref.where('id_categoria', '==', id_categoria).stream()
        else:
            query = produtos_ref.stream()
            
        return [doc.to_dict() | {'id': doc.id} for doc in query]