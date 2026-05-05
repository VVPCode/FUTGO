import re
import os
import time
import random
import uuid
import stripe
from datetime import datetime
from django.conf import settings
from django.core.mail import send_mail
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from firebase_admin import auth as firebase_auth
from google.cloud.firestore_v1.base_query import FieldFilter

from twilio.rest import Client
from dotenv import load_dotenv

load_dotenv()

from .firebase_config import db

def is_admin(request):
    try:
        user_id = request.headers.get('X-User-ID')
        if not user_id: return False
        user_doc = db.collection('usuarios').document(str(user_id)).get()
        if not user_doc.exists: return False
        user_data = user_doc.to_dict()
        return user_data.get('email') == 'admin@futgo.com' or user_data.get('is_admin') == True
    except:
        return False

# ==========================================
# UPLOAD DE MÚLTIPLAS IMAGENS
# ==========================================
class UploadImagemView(APIView):
    def post(self, request):
        try:
            if not is_admin(request):
                return Response({"erro": "Acesso negado."}, status=403)
           
            uploaded_urls = []
            files = request.FILES.getlist('imagens')
           
            if not files:
                return Response({"erro": "Nenhuma imagem recebida no formulário."}, status=400)
           
            for f in files:
                ext = f.name.split('.')[-1]
                file_name = f"produtos/{uuid.uuid4().hex}.{ext}"
                path = default_storage.save(file_name, ContentFile(f.read()))
                media_url = getattr(settings, 'MEDIA_URL', '/media/')
                full_url = request.build_absolute_uri(f"{media_url}{path}")
                uploaded_urls.append(full_url)
               
            return Response({"urls": uploaded_urls}, status=200)
        except Exception as e:
            return Response({"erro": str(e)}, status=500)

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

            decoded_token = firebase_auth.verify_id_token(id_token, clock_skew_seconds=10)
            raw_email = decoded_token.get('email') or fallback_email
            email = raw_email.lower().strip() if raw_email else ""
           
            if not email:
                return Response({"erro": "Provedor social sem e-mail."}, status=status.HTTP_400_BAD_REQUEST)

            raw_nome = decoded_token.get('name') or fallback_name
            nome = raw_nome.strip() if raw_nome else 'Utilizador'
           
            query = db.collection('usuarios').where(filter=FieldFilter('email', '==', email)).limit(1).get()
           
            if len(query) > 0:
                return Response({"mensagem": "Login com sucesso!", "usuario": query[0].to_dict()}, status=status.HTTP_200_OK)
            else:
                id_usuario = int(time.time())
                novo_usuario = {"id_usuario": id_usuario, "nome": nome, "email": email, "cpf": "", "telefone": "", "data_cadastro": datetime.utcnow().isoformat() + "Z"}
                db.collection('usuarios').document(str(id_usuario)).set(novo_usuario)
                return Response({"mensagem": "Conta criada!", "usuario": novo_usuario}, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({"erro": f"Falha na autenticação: {str(e)}"}, status=status.HTTP_401_UNAUTHORIZED)

# ==========================================
# AUTENTICAÇÃO HÍBRIDA E TWILIO
# ==========================================
class CheckAuthView(APIView):
    def post(self, request):
        try:
            identificador = request.data.get('identificador', '').strip().lower()
            if not identificador: return Response({"erro": "Identificador obrigatório."}, status=400)
           
            is_email = '@' in identificador
            if is_email:
                query = db.collection('usuarios').where(filter=FieldFilter('email', '==', identificador)).limit(1).get()
            else:
                tel_limpo = re.sub(r'\D', '', identificador)
                query = db.collection('usuarios').where(filter=FieldFilter('telefone', '==', tel_limpo)).limit(1).get()
                if len(query) == 0 and tel_limpo.startswith('55'):
                    query = db.collection('usuarios').where(filter=FieldFilter('telefone', '==', tel_limpo[2:])).limit(1).get()
               
            return Response({"existe": len(query) > 0, "metodo": "email" if is_email else "whatsapp", "identificador": identificador}, status=200)
        except Exception as e: return Response({"erro": str(e)}, status=500)

class SendOTPView(APIView):
    def post(self, request):
        try:
            identificador = request.data.get('identificador', '').strip().lower()
            metodo = request.data.get('method', 'email')
            if not identificador: return Response({"erro": "Dados incompletos."}, status=400)

            otp_code = str(random.randint(100000, 999999))
            db.collection('otps').document(identificador).set({'otp': otp_code, 'timestamp': time.time()})
           
            print("\n" + "="*50)
            print(f"🔑 [FUTGO] NOVO CÓDIGO OTP: {otp_code}")
            print(f"🎯 Destino: {identificador}")
            print(f"📡 Método:  {metodo.upper()}")
            print("="*50 + "\n")

            if metodo == 'email':
                try:
                    send_mail('FUTGO! - Código de Acesso', f'O seu código é: {otp_code}', settings.EMAIL_HOST_USER, [identificador], fail_silently=False)
                    return Response({"mensagem": "OTP enviado por e-mail!", "otp": otp_code}, status=200)
                except Exception as e:
                    return Response({"erro": "Falha no envio do e-mail, mas veja o terminal.", "otp": otp_code}, status=200)
            elif metodo == 'whatsapp':
                try:
                    account_sid = getattr(settings, 'TWILIO_ACCOUNT_SID', os.environ.get('TWILIO_ACCOUNT_SID'))
                    auth_token = getattr(settings, 'TWILIO_AUTH_TOKEN', os.environ.get('TWILIO_AUTH_TOKEN'))
                    twilio_number = getattr(settings, 'TWILIO_PHONE_NUMBER', os.environ.get('TWILIO_PHONE_NUMBER'))
                    content_sid = getattr(settings, 'TWILIO_WHATSAPP_CONTENT_SID', os.environ.get('TWILIO_WHATSAPP_CONTENT_SID'))

                    if account_sid and auth_token and twilio_number:
                        client = Client(account_sid, auth_token)
                        to_number = f"whatsapp:{identificador}" if identificador.startswith('+') else f"whatsapp:+{identificador}"
                        from_number = f"whatsapp:{twilio_number}" if not str(twilio_number).startswith('whatsapp:') else twilio_number
                       
                        is_sandbox = '14155238886' in str(twilio_number)

                        if is_sandbox:
                            message = client.messages.create(body=f"Your FUTGO code is {otp_code}", from_=from_number, to=to_number)
                        elif content_sid:
                            import json
                            message = client.messages.create(from_=from_number, to=to_number, content_sid=content_sid, content_variables=json.dumps({"1": str(otp_code)}))
                        else:
                            message = client.messages.create(body=f"⚽ *FUTGO!*\nO seu código de acesso seguro é: *{otp_code}*", from_=from_number, to=to_number)
                except Exception as e: print(f"Erro na Twilio: {str(e)}")
                return Response({"mensagem": "OTP gerado!", "otp": otp_code}, status=200)
            return Response({"erro": "Método desconhecido."}, status=400)
        except Exception as e: return Response({"erro": str(e)}, status=500)

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
           
            if len(query) == 0: return Response({"erro": "Utilizador não encontrado."}, status=404)
            return Response({"mensagem": "Login ok!", "usuario": query[0].to_dict()}, status=200)
        except Exception as e: return Response({"erro": str(e)}, status=500)

class RegisterView(APIView):
    def post(self, request):
        try:
            dados = request.data
            identificador = dados.get('identificador', '').strip().lower()
            otp_recebido = dados.get('otp')
           
            otp_doc = db.collection('otps').document(identificador).get()
            if not otp_doc.exists or str(otp_doc.to_dict().get('otp')) != str(otp_recebido): return Response({"erro": "Código OTP inválido."}, status=401)
               
            db.collection('otps').document(identificador).delete()
            email_limpo = dados.get('email', '').strip().lower()
            tel_limpo = re.sub(r'\D', '', str(dados.get('telefone', '')))
            cpf_limpo = re.sub(r'\D', '', str(dados.get('cpf', '')))
           
            check_email = db.collection('usuarios').where(filter=FieldFilter('email', '==', email_limpo)).get()
            if len(check_email) > 0: return Response({"erro": "E-mail já registado."}, status=409)

            id_usuario = int(time.time())
            novo_usuario = {"id_usuario": id_usuario, "nome": dados.get('nome', '').strip(), "email": email_limpo, "cpf": cpf_limpo, "telefone": tel_limpo, "data_cadastro": datetime.utcnow().isoformat() + "Z"}
            db.collection('usuarios').document(str(id_usuario)).set(novo_usuario)
            return Response({"mensagem": "Conta criada!", "usuario": novo_usuario}, status=201)
        except Exception as e: return Response({"erro": str(e)}, status=500)

# ==========================================
# PERFIL E ENDEREÇOS
# ==========================================
class UserDetailView(APIView):
    def get(self, request, id_usuario):
        try:
            user_doc = db.collection('usuarios').document(str(id_usuario)).get()
            if not user_doc.exists: return Response({"erro": "Não encontrado."}, status=404)
            return Response({"usuario": user_doc.to_dict()}, status=200)
        except Exception as e: return Response({"erro": str(e)}, status=500)

    def put(self, request, id_usuario):
        try:
            user_ref = db.collection('usuarios').document(str(id_usuario))
            if not user_ref.get().exists: return Response({"erro": "Não encontrado."}, status=404)
            update_data = {"nome": request.data.get('nome'), "telefone": re.sub(r'\D', '', str(request.data.get('telefone', ''))), "cpf": re.sub(r'\D', '', str(request.data.get('cpf', '')))}
            update_data = {k: v for k, v in update_data.items() if v}
            user_ref.update(update_data)
            return Response({"mensagem": "Atualizado!", "usuario": user_ref.get().to_dict()}, status=200)
        except Exception as e: return Response({"erro": str(e)}, status=500)

    def delete(self, request, id_usuario):
        try:
            db.collection('usuarios').document(str(id_usuario)).delete()
            return Response({"mensagem": "Apagado."}, status=200)
        except Exception as e: return Response({"erro": str(e)}, status=500)

class UserEnderecosView(APIView):
    def get(self, request, id_usuario):
        try:
            docs = db.collection('enderecos').where(filter=FieldFilter('id_usuario', '==', int(id_usuario))).get()
            return Response({"enderecos": [doc.to_dict() for doc in docs]}, status=200)
        except Exception as e: return Response({"erro": str(e)}, status=500)

    def post(self, request, id_usuario):
        try:
            dados = request.data
            id_end = f"end_{int(time.time() * 1000)}"
            novo_end = {"id_endereco": id_end, "id_usuario": int(id_usuario), "cep": re.sub(r'\D', '', str(dados.get('cep', ''))), "rua": dados.get('rua', ''), "numero": dados.get('numero', ''), "complemento": dados.get('complemento', ''), "bairro": dados.get('bairro', ''), "cidade": dados.get('cidade', ''), "estado": dados.get('estado', '')}
            db.collection('enderecos').document(id_end).set(novo_end)
            return Response({"mensagem": "Criado!", "endereco": novo_end}, status=201)
        except Exception as e: return Response({"erro": str(e)}, status=500)

class EnderecoDetailView(APIView):
    def delete(self, request, id_endereco):
        try:
            db.collection('enderecos').document(str(id_endereco)).delete()
            return Response({"mensagem": "Removido."}, status=200)
        except Exception as e: return Response({"erro": str(e)}, status=500)

# ==========================================
# PRODUTOS (CATÁLOGO)
# ==========================================
class ProdutoListView(APIView):
    def get(self, request):
        try:
            docs = db.collection('produtos').get()
            return Response([doc.to_dict() for doc in docs], status=200)
        except Exception as e: return Response({"erro": str(e)}, status=500)

    def post(self, request):
        try:
            if not is_admin(request): return Response({"erro": "Acesso negado. Apenas administradores."}, status=403)
            dados = request.data
            id_prod = str(uuid.uuid4())
           
            imagens_lista = dados.get('imagens', [])
            imagem_principal = imagens_lista[0] if imagens_lista else ""
           
            novo_prod = {
                "id": id_prod, "nome_camisa": dados.get('nome_camisa', ''), "preco": float(dados.get('preco', 0.0)),
                "categoria": dados.get('categoria', 'Nacional'), "imagem": imagem_principal, "imagens": imagens_lista,
                "cores": dados.get('cores', []), "pais": dados.get('pais', ''), "liga": dados.get('liga', ''),
                "tamanhos": dados.get('tamanhos', ['P', 'M', 'G', 'GG']), "temporada": dados.get('temporada', ''),
                "tipo_uniforme": dados.get('tipo_uniforme', 'Primeira Camisa'), "marca": dados.get('marca', ''),
                "genero": dados.get('genero', 'Unissex'), "personalizavel": bool(dados.get('personalizavel', False)),
                "data_criacao": datetime.utcnow().isoformat() + "Z"
            }
            db.collection('produtos').document(id_prod).set(novo_prod)
            return Response({"mensagem": "Criado!", "produto": novo_prod}, status=201)
        except Exception as e: return Response({"erro": str(e)}, status=500)

class ProdutoDetailView(APIView):
    def put(self, request, id_produto):
        try:
            if not is_admin(request): return Response({"erro": "Acesso negado."}, status=403)
            prod_ref = db.collection('produtos').document(str(id_produto))
            if not prod_ref.get().exists: return Response({"erro": "Não encontrado."}, status=404)
           
            update_data = request.data.copy()
            if 'imagens' in update_data and len(update_data['imagens']) > 0:
                update_data['imagem'] = update_data['imagens'][0]
               
            prod_ref.update(update_data)
            return Response({"mensagem": "Atualizado!", "produto": prod_ref.get().to_dict()}, status=200)
        except Exception as e: return Response({"erro": str(e)}, status=500)

    def delete(self, request, id_produto):
        try:
            if not is_admin(request): return Response({"erro": "Acesso negado."}, status=403)
            db.collection('produtos').document(str(id_produto)).delete()
            return Response({"mensagem": "Removido."}, status=200)
        except Exception as e: return Response({"erro": str(e)}, status=500)

# ==========================================
# GESTÃO DE PEDIDOS E PAGAMENTO (STRIPE)
# ==========================================
class PedidoCreateView(APIView):
    def post(self, request):
        try:
            user_id = request.headers.get('X-User-ID')
            if not user_id:
                return Response({"erro": "Utilizador não autenticado."}, status=401)
           
            dados = request.data
            id_pedido = f"PED-{int(time.time())}"
           
            novo_pedido = {
                "id_pedido": id_pedido,
                "id_usuario": int(user_id),
                "itens": dados.get('itens', []),
                "endereco_id": dados.get('endereco_id'),
                "frete": dados.get('frete', {}),
                "total": float(dados.get('total', 0.0)),
                "status": "Aguardando Pagamento",
                "data_pedido": datetime.utcnow().isoformat() + "Z"
            }
           
            db.collection('pedidos').document(id_pedido).set(novo_pedido)
           
            user_email = ""
            user_doc = db.collection('usuarios').document(str(user_id)).get()
            if user_doc.exists:
                user_email = user_doc.to_dict().get('email', '')

            stripe_secret_key = os.environ.get('STRIPE_SECRET_KEY', '')
            pagamento_url = None
           
            if stripe_secret_key:
                try:
                    stripe.api_key = stripe_secret_key
                    line_items = []
                   
                    for item in novo_pedido['itens']:
                        line_items.append({
                            'price_data': {
                                'currency': 'brl',
                                'product_data': {'name': f"{item['nome_camisa']} ({item['tamanho']})"},
                                'unit_amount': int(float(item['preco']) * 100),
                            },
                            'quantity': int(item['quantidade']),
                        })
                   
                    if float(novo_pedido['frete'].get('valor', 0)) > 0:
                        line_items.append({
                            'price_data': {
                                'currency': 'brl',
                                'product_data': {'name': f"Frete - {novo_pedido['frete'].get('tipo', 'Envio')}"},
                                'unit_amount': int(float(novo_pedido['frete']['valor']) * 100),
                            },
                            'quantity': 1,
                        })

                    checkout_session = stripe.checkout.Session.create(
                        payment_method_types=['card', 'boleto'],
                        line_items=line_items,
                        mode='payment',
                        customer_email=user_email if '@' in user_email else None,
                        success_url='http://localhost:5173/?pagamento=sucesso',
                        cancel_url='http://localhost:5173/?pagamento=falha',
                        client_reference_id=id_pedido
                    )
                   
                    pagamento_url = checkout_session.url
                except Exception as e:
                    print(f"🚨 ERRO NA STRIPE: {str(e)}")

            return Response({
                "mensagem": "Pedido gerado!",
                "pedido": novo_pedido,
                "pagamento_url": pagamento_url
            }, status=201)
           
        except Exception as e:
            return Response({"erro": str(e)}, status=500)

class PedidoUserListView(APIView):
    def get(self, request, id_usuario):
        try:
            docs = db.collection('pedidos').where(filter=FieldFilter('id_usuario', '==', int(id_usuario))).get()
            pedidos = [doc.to_dict() for doc in docs]
            pedidos.sort(key=lambda x: x.get('data_pedido', ''), reverse=True)
            return Response(pedidos, status=200)
        except Exception as e:
            return Response({"erro": str(e)}, status=500)

class PedidoAdminListView(APIView):
    def get(self, request):
        try:
            if not is_admin(request): return Response({"erro": "Acesso negado."}, status=403)
            docs = db.collection('pedidos').get()
            pedidos = [doc.to_dict() for doc in docs]
            pedidos.sort(key=lambda x: x.get('data_pedido', ''), reverse=True)
            return Response(pedidos, status=200)
        except Exception as e: return Response({"erro": str(e)}, status=500)

class PedidoStatusUpdateView(APIView):
    def put(self, request, id_pedido):
        try:
            if not is_admin(request): return Response({"erro": "Acesso negado."}, status=403)
            novo_status = request.data.get('status')
            if not novo_status: return Response({"erro": "Status não fornecido."}, status=400)
           
            doc_ref = db.collection('pedidos').document(str(id_pedido))
            if not doc_ref.get().exists: return Response({"erro": "Pedido não encontrado."}, status=404)
            doc_ref.update({"status": novo_status})
           
            return Response({"mensagem": "Status atualizado!", "status": novo_status}, status=200)
        except Exception as e: return Response({"erro": str(e)}, status=500)

# ==========================================
# SISTEMA DE RECOMENDAÇÕES (SEMPRE 3+)
# ==========================================
class RecomendacoesView(APIView):
    def get(self, request):
        try:
            produto_id = request.GET.get('produto_id')
            if not produto_id:
                return Response([], status=200)

            recomendados = []
            top_ids = []

            # 1. Procurar no histórico de pedidos
            pedidos_docs = db.collection('pedidos').get()
            produtos_relacionados_count = {}

            for p_doc in pedidos_docs:
                pedido = p_doc.to_dict()
                itens = pedido.get('itens', [])
                ids_no_pedido = [str(item.get('id', item.get('id_produto', ''))) for item in itens]
               
                if str(produto_id) in ids_no_pedido:
                    for item_id in ids_no_pedido:
                        if item_id != str(produto_id) and item_id:
                            produtos_relacionados_count[item_id] = produtos_relacionados_count.get(item_id, 0) + 1

            ids_mais_comprados = sorted(produtos_relacionados_count, key=produtos_relacionados_count.get, reverse=True)
           
            for t_id in ids_mais_comprados:
                prod_doc = db.collection('produtos').document(t_id).get()
                if prod_doc.exists:
                    recomendados.append(prod_doc.to_dict())
                    top_ids.append(t_id)
                if len(recomendados) >= 4:
                    break

            # 2. Se tiver menos de 4, preenche com produtos da MESMA CATEGORIA
            if len(recomendados) < 4:
                base_prod = db.collection('produtos').document(str(produto_id)).get()
                if base_prod.exists:
                    categoria = base_prod.to_dict().get('categoria')
                    fallback_cat = db.collection('produtos').where(filter=FieldFilter('categoria', '==', categoria)).limit(10).get()
                   
                    for fb in fallback_cat:
                        fb_dict = fb.to_dict()
                        if fb_dict.get('id') != str(produto_id) and fb_dict.get('id') not in top_ids:
                            recomendados.append(fb_dict)
                            top_ids.append(fb_dict.get('id'))
                            if len(recomendados) >= 4:
                                break

            # 3. Se AINDA tiver menos de 3, preenche com QUALQUER PRODUTO da loja
            if len(recomendados) < 3:
                all_prods = db.collection('produtos').limit(15).get()
                for ap in all_prods:
                    ap_dict = ap.to_dict()
                    if ap_dict.get('id') != str(produto_id) and ap_dict.get('id') not in top_ids:
                        recomendados.append(ap_dict)
                        top_ids.append(ap_dict.get('id'))
                        if len(recomendados) >= 4:
                            break

            return Response(recomendados[:4], status=200)
           
        except Exception as e:
            return Response({"erro": str(e)}, status=500)