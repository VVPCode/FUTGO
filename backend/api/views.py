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
from firebase_admin import auth as firebase_auth
from google.cloud.firestore_v1.base_query import FieldFilter

# Importações internas do seu projeto
from .firebase_config import db
from .services.whatsapp import enviar_otp_whatsapp

# ==========================================
# VERIFICAÇÃO DE ADMIN
# ==========================================
def is_admin(request):
    try:
        user_id = request.headers.get('X-User-ID')
        if not user_id: 
            return False
        user_doc = db.collection('usuarios').document(str(user_id)).get()
        if not user_doc.exists: 
            return False
        user_data = user_doc.to_dict()
        return user_data.get('email') == 'admin@futgo.com' or user_data.get('is_admin') == True
    except: 
        return False

# ==========================================
# LOGIN SOCIAL (GOOGLE / FACEBOOK)
# ==========================================
class SocialLoginView(APIView):
    def post(self, request):
        try:
            id_token = request.data.get('token')
            fallback_email = request.data.get('fallbackEmail', '')
            fallback_name = request.data.get('fallbackName', '')

            if not id_token:
                return Response({"erro": "Token não fornecido."}, status=status.HTTP_400_BAD_REQUEST)

            # Verifica o token com o Firebase Admin SDK
            decoded_token = firebase_auth.verify_id_token(id_token)
            
            # PROTEÇÃO EXTRA: Tenta extrair o e-mail do token encriptado. 
            # Se vier vazio (comum no Firebase), utiliza o e-mail capturado pelo React (fallback).
            raw_email = decoded_token.get('email') or fallback_email
            email = raw_email.lower().strip() if raw_email else ""
            
            # Bloqueia apenas se, mesmo com o fallback, não houver e-mail
            if not email:
                return Response({
                    "erro": "O seu provedor social não partilhou o e-mail. Por favor, use a opção de entrar com E-mail ou WhatsApp manualmente."
                }, status=status.HTTP_400_BAD_REQUEST)

            raw_nome = decoded_token.get('name') or fallback_name
            nome = raw_nome.strip() if raw_nome else 'Utilizador'
            
            # Procura o utilizador no Firestore
            query = db.collection('usuarios').where(filter=FieldFilter('email', '==', email)).limit(1).get()
            
            if len(query) > 0:
                # Login de utilizador existente
                return Response({"mensagem": "Login com sucesso!", "usuario": query[0].to_dict()}, status=status.HTTP_200_OK)
            else:
                # Registo automático de novo utilizador social
                id_usuario = int(time.time())
                novo_usuario = {
                    "id_usuario": id_usuario, 
                    "nome": nome, 
                    "email": email, 
                    "cpf": "", 
                    "telefone": "", 
                    "data_cadastro": datetime.utcnow().isoformat() + "Z"
                }
                db.collection('usuarios').document(str(id_usuario)).set(novo_usuario)
                return Response({"mensagem": "Conta criada!", "usuario": novo_usuario}, status=status.HTTP_201_CREATED)
        except Exception as e:
            # IMPRIME O ERRO REAL NO TERMINAL
            print(f"\n[ERRO CRÍTICO - LOGIN SOCIAL]: {str(e)}\n")
            return Response({"erro": f"Falha na autenticação: {str(e)}"}, status=status.HTTP_401_UNAUTHORIZED)

# ==========================================
# AUTENTICAÇÃO HÍBRIDA (E-MAIL + WHATSAPP)
# ==========================================
class CheckAuthView(APIView):
    def post(self, request):
        try:
            identificador = request.data.get('identificador', '').strip().lower()
            if not identificador: 
                return Response({"erro": "Identificador obrigatório."}, status=400)
            
            is_email = '@' in identificador
            
            if is_email:
                query = db.collection('usuarios').where(filter=FieldFilter('email', '==', identificador)).limit(1).get()
            else:
                tel_limpo = re.sub(r'\D', '', identificador)
                query = db.collection('usuarios').where(filter=FieldFilter('telefone', '==', tel_limpo)).limit(1).get()
                if len(query) == 0 and tel_limpo.startswith('55'):
                    query = db.collection('usuarios').where(filter=FieldFilter('telefone', '==', tel_limpo[2:])).limit(1).get()
                
            return Response({
                "existe": len(query) > 0, 
                "metodo": "email" if is_email else "whatsapp",
                "identificador": identificador
            }, status=200)
        except Exception as e: 
            return Response({"erro": str(e)}, status=500)

class SendOTPView(APIView):
    def post(self, request):
        try:
            identificador = request.data.get('identificador', '').strip().lower()
            metodo = request.data.get('method', 'email')
            
            if not identificador: 
                return Response({"erro": "Dados incompletos."}, status=400)

            otp_code = str(random.randint(100000, 999999))
            
            # --- DEBUG: SEMPRE IMPRIMIR NO TERMINAL ---
            print("\n" + "="*40)
            print(f"DEBUG OTP - FUTGO")
            print(f"Identificador: {identificador}")
            print(f"Código Gerado: {otp_code}")
            print("="*40 + "\n")

            db.collection('otps').document(identificador).set({'otp': otp_code, 'timestamp': time.time()})

            if metodo == 'email':
                try:
                    send_mail(
                        'FUTGO! - Código de Acesso', 
                        f'O seu código é: {otp_code}', 
                        settings.EMAIL_HOST_USER, 
                        [identificador], 
                        fail_silently=False
                    )
                    return Response({"mensagem": "OTP enviado por e-mail!", "otp": otp_code}, status=200)
                except Exception as e:
                    return Response({"erro": "Falha no envio do e-mail, mas veja o terminal.", "otp": otp_code}, status=200)
                
            elif metodo == 'whatsapp':
                try:
                    enviar_otp_whatsapp(identificador, otp_code)
                except:
                    pass 
                return Response({"mensagem": "OTP gerado!", "otp": otp_code}, status=200)
                    
            return Response({"erro": "Método desconhecido."}, status=400)
        except Exception as e: 
            return Response({"erro": str(e)}, status=500)

class LoginOTPView(APIView):
    def post(self, request):
        try:
            identificador = request.data.get('identificador', '').strip().lower()
            otp_recebido = request.data.get('otp')
            
            otp_doc = db.collection('otps').document(identificador).get()
            if not otp_doc.exists or str(otp_doc.to_dict().get('otp')) != str(otp_recebido):
                return Response({"erro": "Código OTP inválido."}, status=401)
                
            db.collection('otps').document(identificador).delete()
            
            if '@' in identificador:
                query = db.collection('usuarios').where(filter=FieldFilter('email', '==', identificador)).limit(1).get()
            else:
                tel_limpo = re.sub(r'\D', '', identificador)
                query = db.collection('usuarios').where(filter=FieldFilter('telefone', '==', tel_limpo)).limit(1).get()
            
            if len(query) == 0: 
                return Response({"erro": "Utilizador não encontrado."}, status=404)
            return Response({"mensagem": "Login ok!", "usuario": query[0].to_dict()}, status=200)
        except Exception as e: 
            return Response({"erro": str(e)}, status=500)

class RegisterView(APIView):
    def post(self, request):
        try:
            dados = request.data
            identificador = dados.get('identificador', '').strip().lower()
            otp_recebido = dados.get('otp')
            
            otp_doc = db.collection('otps').document(identificador).get()
            if not otp_doc.exists or str(otp_doc.to_dict().get('otp')) != str(otp_recebido):
                return Response({"erro": "Código OTP inválido."}, status=401)
                
            db.collection('otps').document(identificador).delete()
            
            email_limpo = dados.get('email', '').strip().lower()
            tel_limpo = re.sub(r'\D', '', str(dados.get('telefone', '')))
            cpf_limpo = re.sub(r'\D', '', str(dados.get('cpf', '')))
            
            check_email = db.collection('usuarios').where(filter=FieldFilter('email', '==', email_limpo)).get()
            if len(check_email) > 0: 
                return Response({"erro": "E-mail já registado."}, status=409)

            id_usuario = int(time.time())
            novo_usuario = {
                "id_usuario": id_usuario, 
                "nome": dados.get('nome', '').strip(), 
                "email": email_limpo, 
                "cpf": cpf_limpo, 
                "telefone": tel_limpo, 
                "data_cadastro": datetime.utcnow().isoformat() + "Z"
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
            if not user_doc.exists: 
                return Response({"erro": "Não encontrado."}, status=404)
            return Response({"usuario": user_doc.to_dict()}, status=200)
        except Exception as e: 
            return Response({"erro": str(e)}, status=500)

    def put(self, request, id_usuario):
        try:
            user_ref = db.collection('usuarios').document(str(id_usuario))
            if not user_ref.get().exists: 
                return Response({"erro": "Não encontrado."}, status=404)
            
            update_data = {
                "nome": request.data.get('nome'),
                "telefone": re.sub(r'\D', '', str(request.data.get('telefone', ''))),
                "cpf": re.sub(r'\D', '', str(request.data.get('cpf', '')))
            }
            # Remove chaves vazias
            update_data = {k: v for k, v in update_data.items() if v}
            
            user_ref.update(update_data)
            return Response({"mensagem": "Atualizado!", "usuario": user_ref.get().to_dict()}, status=200)
        except Exception as e: 
            return Response({"erro": str(e)}, status=500)

    def delete(self, request, id_usuario):
        try:
            db.collection('usuarios').document(str(id_usuario)).delete()
            return Response({"mensagem": "Apagado."}, status=200)
        except Exception as e: 
            return Response({"erro": str(e)}, status=500)

class UserEnderecosView(APIView):
    def get(self, request, id_usuario):
        try:
            docs = db.collection('enderecos').where(filter=FieldFilter('id_usuario', '==', int(id_usuario))).get()
            return Response({"enderecos": [doc.to_dict() for doc in docs]}, status=200)
        except Exception as e: 
            return Response({"erro": str(e)}, status=500)

    def post(self, request, id_usuario):
        try:
            dados = request.data
            id_end = f"end_{int(time.time() * 1000)}"
            
            novo_end = {
                "id_endereco": id_end,
                "id_usuario": int(id_usuario),
                "cep": re.sub(r'\D', '', str(dados.get('cep', ''))),
                "rua": dados.get('rua', ''),
                "numero": dados.get('numero', ''),
                "complemento": dados.get('complemento', ''),
                "bairro": dados.get('bairro', ''),
                "cidade": dados.get('cidade', ''),
                "estado": dados.get('estado', '')
            }
            
            db.collection('enderecos').document(id_end).set(novo_end)
            return Response({"mensagem": "Criado!", "endereco": novo_end}, status=201)
        except Exception as e: 
            return Response({"erro": str(e)}, status=500)

class EnderecoDetailView(APIView):
    def delete(self, request, id_endereco):
        try:
            db.collection('enderecos').document(str(id_endereco)).delete()
            return Response({"mensagem": "Removido."}, status=200)
        except Exception as e: 
            return Response({"erro": str(e)}, status=500)

# ==========================================
# PRODUTOS (CATÁLOGO)
# ==========================================
class ProdutoListView(APIView):
    def get(self, request):
        try:
            docs = db.collection('produtos').get()
            return Response([doc.to_dict() for doc in docs], status=200)
        except Exception as e: 
            return Response({"erro": str(e)}, status=500)

    def post(self, request):
        try:
            if not is_admin(request): 
                return Response({"erro": "Acesso negado. Apenas administradores."}, status=403)
            
            dados = request.data
            id_prod = str(uuid.uuid4())
            
            novo_prod = {
                "id": id_prod,
                "nome_camisa": dados.get('nome_camisa', ''),
                "preco": float(dados.get('preco', 0.0)),
                "categoria": dados.get('categoria', 'Nacional'),
                "imagem": dados.get('imagem', ''),
                "data_criacao": datetime.utcnow().isoformat() + "Z"
            }
            
            db.collection('produtos').document(id_prod).set(novo_prod)
            return Response({"mensagem": "Criado!", "produto": novo_prod}, status=201)
        except Exception as e: 
            return Response({"erro": str(e)}, status=500)

class ProdutoDetailView(APIView):
    def put(self, request, id_produto):
        try:
            if not is_admin(request): 
                return Response({"erro": "Acesso negado."}, status=403)
                
            prod_ref = db.collection('produtos').document(str(id_produto))
            if not prod_ref.get().exists: 
                return Response({"erro": "Não encontrado."}, status=404)
                
            prod_ref.update(request.data)
            return Response({"mensagem": "Atualizado!", "produto": prod_ref.get().to_dict()}, status=200)
        except Exception as e: 
            return Response({"erro": str(e)}, status=500)

    def delete(self, request, id_produto):
        try:
            if not is_admin(request): 
                return Response({"erro": "Acesso negado."}, status=403)
                
            db.collection('produtos').document(str(id_produto)).delete()
            return Response({"mensagem": "Removido."}, status=200)
        except Exception as e: 
            return Response({"erro": str(e)}, status=500)