from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .views import CalendarViewSet, ContactBirthdaySyncView, EventViewSet
from .views_health import health

router = DefaultRouter()
router.register(r"calendars", CalendarViewSet, basename="calendar")
router.register(r"events", EventViewSet, basename="event")

urlpatterns = [
    path("auth/jwt/create/", TokenObtainPairView.as_view(), name="jwt-create"),
    path("auth/jwt/refresh/", TokenRefreshView.as_view(), name="jwt-refresh"),
    path("health/", health),
    path("integrations/contact-birthdays/sync/", ContactBirthdaySyncView.as_view(), name="contact-birthday-sync"),
    path("", include(router.urls)),
]
