from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    # Esta linha é a magia: Diz ao Django para mandar tudo o que começa com /api/ para o nosso ficheiro api/urls.py
    path('api/', include('api.urls')), 
]