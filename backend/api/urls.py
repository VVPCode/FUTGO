from django.urls import path
from .views import CheckEmailView, SendOTPView, LoginOTPView, RegisterView, UserDetailView

urlpatterns = [
    path('auth/check-email/', CheckEmailView.as_view(), name='check-email'),
    path('auth/send-otp/', SendOTPView.as_view(), name='send-otp'), # <- NOVA ROTA AQUI
    path('auth/login/', LoginOTPView.as_view(), name='login-otp'),
    path('auth/register/', RegisterView.as_view(), name='register'),
    path('auth/user/<int:id_usuario>/', UserDetailView.as_view(), name='user-detail'),
]