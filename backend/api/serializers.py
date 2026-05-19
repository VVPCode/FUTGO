from rest_framework import serializers
from .models import Produto, Pedido, ItemPedido

class CheckEmailSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)

class LoginOTPSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)
    otp = serializers.CharField(max_length=6, required=True)

class RegisterSerializer(serializers.Serializer):
    nome = serializers.CharField(max_length=100, required=True)
    email = serializers.EmailField(required=True)
    cpf = serializers.CharField(required=True)
    telefone = serializers.CharField(required=True)
    otp = serializers.CharField(max_length=6, required=True)

class EnderecoSerializer(serializers.Serializer):
    cep = serializers.CharField(max_length=10, required=True)
    rua = serializers.CharField(max_length=255, required=True)
    numero = serializers.CharField(max_length=20, required=True)
    complemento = serializers.CharField(max_length=255, required=False, allow_blank=True)
    bairro = serializers.CharField(max_length=100, required=True)
    cidade = serializers.CharField(max_length=100, required=True)
    estado = serializers.CharField(max_length=2, required=True)
    
class ProdutoSerializer(serializers.Serializer):
    # ADICIONADO: O Frontend precisa do ID para o carrinho e para editar os produtos
    id = serializers.IntegerField(read_only=True) 
    
    nome_camisa = serializers.CharField(max_length=255, required=True)
    preco = serializers.FloatField(required=True)
    
    # 👇 NOVO CAMPO: Controlo de stock definitivo (O frontend lê daqui)
    estoque = serializers.IntegerField(required=False, default=50)
    
    categoria = serializers.CharField(max_length=100, required=True)
    
    cores = serializers.ListField(child=serializers.CharField(max_length=50), required=False)
    pais = serializers.CharField(max_length=100, required=False, allow_blank=True)
    liga = serializers.CharField(max_length=100, required=False, allow_blank=True)
    tamanhos = serializers.ListField(child=serializers.CharField(), required=False)
    
    temporada = serializers.CharField(max_length=50, required=False, allow_blank=True)
    tipo_uniforme = serializers.CharField(max_length=50, required=False, allow_blank=True)
    marca = serializers.CharField(max_length=50, required=False, allow_blank=True)
    genero = serializers.CharField(max_length=50, required=False, allow_blank=True)
    personalizavel = serializers.BooleanField(default=False, required=False)
    
    # NOVO: Agora aceitamos uma lista de imagens
    imagens = serializers.ListField(
        child=serializers.CharField(max_length=1000), 
        required=True,
        error_messages={'required': 'É obrigatório fornecer no mínimo uma imagem para o produto.'}
    )

# ==============================================================================
# 👇 NOVOS SERIALIZADORES: PARA CARRINHO DE COMPRAS, PEDIDOS E GESTÃO NO ADMIN 👇
# ==============================================================================

class ItemPedidoSerializer(serializers.ModelSerializer):
    class Meta:
        model = ItemPedido
        fields = ['id', 'produto', 'nome_camisa', 'quantidade', 'tamanho', 'preco_unitario']

class PedidoSerializer(serializers.ModelSerializer):
    # O many=True e read_only=True puxa automaticamente os itens vinculados ao pedido
    itens = ItemPedidoSerializer(many=True, read_only=True)

    class Meta:
        model = Pedido
        fields = ['id', 'id_usuario', 'total', 'status', 'data_pedido', 'endereco_id', 'frete_tipo', 'frete_valor', 'itens']