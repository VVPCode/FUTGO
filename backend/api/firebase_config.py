import firebase_admin
from firebase_admin import credentials, firestore
import os
import sys

# Caminho absoluto para o ficheiro de credenciais
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
cred_path = os.path.join(BASE_DIR, 'firebase-admin-key.json')

# Verifica se o ficheiro existe antes de tentar ligar
if not os.path.exists(cred_path):
    print("\n" + "="*70)
    print("🚨 ERRO FATAL: CHAVE DO FIREBASE NÃO ENCONTRADA 🚨")
    print(f"O Django procurou o arquivo em: {cred_path}")
    print("\nCOMO RESOLVER:")
    print("1. Vá ao Firebase Console > Configurações do Projeto > Contas de Serviço")
    print("2. Selecione Python e clique em 'Gerar nova chave privada'")
    print("3. Coloque o ficheiro baixado dentro da pasta 'backend'")
    print("4. Renomeie esse ficheiro EXATAMENTE para 'firebase-admin-key.json'")
    print("="*70 + "\n")
    sys.exit(1) # Pára o servidor graciosamente

# Inicializa o Firebase Admin APENAS se ainda não estiver inicializado
if not firebase_admin._apps:
    try:
        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred)
        print("✅ Firebase Admin SDK conectado com sucesso!")
    except Exception as e:
        print(f"❌ Erro ao conectar Firebase Admin. Erro: {e}")

db = firestore.client()
# Exporta o cliente do Firestore para ser usado nas Views
db = firestore.client()