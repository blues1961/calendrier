from rest_framework import viewsets, permissions
from .models import Calendar, Event
from .serializers import CalendarSerializer, EventSerializer

class IsOwner(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        from .models import Calendar as Cal, Event as Ev
        if isinstance(obj, Cal):
            return obj.owner == request.user
        if isinstance(obj, Ev):
            return obj.calendar.owner == request.user
        return False

class CalendarViewSet(viewsets.ModelViewSet):
    serializer_class = CalendarSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwner]

    def get_queryset(self):
        return Calendar.objects.filter(owner=self.request.user)

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

class EventViewSet(viewsets.ModelViewSet):
    serializer_class = EventSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwner]

    def get_queryset(self):
        return Event.objects.filter(calendar__owner=self.request.user)
