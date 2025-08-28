from rest_framework import serializers
from .models import Calendar, Event

class CalendarSerializer(serializers.ModelSerializer):
    class Meta:
        model = Calendar
        fields = ["id", "name", "color", "is_default"]

class EventSerializer(serializers.ModelSerializer):
    calendar_name = serializers.ReadOnlyField(source="calendar.name")
    class Meta:
        model = Event
        fields = ["id", "calendar", "calendar_name", "title", "description", "start", "end", "all_day", "location"]
