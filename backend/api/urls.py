from django.urls import path
from .views import CheckEmailView, LoginOTPView, RegisterView, GoogleAuthView

urlpatterns = [
    # Rota para verificar se o e-mail existe
    path('auth/check-email/', CheckEmailView.as_view(), name='check-email'),
    
    # Rota para login com OTP
    path('auth/login/', LoginOTPView.as_view(), name='login-otp'),
    
    # Rota para finalizar o cadastro com OTP
    path('auth/register/', RegisterView.as_view(), name='register'),

    # --- Rota para autenticação via Google ---
    path('auth/google/', GoogleAuthView.as_view(), name='google-auth'),
]