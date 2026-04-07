from django.urls import path
from .views import (
    CheckAuthView,
    SendOTPView,
    LoginOTPView,
    RegisterView,
    SocialLoginView,
    UserDetailView,
    UserEnderecosView,
    EnderecoDetailView,
    ProdutoListView,
    ProdutoDetailView,
    UploadImagemView # A nova view para o upload de múltiplas imagens
)

urlpatterns = [
    # ==========================
    # ROTAS DE AUTENTICAÇÃO
    # ==========================
    path('auth/check/', CheckAuthView.as_view(), name='check_auth'),
    path('auth/send-otp/', SendOTPView.as_view(), name='send_otp'),
    path('auth/login/', LoginOTPView.as_view(), name='login_otp'),
    path('auth/register/', RegisterView.as_view(), name='register'),
    path('auth/social/', SocialLoginView.as_view(), name='social_login'),

    # ==========================
    # ROTAS DE PERFIL E ENDEREÇOS
    # ==========================
    path('auth/user/<int:id_usuario>/', UserDetailView.as_view(), name='user_detail'),
    path('auth/user/<int:id_usuario>/enderecos/', UserEnderecosView.as_view(), name='user_enderecos'),
    path('auth/endereco/<str:id_endereco>/', EnderecoDetailView.as_view(), name='endereco_detail'),

    # ==========================
    # ROTAS DO CATÁLOGO DE PRODUTOS
    # ==========================
    path('produtos/', ProdutoListView.as_view(), name='produto_list'),
    path('produtos/<str:id_produto>/', ProdutoDetailView.as_view(), name='produto_detail'),
    
    # ==========================
    # ROTA DE UPLOAD DE ARQUIVOS
    # ==========================
    path('upload-imagens/', UploadImagemView.as_view(), name='upload_imagens'),
]