import json
from django.conf import settings
from twilio.rest import Client

def enviar_otp_whatsapp(numero_destino: str, codigo_otp: str) -> bool:
    """
    Envia um código OTP via WhatsApp utilizando os Content Templates do Twilio.
    RN: O WhatsApp exige templates pré-aprovados para iniciar conversas (Business-Initiated).
    """
    try:
        # 1. Inicializa o cliente do Twilio com as chaves do settings.py
        client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
        
        # 2. Formata os números para o padrão do WhatsApp do Twilio ("whatsapp:+55...")
        numero_origem = f"whatsapp:{settings.TWILIO_PHONE_NUMBER}"
        
        numero_formatado = numero_destino if numero_destino.startswith('+') else f"+{numero_destino}"
        if not numero_formatado.startswith('whatsapp:'):
            numero_formatado = f"whatsapp:{numero_formatado}"
            
        # 3. Envia a mensagem utilizando o Content SID da sua imagem
        # O SID 'HX229f5a04fd0510ce1b071852155d3e75' corresponde ao template:
        # "{{1}} is your verification code. For your security, do not share this code."
        message = client.messages.create(
            from_=numero_origem,
            to=numero_formatado,
            content_sid='HX229f5a04fd0510ce1b071852155d3e75',
            content_variables=json.dumps({"1": str(codigo_otp)})
        )
        
        print(f"✅ WhatsApp OTP enviado com sucesso! SID: {message.sid}")
        return True
        
    except Exception as e:
        print(f"❌ Erro ao enviar WhatsApp via Twilio: {e}")
        return False