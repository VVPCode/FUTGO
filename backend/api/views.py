import re
import time
from datetime import datetime
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .serializers import CheckEmailSerializer, RegisterSerializer, LoginOTPSerializer
from .firebase_config import db

class GoogleAuthView(APIView):
    def post(self, request):
        email = request.data.get('email', '').lower()
        nome = request.data.get('nome', '')

        if not email:
            return Response({"erro": "E-mail não fornecido pelo Google."}, status=status.HTTP_400_BAD_REQUEST)

        usuarios_ref = db.collection('usuarios')
        query = usuarios_ref.where('email', '==', email).limit(1).get()

        if len(query) > 0:
            usuario_data = query[0].to_dict()
            return Response({
                "mensagem": "Login com Google efetuado com sucesso!", 
                "usuario": usuario_data, 
                "is_new": False
            }, status=status.HTTP_200_OK)
        else:
            return Response({
                "mensagem": "Usuário novo. Complete o cadastro.", 
                "is_new": True, 
                "email": email, 
                "nome": nome
            }, status=status.HTTP_200_OK)
        
class CheckEmailView(APIView):
    """
    Endpoint: POST /api/auth/check-email/
    Verifica se o e-mail já existe na base de dados para decidir o fluxo (Login ou Registo).
    """
    def post(self, request):
        serializer = CheckEmailSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        email = serializer.validated_data['email'].lower()
        
        # Consulta no Firestore
        usuarios_ref = db.collection('usuarios')
        query = usuarios_ref.where('email', '==', email).limit(1).get()
        
        if len(query) > 0:
            return Response({"existe": True, "mensagem": "Usuário encontrado. Solicite OTP."}, status=status.HTTP_200_OK)
        else:
            return Response({"existe": False, "mensagem": "Usuário não encontrado. Inicie o cadastro."}, status=status.HTTP_200_OK)

class LoginOTPView(APIView):
    """
    Endpoint: POST /api/auth/login/
    Valida o OTP para usuários já existentes.
    """
    def post(self, request):
        serializer = LoginOTPSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        email = serializer.validated_data['email'].lower()
        otp = serializer.validated_data['otp']
        
        # Simulação de verificação de OTP (Em produção, verificaria contra uma tabela de OTPs temporários)
        if otp != "123456":
            return Response({"erro": "Código OTP inválido."}, status=status.HTTP_401_UNAUTHORIZED)
            
        # Busca o usuário
        usuarios_ref = db.collection('usuarios')
        query = usuarios_ref.where('email', '==', email).limit(1).get()
        
        if len(query) == 0:
            return Response({"erro": "Usuário não encontrado."}, status=status.HTTP_404_NOT_FOUND)
            
        usuario_data = query[0].to_dict()
        
        # RNF01 - Aqui você geraria o JWT. Para já, retornamos os dados do usuário.
        return Response({"mensagem": "Login efetuado com sucesso!", "usuario": usuario_data}, status=status.HTTP_200_OK)

class RegisterView(APIView):
    """
    Endpoint: POST /api/auth/register/
    Aplica RN05 (Limpeza/Unicidade) e RN06 (ID e Data) e salva no Firestore após validar OTP.
    """
    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
        dados = serializer.validated_data
        
        # 1. Validação de OTP do Cadastro
        if dados['otp'] != "123456":
            return Response({"erro": "Código OTP inválido."}, status=status.HTTP_401_UNAUTHORIZED)
            
        email_limpo = dados['email'].lower()
        
        # RN05 - Sanitização (Remove máscaras)
        cpf_numeros = re.sub(r'\D', '', dados['cpf'])
        tel_numeros = re.sub(r'\D', '', dados['telefone'])
        
        if not cpf_numeros or not tel_numeros:
             return Response({"erro": "CPF ou Telefone inválidos."}, status=status.HTTP_400_BAD_REQUEST)
             
        cpf_int = int(cpf_numeros)
        tel_int = int(tel_numeros)

        # RN05 - Verificação de Unicidade (Email ou CPF)
        usuarios_ref = db.collection('usuarios')
        check_email = usuarios_ref.where('email', '==', email_limpo).limit(1).get()
        check_cpf = usuarios_ref.where('cpf', '==', cpf_int).limit(1).get()
        
        if len(check_email) > 0 or len(check_cpf) > 0:
            return Response({"erro": "E-mail ou CPF já cadastrados no sistema."}, status=status.HTTP_409_CONFLICT)

        # RN06 - Campos Autogerados
        # Gera um timestamp inteiro para simular a PK int(11)
        id_usuario = int(time.time())
        data_cadastro = datetime.utcnow().isoformat() + "Z"
        
        novo_usuario = {
            "id_usuario": id_usuario,
            "nome": dados['nome'].strip(),
            "email": email_limpo,
            "cpf": cpf_int,
            "telefone": tel_int,
            "data_cadastro": data_cadastro
        }

        # Salvar no Firestore usando o ID gerado como chave do documento
        try:
            usuarios_ref.document(str(id_usuario)).set(novo_usuario)
            return Response({"mensagem": "Usuário criado com sucesso!", "usuario": novo_usuario}, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({"erro": f"Falha ao salvar no banco: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)