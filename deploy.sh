#!/bin/bash
# ==============================================================================
# SCRIPT DE DESPLIEGUE CONTINUO - G-MKT AI
# Ejecuta siempre este script para actualizar todos los sistemas a la última versión
# ==============================================================================

echo "🚀 Iniciando proceso de despliegue en producción..."

# 1. Obtener última versión del código
echo "⬇️  Descargando últimos cambios de GitHub..."
git pull origin main
if [ $? -ne 0 ]; then
    echo "❌ Error al descargar de Git. Revisa si hay conflictos."
    exit 1
fi

# 2. Actualizar dependencias y frontend
echo "🎨 Reconstruyendo la interfaz de usuario (Frontend)..."
cd frontend
npm install
npm run build
pm2 restart gmkt-frontend
cd ..

# 3. Instalar librerías nuevas back y resetear motores
echo "🧠 Reiniciando Inteligencia Artificial y Workers (Backend)..."
cd backend
source venv/bin/activate
pip install -r requirements.txt
pm2 restart gmkt-backend
pm2 restart gmkt-celery
cd ..

echo "✅ ¡Despliegue completado maravillosamente!"
echo "🌐 Todo el sistema está corriendo con la última versión de la rama 'main'."
