from rest_framework import serializers
from .models import Calendar, Event

class CalendarSerializer(serializers.ModelSerializer):
    class Meta:
        model = Calendar
        fields = ["id", "name", "color", "is_default"]

class EventSerializer(serializers.ModelSerializer):
    calendar_name = serializers.ReadOnlyField(source="calendar.name")

    def validate_calendar(self, value):
        request = self.context.get("request")
        if request and value.owner_id != request.user.id:
            raise serializers.ValidationError("Ce calendrier ne vous appartient pas.")
        return value

    class Meta:
        model = Event
        fields = [
            "id",
            "calendar",
            "calendar_name",
            "title",
            "description",
            "start",
            "end",
            "all_day",
            "location",
        ]
