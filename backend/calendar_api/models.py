from django.conf import settings
from django.db import models
from django.db.models import Q


BIRTHDAY_CALENDAR_NAME = "Anniversaires"
BIRTHDAY_CALENDAR_COLOR = "#d81b60"
BIRTHDAY_NAME_MARKER = "annivers"


class Calendar(models.Model):
    class Kind(models.TextChoices):
        PERSONAL = "personal", "Personal"
        BIRTHDAYS = "birthdays", "Birthdays"

    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="calendars")
    name = models.CharField(max_length=100)
    color = models.CharField(max_length=7, default="#1976d2")
    is_default = models.BooleanField(default=False)
    kind = models.CharField(max_length=16, choices=Kind.choices, default=Kind.PERSONAL)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("owner", "name")
        ordering = ["name"]
        constraints = [
            models.UniqueConstraint(
                fields=["owner"],
                condition=Q(kind="birthdays"),
                name="uniq_birthday_calendar_per_owner",
            ),
        ]

    def __str__(self):
        return f"{self.name} ({self.owner})"

class Event(models.Model):
    class Recurrence(models.TextChoices):
        NONE = "none", "None"
        YEARLY = "yearly", "Yearly"

    calendar = models.ForeignKey(Calendar, on_delete=models.CASCADE, related_name="events")
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    start = models.DateTimeField()
    end = models.DateTimeField()
    all_day = models.BooleanField(default=False)
    location = models.CharField(max_length=200, blank=True)
    external_uid = models.CharField(max_length=255, blank=True, null=True, db_index=True)
    recurrence = models.CharField(max_length=16, choices=Recurrence.choices, default=Recurrence.NONE)
    recurrence_month = models.PositiveSmallIntegerField(blank=True, null=True)
    recurrence_day = models.PositiveSmallIntegerField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["start"]
        constraints = [
            models.UniqueConstraint(
                fields=["calendar", "external_uid"],
                condition=Q(external_uid__isnull=False) & ~Q(external_uid=""),
                name="uniq_event_calendar_external_uid",
            )
        ]


def ensure_birthday_calendar(user):
    birthday_calendar = Calendar.objects.filter(owner=user, kind=Calendar.Kind.BIRTHDAYS).first()
    legacy_named_calendar = (
        Calendar.objects.filter(owner=user, name__icontains=BIRTHDAY_NAME_MARKER)
        .exclude(kind=Calendar.Kind.BIRTHDAYS)
        .order_by("id")
        .first()
    )

    if birthday_calendar is not None:
        if (
            legacy_named_calendar is not None
            and not birthday_calendar.events.exists()
            and legacy_named_calendar.events.exists()
        ):
            birthday_calendar.delete()
            legacy_named_calendar.kind = Calendar.Kind.BIRTHDAYS
            legacy_named_calendar.save(update_fields=["kind"])
            return legacy_named_calendar
        return birthday_calendar

    if legacy_named_calendar is not None:
        legacy_named_calendar.kind = Calendar.Kind.BIRTHDAYS
        legacy_named_calendar.save(update_fields=["kind"])
        return legacy_named_calendar

    return Calendar.objects.create(
        owner=user,
        name=BIRTHDAY_CALENDAR_NAME,
        color=BIRTHDAY_CALENDAR_COLOR,
        is_default=False,
        kind=Calendar.Kind.BIRTHDAYS,
    )


def calendar_represents_birthdays(calendar):
    if calendar.kind == Calendar.Kind.BIRTHDAYS:
        return True
    return BIRTHDAY_NAME_MARKER in str(calendar.name or "").strip().lower()
