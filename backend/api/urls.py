from django.urls import path
from .views import (
    CheckAuthView, SendOTPView, LoginOTPView, RegisterView, SocialLoginView,
    UserDetailView, UserEnderecosView, EnderecoDetailView,
    ProdutoListView, ProdutoDetailView
)

urlpatterns = [
    # Rotas de Autenticação Híbrida
    path('auth/check/', CheckAuthView.as_view(), name='check-auth'), # <--- ALTERADO
    path('auth/send-otp/', SendOTPView.as_view(), name='send-otp'),
    path('auth/login/', LoginOTPView.as_view(), name='login-otp'),
    path('auth/register/', RegisterView.as_view(), name='register'),
    path('auth/social/', SocialLoginView.as_view(), name='social-login'),
    
    # Rotas de Perfil e Endereços
    path('auth/user/<int:id_usuario>/', UserDetailView.as_view(), name='user-detail'),
    path('auth/user/<int:id_usuario>/enderecos/', UserEnderecosView.as_view(), name='user-enderecos'),
    path('auth/endereco/<str:id_endereco>/', EnderecoDetailView.as_view(), name='endereco-detail'),
    
    # Rotas do Catálogo (Admin e Público)
    path('produtos/', ProdutoListView.as_view(), name='produtos-list'),
    path('produtos/<str:id_produto>/', ProdutoDetailView.as_view(), name='produtos-detail'),
]