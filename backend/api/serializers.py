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