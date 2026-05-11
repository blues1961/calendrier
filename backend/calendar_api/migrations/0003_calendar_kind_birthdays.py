from django.conf import settings
from django.db import migrations, models
from django.db.models import Q


BIRTHDAY_CALENDAR_NAME = "Anniversaires"
BIRTHDAY_CALENDAR_COLOR = "#d81b60"
BIRTHDAY_NAME_MARKER = "annivers"


def backfill_birthday_calendars(apps, schema_editor):
    Calendar = apps.get_model("calendar_api", "Calendar")
    User = apps.get_model(*settings.AUTH_USER_MODEL.split("."))

    for user in User.objects.all():
        birthday_calendar = Calendar.objects.filter(owner=user, kind="birthdays").order_by("id").first()
        if birthday_calendar is not None:
            continue

        named_calendar = Calendar.objects.filter(owner=user, name__icontains=BIRTHDAY_NAME_MARKER).order_by("id").first()
        if named_calendar is not None:
            named_calendar.kind = "birthdays"
            named_calendar.save(update_fields=["kind"])
            continue

        Calendar.objects.create(
            owner=user,
            name=BIRTHDAY_CALENDAR_NAME,
            color=BIRTHDAY_CALENDAR_COLOR,
            is_default=False,
            kind="birthdays",
        )


class Migration(migrations.Migration):
    atomic = False

    dependencies = [
        ("calendar_api", "0002_event_external_uid"),
    ]

    operations = [
        migrations.AddField(
            model_name="calendar",
            name="kind",
            field=models.CharField(
                choices=[("personal", "Personal"), ("birthdays", "Birthdays")],
                default="personal",
                max_length=16,
            ),
        ),
        migrations.RunPython(backfill_birthday_calendars, migrations.RunPython.noop),
        migrations.AddConstraint(
            model_name="calendar",
            constraint=models.UniqueConstraint(
                fields=("owner",),
                condition=Q(kind="birthdays"),
                name="uniq_birthday_calendar_per_owner",
            ),
        ),
    ]
