from rest_framework import serializers

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

# --- NOVO: SERIALIZADOR DE ENDEREÇO ---
class EnderecoSerializer(serializers.Serializer):
    cep = serializers.CharField(max_length=10, required=True)
    rua = serializers.CharField(max_length=255, required=True)
    numero = serializers.CharField(max_length=20, required=True)
    complemento = serializers.CharField(max_length=255, required=False, allow_blank=True)
    bairro = serializers.CharField(max_length=100, required=True)
    cidade = serializers.CharField(max_length=100, required=True)
    estado = serializers.CharField(max_length=2, required=True)
    
class ProdutoSerializer(serializers.Serializer):
    nome_camisa = serializers.CharField(max_length=255, required=True)
    preco = serializers.FloatField(required=True)
    categoria = serializers.CharField(max_length=100, required=True)
    # A regra de "no mínimo uma imagem" é garantida aqui com required=True
    imagem = serializers.URLField(required=True, error_messages={
        'required': 'É obrigatório fornecer no mínimo uma imagem (URL) para o produto.',
        'invalid': 'Forneça um URL de imagem válido.'
    })