from django.urls import path
from .views import (
    CheckEmailView, SendOTPView, LoginOTPView, RegisterView, SocialLoginView,
    UserDetailView, UserEnderecosView, EnderecoDetailView,
    ProdutoListView, ProdutoDetailView
)

urlpatterns = [
    # ==========================================
    # ROTAS DE AUTENTICAÇÃO
    # ==========================================
    path('auth/check-email/', CheckEmailView.as_view(), name='check-email'),
    path('auth/send-otp/', SendOTPView.as_view(), name='send-otp'),
    path('auth/login/', LoginOTPView.as_view(), name='login-otp'),
    path('auth/register/', RegisterView.as_view(), name='register'),
    
    # 🌟 A ROTA QUE RESOLVE O SEU ERRO 404 (LOGIN GOOGLE/FACEBOOK):
    path('auth/social/', SocialLoginView.as_view(), name='social-login'),
    
    # ==========================================
    # ROTAS DE PERFIL E ENDEREÇOS
    # ==========================================
    path('auth/user/<int:id_usuario>/', UserDetailView.as_view(), name='user-detail'),
    path('auth/user/<int:id_usuario>/enderecos/', UserEnderecosView.as_view(), name='user-enderecos'),
    path('auth/endereco/<str:id_endereco>/', EnderecoDetailView.as_view(), name='endereco-detail'),
    
    # ==========================================
    # ROTAS DO CATÁLOGO DE PRODUTOS (ADMIN E PÚBLICO)
    # ==========================================
    path('produtos/', ProdutoListView.as_view(), name='produtos-list'),
    path('produtos/<str:id_produto>/', ProdutoDetailView.as_view(), name='produtos-detail'),
]