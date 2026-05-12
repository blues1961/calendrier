from rest_framework import serializers
from .models import Calendar, Event, calendar_represents_birthdays

class CalendarSerializer(serializers.ModelSerializer):
    class Meta:
        model = Calendar
        fields = ["id", "name", "color", "is_default", "kind"]
        read_only_fields = ["kind"]

class EventSerializer(serializers.ModelSerializer):
    calendar_name = serializers.ReadOnlyField(source="calendar.name")
    kind = serializers.SerializerMethodField()
    recurrence = serializers.ReadOnlyField()
    month = serializers.ReadOnlyField(source="recurrence_month")
    day = serializers.ReadOnlyField(source="recurrence_day")

    def validate_calendar(self, value):
        request = self.context.get("request")
        if request and value.owner_id != request.user.id:
            raise serializers.ValidationError("Ce calendrier ne vous appartient pas.")
        return value

    def get_kind(self, obj):
        if calendar_represents_birthdays(obj.calendar):
            return "birthday"
        return "event"

    class Meta:
        model = Event
        fields = [
            "id",
            "calendar",
            "calendar_name",
            "kind",
            "title",
            "description",
            "start",
            "end",
            "all_day",
            "location",
            "recurrence",
            "month",
            "day",
        ]
        read_only_fields = ["kind", "calendar_name", "recurrence", "month", "day"]


class DashboardEventsQuerySerializer(serializers.Serializer):
    owner_username = serializers.CharField()
    range_start = serializers.DateTimeField(required=False, allow_null=True)
    range_end = serializers.DateTimeField(required=False, allow_null=True)

    def validate(self, attrs):
        range_start = attrs.get("range_start")
        range_end = attrs.get("range_end")
        if range_start and range_end and range_end < range_start:
            attrs["range_end"] = range_start
        return attrs
