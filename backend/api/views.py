import re
import time
import random
from datetime import datetime
from django.conf import settings
from django.core.mail import send_mail
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .serializers import CheckEmailSerializer, RegisterSerializer, LoginOTPSerializer
from .firebase_config import db

class CheckEmailView(APIView):
    """ Verifica se o e-mail já existe na base de dados """
    def post(self, request):
        serializer = CheckEmailSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        email = serializer.validated_data['email'].lower()
        usuarios_ref = db.collection('usuarios')
        query = usuarios_ref.where('email', '==', email).limit(1).get()
        
        if len(query) > 0:
            return Response({"existe": True}, status=status.HTTP_200_OK)
        else:
            return Response({"existe": False}, status=status.HTTP_200_OK)

class SendOTPView(APIView):
    """ Gera OTP, guarda no Firestore e envia APENAS via E-mail real """
    def post(self, request):
        email = request.data.get('email', '').lower()
        if not email:
            return Response({"erro": "O E-mail é obrigatório."}, status=status.HTTP_400_BAD_REQUEST)

        # 1. Gera código aleatório de 6 dígitos
        otp_code = str(random.randint(100000, 999999))
        
        # 2. Guarda o OTP temporariamente no Firestore (expira logicamente na validação)
        db.collection('otps').document(email).set({
            'otp': otp_code,
            'timestamp': time.time()
        })

        # Debug no terminal para facilitar os testes locais
        print("\n" + "="*50)
        print(f"🔑 [MODO TESTE] CÓDIGO OTP GERADO")
        print(f"📧 Destino: {email}")
        print(f"🔢 CÓDIGO: {otp_code}")
        print("="*50 + "\n")

        # 3. Envio Real de E-mail via SMTP do Django
        try:
            send_mail(
                subject='FUTGO! - O seu Código de Acesso',
                message=f'Olá!\n\nO seu código de verificação seguro é: {otp_code}\n\nPor favor, introduza este código na plataforma para validar a sua identidade.\n\nSe não solicitou este acesso, ignore este e-mail.',
                from_email=settings.EMAIL_HOST_USER,
                recipient_list=[email],
                fail_silently=False, 
            )
            return Response({"mensagem": "OTP enviado por E-mail com sucesso!"}, status=status.HTTP_200_OK)
                
        except Exception as e:
            print(f"ERRO SMTP: {e}")
            return Response({"erro": "Erro ao enviar e-mail. Verifique as configurações SMTP (Senha de App) no settings.py."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class LoginOTPView(APIView):
    """ Valida o OTP e faz o Login do utilizador """
    def post(self, request):
        serializer = LoginOTPSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        email = serializer.validated_data['email'].lower()
        otp_recebido = serializer.validated_data['otp']
        
        # Validação real do OTP no Firestore
        otp_doc = db.collection('otps').document(email).get()
        if not otp_doc.exists or str(otp_doc.to_dict().get('otp')) != str(otp_recebido):
            return Response({"erro": "Código OTP inválido ou expirado."}, status=status.HTTP_401_UNAUTHORIZED)
            
        # Apaga o OTP após o uso (Segurança)
        db.collection('otps').document(email).delete()
            
        # Busca os dados do utilizador
        usuarios_ref = db.collection('usuarios')
        query = usuarios_ref.where('email', '==', email).limit(1).get()
        
        if len(query) == 0:
            return Response({"erro": "Utilizador não encontrado."}, status=status.HTTP_404_NOT_FOUND)
            
        usuario_data = query[0].to_dict()
        return Response({"mensagem": "Login efetuado com sucesso!", "usuario": usuario_data}, status=status.HTTP_200_OK)

class RegisterView(APIView):
    """ Finaliza o registo após validação do OTP """
    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
        dados = serializer.validated_data
        email_limpo = dados['email'].lower()
        
        # Validação real do OTP no Firestore
        otp_doc = db.collection('otps').document(email_limpo).get()
        if not otp_doc.exists or str(otp_doc.to_dict().get('otp')) != str(dados['otp']):
            return Response({"erro": "Código OTP inválido ou expirado."}, status=status.HTTP_401_UNAUTHORIZED)
            
        # Apaga o OTP após o uso
        db.collection('otps').document(email_limpo).delete()
            
        # RN05: Limpeza de dados
        cpf_numeros = re.sub(r'\D', '', dados['cpf'])
        tel_numeros = re.sub(r'\D', '', dados['telefone'])
        
        if not cpf_numeros or not tel_numeros:
             return Response({"erro": "CPF ou Telefone inválidos."}, status=status.HTTP_400_BAD_REQUEST)
             
        cpf_int = int(cpf_numeros)
        tel_int = int(tel_numeros)

        # RN05: Verificação de Unicidade
        usuarios_ref = db.collection('usuarios')
        check_email = usuarios_ref.where('email', '==', email_limpo).limit(1).get()
        check_cpf = usuarios_ref.where('cpf', '==', cpf_int).limit(1).get()
        
        if len(check_email) > 0 or len(check_cpf) > 0:
            return Response({"erro": "E-mail ou CPF já registados."}, status=status.HTTP_409_CONFLICT)

        # RN06: Geração de PK (ID) e Data
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

        try:
            usuarios_ref.document(str(id_usuario)).set(novo_usuario)
            return Response({"mensagem": "Conta criada com sucesso!", "usuario": novo_usuario}, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({"erro": f"Falha ao guardar os dados: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class UserDetailView(APIView):
    """ Gere o CRUD completo de um Perfil """
    def get(self, request, id_usuario):
        user_ref = db.collection('usuarios').document(str(id_usuario))
        user_doc = user_ref.get()
        
        if not user_doc.exists:
            return Response({"erro": "Utilizador não encontrado."}, status=status.HTTP_404_NOT_FOUND)
            
        return Response({"usuario": user_doc.to_dict()}, status=status.HTTP_200_OK)

    def put(self, request, id_usuario):
        nome = request.data.get('nome')
        telefone = request.data.get('telefone')

        if not nome or not telefone:
            return Response({"erro": "Nome e telefone são obrigatórios."}, status=status.HTTP_400_BAD_REQUEST)

        tel_numeros = re.sub(r'\D', '', str(telefone))
        if not tel_numeros:
            return Response({"erro": "Telefone inválido."}, status=status.HTTP_400_BAD_REQUEST)

        user_ref = db.collection('usuarios').document(str(id_usuario))
        
        if not user_ref.get().exists:
            return Response({"erro": "Utilizador não encontrado."}, status=status.HTTP_404_NOT_FOUND)

        try:
            user_ref.update({
                "nome": nome.strip(),
                "telefone": int(tel_numeros)
            })
            updated_user = user_ref.get().to_dict()
            return Response({"mensagem": "Perfil atualizado!", "usuario": updated_user}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"erro": f"Erro ao atualizar: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def delete(self, request, id_usuario):
        user_ref = db.collection('usuarios').document(str(id_usuario))
        
        if not user_ref.get().exists:
            return Response({"erro": "Utilizador não encontrado."}, status=status.HTTP_404_NOT_FOUND)

        try:
            user_ref.delete()
            return Response({"mensagem": "Conta encerrada permanentemente."}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"erro": f"Erro ao apagar conta: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)