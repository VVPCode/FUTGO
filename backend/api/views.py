import re
import time
import random
import uuid
from datetime import datetime
from django.conf import settings
from django.core.mail import send_mail
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .serializers import CheckEmailSerializer, RegisterSerializer, LoginOTPSerializer, EnderecoSerializer, ProdutoSerializer
from .firebase_config import db

# ==========================================
# FUNÇÃO AUXILIAR DE SEGURANÇA (ADMIN)
# ==========================================
def is_admin(request):
    try:
        user_id = request.headers.get('X-User-ID')
        if not user_id: return False
        user_doc = db.collection('usuarios').document(str(user_id)).get()
        if not user_doc.exists: return False
        user_data = user_doc.to_dict()
        if user_data.get('email') == 'admin@futgo.com' or user_data.get('is_admin') == True:
            return True
        return False
    except:
        return False

# ==========================================
# AUTENTICAÇÃO E OTP
# ==========================================
class CheckEmailView(APIView):
    def post(self, request):
        try:
            serializer = CheckEmailSerializer(data=request.data)
            if not serializer.is_valid(): return Response(serializer.errors, status=400)
            email = serializer.validated_data['email'].lower()
            query = db.collection('usuarios').where('email', '==', email).limit(1).get()
            return Response({"existe": len(query) > 0}, status=200)
        except Exception as e:
            return Response({"erro": str(e)}, status=500)

class SendOTPView(APIView):
    def post(self, request):
        try:
            email = request.data.get('email', '').lower()
            if not email: return Response({"erro": "E-mail obrigatório."}, status=400)

            otp_code = str(random.randint(100000, 999999))
            db.collection('otps').document(email).set({'otp': otp_code, 'timestamp': time.time()})
            print(f"\n🔑 [MODO TESTE] CÓDIGO OTP: {otp_code} -> {email}\n")

            send_mail(
                'FUTGO! - Código de Acesso',
                f'O seu código é: {otp_code}\n\nNão partilhe este código.',
                settings.EMAIL_HOST_USER, [email], fail_silently=False, 
            )
            return Response({"mensagem": "OTP enviado!"}, status=200)
        except Exception as e:
            return Response({"erro": "Erro SMTP ao enviar e-mail."}, status=500)

class LoginOTPView(APIView):
    def post(self, request):
        try:
            serializer = LoginOTPSerializer(data=request.data)
            if not serializer.is_valid(): return Response(serializer.errors, status=400)
            
            email = serializer.validated_data['email'].lower()
            otp_recebido = serializer.validated_data['otp']
            
            otp_doc = db.collection('otps').document(email).get()
            if not otp_doc.exists or str(otp_doc.to_dict().get('otp')) != str(otp_recebido):
                return Response({"erro": "Código OTP inválido."}, status=401)
                
            db.collection('otps').document(email).delete()
            query = db.collection('usuarios').where('email', '==', email).limit(1).get()
            
            if len(query) == 0: return Response({"erro": "Utilizador não encontrado."}, status=404)
            return Response({"mensagem": "Login efetuado!", "usuario": query[0].to_dict()}, status=200)
        except Exception as e:
            return Response({"erro": str(e)}, status=500)

class RegisterView(APIView):
    def post(self, request):
        try:
            serializer = RegisterSerializer(data=request.data)
            if not serializer.is_valid(): return Response(serializer.errors, status=400)
                
            dados = serializer.validated_data
            email_limpo = dados['email'].lower()
            
            otp_doc = db.collection('otps').document(email_limpo).get()
            if not otp_doc.exists or str(otp_doc.to_dict().get('otp')) != str(dados['otp']):
                return Response({"erro": "Código OTP inválido."}, status=401)
                
            db.collection('otps').document(email_limpo).delete()
                
            cpf_numeros = int(re.sub(r'\D', '', dados['cpf']))
            tel_numeros = int(re.sub(r'\D', '', dados['telefone']))
            
            check_email = db.collection('usuarios').where('email', '==', email_limpo).limit(1).get()
            check_cpf = db.collection('usuarios').where('cpf', '==', cpf_numeros).limit(1).get()
            if len(check_email) > 0 or len(check_cpf) > 0:
                return Response({"erro": "E-mail ou CPF já registados."}, status=409)

            id_usuario = int(time.time())
            novo_usuario = {
                "id_usuario": id_usuario, "nome": dados['nome'].strip(), "email": email_limpo,
                "cpf": cpf_numeros, "telefone": tel_numeros, "data_cadastro": datetime.utcnow().isoformat() + "Z"
            }
            db.collection('usuarios').document(str(id_usuario)).set(novo_usuario)
            return Response({"mensagem": "Conta criada!", "usuario": novo_usuario}, status=201)
        except Exception as e:
            return Response({"erro": str(e)}, status=500)

# ==========================================
# PERFIL E ENDEREÇOS
# ==========================================
class UserDetailView(APIView):
    def get(self, request, id_usuario):
        try:
            user_doc = db.collection('usuarios').document(str(id_usuario)).get()
            if not user_doc.exists: return Response({"erro": "Não encontrado."}, status=404)
            return Response({"usuario": user_doc.to_dict()}, status=200)
        except Exception as e:
            return Response({"erro": str(e)}, status=500)

    def put(self, request, id_usuario):
        try:
            nome = request.data.get('nome')
            telefone = request.data.get('telefone')
            if not nome or not telefone: return Response({"erro": "Campos obrigatórios."}, status=400)

            tel_numeros = re.sub(r'\D', '', str(telefone))
            if not tel_numeros: return Response({"erro": "Telefone inválido."}, status=400)

            user_ref = db.collection('usuarios').document(str(id_usuario))
            if not user_ref.get().exists: return Response({"erro": "Não encontrado."}, status=404)

            user_ref.update({"nome": nome.strip(), "telefone": int(tel_numeros)})
            return Response({"mensagem": "Atualizado!", "usuario": user_ref.get().to_dict()}, status=200)
        except Exception as e:
            return Response({"erro": str(e)}, status=500)

    def delete(self, request, id_usuario):
        try:
            user_ref = db.collection('usuarios').document(str(id_usuario))
            if not user_ref.get().exists: return Response({"erro": "Não encontrado."}, status=404)
            user_ref.delete()
            return Response({"mensagem": "Apagado."}, status=200)
        except Exception as e:
            return Response({"erro": str(e)}, status=500)

class UserEnderecosView(APIView):
    def get(self, request, id_usuario):
        try:
            enderecos_ref = db.collection('enderecos').where('id_usuario', '==', int(id_usuario)).get()
            enderecos = [doc.to_dict() for doc in enderecos_ref]
            return Response({"enderecos": enderecos}, status=200)
        except Exception as e:
            return Response({"erro": str(e)}, status=500)

    def post(self, request, id_usuario):
        try:
            serializer = EnderecoSerializer(data=request.data)
            if not serializer.is_valid(): return Response(serializer.errors, status=400)
                
            dados = serializer.validated_data
            id_endereco = f"end_{int(time.time() * 1000)}"
            cep_limpo = re.sub(r'\D', '', dados['cep'])
            
            novo_endereco = {
                "id_endereco": id_endereco, "id_usuario": int(id_usuario), "cep": cep_limpo,
                "rua": dados['rua'], "numero": dados['numero'], "complemento": dados.get('complemento', ''),
                "bairro": dados['bairro'], "cidade": dados['cidade'], "estado": dados['estado'].upper(),
                "data_criacao": datetime.utcnow().isoformat() + "Z"
            }
            db.collection('enderecos').document(id_endereco).set(novo_endereco)
            return Response({"mensagem": "Endereço criado!", "endereco": novo_endereco}, status=201)
        except Exception as e:
            return Response({"erro": str(e)}, status=500)

class EnderecoDetailView(APIView):
    def delete(self, request, id_endereco):
        try:
            endereco_ref = db.collection('enderecos').document(str(id_endereco))
            if not endereco_ref.get().exists: return Response({"erro": "Não encontrado."}, status=404)
            endereco_ref.delete()
            return Response({"mensagem": "Removido."}, status=200)
        except Exception as e:
            return Response({"erro": str(e)}, status=500)

# ==========================================
# PRODUTOS (CATÁLOGO)
# ==========================================
class ProdutoListView(APIView):
    def get(self, request):
        try:
            produtos_ref = db.collection('produtos').get()
            produtos = [doc.to_dict() for doc in produtos_ref]
            return Response(produtos, status=200)
        except Exception as e:
            return Response({"erro": str(e)}, status=500)

    def post(self, request):
        try:
            if not is_admin(request): return Response({"erro": "Acesso Negado."}, status=403)
            serializer = ProdutoSerializer(data=request.data)
            if not serializer.is_valid(): return Response(serializer.errors, status=400)
                
            dados = serializer.validated_data
            id_produto = str(uuid.uuid4())
            
            novo_produto = {
                "id": id_produto, "nome_camisa": dados['nome_camisa'], "preco": float(dados['preco']),
                "categoria": dados['categoria'], "imagem": dados['imagem'],
                "data_criacao": datetime.utcnow().isoformat() + "Z"
            }
            db.collection('produtos').document(id_produto).set(novo_produto)
            return Response({"mensagem": "Produto adicionado!", "produto": novo_produto}, status=201)
        except Exception as e:
            return Response({"erro": str(e)}, status=500)

class ProdutoDetailView(APIView):
    def put(self, request, id_produto):
        try:
            if not is_admin(request): return Response({"erro": "Acesso Negado."}, status=403)
            serializer = ProdutoSerializer(data=request.data)
            if not serializer.is_valid(): return Response(serializer.errors, status=400)
                
            produto_ref = db.collection('produtos').document(str(id_produto))
            if not produto_ref.get().exists: return Response({"erro": "Produto não encontrado."}, status=404)
                
            dados = serializer.validated_data
            produto_ref.update({
                "nome_camisa": dados['nome_camisa'], "preco": float(dados['preco']),
                "categoria": dados['categoria'], "imagem": dados['imagem']
            })
            return Response({"mensagem": "Produto atualizado!", "produto": produto_ref.get().to_dict()}, status=200)
        except Exception as e:
            return Response({"erro": str(e)}, status=500)

    def delete(self, request, id_produto):
        try:
            if not is_admin(request): return Response({"erro": "Acesso Negado."}, status=403)
            produto_ref = db.collection('produtos').document(str(id_produto))
            if not produto_ref.get().exists: return Response({"erro": "Produto não encontrado."}, status=404)
                
            produto_ref.delete()
            return Response({"mensagem": "Produto removido."}, status=200)
        except Exception as e:
            return Response({"erro": str(e)}, status=500)