# backend/calendar_api/admin.py
from django.contrib import admin
from .models import Calendar, Event

@admin.register(Calendar)
class CalendarAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "owner", "is_default", "created_at")
    list_filter = ("is_default", "owner")
    search_fields = ("name", "owner__username")
    ordering = ("-created_at",)

@admin.register(Event)
class EventAdmin(admin.ModelAdmin):
    list_display = ("id", "title", "calendar", "start", "end", "all_day", "external_contact_id")
    list_filter = ("all_day", "calendar")
    search_fields = ("title", "calendar__name", "external_contact_id")
    ordering = ("-start",)
